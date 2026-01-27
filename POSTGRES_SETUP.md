# PostgreSQL Setup Guide for Development

This guide will help you set up PostgreSQL for local development to match your production environment.

## Why PostgreSQL?

Using PostgreSQL in development ensures that:
- You catch database-specific issues before deploying to production
- Performance characteristics match production
- SQL syntax and features are consistent
- You can test migrations and queries in a production-like environment

## Prerequisites

- PostgreSQL installed on your system
- Python and Poetry installed
- Existing SQLite database with data (if migrating)

## Step 1: Install PostgreSQL

### macOS (using Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Windows
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

## Step 2: Create PostgreSQL Database

1. Connect to PostgreSQL:
```bash
psql postgres
```

2. Create a new database and user:
```sql
-- Create database
CREATE DATABASE expense_tracker;

-- Create user (optional, or use default 'postgres' user)
CREATE USER expense_user WITH PASSWORD 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE expense_tracker TO expense_user;

-- Exit psql
\q
```

## Step 3: Update Environment Configuration

1. Copy the example environment file (if you haven't already):
```bash
cd backend
cp .env.example .env
```

2. Update `.env` with your PostgreSQL connection string:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/expense_tracker
```

Or if you created a custom user:
```bash
DATABASE_URL=postgresql://expense_user:your_password@localhost:5432/expense_tracker
```

**Connection string format:** `postgresql://username:password@host:port/database_name`

## Step 4: Run Database Migrations

Create the database schema in PostgreSQL:
```bash
cd backend
poetry run alembic upgrade head
```

This will create all the necessary tables in your PostgreSQL database.

## Step 5: Migrate Data from SQLite (if applicable)

If you have existing data in SQLite that you want to migrate:

1. Make sure your SQLite database file exists: `backend/expense_tracker.db`

2. Run the migration script:
```bash
cd backend
poetry run python scripts/migrate_sqlite_to_postgres.py
```

The script will:
- Connect to your SQLite database
- Connect to your PostgreSQL database (from `DATABASE_URL` in `.env`)
- Transfer all data while preserving relationships
- Handle UUID conversion and data type differences

3. You can also specify database URLs explicitly:
```bash
SQLITE_URL=sqlite:///./expense_tracker.db \
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/expense_tracker \
poetry run python scripts/migrate_sqlite_to_postgres.py
```

## Step 6: Verify Migration

1. Start your development server:
```bash
cd backend
poetry run uvicorn app.main:app --reload
```

2. Check that your data is accessible:
- Visit `http://localhost:8000/docs`
- Test API endpoints to verify data was migrated correctly

3. Verify in PostgreSQL:
```bash
psql expense_tracker
```

```sql
-- Check table counts
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'budgets', COUNT(*) FROM budgets
UNION ALL
SELECT 'rent_expenses', COUNT(*) FROM rent_expenses;

\q
```

## Troubleshooting

### Connection refused
- Make sure PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
- Check that the port (default 5432) is correct
- Verify your connection string in `.env`

### Authentication failed
- Verify username and password in your connection string
- Check PostgreSQL authentication settings in `pg_hba.conf`

### Database does not exist
- Create the database: `createdb expense_tracker` or use `psql` to create it

### Migration script errors
- Ensure both SQLite and PostgreSQL databases are accessible
- Check that PostgreSQL database is empty or you're okay with skipping existing rows
- Verify all dependencies are installed: `poetry install`

### UUID conversion errors
- The migration script handles UUID conversion automatically
- If you see UUID errors, check that your SQLite database has valid UUID strings

## Backup Your SQLite Database (Recommended)

Before migrating, create a backup of your SQLite database:
```bash
cd backend
cp expense_tracker.db expense_tracker.db.backup
```

## Next Steps

After successful migration:
1. Test all functionality in your application
2. Verify that all data is accessible
3. Consider removing the SQLite database file once you're confident everything works
4. Update your development workflow to use PostgreSQL going forward

## Production vs Development

Your production environment should use the same PostgreSQL setup. The only difference should be:
- **Development**: `postgresql://postgres:postgres@localhost:5432/expense_tracker`
- **Production**: Connection string from your hosting provider (Railway, etc.)

This ensures consistency between environments and helps catch issues early.
