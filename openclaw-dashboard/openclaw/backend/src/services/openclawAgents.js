import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';

const DEFAULT_OPENCLAW_ROOT = path.join(os.homedir(), '.openclaw');
const OPENCLAW_ROOT = (process.env.OPENCLAW_WORKSPACE || DEFAULT_OPENCLAW_ROOT).replace(/\/$/, '');
const AGENTS_ROOT = path.join(OPENCLAW_ROOT, 'agents');

const ensureDirExists = async (dirPath) => {
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) return false;
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
};

const safeReadJson = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

const normalizeAgentId = (value) => {
  if (!value) return 'main';
  return String(value).replace(/^agent:/i, '').trim();
};

const collectSkillEntries = (snapshot) => {
  if (!snapshot) return [];
  if (Array.isArray(snapshot.resolvedSkills) && snapshot.resolvedSkills.length) {
    return snapshot.resolvedSkills.map((skill) => ({
      name: skill.name,
      description: skill.description || '',
      filePath: skill.filePath,
      baseDir: skill.baseDir,
      source: skill.source,
      primaryEnv: skill.primaryEnv || skill.primary_env || null
    }));
  }
  if (Array.isArray(snapshot.skills)) {
    return snapshot.skills.map((skill) => ({
      name: typeof skill === 'string' ? skill : skill.name,
      description: '',
      filePath: null,
      baseDir: null,
      source: null,
      primaryEnv: skill.primaryEnv || null
    }));
  }
  return [];
};

const dedupeSkills = (skills) => {
  const byName = new Map();
  for (const skill of skills) {
    if (!skill?.name) continue;
    if (!byName.has(skill.name)) {
      byName.set(skill.name, skill);
    }
  }
  return Array.from(byName.values());
};

const mapSessionEntry = (sessionKey, entry = {}) => {
  const updatedAt = entry.updatedAt || entry.timestamp || null;
  const subject = entry.subject || entry.displayName || entry.origin?.label || sessionKey;
  return {
    sessionKey,
    sessionId: entry.sessionId,
    sessionFile: entry.sessionFile,
    updatedAt,
    channel: entry.deliveryContext?.channel || entry.lastChannel || entry.origin?.surface || null,
    chatType: entry.chatType || entry.origin?.chatType || 'direct',
    origin: entry.origin || null,
    deliveryContext: entry.deliveryContext || null,
    subject,
    skillsSnapshot: entry.skillsSnapshot || null
  };
};

export async function listAgentsSummary() {
  const exists = await ensureDirExists(AGENTS_ROOT);
  if (!exists) return [];
  const entries = await fs.readdir(AGENTS_ROOT, { withFileTypes: true });
  const summaries = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const agentId = normalizeAgentId(entry.name);
    const sessionsMeta = await loadAgentSessions(agentId);
    const sessions = sessionsMeta.sessions;
    const latest = sessions[0] || null;
    const skills = dedupeSkills(sessionsMeta.skillsFromSnapshots);
    summaries.push({
      id: agentId,
      path: sessionsMeta.agentPath,
      sessionCount: sessions.length,
      skillCount: skills.length,
      lastUpdated: latest?.updatedAt || null,
      channels: Array.from(new Set(sessions.map((s) => s.channel).filter(Boolean)))
    });
  }
  return summaries.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
}

export async function getAgentDetail(agentId) {
  const normalizedId = normalizeAgentId(agentId);
  const sessionsData = await loadAgentSessions(normalizedId);
  const skills = dedupeSkills(sessionsData.skillsFromSnapshots);
  return {
    agent: {
      id: normalizedId,
      path: sessionsData.agentPath,
      sessionCount: sessionsData.sessions.length,
      skillCount: skills.length,
      lastUpdated: sessionsData.sessions[0]?.updatedAt || null,
      channels: Array.from(new Set(sessionsData.sessions.map((s) => s.channel).filter(Boolean)))
    },
    skills,
    sessions: sessionsData.sessions
  };
}

export async function getAgentSkills(agentId) {
  const detail = await getAgentDetail(agentId);
  return detail.skills;
}

const filterSessions = (sessions, { channel, chatType } = {}) => {
  let result = [...sessions];
  if (channel) {
    const normalized = channel.toLowerCase();
    result = result.filter((session) => (session.channel || '').toLowerCase() === normalized);
  }
  if (chatType) {
    const normalized = chatType.toLowerCase();
    result = result.filter((session) => (session.chatType || '').toLowerCase() === normalized);
  }
  return result;
};

export async function getAgentSessions(agentId, { channel, chatType, limit } = {}) {
  const detail = await getAgentDetail(agentId);
  let sessions = filterSessions(detail.sessions, { channel, chatType });
  if (Number.isFinite(limit) && limit > 0) {
    sessions = sessions.slice(0, limit);
  }
  return sessions;
}

export async function getAgentSessionMessages(agentId, sessionId, { limit = 200 } = {}) {
  const normalizedId = normalizeAgentId(agentId);
  const sessionFileName = sessionId.endsWith('.jsonl') ? sessionId : `${sessionId}.jsonl`;
  const filePath = path.join(AGENTS_ROOT, normalizedId, 'sessions', sessionFileName);
  await fs.access(filePath); // throws if missing

  const lines = readline.createInterface({
    input: fsSync.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity
  });

  const messages = [];
  for await (const line of lines) {
    if (!line.trim()) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    if (record.type !== 'message') continue;
    const payload = record.message || {};
    const text = flattenContent(payload.content);
    messages.push({
      id: record.id,
      role: payload.role || record.role || 'system',
      text,
      timestamp: payload.timestamp || record.timestamp || null,
      rawType: payload.type || null
    });
  }

  const trimmed = limit && messages.length > limit
    ? messages.slice(messages.length - limit)
    : messages;

  return trimmed;
}

const flattenContent = (content) => {
  if (!content) return '';
  if (typeof content === 'string') return content;
  const reducer = (chunk) => {
    if (!chunk || typeof chunk !== 'object') return '';
    if (typeof chunk.text === 'string') return chunk.text;
    if (typeof chunk.thinking === 'string') return chunk.thinking;
    if (typeof chunk.content === 'string') return chunk.content;
    return '';
  };
  if (Array.isArray(content)) {
    return content
      .map(reducer)
      .map((value) => value.trim())
      .filter(Boolean)
      .join('\n\n');
  }
  if (typeof content === 'object') {
    return reducer(content);
  }
  return '';
};

async function loadAgentSessions(agentId) {
  const normalizedId = normalizeAgentId(agentId);
  const agentPath = path.join(AGENTS_ROOT, normalizedId);
  const sessionsDir = path.join(agentPath, 'sessions');
  const sessionsFile = path.join(sessionsDir, 'sessions.json');
  const sessionsJson = await safeReadJson(sessionsFile);
  const sessions = [];
  const skillsFromSnapshots = [];

  if (sessionsJson && typeof sessionsJson === 'object') {
    Object.entries(sessionsJson).forEach(([key, value]) => {
      const mapped = mapSessionEntry(key, value);
      sessions.push(mapped);
      skillsFromSnapshots.push(...collectSkillEntries(mapped.skillsSnapshot));
    });
  }

  sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  return { agentPath, sessions, skillsFromSnapshots };
}

export const openclawPaths = {
  root: OPENCLAW_ROOT,
  agents: AGENTS_ROOT
};
