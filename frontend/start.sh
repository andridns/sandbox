#!/bin/sh
set -e

# IMPORTANT: Output to both stdout and stderr to ensure Railway captures it
# Railway may only show logs after container starts, but this should appear

# Create a marker file to prove script ran (for debugging)
touch /tmp/start-script-ran.txt 2>/dev/null || true

# Output to stderr (Railway captures stderr)
echo "==========================================" >&2
echo "NGINX STARTUP SCRIPT EXECUTING" >&2
echo "NGINX STARTUP - Checking BACKEND_URL" >&2
echo "==========================================" >&2
echo "BACKEND_URL=${BACKEND_URL:-NOT SET}" >&2
echo "Script PID: $$" >&2
echo "Current directory: $(pwd)" >&2
echo "" >&2

if [ -n "$BACKEND_URL" ]; then
    echo "✓ BACKEND_URL is set: $BACKEND_URL" >&2
    echo "Generating nginx config with proxy rules..." >&2
    
    # Generate nginx config with backend URL
    cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Serve static files - SPA routing fallback
    location / {
        try_files \$uri /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass $BACKEND_URL/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
        proxy_redirect off;
    }

    # Proxy uploads to backend
    location /uploads {
        proxy_pass $BACKEND_URL/uploads;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_redirect off;
    }
}
EOF
    
    echo "✓ Nginx config generated" >&2
    echo "" >&2
    echo "--- Generated config ---" >&2
    cat /etc/nginx/conf.d/default.conf >&2
    echo "--- End config ---" >&2
    echo "" >&2
    
    echo "Testing nginx configuration..." >&2
    nginx -t >&2
    echo "✓ Nginx config is valid" >&2
else
    echo "✗ ERROR: BACKEND_URL is not set!" >&2
    echo "Creating nginx config without proxy (API calls will fail)" >&2
    cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
EOF
fi

echo "" >&2
echo "==========================================" >&2
echo "Starting nginx..." >&2
echo "==========================================" >&2

# Start nginx using the default entrypoint
# Redirect nginx output to stderr so Railway captures it
exec /docker-entrypoint.sh nginx -g 'daemon off;' 2>&1
