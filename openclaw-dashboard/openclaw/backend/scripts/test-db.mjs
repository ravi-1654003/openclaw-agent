import '../src/loadEnv.js';
import { pool, ready, isVectorStoreEnabled } from '../src/db/client.js';

async function main() {
  try {
    await ready;
    const ping = await pool.query(
      'SELECT current_database() AS database, current_user AS user, version() AS version, NOW() AS now'
    );
    console.log('✅ Database connection successful');
    console.table(ping.rows);

    const vectorEnabled = isVectorStoreEnabled();
    console.log(`\nVector store enabled: ${vectorEnabled}`);

    const embeddingColumn = await pool.query(`
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'conversation_messages'
        AND column_name = 'embedding'
    `);
    console.log('\nconversation_messages.embedding column info:');
    console.table(embeddingColumn.rows);

    const memoryColumn = await pool.query(`
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'agent_memories'
        AND column_name = 'embedding'
    `);
    console.log('\nagent_memories.embedding column info:');
    console.table(memoryColumn.rows);

    const latestMessages = await pool.query(`
      SELECT id, role, LEFT(content, 80) AS content_snippet,
             pg_typeof(embedding) AS embedding_type,
             embedding IS NOT NULL AS has_embedding,
             created_at
      FROM conversation_messages
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log('\nLatest conversation messages:');
    console.table(latestMessages.rows);
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
