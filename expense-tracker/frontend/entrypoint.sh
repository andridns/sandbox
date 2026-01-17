#!/bin/sh
set -e

# Log everything to stderr so Railway captures it
exec 1>&2

echo "=========================================="
echo "NGINX ENTRYPOINT - STARTING"
echo "=========================================="
echo "BACKEND_URL=${BACKEND_URL:-NOT SET}"
echo ""

# Check if BACKEND_URL is set
if [ -z "$BACKEND_URL" ]; then
    echo "ERROR: BACKEND_URL is not set!"
    echo "Creating nginx config WITHOUT proxy (API calls will fail)"
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
    echo "WARNING: No proxy configured - set BACKEND_URL in Railway!"
else
    echo "✓ BACKEND_URL is set: $BACKEND_URL"
    
    # Remove trailing slash from BACKEND_URL if present
    BACKEND_URL=$(echo "$BACKEND_URL" | sed 's:/*$::')
    echo "BACKEND_URL (normalized): $BACKEND_URL"
    echo "Generating nginx config with proxy..."
    
    # Generate nginx config with backend URL substitution
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
    # Frontend requests: /api/v1/import/excel -> Backend: BACKEND_URL/api/v1/import/excel
    location /api {
        proxy_pass ${BACKEND_URL}/api;
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
    
    echo "✓ Nginx config generated"
    echo ""
    echo "--- Generated nginx config (checking proxy_pass) ---"
    grep -A 2 "location /api" /etc/nginx/conf.d/default.conf || echo "WARNING: /api location not found!"
    echo "--- End config snippet ---"
    echo ""
    
    echo "Testing nginx configuration..."
    if nginx -t; then
        echo "✓ Nginx config is valid"
    else
        echo "✗ ERROR: Nginx config is invalid!"
        echo "Full config:"
        cat /etc/nginx/conf.d/default.conf
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo "Starting nginx..."
echo "=========================================="

# Start nginx
exec nginx -g 'daemon off;'
