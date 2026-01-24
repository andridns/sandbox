# Migration Summary: SQLite to PostgreSQL

This document summarizes the changes made to migrate from SQLite to PostgreSQL for development.

## Changes Made

### 1. Database Configuration
- **File**: `backend/app/database.py`
  - Updated default `DATABASE_URL` to use PostgreSQL
  - Maintained backward compatibility for SQLite (if explicitly configured)
  - Default: `postgresql://postgres:postgres@localhost:5432/expense_tracker`

### 2. Environment Configuration
- **File**: `backend/.env.example`
  - Updated default `DATABASE_URL` to PostgreSQL connection string
  - Added example PostgreSQL connection string

### 3. Migration Script
- **File**: `backend/scripts/migrate_sqlite_to_postgres.py`
  - Comprehensive script to transfer all data from SQLite to PostgreSQL
  - Handles UUID conversion, JSON fields, timestamps, and relationships
  - Migrates tables in correct dependency order
  - Skips existing rows to allow re-running

### 4. Documentation
- **File**: `POSTGRES_SETUP.md`
  - Complete setup guide for PostgreSQL
  - Installation instructions for different platforms
  - Migration steps and troubleshooting

- **Files**: `backend/README.md`, `README.md`
  - Updated to reflect PostgreSQL as default
  - Updated setup instructions

## Quick Start

1. **Install PostgreSQL** (if not already installed)
   ```bash
   # macOS
   brew install postgresql@15
   brew services start postgresql@15
   ```

2. **Create Database**
   ```bash
   createdb expense_tracker
   ```

3. **Update `.env` file**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and set DATABASE_URL to your PostgreSQL connection string
   ```

4. **Run Migrations**
   ```bash
   poetry run alembic upgrade head
   ```

5. **Migrate Data from SQLite** (if you have existing data)
   ```bash
   poetry run python scripts/migrate_sqlite_to_postgres.py
   ```

6. **Start Development Server**
   ```bash
   poetry run uvicorn app.main:app --reload
   ```

## Benefits

✅ **Consistency**: Development and production use the same database  
✅ **Performance**: Catch performance issues before deploying  
✅ **Features**: Access to PostgreSQL-specific features  
✅ **Testing**: Test migrations and queries in production-like environment  

## Next Steps

1. Set up PostgreSQL locally (see `POSTGRES_SETUP.md`)
2. Migrate your existing SQLite data
3. Test your application thoroughly
4. Remove SQLite database file once confident everything works

## Rollback

If you need to rollback to SQLite temporarily:
1. Set `DATABASE_URL=sqlite:///./expense_tracker.db` in `.env`
2. The code still supports SQLite for backward compatibility
