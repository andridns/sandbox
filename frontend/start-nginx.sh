#!/bin/sh
# Don't use set -e, we want nginx to start even if proxy config fails

echo "=== Starting Nginx with Proxy Configuration ===" >&2
echo "Checking BACKEND_URL environment variable..." >&2

# Check if BACKEND_URL is set
if [ -n "$BACKEND_URL" ]; then
    echo "✓ BACKEND_URL is set to: $BACKEND_URL" >&2
    echo "Configuring nginx to proxy API requests to backend..." >&2
    
    # Install gettext for envsubst
    apk add --no-cache gettext >&2
    
    # Substitute BACKEND_URL in template
    envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
    
    echo "✓ Nginx proxy configuration applied successfully" >&2
    echo "API requests to /api/* will be proxied to: $BACKEND_URL" >&2
else
    echo "✗ BACKEND_URL not set!" >&2
    echo "Using default nginx config (no proxy)" >&2
    echo "WARNING: API requests will fail. Set BACKEND_URL in Railway frontend service variables." >&2
fi

echo "Starting nginx..." >&2
# Start nginx
exec nginx -g 'daemon off;'
