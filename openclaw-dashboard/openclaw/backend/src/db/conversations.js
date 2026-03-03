import { randomUUID } from 'crypto';
import { pool, ready, isVectorStoreEnabled } from './client.js';
import { toVectorParam, toJsonbParam } from './utils.js';

const defaultLimit = 50;

export async function ensureConversation({ conversationId, topic } = {}) {
  await ready;
  if (conversationId) {
    const existing = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
    if (existing.rowCount > 0) {
      return existing.rows[0];
    }
  }

  if (topic) {
    const byTopic = await pool.query(
      'SELECT * FROM conversations WHERE topic = $1 ORDER BY created_at DESC LIMIT 1',
      [topic]
    );
    if (byTopic.rowCount > 0) {
      return byTopic.rows[0];
    }
  } else {
    const latest = await pool.query(
      'SELECT * FROM conversations ORDER BY created_at DESC LIMIT 1'
    );
    if (latest.rowCount > 0) {
      return latest.rows[0];
    }
  }

  const newId = randomUUID();
  const created = await pool.query(
    'INSERT INTO conversations (id, topic) VALUES ($1, $2) RETURNING *',
    [newId, topic || null]
  );
  return created.rows[0];
}

export async function insertMessage({ conversationId, role, content, embedding = null, metadata = {} }) {
  await ready;
  const params = [
    conversationId,
    role,
    content,
    toVectorParam(embedding),
    toJsonbParam(metadata)
  ];
  const embeddingCast = isVectorStoreEnabled() ? '::vector' : '::jsonb';
  const result = await pool.query(
    `INSERT INTO conversation_messages (conversation_id, role, content, embedding, metadata)
     VALUES ($1, $2, $3, $4${embeddingCast}, $5::jsonb)
     RETURNING *`,
    params
  );
  return parseRow(result.rows[0]);
}

const parseRow = (row) => ({
  ...row,
  metadata:
    typeof row.metadata === 'string'
      ? JSON.parse(row.metadata)
      : row.metadata || {}
});

export async function getConversationMessages(conversationId, limit = defaultLimit, before = null) {
  await ready;
  const params = [conversationId, limit];
  let clause = '';
  if (before) {
    clause = ' AND created_at < $3';
    params.push(before);
  }
  const result = await pool.query(
    `SELECT * FROM conversation_messages
     WHERE conversation_id = $1${clause}
     ORDER BY created_at DESC
     LIMIT $2`,
    params
  );
  return result.rows.reverse().map(parseRow);
}

export async function searchMessages(queryEmbedding, topK = 10) {
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
    throw new Error('queryEmbedding must be a non-empty array');
  }
  if (!isVectorStoreEnabled()) {
    throw new Error('Vector search is disabled. Enable PGVECTOR_EXTENSION to use this feature.');
  }
  await ready;
  const result = await pool.query(
    `SELECT *, (embedding <=> $1::vector) AS distance
     FROM conversation_messages
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [toVectorParam(queryEmbedding), topK]
  );
  return result.rows.map((row) => ({ ...parseRow(row), distance: row.distance }));
}
