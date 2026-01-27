#!/bin/sh

# Output to both stdout and stderr to ensure Railway captures it
echo "==========================================" 1>&2
echo "=== NGINX STARTUP SCRIPT ===" 1>&2
echo "==========================================" 1>&2
echo "BACKEND_URL=${BACKEND_URL:-NOT SET}" 1>&2
echo "==========================================" 1>&2

# Generate nginx config from template
if [ -n "$BACKEND_URL" ]; then
    echo "✓ BACKEND_URL is set: $BACKEND_URL"
    echo "Generating nginx config with proxy..."
    
    # Use envsubst to replace ${BACKEND_URL} in template
    envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
    
    echo "✓ Nginx config generated"
    echo "--- Generated nginx config ---"
    cat /etc/nginx/conf.d/default.conf
    echo "--- End config ---"
    
    echo "Testing nginx configuration..."
    nginx -t || {
        echo "ERROR: Generated nginx config is invalid!"
        exit 1
    }
    echo "✓ Nginx config is valid"
else
    echo "✗ ERROR: BACKEND_URL is not set!"
    echo "Creating nginx config without proxy (API calls will fail)"
    # Create a basic config without proxy
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

echo "==========================================" 1>&2
echo "Starting nginx..." 1>&2
echo "==========================================" 1>&2

# Execute the default nginx entrypoint (it will start nginx)
exec /docker-entrypoint.sh nginx -g 'daemon off;' 2>&1
