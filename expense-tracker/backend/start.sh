#!/bin/bash
set -e

# Wait for database to be ready (if using PostgreSQL)
# Railway handles database readiness, but we can add a simple retry loop
if [ -n "$DATABASE_URL" ] && [[ "$DATABASE_URL" == postgresql* ]]; then
    echo "Waiting for database connection..."
    # Simple retry loop - try migrations, they will fail if DB is not ready
    for i in {1..30}; do
        if poetry run alembic current &>/dev/null || poetry run python -c "from app.database import engine; engine.connect()" &>/dev/null; then
            echo "Database is ready!"
            break
        fi
        echo "Waiting for database... ($i/30)"
        sleep 2
    done
fi

# Run database migrations
echo "Running database migrations..."
poetry run alembic upgrade head || echo "Migration failed or already up to date"

# Start the application
echo "Starting FastAPI server..."
exec poetry run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
