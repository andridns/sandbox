# Use Python 3.10 slim image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install --no-cache-dir poetry

# Configure Poetry to not create virtual environment (we're in a container)
RUN poetry config virtualenvs.create false

# Copy Poetry configuration
COPY pyproject.toml ./

# Install dependencies
# Poetry will resolve dependencies from pyproject.toml if poetry.lock is missing
# This is fine for production - Poetry will create a lock file during install
# Note: --no-dev is deprecated in Poetry 2.0+, use --without dev instead
# --no-root skips installing the current project (we copy the code with COPY . . later)
RUN poetry install --without dev --no-interaction --no-ansi --no-root

# Copy application code
COPY . .

# Note: rent-tracker directory should be copied into backend/rent-tracker before building
# This ensures the JSON file is available for the import script during startup
# The import script will try multiple paths to find the JSON file if this doesn't exist

# Create uploads directory
RUN mkdir -p uploads/receipts backups

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Run startup script
CMD ["./start.sh"]
