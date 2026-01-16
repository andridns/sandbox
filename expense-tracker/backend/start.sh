#!/bin/bash
set -e

# Wait for database to be ready (if using PostgreSQL)
if [ -n "$DATABASE_URL" ] && [[ "$DATABASE_URL" == postgresql* ]]; then
    echo "Waiting for database to be ready..."
    until pg_isready -h $(echo $DATABASE_URL | sed -e 's/.*@\(.*\):.*/\1/') -p $(echo $DATABASE_URL | sed -e 's/.*:\([0-9]*\).*/\1/') 2>/dev/null; do
        sleep 1
    done
    echo "Database is ready!"
fi

# Run database migrations
echo "Running database migrations..."
poetry run alembic upgrade head

# Start the application
echo "Starting FastAPI server..."
exec poetry run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
