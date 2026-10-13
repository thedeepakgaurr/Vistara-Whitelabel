// Migration script to update agents table and add index to calls table
// Usage: node --env-file=.env scripts/migrate-agent-builder.mjs

import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vistara_whitelabel',
  });

  console.log('Running agent builder schema migration...');

  // Helper to check if a column exists
  async function hasColumn(table, column) {
    const [rows] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  // Helper to check if an index exists
  async function hasIndex(table, indexName) {
    const [rows] = await conn.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [table, indexName]
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  const columns = [
    { name: 'language', sql: `ALTER TABLE agents ADD COLUMN language VARCHAR(50) NOT NULL DEFAULT 'Hindi'` },
    { name: 'calling_method', sql: `ALTER TABLE agents ADD COLUMN calling_method VARCHAR(30) NOT NULL DEFAULT 'traditional'` },
    { name: 'voice', sql: `ALTER TABLE agents ADD COLUMN voice VARCHAR(50) NOT NULL DEFAULT 'meera'` },
    { name: 'first_message', sql: `ALTER TABLE agents ADD COLUMN first_message TEXT DEFAULT NULL` },
    { name: 'system_instruction', sql: `ALTER TABLE agents ADD COLUMN system_instruction MEDIUMTEXT DEFAULT NULL` },
    { name: 'deliverables', sql: `ALTER TABLE agents ADD COLUMN deliverables JSON DEFAULT NULL` },
    { name: 'status', sql: `ALTER TABLE agents ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'` },
    { name: 'updated_at', sql: `ALTER TABLE agents ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` },
  ];

  for (const col of columns) {
    if (!(await hasColumn('agents', col.name))) {
      console.log(`Adding column: ${col.name} to agents table`);
      await conn.query(col.sql);
    } else {
      console.log(`Column ${col.name} already exists in agents table.`);
    }
  }

  if (!(await hasIndex('calls', 'calls_status_created_at_idx'))) {
    console.log(`Adding composite index calls_status_created_at_idx on calls(status, created_at)`);
    await conn.query(`ALTER TABLE calls ADD KEY calls_status_created_at_idx (status, created_at)`);
  } else {
    console.log(`Index calls_status_created_at_idx already exists.`);
  }

  console.log('Migration completed successfully.');
  await conn.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
