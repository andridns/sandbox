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

# Copy Poetry files
# If building from repo root, use expense-tracker/backend/ prefix
# If building from backend directory, files are in current directory
COPY expense-tracker/backend/pyproject.toml expense-tracker/backend/poetry.lock ./

# Install dependencies
RUN poetry install --no-dev --no-interaction --no-ansi

# Copy application code
COPY expense-tracker/backend/ ./

# Create uploads directory
RUN mkdir -p uploads/receipts backups

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Run startup script
CMD ["./start.sh"]
