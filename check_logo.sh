#!/bin/bash
PGPASSWORD='L3p4pp@S3rv3r#2026!' psql -h 127.0.0.1 -U pesantren -d pesantren_db -t -c "SELECT key, value FROM app_settings ORDER BY key;" 2>&1
