import { pool, ready } from './client.js';

export async function insertContact({ name, email, phone = null }) {
  await ready;
  const result = await pool.query(
    `INSERT INTO contacts (name, email, phone)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, email, phone || null]
  );
  return result.rows[0];
}

export async function listContacts(limit = 100) {
  await ready;
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const result = await pool.query(
    `SELECT * FROM contacts
     ORDER BY created_at DESC
     LIMIT $1`,
    [safeLimit]
  );
  return result.rows;
}
