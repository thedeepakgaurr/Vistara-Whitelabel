// Applies scripts/schema.sql to the configured MySQL server.
// Usage: node --env-file=.env scripts/apply-schema.mjs
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = await readFile(path.join(__dirname, 'schema.sql'), 'utf8');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  await conn.query(sql);
  console.log('Schema applied successfully.');
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
