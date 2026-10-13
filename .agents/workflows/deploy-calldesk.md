---
name: deploy-calldesk
description: Fast, resilient deployment of CallDesk (Vistara Whitelabel Platform) to production VPS (ssh vistara) with memory guards, automatic DB migrations, GitHub sync, and PM2 restart.
---

# Deploy CallDesk Production Platform Workflow

This workflow executes high-speed, zero-downtime deployments of the CallDesk voice calling white-label platform to the production VPS server.

## Production Specs & Environment
- **SSH Target**: `vistara` (`ssh vistara`)
- **Remote Directory**: `/var/www/vistara`
- **PM2 Process**: `vistara` (Port 4000)
- **Live Domain**: `https://calldesk.vistaraai.in`
- **Reverse Proxy**: Nginx listening on port 443 with SSL -> proxying `http://127.0.0.1:4000`
- **Database**: Local MySQL on VPS (`vistara_whitelabel`)
- **VPS Memory Guard**: `NODE_OPTIONS="--max-old-space-size=1536"` (strictly required due to VPS RAM allocation)

---

## Fast-Track Runbook

### Step 1: Lightweight Pre-Deploy Verification (~10 seconds)
Before deploying, run quick validation checks locally to ensure compilation integrity:

1. **TypeScript Type Safety**:
   ```powershell
   npx tsc --noEmit
   ```
   *Must report 0 errors.*

2. **Lint & Code Integrity**:
   ```powershell
   npm run lint
   ```
   *Must report 0 errors.*

---

### Step 2: Commit Working Tree
1. Check changed files:
   ```powershell
   git status
   ```
2. Stage and commit:
   ```powershell
   git add -A
   git commit -m "feat: <clear summary of changes>"
   ```
*(Note: Do NOT manually push to GitHub first â€” `npm run deploy` handles both GitHub and VPS synchronization automatically in Step 3).*

---

### Step 3: Trigger 1-Command Deployment Pipeline
Execute the automated deployment script:
```powershell
npm run deploy
```

#### What `npm run deploy` Executes Automatically:
1. **GitHub Origin Push**: Synchronizes `main` to GitHub (`origin/main`).
2. **VPS Direct SSH Push**: Pushes directly to VPS git repo:
   ```powershell
   git push vistara:/var/www/vistara main:refs/heads/temp-deploy -f
   ```
3. **VPS Fast-Forward, Migrate & Build**:
   ```bash
   ssh vistara "cd /var/www/vistara && git checkout package-lock.json && git merge --ff-only temp-deploy && git branch -D temp-deploy && npm install --production=false && node --env-file=.env scripts/migrate-agent-builder.mjs && NODE_OPTIONS='--max-old-space-size=1536' npm run build && pm2 restart vistara"
   ```
4. **Automated Health Checks**: Queries both local port 4000 (`/login`) and live domain `https://calldesk.vistaraai.in/login` for `HTTP 200` or `HTTP 307`.

#### Fast Deployment Flags:
If you need to bypass origin push during rapid iteration or credential conflicts:
- **Skip GitHub origin push** (deploys directly to VPS over SSH):
  ```powershell
  powershell -ExecutionPolicy Bypass -File ./scripts/deploy-production.ps1 -SkipOriginPush
  ```
- **Skip DB Migration** (if database schema hasn't changed):
  ```powershell
  powershell -ExecutionPolicy Bypass -File ./scripts/deploy-production.ps1 -SkipDbMigrate
  ```

---

### Step 4: Verification
The deployment script prints status codes automatically. If manual verification is required:
```powershell
curl.exe -s -I https://calldesk.vistaraai.in/login
ssh vistara "pm2 status vistara"
```
Ensure `HTTP/2 200` or `HTTP/1.1 200` is returned and PM2 uptime is active.

---

## Troubleshooting & Known Edge Cases

### 1. GitHub Credential Collision (`Repository not found`)
- **Symptom**: `git push origin main` fails with `fatal: repository 'https://github.com/thedeepakgaurr/Vistara-Whitelabel.git/' not found`.
- **Cause**: Windows Git Credential Manager has another active token.
- **Fix**: Re-run deployment bypassing GitHub push:
  ```powershell
  powershell -ExecutionPolicy Bypass -File ./scripts/deploy-production.ps1 -SkipOriginPush
  ```

### 2. VPS Out Of Memory during Build
- **Symptom**: Build fails on VPS with `JavaScript heap out of memory`.
- **Cause**: High concurrency of multiple node processes on VPS.
- **Fix**: The script enforces `NODE_OPTIONS='--max-old-space-size=1536'`. You can inspect available VPS RAM with:
  ```powershell
  ssh vistara "free -m"
  ```

### 3. Inspecting Remote Logs
To inspect real-time CallDesk server logs if PM2 reports an error:
```powershell
ssh vistara "pm2 logs vistara --lines 40"
```
