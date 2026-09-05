#!/bin/bash
set -e
cd /var/www/vistara

echo "📥 Pulling latest code..."
git pull

echo "📦 Installing new dependencies (if any)..."
npm install --production=false

echo "🏗️ Building Next.js..."
NODE_OPTIONS="--max-old-space-size=1536" npm run build

echo "🔄 Restarting application..."
pm2 restart vistara

echo "✅ Done! Latest changes are live."

