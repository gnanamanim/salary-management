import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool, closePool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  // eslint-disable-next-line no-console
  console.log('✅ Migration complete — schema applied.');
}

migrate()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('❌ Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(closePool);
