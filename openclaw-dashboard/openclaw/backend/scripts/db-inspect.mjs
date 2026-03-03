import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const config = {
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSL && process.env.PGSSL !== 'false' ? { rejectUnauthorized: false } : undefined
};

const client = new Client(config);

try {
  await client.connect();
  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log(result.rows);
} catch (error) {
  console.error('DB query failed', error);
} finally {
  await client.end();
}
