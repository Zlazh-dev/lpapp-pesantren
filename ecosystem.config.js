// PM2 ecosystem config — production server
// Reads .env to inject UPLOAD_DIR and other vars into PM2 process env
const { readFileSync, existsSync } = require('fs')
const path = require('path')

const ENV_FILE = path.resolve(__dirname, '.env')
const dotenv = {}

if (existsSync(ENV_FILE)) {
    readFileSync(ENV_FILE, 'utf8')
        .split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#') && l.trim())
        .forEach(l => {
            const i = l.indexOf('=')
            const key = l.slice(0, i).trim()
            const val = l.slice(i + 1).trim().replace(/^"|"$/g, '')
            dotenv[key] = val
        })
}

module.exports = {
    apps: [{
        name: 'lpapp',
        script: '.next/standalone/server.js',
        cwd: '/home/adminedas/lpapp-pesantren',
        instances: 2,
        exec_mode: 'cluster',
        autorestart: true,
        watch: false,
        max_memory_restart: '512M',
        restart_delay: 3000,
        env: {
            NODE_ENV: 'production',
            PORT: 3000,
            HOSTNAME: '0.0.0.0',
            // Inject all .env vars — critical for UPLOAD_DIR, DATABASE_URL, NEXTAUTH_SECRET, etc.
            ...dotenv,
        },
        // Log to dedicated folder (outside app dir)
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        error_file: '/home/adminedas/logs/lpapp-error.log',
        out_file: '/home/adminedas/logs/lpapp-out.log',
        merge_logs: true,
    }]
}
