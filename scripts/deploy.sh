#!/bin/bash
# deploy.sh — Safe deploy script for lpapp on VPS
# Run from: /home/adminedas/lpapp-pesantren/
# Usage: bash scripts/deploy.sh

set -e  # Stop on any error

APP_DIR="/home/adminedas/lpapp-pesantren"
UPLOAD_DIR="/home/adminedas/uploads"
LOG_DIR="/home/adminedas/logs"

echo "[deploy] Starting deployment at $(date)"

# 1. Ensure persistent directories exist with correct permissions
echo "[deploy] Ensuring persistent directories..."
mkdir -p "$UPLOAD_DIR/photo" "$UPLOAD_DIR/kk" "$UPLOAD_DIR/logo"
mkdir -p "$LOG_DIR"
chmod -R 755 "$UPLOAD_DIR"

# 2. Pull latest code
echo "[deploy] Pulling latest code..."
cd "$APP_DIR"
git pull origin master

# 3. Install dependencies (only if package.json changed)
echo "[deploy] Installing dependencies..."
npm ci --omit=dev

# 4. Build app
echo "[deploy] Building..."
npm run build

# 5. Reload PM2 (graceful reload — zero downtime)
#    If ecosystem.config.js exists, use it; otherwise restart all
echo "[deploy] Reloading PM2..."
if [ -f "$APP_DIR/ecosystem.config.js" ]; then
    pm2 reload ecosystem.config.js --update-env
else
    pm2 restart all --update-env
fi

# 6. Save PM2 process list (so it survives reboots)
pm2 save

echo "[deploy] ✅ Deployment complete at $(date)"
echo "[deploy] App status:"
pm2 status
