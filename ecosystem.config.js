// PM2 ecosystem config — production server
// Place at: /home/adminedas/lpapp-pesantren/ecosystem.config.js
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
        // Load .env automatically — UPLOAD_DIR and DATABASE_URL will be available
        env_file: '/home/adminedas/lpapp-pesantren/.env',
        env: {
            NODE_ENV: 'production',
            PORT: 3000,
            HOSTNAME: '0.0.0.0',
        },
        // Log rotation
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        error_file: '/home/adminedas/logs/lpapp-error.log',
        out_file: '/home/adminedas/logs/lpapp-out.log',
        merge_logs: true,
    }]
}
