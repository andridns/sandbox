#!/bin/sh
# Wrapper script to log environment and then call nginx's entrypoint

# Log to stderr (Railway captures stderr)
echo "========================================" >&2
echo "NGINX CONTAINER STARTING" >&2
echo "========================================" >&2
echo "BACKEND_URL=${BACKEND_URL:-NOT SET}" >&2
echo "Checking nginx template..." >&2

# Check if template exists
if [ -f /etc/nginx/templates/default.conf.template ]; then
    echo "✓ Template file exists" >&2
    echo "Template content (first 10 lines):" >&2
    head -10 /etc/nginx/templates/default.conf.template >&2
else
    echo "✗ Template file NOT found!" >&2
fi

echo "" >&2
echo "Calling nginx entrypoint (it will process templates)..." >&2
echo "========================================" >&2

# Call nginx's default entrypoint - it processes templates automatically
exec /docker-entrypoint.sh "$@"
