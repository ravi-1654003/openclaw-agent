import express from 'express';
import fetch from 'node-fetch';
import { ensureConversation, getConversationMessages, insertMessage, getConversationById } from '../db/conversations.js';
import { insertMemory } from '../db/memories.js';
import { getEmbeddingForText, embeddingsConfig } from '../lib/embeddings.js';
import { isDatabaseConfigured } from '../db/client.js';

const router = express.Router();

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:18789/v1/responses';
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || 'my_token_1654003';
const DEFAULT_PAGE_SIZE = Number(process.env.CHAT_PAGE_SIZE || 10);
const MAX_PAGE_SIZE = Number(process.env.CHAT_PAGE_MAX || 50);
const DEFAULT_AGENT_ID = (process.env.DEFAULT_AGENT_ID || 'main').trim();

const seedTime = Date.now();
const seedMessages = [
  { role: 'agent', content: 'Hello from OpenClaw!', metadata: {}, created_at: new Date(seedTime - 2000).toISOString() },
  { role: 'user', content: 'Hi bot, show me my cron jobs.', metadata: {}, created_at: new Date(seedTime - 1000).toISOString() }
];

const inMemoryConversations = new Map();

const toLegacyMessage = (message) => ({
  from: message.role === 'user' ? 'you' : message.role,
  text: message.content,
  role: message.role,
  metadata: message.metadata || {},
  created_at: message.created_at || new Date().toISOString()
});

const normalizeAgentId = (value) => {
  if (!value) return DEFAULT_AGENT_ID;
  return String(value).replace(/^agent:/i, '').trim() || DEFAULT_AGENT_ID;
};

const getInMemoryConversation = (agentId) => {
  const normalized = normalizeAgentId(agentId);
  if (!inMemoryConversations.has(normalized)) {
    inMemoryConversations.set(normalized, {
      id: `in-memory-${normalized}`,
      messages: normalized === DEFAULT_AGENT_ID ? [...seedMessages] : []
    });
  }
  return inMemoryConversations.get(normalized);
};

const pushInMemoryMessage = ({ agentId, role, content, metadata }) => {
  const convo = getInMemoryConversation(agentId);
  convo.messages.push({
    role,
    content,
    metadata: metadata || {},
    created_at: new Date().toISOString()
  });
};

const persistMemory = async (payload) => {
  if (!isDatabaseConfigured()) return;
  try {
    await insertMemory(payload);
  } catch (memoryError) {
    console.error('[chat] failed to persist vector memory', memoryError);
  }
};

const parseGatewayResponse = (raw) => {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse gateway JSON', err);
    return '(Invalid JSON from Gateway)';
  }

  if (data && data.output && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.type === 'message' && Array.isArray(item.content)) {
        const textItem = item.content.find((c) => c.type === 'output_text');
        if (textItem?.text) return textItem.text;
      }
    }
  }
  return '(No reply received)';
};

const normalizeLimit = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(1, Math.floor(num)), MAX_PAGE_SIZE);
};

const normalizeCursor = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const buildPageResponse = (messages, limit) => {
  const hasMore = messages.length > limit;
  const trimmed = hasMore ? messages.slice(1) : messages;
  const nextCursor = hasMore && trimmed.length ? trimmed[0].created_at : null;
  return { messages: trimmed.map(toLegacyMessage), hasMore, nextCursor };
};

const buildGatewayModel = (agentId) => {
  const normalized = normalizeAgentId(agentId);
  if (normalized.startsWith('openclaw:') || normalized.startsWith('agent:')) {
    return normalized;
  }
  return `openclaw:${normalized}`;
};

const sanitizeConversationId = async (conversationId, agentId) => {
  if (!conversationId) return null;
  if (!isDatabaseConfigured()) return conversationId;
  const existing = await getConversationById(conversationId);
  if (!existing) return null;
  if (existing.topic && existing.topic !== agentId) return null;
  return conversationId;
};

