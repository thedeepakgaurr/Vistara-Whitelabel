param(
    [string]$RemoteHost = "vistara",
    [string]$RemoteDir = "/var/www/vistara",
    [string]$Branch = "main",
    [string]$Pm2Name = "vistara",
    [switch]$SkipOriginPush = $false,
    [switch]$SkipDbMigrate = $false
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Starting CallDesk Deployment to $RemoteHost" -ForegroundColor Cyan
Write-Host " Target Directory: $RemoteDir" -ForegroundColor Cyan
Write-Host " Live Domain: https://calldesk.vistaraai.in" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Check for uncommitted tracked changes
$status = git status --porcelain -uno
if ($status) {
    Write-Host "Warning: You have uncommitted changes in tracked files:" -ForegroundColor Yellow
    git status -s -uno
    $confirm = Read-Host "Proceed anyway with current committed HEAD? (y/n)"
    if ($confirm -ne 'y') {
        Write-Host "Aborted by user." -ForegroundColor Red
        exit 1
    }
}

# 2. Push commits to GitHub origin
if (-not $SkipOriginPush) {
    Write-Host "Pushing code to GitHub origin ($Branch)..." -ForegroundColor Cyan
    git push origin "$Branch"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to push to GitHub origin ($Branch). If credential collision occurred or origin is already synced, re-run with -SkipOriginPush." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Skipping push to GitHub origin (-SkipOriginPush active)..." -ForegroundColor Yellow
}

# 3. Push commits to VPS via Git SSH
Write-Host "Pushing code to $RemoteHost ($RemoteDir)..." -ForegroundColor Cyan
git push "${RemoteHost}:${RemoteDir}" "${Branch}:refs/heads/temp-deploy" -f
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to push to VPS over SSH." -ForegroundColor Red
    exit 1
}

# 4. Merge, install dependencies, run migrations, build Next.js, and restart PM2 on VPS
Write-Host "Merging, installing deps, building Next.js, and restarting PM2 on VPS..." -ForegroundColor Cyan

$migrateCmd = if (-not $SkipDbMigrate) { "node --env-file=.env scripts/migrate-agent-builder.mjs && " } else { "" }

$remoteScript = "cd $RemoteDir && " +
    "git checkout package-lock.json && " +
    "git merge --ff-only temp-deploy && " +
    "git branch -D temp-deploy && " +
    "npm install --production=false && " +
    $migrateCmd +
    "NODE_OPTIONS='--max-old-space-size=1536' npm run build && " +
    "pm2 restart $Pm2Name && " +
    "sleep 2"

ssh $RemoteHost "$remoteScript"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Remote build or PM2 restart failed on VPS." -ForegroundColor Red
    exit 1
}

# 5. Verification & Health Checks
Write-Host "Running health checks..." -ForegroundColor Cyan
$httpCodeLocal = ssh $RemoteHost "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/login"
$httpCodeLive = ssh $RemoteHost "curl -s -o /dev/null -w '%{http_code}' https://calldesk.vistaraai.in/login"

if ($httpCodeLocal -eq "200" -or $httpCodeLocal -eq "307" -or $httpCodeLocal -eq "302") {
    Write-Host "Local VPS server healthy (HTTP $httpCodeLocal on port 4000)" -ForegroundColor Green
} else {
    Write-Host "Local port returned HTTP $httpCodeLocal" -ForegroundColor Yellow
}

if ($httpCodeLive -eq "200" -or $httpCodeLive -eq "307" -or $httpCodeLive -eq "302") {
    Write-Host "Live domain online (HTTP $httpCodeLive on https://calldesk.vistaraai.in)" -ForegroundColor Green
} else {
    Write-Host "Live domain returned HTTP $httpCodeLive" -ForegroundColor Yellow
}

Write-Host "==========================================" -ForegroundColor Green
Write-Host " CallDesk Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
