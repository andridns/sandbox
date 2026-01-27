# Production Rent Expenses Setup

This document explains how rent expenses are automatically imported during production deployment.

## Overview

When deploying to production (Railway), the following happens automatically:

1. **Database Migrations**: The `rent_expenses` table is created via Alembic migration (`007_add_rent_expenses_table.py`)
2. **Data Import**: If the `rent_expenses` table is empty, the system automatically imports all 50 rent expense records from `hvj_monthly_expenses.json`
3. **Idempotent**: The import only runs if the table is empty, so it won't duplicate data on redeployments

## How It Works

### 1. Migration
The migration runs automatically via `start.sh`:
```bash
poetry run alembic upgrade head
```

### 2. Import Process
The `start.sh` script checks if rent expenses exist:
- If count = 0: Runs the import script
- If count > 0: Skips import (data already exists)

### 3. JSON File Location
The import script (`scripts/import_rent_expenses.py`) automatically searches for the JSON file in multiple locations:
- `backend/rent-tracker/hvj_monthly_expenses.json` (primary location for Docker builds)
- `../rent-tracker/hvj_monthly_expenses.json` (if building from project root)
- Other fallback paths

### 4. Docker Build
The `rent-tracker` directory is included in the Docker build context, so the JSON file is available during container startup.

## Files Modified

1. **`backend/alembic/env.py`**: Added `RentExpense` to model imports for autogenerate support
2. **`backend/start.sh`**: Added rent expense import step after migrations
3. **`backend/scripts/import_rent_expenses.py`**: Enhanced to handle missing files gracefully
4. **`backend/rent-tracker/`**: Copied into backend directory for Docker builds

## Verification

After deployment, you can verify the import worked by:

1. **Check Railway logs** for:
   ```
   Checking if rent expenses need to be imported...
   Rent expenses table is empty. Importing rent expense data...
   Import completed!
     - Imported: 50 records
   ```

2. **Or check the database**:
   - Connect to your PostgreSQL database
   - Run: `SELECT COUNT(*) FROM rent_expenses;`
   - Should return: `50`

## Manual Import (If Needed)

If automatic import fails, you can manually import:

```bash
# SSH into Railway container or run locally
poetry run python scripts/import_rent_expenses.py rent-tracker/hvj_monthly_expenses.json
```

## Troubleshooting

### Import Skipped
If you see "Rent expenses already exist (X records)", the import was skipped because data already exists. This is normal after the first deployment.

### JSON File Not Found
If you see "Warning: JSON file not found", check:
1. The `rent-tracker` directory exists in `backend/rent-tracker/`
2. The JSON file is committed to git
3. The Docker build includes the directory

### Migration Fails
If migrations fail:
1. Check Railway logs for specific error
2. Verify `DATABASE_URL` is set correctly
3. Ensure PostgreSQL is accessible

## Notes

- The import is **idempotent**: Running it multiple times won't create duplicates
- Existing records are **updated** if the period matches
- The import script handles both SQLite (dev) and PostgreSQL (production)
- All 50 records from the JSON file will be imported on first deployment
