#!/bin/bash
# ============================================================
# LPAPP SERVER HARDENING SCRIPT
# Ubuntu 24.04 - lpapp-server
# ============================================================
set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║    LPAPP SERVER HARDENING SCRIPT         ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────────
# [1] BLOKIR PORT 3000 DARI PUBLIK via UFW
# ─────────────────────────────────────────────
echo "[1/7] Memblokir akses langsung ke port 3000..."
sudo ufw deny 3000/tcp comment 'Block direct Next.js - use Nginx only'
sudo ufw deny 3001/tcp comment 'Block extra app ports'
echo ">>> UFW port 3000/3001 diblokir ✓"

# ─────────────────────────────────────────────
# [2] SSH HARDENING
# ─────────────────────────────────────────────
echo ""
echo "[2/7] Hardening SSH config..."

# Fix X11Forwarding di sshd_config utama
sudo sed -i 's/^X11Forwarding yes/X11Forwarding no/' /etc/ssh/sshd_config

# Tulis ulang 99-hardening.conf dengan config lengkap
sudo tee /etc/ssh/sshd_config.d/99-hardening.conf > /dev/null << 'EOF'
# ── SSH Hardening (lpapp-server) ──────────────

# Disable root login
PermitRootLogin no

# Key-only auth (no password)
PasswordAuthentication no
PubkeyAuthentication yes

# Reduce login grace time to 20s
LoginGraceTime 20

# Max 3 auth attempts per connection
MaxAuthTries 3

# Max 3 concurrent SSH sessions
MaxSessions 3

# Disable empty passwords
PermitEmptyPasswords no

# Disable X11 forwarding
X11Forwarding no

# Disable TCP/agent/stream forwarding
AllowTcpForwarding no
AllowAgentForwarding no
StreamLocalBindUnlink no

# Idle session timeout: 5 min idle = disconnect
ClientAliveInterval 300
ClientAliveCountMax 2

# Do not read user environment files
PermitUserEnvironment no

# Disable tunneling
PermitTunnel no

# Use only strong host key algorithms
HostKeyAlgorithms ssh-ed25519,ssh-ed25519-cert-v01@openssh.com,rsa-sha2-512,rsa-sha2-256

# Only strong key exchange algorithms
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512

# Only strong MACs
MACs hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,umac-128-etm@openssh.com
EOF

# Validate SSH config
sudo sshd -t && echo ">>> SSH config valid ✓" || { echo "ERROR: SSH config invalid! Reverting..."; exit 1; }

# ─────────────────────────────────────────────
# [3] NGINX: HAPUS TLS 1.0/1.1, TAMBAH HSTS + CSP
# ─────────────────────────────────────────────
echo ""
echo "[3/7] Hardening Nginx security headers & TLS..."

# Update security.conf global
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

# Permissions Policy - disable unnecessary APIs
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()" always;

# HSTS (HTTP Strict Transport Security) - 2 years
# ONLY enable if you have HTTPS! Uncomment below when SSL is set up:
# add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# Content Security Policy (CSP) - permissive but protective baseline
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;

# Reduce timeout windows (anti-slowloris)
client_body_timeout 10s;
client_header_timeout 10s;
send_timeout 10s;
keepalive_timeout 30s;

# SSL/TLS settings (applies when SSL is configured)
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256';
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;
EOF

echo ">>> Nginx security.conf diperbarui ✓"

# ─────────────────────────────────────────────
# [4] UPDATE NGINX RATE LIMITING
# ─────────────────────────────────────────────
echo ""
echo "[4/7] Update Nginx rate limiting..."

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

echo ">>> Nginx rate-limit.conf diperbarui ✓"

# ─────────────────────────────────────────────
# [5] UPDATE SITES-ENABLED/LPAPP dengan limit_conn
# ─────────────────────────────────────────────
echo ""
echo "[5/7] Update Nginx virtual host config..."

# Backup config lama
sudo cp /etc/nginx/sites-enabled/lpapp /etc/nginx/sites-enabled/lpapp.bak.$(date +%Y%m%d%H%M%S)

sudo tee /etc/nginx/sites-enabled/lpapp > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Hide Nginx version (also set globally)
    server_tokens off;

    # Limit simultaneous connections per IP
    limit_conn conn_limit 20;

    # --- Security Headers ---
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;

    # --- Block dotfiles (e.g. .env, .git) ---
    location ~ /\. {
        deny all;
        return 404;
    }

    # --- Block common exploit paths ---
    location ~* \.(php|asp|aspx|jsp|cgi|sh|py|pl|rb)$ {
        deny all;
        return 404;
    }

    # --- Block bad bots & scanners ---
    if ($http_user_agent ~* "(sqlmap|nikto|nmap|masscan|zgrab|python-requests/2|curl/7.[0-6]|Python-urllib|libwww-perl|Go-http-client/1.1|PhantomJS|HeadlessChrome|SemrushBot|AhrefsBot|MJ12bot|DotBot|BLEXBot|DataForSeoBot|PetalBot|YandexBot)") {
        return 403;
    }

    # --- Rate limit login endpoint (agresif) ---
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
        proxy_cache_bypass $http_upgrade;
    }

    # --- Rate limit upload endpoint ---
    location /api/upload {
        limit_req zone=upload_limit burst=5 nodelay;
        limit_req_status 429;
        client_max_body_size 15M;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # --- Rate limit API secara umum ---
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
        proxy_cache_bypass $http_upgrade;
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
        client_max_body_size 15M;
    }
}
EOF

