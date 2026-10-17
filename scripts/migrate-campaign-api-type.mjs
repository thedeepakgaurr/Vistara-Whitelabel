// Migration script to update campaigns, calls, and create api_rate_limits & webhook_delivery_logs
// Usage: node --env-file=.env scripts/migrate-campaign-api-type.mjs

import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vistara_whitelabel',
  });

  console.log('Running API Campaign & Rate Limit schema migration...');

  async function hasColumn(table, column) {
    const [rows] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  async function hasIndex(table, indexName) {
    const [rows] = await conn.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [table, indexName]
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  async function hasTable(table) {
    const [rows] = await conn.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table]
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  // 1. Add type to campaigns
  if (!(await hasColumn('campaigns', 'type'))) {
    console.log('Adding column: type to campaigns table');
    await conn.query(`ALTER TABLE campaigns ADD COLUMN type VARCHAR(30) NOT NULL DEFAULT 'csv'`);
  } else {
    console.log('Column type already exists in campaigns table.');
  }

  // 2. Add webhook_url to campaigns
  if (!(await hasColumn('campaigns', 'webhook_url'))) {
    console.log('Adding column: webhook_url to campaigns table');
    await conn.query(`ALTER TABLE campaigns ADD COLUMN webhook_url VARCHAR(1000) DEFAULT NULL`);
  } else {
    console.log('Column webhook_url already exists in campaigns table.');
  }

  // 3. Add idempotency_key to calls
  if (!(await hasColumn('calls', 'idempotency_key'))) {
    console.log('Adding column: idempotency_key to calls table');
    await conn.query(`ALTER TABLE calls ADD COLUMN idempotency_key VARCHAR(128) DEFAULT NULL`);
  } else {
    console.log('Column idempotency_key already exists in calls table.');
  }

  // 4. Add unique index for idempotency_key
  if (!(await hasIndex('calls', 'calls_idempotency_key_unique'))) {
    console.log('Adding unique key calls_idempotency_key_unique on calls(idempotency_key)');
    await conn.query(`ALTER TABLE calls ADD UNIQUE KEY calls_idempotency_key_unique (idempotency_key)`);
  } else {
    console.log('Index calls_idempotency_key_unique already exists.');
  }

  // 5. Create api_rate_limits table
  if (!(await hasTable('api_rate_limits'))) {
    console.log('Creating table: api_rate_limits');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS api_rate_limits (
        user_id INT NOT NULL,
        window_start INT NOT NULL,
        request_count INT NOT NULL DEFAULT 1,
        PRIMARY KEY (user_id, window_start),
        CONSTRAINT api_rate_limits_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } else {
    console.log('Table api_rate_limits already exists.');
  }

  // 6. Create webhook_delivery_logs table
  if (!(await hasTable('webhook_delivery_logs'))) {
    console.log('Creating table: webhook_delivery_logs');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
        id INT NOT NULL AUTO_INCREMENT,
        call_id INT NOT NULL,
        campaign_id INT NOT NULL,
        webhook_url VARCHAR(1000) NOT NULL,
        attempt TINYINT NOT NULL DEFAULT 1,
        status_code SMALLINT DEFAULT NULL,
        delivered TINYINT(1) NOT NULL DEFAULT 0,
        error_message VARCHAR(500) DEFAULT NULL,
        attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY wdl_call_id_idx (call_id),
        KEY wdl_campaign_id_idx (campaign_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } else {
    console.log('Table webhook_delivery_logs already exists.');
  }

  console.log('API Campaign & Rate Limit migration completed successfully.');
  await conn.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
