#!/bin/bash
# lpapp Security Hardening Script
# Server: Ubuntu 24.04 (serverlp3ia)
# Run as: bash /tmp/harden.sh

set -e

echo "============================================"
echo " lpapp Server Security Hardening"
echo " $(date)"
echo "============================================"

# ─── 1. UPDATE SYSTEM ───────────────────────────
echo ""
echo "[1/6] Updating package lists..."
sudo apt-get update -qq

# ─── 2. INSTALL NGINX ───────────────────────────
echo ""
echo "[2/6] Installing Nginx..."
sudo apt-get install -y nginx

# Configure Nginx
sudo tee /etc/nginx/sites-available/lpapp > /dev/null << 'NGINX_CONF'
# Rate limiting zones (must be in http context - placed in conf.d)
# Defined in /etc/nginx/conf.d/rate-limit.conf

server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Hide Nginx version
    server_tokens off;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;

    # Rate limit login endpoint aggressively
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

    # Rate limit general API
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

    # SSE endpoints — disable buffering
    location /api/chat-stream {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        chunked_transfer_encoding on;
    }

    # All other traffic
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
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;

        # Block bad bots at Nginx level
        if ($http_user_agent ~* "(python-requests|scrapy|curl|wget|go-http-client|libwww-perl|PhantomJS|HeadlessChrome|SemrushBot|AhrefsBot|MJ12bot|DotBot|BLEXBot|DataForSeoBot)") {
            return 403;
        }
    }

    # Block access to hidden files
    location ~ /\. {
        deny all;
        return 404;
    }

    # Limit upload size
    client_max_body_size 15M;
}
NGINX_CONF

# Rate limiting config in separate file (http context)
sudo tee /etc/nginx/conf.d/rate-limit.conf > /dev/null << 'RATE_CONF'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=60r/m;

# Limit connections per IP
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# Log rate limit rejections
limit_req_log_level warn;
RATE_CONF

# Global Nginx security settings
sudo tee /etc/nginx/conf.d/security.conf > /dev/null << 'SEC_CONF'
# Hide Nginx version globally
server_tokens off;

# Prevent clickjacking globally
add_header X-Frame-Options "DENY" always;

# Reduce timeout windows (helps against slowloris attacks)
client_body_timeout 10s;
client_header_timeout 10s;
send_timeout 10s;
keepalive_timeout 30s;
SEC_CONF

# Enable site, disable default
sudo ln -sf /etc/nginx/sites-available/lpapp /etc/nginx/sites-enabled/lpapp
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
echo "[2/6] Testing Nginx config..."
sudo nginx -t

# Start and enable Nginx
sudo systemctl enable nginx
sudo systemctl restart nginx
echo "[2/6] Nginx installed and configured ✓"

# ─── 3. INSTALL FAIL2BAN ────────────────────────
echo ""
echo "[3/6] Installing Fail2ban..."
sudo apt-get install -y fail2ban

# Configure Fail2ban
sudo tee /etc/fail2ban/jail.local > /dev/null << 'JAIL_CONF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5
backend  = systemd

[sshd]
enabled  = true
port     = 22
filter   = sshd
maxretry = 5
bantime  = 3600

[nginx-limit-req]
enabled  = true
port     = http,https
filter   = nginx-limit-req
logpath  = /var/log/nginx/error.log
maxretry = 5
findtime = 60
bantime  = 600
JAIL_CONF

sudo systemctl enable fail2ban
sudo systemctl restart fail2ban
echo "[3/6] Fail2ban installed and configured ✓"

# ─── 4. UFW FIREWALL ────────────────────────────
echo ""
echo "[4/6] Configuring UFW firewall..."
sudo ufw --force reset

sudo ufw default deny incoming
sudo ufw default allow outgoing

# Essential ports only
sudo ufw allow 22/tcp    comment 'SSH'
sudo ufw allow 80/tcp    comment 'HTTP (Nginx)'
sudo ufw allow 443/tcp   comment 'HTTPS (future)'

# Enable firewall (non-interactive)
sudo ufw --force enable
echo "[4/6] UFW enabled ✓"
sudo ufw status verbose

# ─── 5. SSH HARDENING ───────────────────────────
echo ""
echo "[5/6] Hardening SSH configuration..."

# Backup original config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%Y%m%d)

# Apply hardened settings
sudo tee /etc/ssh/sshd_config.d/99-hardening.conf > /dev/null << 'SSH_CONF'
# Disable root login (use sudo instead)
PermitRootLogin no

# Limit login grace time
LoginGraceTime 30

# Max auth attempts per connection
MaxAuthTries 4

# Max concurrent SSH sessions
MaxSessions 5

# Disable empty passwords
PermitEmptyPasswords no

# Disable X11 forwarding (not needed for web server)
X11Forwarding no

# Disable TCP forwarding
AllowTcpForwarding no

# Only allow specific users (uncomment and set your username)
# AllowUsers adminedas

# Use protocol 2 only
Protocol 2
SSH_CONF

sudo systemctl restart sshd
echo "[5/6] SSH hardened ✓"

# ─── 6. SYSTEM SECURITY SETTINGS ────────────────
echo ""
echo "[6/6] Applying system security settings..."

# Sysctl network hardening
sudo tee /etc/sysctl.d/99-security.conf > /dev/null << 'SYSCTL_CONF'
# Disable IP source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Enable SYN cookies (protect against SYN flood)
net.ipv4.tcp_syncookies = 1

# Disable ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0

# Log martian packets (suspicious routing)
net.ipv4.conf.all.log_martians = 1

# Ignore broadcast pings (prevent smurf attacks)
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Ignore bogus ICMP errors
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Enable IP spoofing protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
SYSCTL_CONF

sudo sysctl -p /etc/sysctl.d/99-security.conf 2>/dev/null || true
echo "[6/6] System security settings applied ✓"

# ─── SUMMARY ────────────────────────────────────
echo ""
echo "============================================"
echo " Hardening Complete! Summary:"
echo "============================================"
echo ""
echo "✓ Nginx      : $(sudo systemctl is-active nginx)"
echo "✓ Fail2ban   : $(sudo systemctl is-active fail2ban)"
echo "✓ UFW Status :"
sudo ufw status
echo ""
echo "✓ Open ports:"
sudo ss -tlnp
echo ""
echo "✓ Fail2ban jails:"
sudo fail2ban-client status
echo ""
echo "============================================"
echo " CATATAN PENTING:"
echo " - Aplikasi Next.js harus berjalan di port 3000"
echo " - Nginx sebagai reverse proxy di port 80"
echo " - Untuk HTTPS: jalankan: sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx"
echo "============================================"