router.get('/', async (req, res) => {
  try {
    const { conversationId, limit, before, agentId } = req.query;
    const pageSize = normalizeLimit(limit);
    const cursor = normalizeCursor(before);
    const normalizedAgentId = normalizeAgentId(agentId);

    if (!isDatabaseConfigured()) {
      const convo = getInMemoryConversation(normalizedAgentId);
      let pool = [...convo.messages];
      if (cursor) {
        const cursorTime = new Date(cursor).getTime();
        pool = pool.filter((msg) => new Date(msg.created_at || 0).getTime() < cursorTime);
      }
      const start = Math.max(pool.length - (pageSize + 1), 0);
      const subset = pool.slice(start);
      const payload = buildPageResponse(subset, pageSize);
      return res.json({
        conversationId: convo.id,
        agentId: normalizedAgentId,
        ...payload
      });
    }

    const effectiveConversationId = await sanitizeConversationId(conversationId, normalizedAgentId);
    const conversation = await ensureConversation({ conversationId: effectiveConversationId, topic: normalizedAgentId });
    const rawMessages = await getConversationMessages(
      conversation.id,
      pageSize + 1,
      cursor
    );
    const payload = buildPageResponse(rawMessages, pageSize);
    res.json({ conversationId: conversation.id, agentId: normalizedAgentId, ...payload });
  } catch (error) {
    console.error('[chat:get] error', error);
    res.status(500).json({ error: 'Unable to fetch conversation history' });
  }
});

router.post('/', async (req, res) => {
  const { text, conversationId, metadata, agentId } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  const normalizedAgentId = normalizeAgentId(agentId);
  let conversation;
  try {
    if (isDatabaseConfigured()) {
      const effectiveConversationId = await sanitizeConversationId(conversationId, normalizedAgentId);
      conversation = await ensureConversation({ conversationId: effectiveConversationId, topic: normalizedAgentId });

      const userEmbedding = await getEmbeddingForText(text);
      const userMetadata = { source: 'user', agentId: normalizedAgentId, ...(metadata || {}) };
      await insertMessage({
        conversationId: conversation.id,
        role: 'user',
        content: text,
        embedding: userEmbedding,
        metadata: userMetadata
      });
      await persistMemory({
        conversationId: conversation.id,
        source: 'user',
        content: text,
        embedding: userEmbedding,
        metadata: { ...userMetadata, conversationId: conversation.id }
      });
    } else {
      conversation = getInMemoryConversation(normalizedAgentId);
      pushInMemoryMessage({ agentId: normalizedAgentId, role: 'user', content: text, metadata: { source: 'user', ...(metadata || {}) } });
    }

    console.log(`→ [ui→backend][${normalizedAgentId}]: ${text}`);
    const ocRes = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GATEWAY_TOKEN}`
      },
      body: JSON.stringify({
        input: text,
        model: buildGatewayModel(normalizedAgentId)
      })
    });

    const dataRaw = await ocRes.text();
    console.log('← [gateway raw]:', dataRaw);
    const reply = parseGatewayResponse(dataRaw);

    if (isDatabaseConfigured()) {
      let agentEmbedding = null;
      if (embeddingsConfig.embedAgentMessages) {
        agentEmbedding = await getEmbeddingForText(reply);
      }

      const agentMetadata = { source: 'agent', agentId: normalizedAgentId };
      await insertMessage({
        conversationId: conversation.id,
        role: 'agent',
        content: reply,
        embedding: agentEmbedding,
        metadata: agentMetadata
      });
      await persistMemory({
        conversationId: conversation.id,
        source: 'agent',
        content: reply,
        embedding: agentEmbedding,
        metadata: { ...agentMetadata, conversationId: conversation.id }
      });
    } else {
      pushInMemoryMessage({ agentId: normalizedAgentId, role: 'agent', content: reply, metadata: { source: 'agent' } });
    }

    console.log(`→ [backend→ui][${normalizedAgentId}]: ${reply}`);
    res.json({ reply, conversationId: conversation.id, agentId: normalizedAgentId });
  } catch (error) {
    console.error('[chat:post] error', error);
    const errorMsg = '⚠️ OpenClaw backend unavailable.';

    if (isDatabaseConfigured()) {
      try {
        const effectiveConversationId = await sanitizeConversationId(conversationId, normalizedAgentId);
        const fallbackConversation = await ensureConversation({ conversationId: effectiveConversationId, topic: normalizedAgentId });
        const errorMetadata = { source: 'error', detail: error.message, agentId: normalizedAgentId };
        await insertMessage({
          conversationId: fallbackConversation.id,
          role: 'agent',
          content: errorMsg,
          metadata: errorMetadata
        });
        await persistMemory({
          conversationId: fallbackConversation.id,
          source: 'error',
          content: errorMsg,
          metadata: { ...errorMetadata, conversationId: fallbackConversation.id }
        });
      } catch (dbError) {
        console.error('Failed to persist error message', dbError);
      }
    } else {
      pushInMemoryMessage({
        agentId: normalizedAgentId,
        role: 'agent',
        content: errorMsg,
        metadata: { source: 'error', detail: error.message }
      });
    }

    res.json({ reply: errorMsg, conversationId: conversation?.id || getInMemoryConversation(normalizedAgentId).id, agentId: normalizedAgentId });
  }
});

export default router;