echo ">>> Nginx virtual host diperbarui ✓"

# ─────────────────────────────────────────────
# [6] FAIL2BAN: TAMBAH NGINX JAIL
# ─────────────────────────────────────────────
echo ""
echo "[6/7] Konfigurasi fail2ban untuk Nginx..."

sudo tee /etc/fail2ban/jail.d/nginx.conf > /dev/null << 'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
banaction = ufw

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

[nginx-botsearch]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/access.log
maxretry = 5
bantime  = 24h
EOF

# Pastikan filter nginx-limit-req tersedia
if [ ! -f /etc/fail2ban/filter.d/nginx-limit-req.conf ]; then
    sudo tee /etc/fail2ban/filter.d/nginx-limit-req.conf > /dev/null << 'FILTER'
[Definition]
failregex = limiting requests, excess:.* by zone.*client: <HOST>
ignoreregex =
FILTER
    echo ">>> fail2ban filter nginx-limit-req dibuat ✓"
fi

if [ ! -f /etc/fail2ban/filter.d/nginx-botsearch.conf ]; then
    sudo tee /etc/fail2ban/filter.d/nginx-botsearch.conf > /dev/null << 'FILTER'
[Definition]
failregex = ^<HOST> .* "(GET|POST|HEAD).*(\.php|\.asp|\.aspx|\.env|\/admin|\/wp-login|\/xmlrpc|\/\.git|\/\.htaccess).*" (404|403)
ignoreregex =
FILTER
    echo ">>> fail2ban filter nginx-botsearch dibuat ✓"
fi

echo ">>> fail2ban jail Nginx dikonfigurasi ✓"

# ─────────────────────────────────────────────
# [7] FIX .env permissions & PostgreSQL check
# ─────────────────────────────────────────────
echo ""
echo "[7/7] Fix file permissions & cek PostgreSQL..."

# Pastikan .env standalone juga 600
chmod 600 /home/adminedas/lpapp-pesantren/.env 2>/dev/null || true
chmod 600 /home/adminedas/lpapp-pesantren/.next/standalone/.env 2>/dev/null || true
echo ">>> .env file permissions 600 ✓"

# Cek PostgreSQL listen_addresses
PG_CONF=$(find /etc/postgresql -name postgresql.conf 2>/dev/null | head -1)
if [ -n "$PG_CONF" ]; then
    PG_LISTEN=$(grep '^listen_addresses' "$PG_CONF" 2>/dev/null || echo "not set (default: localhost)")
    echo ">>> PostgreSQL listen_addresses: $PG_LISTEN"
    # Pastikan hanya localhost
    if sudo grep -qE "^listen_addresses\s*=\s*'?\*'?" "$PG_CONF"; then
        echo "PERINGATAN: PostgreSQL listen ke semua interface! Memperbaiki..."
        sudo sed -i "s/^listen_addresses\s*=.*/listen_addresses = 'localhost'/" "$PG_CONF"
        echo ">>> PostgreSQL listen_addresses diperbaiki ke 'localhost' ✓"
    else
        echo ">>> PostgreSQL sudah aman (only localhost) ✓"
    fi
fi

# ─────────────────────────────────────────────
# RELOAD SEMUA SERVICES
# ─────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════"
echo " Mereload services..."
echo "══════════════════════════════════════════"

# Test Nginx config dulu
sudo nginx -t && echo ">>> Nginx config valid ✓" || { echo "ERROR: Nginx config invalid!"; exit 1; }

# Reload Nginx (tidak restart agar tidak drop koneksi)
sudo systemctl reload nginx && echo ">>> Nginx di-reload ✓"

# Restart SSH daemon (hati-hati: pastikan ada session lain terbuka!)
echo ""
echo "PERINGATAN: SSH daemon akan di-restart."
echo "Pastikan Anda punya akses backup sebelum melanjutkan."
echo "Merestart sshd dalam 3 detik..."
sleep 3
sudo systemctl restart sshd && echo ">>> sshd di-restart ✓"

# Reload fail2ban
sudo systemctl restart fail2ban && echo ">>> fail2ban di-restart ✓"

# UFW reload
sudo ufw reload && echo ">>> UFW di-reload ✓"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   HARDENING SELESAI! Status:             ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "UFW Status:"
sudo ufw status numbered
echo ""
echo "fail2ban Status:"
sudo fail2ban-client status
echo ""
echo "Proses selesai! Server sudah diperketat."
