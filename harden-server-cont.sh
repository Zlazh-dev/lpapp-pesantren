#!/bin/bash
# ============================================================
# LPAPP SERVER HARDENING - CONTINUATION (Step 3–7)
# Fix: hapus ssl_ directives dari security.conf (sudah di nginx.conf)
# ============================================================
set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  HARDENING LANJUTAN (Step 3-7)           ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────────
# [3] FIX NGINX security.conf (tanpa ssl_ duplikat)
# ─────────────────────────────────────────────
echo "[3/7] Fix Nginx security.conf (hapus ssl_ yang duplikat)..."

sudo tee /etc/nginx/conf.d/security.conf > /dev/null << 'EOF'
# ── Nginx Global Security Config (lpapp-server) ──

# Hide Nginx version
server_tokens off;

# Prevent clickjacking
add_header X-Frame-Options "SAMEORIGIN" always;

# Prevent MIME sniffing
add_header X-Content-Type-Options "nosniff" always;

# XSS Protection (legacy browsers)
add_header X-XSS-Protection "1; mode=block" always;

# Referrer Policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Permissions Policy - disable unnecessary browser APIs
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()" always;

# Reduce timeout windows (anti-slowloris)
client_body_timeout 10s;
client_header_timeout 10s;
send_timeout 10s;
keepalive_timeout 30s;
EOF

echo ">>> security.conf diperbaiki ✓"

# ─────────────────────────────────────────────
# [4] Re-apply rate-limit.conf (sudah OK, tulis ulang untuk pastikan)
# ─────────────────────────────────────────────
echo ""
echo "[4/7] Verify rate-limit.conf..."

sudo tee /etc/nginx/conf.d/rate-limit.conf > /dev/null << 'EOF'
# ── Nginx Rate Limiting Zones (lpapp-server) ──

# Login endpoint: 5 req/menit per IP
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

# API umum: 60 req/menit per IP
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=60r/m;

# Upload endpoint: 10 req/menit per IP
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=10r/m;

# Koneksi bersamaan per IP
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# Log level untuk rate limit
limit_req_log_level warn;
limit_conn_log_level warn;
EOF

echo ">>> rate-limit.conf OK ✓"

# ─────────────────────────────────────────────
# [5] UPDATE sites-enabled/lpapp
# ─────────────────────────────────────────────
echo ""
echo "[5/7] Update Nginx virtual host (sites-enabled/lpapp)..."

# Backup dulu
sudo cp /etc/nginx/sites-enabled/lpapp /etc/nginx/sites-enabled/lpapp.bak.$(date +%Y%m%d%H%M%S) 2>/dev/null || true

sudo tee /etc/nginx/sites-enabled/lpapp > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Hide Nginx version
    server_tokens off;

    # Limit simultaneous connections per IP (anti-DDoS)
    limit_conn conn_limit 20;

    # Max upload size
    client_max_body_size 15M;

    # --- Security Headers ---
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;

    # --- Block dotfiles (.env, .git, .htaccess, dll) ---
    location ~ /\. {
        deny all;
        return 404;
    }

    # --- Block script file extensions ---
    location ~* \.(php|asp|aspx|jsp|cgi|sh|rb|pl)$ {
        deny all;
        return 404;
    }

    # --- Block bad bots & scanners ---
    if ($http_user_agent ~* "(sqlmap|nikto|nmap|masscan|zgrab|python-requests/2\.[0-7]|libwww-perl|Go-http-client/1\.1|PhantomJS|HeadlessChrome|SemrushBot|AhrefsBot|MJ12bot|DotBot|BLEXBot|DataForSeoBot|PetalBot|YandexBot)") {
        return 403;
    }

    # --- Rate limit: Login endpoint (agresif) ---
    location /api/auth {
        limit_req zone=login_limit burst=3 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # --- Rate limit: Upload endpoint ---
    location /api/upload {
        limit_req zone=upload_limit burst=5 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # --- Rate limit: API umum ---
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # --- Proxy utama ke Next.js ---
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

echo ">>> sites-enabled/lpapp diperbarui ✓"

# Test Nginx config
sudo nginx -t && echo ">>> Nginx config VALID ✓" || { echo "ERROR: Nginx config invalid!"; exit 1; }

# ─────────────────────────────────────────────
# [6] FAIL2BAN NGINX JAIL
# ─────────────────────────────────────────────
echo ""
echo "[6/7] Konfigurasi fail2ban Nginx jail..."

sudo tee /etc/fail2ban/jail.d/nginx.conf > /dev/null << 'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled  = true
port     = ssh
maxretry = 3
bantime  = 24h

[nginx-http-auth]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/error.log
maxretry = 5

[nginx-limit-req]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/error.log
maxretry = 10
findtime = 2m
bantime  = 30m
EOF

# Buat filter nginx-limit-req kalau belum ada
if [ ! -f /etc/fail2ban/filter.d/nginx-limit-req.conf ]; then
    sudo tee /etc/fail2ban/filter.d/nginx-limit-req.conf > /dev/null << 'FILTER'
[Definition]
failregex = limiting requests, excess:.* by zone.*client: <HOST>
ignoreregex =
FILTER
fi

echo ">>> fail2ban Nginx jail dikonfigurasi ✓"

# ─────────────────────────────────────────────
# [7] FILE PERMISSIONS & POSTGRESQL CHECK
# ─────────────────────────────────────────────
echo ""
echo "[7/7] Fix file permissions & PostgreSQL check..."

chmod 600 /home/adminedas/lpapp-pesantren/.env 2>/dev/null && echo ">>> .env permission 600 ✓" || echo "(skip: .env tidak ditemukan)"
chmod 600 /home/adminedas/lpapp-pesantren/.next/standalone/.env 2>/dev/null && echo ">>> standalone .env permission 600 ✓" || echo "(skip)"

# Cek PostgreSQL listen_addresses
PG_CONF=$(find /etc/postgresql -name postgresql.conf 2>/dev/null | head -1)
if [ -n "$PG_CONF" ]; then
    echo ">>> PostgreSQL config: $PG_CONF"
    PG_LISTEN=$(sudo grep -E "^listen_addresses" "$PG_CONF" 2>/dev/null || echo "default (localhost)")
    echo ">>> PostgreSQL listen: $PG_LISTEN"
    if sudo grep -qE "^listen_addresses\s*=\s*['\"]?\*['\"]?" "$PG_CONF" 2>/dev/null; then
        sudo sed -i "s/^listen_addresses\s*=.*/listen_addresses = 'localhost'/" "$PG_CONF"
        echo ">>> PostgreSQL diperbaiki → localhost only ✓"
    else
        echo ">>> PostgreSQL sudah aman ✓"
    fi
fi

# ─────────────────────────────────────────────
# RELOAD SEMUA SERVICES
# ─────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════"
echo " Reloading services..."
echo "══════════════════════════════════════════"

sudo systemctl reload nginx && echo ">>> Nginx reloaded ✓"
sudo systemctl restart fail2ban && echo ">>> fail2ban restarted ✓"
sudo ufw reload && echo ">>> UFW reloaded ✓"

echo ""
echo "══════════════════════════════════════════"
echo " Merestart sshd (tunggu sebentar)..."
echo "══════════════════════════════════════════"
sleep 2
sudo systemctl restart sshd && echo ">>> sshd restarted ✓"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   HARDENING SELESAI! ✓                   ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "=== UFW STATUS ==="
sudo ufw status numbered
echo ""
echo "=== FAIL2BAN STATUS ==="
sudo fail2ban-client status
echo ""
echo "Server sudah diperketat! Semua celah ditutup."
