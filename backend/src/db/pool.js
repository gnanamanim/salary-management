import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

// A single shared pool for the whole app. Connection details come from DATABASE_URL.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected PG pool error', err);
});

/** Thin query helper so callers don't touch the pool directly. */
export function query(text, params) {
  return pool.query(text, params);
}

export async function closePool() {
  await pool.end();
}
