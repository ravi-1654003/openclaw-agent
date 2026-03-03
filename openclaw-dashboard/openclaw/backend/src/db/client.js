


import '../loadEnv.js';
import { Pool } from 'pg';

const envDimension = Number(process.env.EMBEDDINGS_DIMENSION);
const DEFAULT_VECTOR_DIMENSION = Number.isFinite(envDimension) && envDimension > 0
  ? Math.floor(envDimension)
  : 1536;
const wantsPgVector = (process.env.PGVECTOR_EXTENSION || 'true').toLowerCase() !== 'false';
const extensionPermissionCodes = new Set(['42501', '0A000']);
const schemaPermissionCodes = new Set(['42501']);
let vectorEnabled = wantsPgVector;

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSL && process.env.PGSSL !== 'false' ? { rejectUnauthorized: false } : undefined
};

const hasDbConfig = Boolean(
  poolConfig.connectionString ||
  poolConfig.host ||
  (poolConfig.database && poolConfig.user)
);

let databaseAvailable = hasDbConfig;

async function ensureVectorCompatibility(client) {
  if (!vectorEnabled) return false;
  const checks = await client.query(`
    SELECT table_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'embedding'
      AND table_name IN ('conversation_messages', 'agent_memories')
  `);
  if (!checks.rowCount) return true;
  for (const row of checks.rows) {
    if (row.udt_name !== 'vector') {
      console.warn(`[db] ${row.table_name}.embedding is ${row.udt_name}; expected vector. Falling back to JSONB embeddings.`);
      vectorEnabled = false;
      return false;
    }
  }
  return true;
}

let pool;

function createDisabledPool(reason) {
  const message = reason || 'Database is not configured. Set DATABASE_URL or PG* env vars to enable persistence.';
  const error = new Error(message);
  return {
    query() {
      throw error;
    },
    async connect() {
      throw error;
    }
  };
}

function disableDatabase(reason) {
  const label = reason ? `[db] ${reason}` : '[db] Database disabled';
  console.warn(`${label}. Falling back to in-memory mode.`);
  vectorEnabled = false;
  databaseAvailable = false;
  pool = createDisabledPool(reason);
}

async function ensureSchema(client) {
  if (vectorEnabled) {
    try {
      const existing = await client.query("SELECT 1 FROM pg_extension WHERE extname = 'vector'");
      if (existing.rowCount === 0) {
        await client.query('CREATE EXTENSION IF NOT EXISTS vector');
      }
    } catch (error) {
      if (extensionPermissionCodes.has(error.code)) {
        console.warn('[db] pgvector unavailable (insufficient privileges). Falling back to JSONB embeddings.');
        vectorEnabled = false;
      } else {
        throw error;
      }
    }
  }

  const embeddingColumnType = vectorEnabled
    ? `VECTOR(${DEFAULT_VECTOR_DIMENSION})`
    : 'JSONB';

  await client.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY,
      topic TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS conversation_messages (
      id BIGSERIAL PRIMARY KEY,
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user','agent','system')),
      content TEXT NOT NULL,
      embedding ${embeddingColumnType},
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS conversation_messages_convo_id_idx
    ON conversation_messages (conversation_id, created_at)
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS agent_memories (
      id BIGSERIAL PRIMARY KEY,
      agent_id TEXT NOT NULL,
      source TEXT NOT NULL,
      conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
      content TEXT NOT NULL,
      embedding ${embeddingColumnType},
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    ALTER TABLE agent_memories
    ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL
  `);

  await client.query(`
    ALTER TABLE agent_memories
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb
  `);

  await client.query(`
    ALTER TABLE agent_memories
    ALTER COLUMN metadata SET DEFAULT '{}'::jsonb
  `);

  if (vectorEnabled) {
    const compatible = await ensureVectorCompatibility(client);
    vectorEnabled = compatible;
  }

  await client.query(`
    DO $$
    BEGIN
      ALTER TABLE agent_memories
      ADD CONSTRAINT agent_memories_source_check
      CHECK (source IN ('user','agent','system','error','tool'));
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS agent_memories_agent_id_created_idx
    ON agent_memories (agent_id, created_at DESC)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS agent_memories_conversation_idx
    ON agent_memories (conversation_id, created_at DESC)
  `);

  if (vectorEnabled) {
    await client.query(`
      CREATE INDEX IF NOT EXISTS conversation_messages_embedding_idx
      ON conversation_messages
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS agent_memories_embedding_idx
      ON agent_memories
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
  }
}

async function init() {
  if (!hasDbConfig) {
    console.warn('[db] No database configuration detected. Skipping schema init (in-memory mode).');
    vectorEnabled = false;
    databaseAvailable = false;
    return;
  }

  const client = await pool.connect();
  try {
    await ensureSchema(client);
    console.info('[db] Connected and schema ensured');
  } catch (error) {
    if (schemaPermissionCodes.has(error.code)) {
      disableDatabase('Insufficient privileges to manage database schema');
      return;
    }
    console.error('[db] Failed to initialize schema', error);
    throw error;
  } finally {
    client.release();
  }
}

if (hasDbConfig) {
  pool = new Pool(poolConfig);
} else {
  pool = createDisabledPool();
}

const ready = init().catch((error) => {
  // If initialization failed and we haven't already disabled the DB, log once and keep promise resolved
  if (!schemaPermissionCodes.has(error.code || '')) {
    console.error('[db] Initialization error', error);
  }
});

export { pool, ready };
export const VECTOR_DIMENSION = DEFAULT_VECTOR_DIMENSION;
export function isVectorStoreEnabled() {
  return vectorEnabled && databaseAvailable;
}
export function isDatabaseConfigured() {
  return databaseAvailable;
}
