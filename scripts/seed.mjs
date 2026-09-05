// Creates (or updates) the platform-owner admin account.
// Usage: node --env-file=.env scripts/seed.mjs
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@platform.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Platform Admin';

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vistara_whitelabel',
  });

  const [existing] = await conn.query('SELECT id FROM users WHERE email = ? LIMIT 1', [ADMIN_EMAIL]);
  if (existing.length > 0) {
    console.log(`Admin already exists: ${ADMIN_EMAIL}`);
    await conn.end();
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const apiKey = `cd_live_${crypto.randomBytes(24).toString('hex')}`;

  await conn.query(
    `INSERT INTO users (email, password_hash, name, role, api_key, wallet_balance, rate_per_connected_minute, rate_per_unconnected_call, is_active)
     VALUES (?, ?, ?, 'admin', ?, 0, 0, 0, 1)`,
    [ADMIN_EMAIL, passwordHash, ADMIN_NAME, apiKey]
  );

  console.log('Admin account created:');
  console.log(`  email:    ${ADMIN_EMAIL}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);
  console.log('Change the password after first login.');

  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
