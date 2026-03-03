import { pool, ready, isVectorStoreEnabled } from './client.js';
import { toJsonbParam, toVectorParam } from './utils.js';

const DEFAULT_AGENT_ID = process.env.MEMORY_AGENT_ID || 'openclaw:main';

const parseRow = (row) => ({
  ...row,
  metadata:
    typeof row?.metadata === 'string'
      ? JSON.parse(row.metadata)
      : row?.metadata || {}
});

export async function insertMemory({
  agentId = DEFAULT_AGENT_ID,
  source,
  conversationId = null,
  content,
  embedding = null,
  metadata = {}
}) {
  if (!source) {
    throw new Error('source is required to persist a memory record');
  }
  if (!content || !content.trim()) {
    throw new Error('content is required to persist a memory record');
  }

  await ready;
  const embeddingCast = isVectorStoreEnabled() ? '::vector' : '::jsonb';
  const result = await pool.query(
    `INSERT INTO agent_memories (agent_id, source, conversation_id, content, embedding, metadata)
     VALUES ($1, $2, $3, $4, $5${embeddingCast}, $6::jsonb)
     RETURNING *`,
    [agentId, source, conversationId, content, toVectorParam(embedding), toJsonbParam(metadata)]
  );
  return parseRow(result.rows[0]);
}

export async function countMemories(agentId = DEFAULT_AGENT_ID) {
  await ready;
  const result = await pool.query(
    'SELECT COUNT(*)::INT AS total FROM agent_memories WHERE agent_id = $1',
    [agentId]
  );
  return result.rows[0]?.total ?? 0;
}
