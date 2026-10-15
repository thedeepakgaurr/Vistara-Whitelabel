# Rule: Bidirectional Production Database & Schema Synchronization

## Principle
The repository reference schema file (`scripts/schema.sql`) and the live production database (`vistara_whitelabel` on the `vistara` VPS) must always remain 100% in sync. Neither must ever drift from the other.

---

## 1. When Modifying Production Database First
Whenever any table, column, index, constraint, default value, or data type is modified, added, or dropped in the production MySQL database:
1. **Update `scripts/schema.sql` immediately**:
   - Add/modify the corresponding table definitions, columns, default values, and indexes.
   - Preserve SQL formatting, comments, table constraints, and foreign key definitions.
2. **Update TypeScript Definitions**:
   - Update corresponding interfaces in `src/types/index.ts` (e.g., `UserRow`, `AgentRow`, `CampaignRow`, `CallRow`, `WalletTransactionRow`).
3. **Verify Parity**:
   - Verify that `DESCRIBE <table>` on production matches the definitions in `scripts/schema.sql`.

---

## 2. When Modifying `scripts/schema.sql` First
Whenever `scripts/schema.sql` is updated to add or change tables, columns, data types, or indexes:
1. **Apply Migration to Production**:
   - Apply non-destructive `ALTER TABLE` / `CREATE TABLE` commands directly to the production database via `ssh vistara` or provide/run an idempotent migration script (e.g., `scripts/migrate-*.mjs`).
2. **Safety & Zero Data Loss**:
   - Never run destructive operations (`DROP TABLE`, `DROP COLUMN`) against production without explicit user confirmation.
   - Always run pre-flight checks (`INFORMATION_SCHEMA.COLUMNS` or `IF NOT EXISTS`) before applying alterations.
3. **Verification**:
   - Check `SHOW CREATE TABLE <table>` or `DESCRIBE <table>` on production after execution to confirm clean application.

---

## 3. Associated Tenant Awareness
- While `vistara_whitelabel` is the primary platform database, keep tenant databases (`hindischool_whitelabel`, `kohinoor_whitelabel`) in mind when core whitelabel engine capabilities (like agent builder or call structures) are upgraded.
