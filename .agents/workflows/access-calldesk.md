---
name: access-calldesk
description: Direct inspection, live log analysis, service diagnostics, and production MySQL database operations for CallDesk on VPS (ssh vistara).
---

# Access CallDesk VPS & Production Database Workflow

Use this workflow whenever you need to inspect the live CallDesk application, view real-time PM2 logs, check system health, or query/modify the production MySQL database on the VPS.

---

## Production Host & Environment Specifications

- **SSH Target**: `vistara` (`ssh vistara`)
- **Remote Project Directory**: `/var/www/vistara`
- **PM2 Service Name**: `vistara` (Port `4000`)
- **Live Platform Domain**: `https://calldesk.vistaraai.in`
- **Reverse Proxy**: Nginx with SSL (`/etc/nginx/sites-available/vistara`)
- **Production Database**: MySQL (`vistara_whitelabel`) accessed via local socket with `sudo mysql vistara_whitelabel`
- **Tenant Databases**: `hindischool_whitelabel`, `kohinoor_whitelabel`

---

## 1. Production Database Operations

### Connect & Query Live Database
Run queries non-interactively using `sudo mysql`:
```bash
# Execute a custom SQL query
ssh vistara "sudo mysql vistara_whitelabel -e 'SELECT * FROM users LIMIT 5;'"

# View table status and row counts
ssh vistara "sudo mysql vistara_whitelabel -e 'SELECT TABLE_NAME, TABLE_ROWS FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = \"vistara_whitelabel\";'"
```

### Check & Compare Table Schema
```bash
# Describe a specific table
ssh vistara "sudo mysql vistara_whitelabel -e 'DESCRIBE calls;'"

# View exact CREATE TABLE definition
ssh vistara "sudo mysql vistara_whitelabel -e 'SHOW CREATE TABLE agents\G'"
```

### Create a Safe Database Backup
Always generate a timestamped dump before running manual schema alterations:
```bash
ssh vistara "sudo mysqldump vistara_whitelabel | gzip > /home/ubuntu/vistara_whitelabel_\$(date +%Y%m%d_%H%M%S).sql.gz"
```

### Apply Migrations & Maintain Parity
> [!IMPORTANT]
> In accordance with `.agents/rules/db-schema-sync.md`:
> - Always update `scripts/schema.sql` and `src/types/index.ts` whenever the production DB schema changes.
> - Never execute destructive operations (`DROP`) without explicit confirmation.
> - Prefer idempotent scripts:
> ```bash
> ssh vistara "cd /var/www/vistara && node scripts/migrate-agent-builder.mjs"
> ```

---

## 2. Application & PM2 Health Diagnostics

### Check Process Status & Metrics
```bash
# View process status, memory, uptime, and restart count
ssh vistara "pm2 describe vistara"

# Check system memory and swap utilization
ssh vistara "free -h"

# Check disk space
ssh vistara "df -h /"
```

### View Live Logs
```bash
# View last 100 log lines without streaming/blocking
ssh vistara "pm2 logs vistara --lines 100 --nostream"

# View error log exclusively
ssh vistara "tail -n 50 /home/ubuntu/.pm2/logs/vistara-error.log"
```

### Restart Application Gracefully
```bash
ssh vistara "pm2 restart vistara"
```

---

## 3. Web Server & Proxy Diagnostics

### Inspect Nginx Configuration & Syntax
```bash
# Test Nginx syntax
ssh vistara "sudo nginx -t"

# Reload Nginx (zero downtime)
ssh vistara "sudo systemctl reload nginx"
```

### Check HTTP & SSL Response
```bash
# Verify headers on live domain
ssh vistara "curl -I -s https://calldesk.vistaraai.in | head -n 10"
```

---

## 4. Tenant Cross-Inspection (When Needed)

If an issue spans multiple white-label tenants on the same VPS:
- **HindiSchool**: Directory `/var/www/hindischool`, Port `4001`, DB `hindischool_whitelabel`
- **Kohinoor Automation**: Directory `/var/www/kohinoor-automation`, Port `4002`, DB `kohinoor_whitelabel`
- **Vistara AI Website**: Directory `/var/www/vistara-website`, Port `3001`
