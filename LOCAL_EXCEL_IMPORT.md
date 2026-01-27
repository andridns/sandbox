# Local Excel Import Guide

This guide explains how to import Excel files directly to your production database from your local machine. This is useful when the production server times out during large imports (e.g., 5000+ transactions).

## Quick Start

```bash
# 1. Get PUBLIC database URL from Railway (NOT the internal one!)
#    Railway → PostgreSQL service → "Connect" or "Public Networking" tab

# 2. Set the public DATABASE_URL (use the public endpoint from Railway)
export DATABASE_URL="postgresql://postgres:password@switchyard.proxy.rlwy.net:PORT/railway"

# 3. Run the import
cd expense-tracker/backend
poetry run python scripts/import_excel_local.py ~/Downloads/expenses.xlsx
```

**⚠️ Important:** If your DATABASE_URL contains `.railway.internal`, it won't work from your local machine. You need the **public** database URL.

## Why Use Local Import?

The production import API processes expenses one-by-one, committing each transaction individually. For large files (5000+ rows), this can:
- Exceed server timeout limits
- Consume too many server resources
- Fail partway through (e.g., only importing 1000 out of 5000)

The local import script solves this by:
- Processing expenses in batches (200 per batch by default)
- Committing entire batches at once (much faster)
- Running on your local machine (no server timeout)
- Providing progress feedback and error handling

## Prerequisites

1. **Python environment** with Poetry installed
2. **Production database access** (DATABASE_URL)
3. **Excel file** (.xlsx or .xls format)

## Step 1: Get Production Database URL

**⚠️ Important:** Railway provides two types of database URLs:
- **Internal URL** (`.railway.internal`) - Only works within Railway's network
- **Public URL** - Works from your local machine (what you need!)

For local imports, you need the **public database URL**, not the internal one.

### Option A: Railway Dashboard (Recommended)

1. Go to [Railway Dashboard](https://railway.app)
2. Select your **PostgreSQL database service** (not the backend service)
3. Click on the **"Networking"** tab (or "Connect" tab)
4. In the **"Public Networking"** section, you'll see a public endpoint like:
   - `switchyard.proxy.rlwy.net:51922` (this proxies to internal port 5432)
5. Copy the public endpoint (hostname and port)
6. Construct your DATABASE_URL:
   ```
   postgresql://postgres:YOUR_PASSWORD@switchyard.proxy.rlwy.net:51922/railway
   ```
   Replace:
   - `YOUR_PASSWORD` with your actual database password (from Variables tab)
   - `51922` with your actual public port number

The public URL will look like:
```
postgresql://postgres:password@switchyard.proxy.rlwy.net:51922/railway
```

**Important Notes:**
- The hostname will be `switchyard.proxy.rlwy.net` (Railway's public proxy)
- The port will be a random port number (e.g., `51922`) - this is different from the internal port 5432
- If you see `postgres.railway.internal` in the hostname, that's the internal URL and won't work from your local machine
- The public endpoint proxies to the internal PostgreSQL port (5432), so you use the public port shown in Railway

### Alternative: Get from PostgreSQL Service Variables

If the public URL isn't shown:

1. Go to your **PostgreSQL service** in Railway
2. Click on **"Variables"** tab
3. Look for `DATABASE_URL` - this might be the internal URL
4. Go to **"Settings"** → **"Networking"**
5. Enable **"Public Networking"** if it's disabled
6. Railway will provide a public connection string

The public URL typically has a hostname like:
- `containers-us-west-xxx.railway.app` (public)
- NOT `postgres.railway.internal` (internal only)

### Option B: Railway CLI

If you have Railway CLI installed:

```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
cd expense-tracker/backend
railway link

# Get DATABASE_URL
railway variables
```

## Step 2: Set Up Environment

Navigate to the backend directory:

```bash
cd expense-tracker/backend
```

Set the DATABASE_URL environment variable:

```bash
# On macOS/Linux
export DATABASE_URL="postgresql://user:password@host:port/dbname"

# On Windows (PowerShell)
$env:DATABASE_URL="postgresql://user:password@host:port/dbname"

# On Windows (CMD)
set DATABASE_URL=postgresql://user:password@host:port/dbname
```

**⚠️ Security Warning:** Never commit DATABASE_URL to git or share it publicly. It contains sensitive database credentials.

## Step 3: Run the Import Script

### Basic Usage

```bash
poetry run python scripts/import_excel_local.py /path/to/your/file.xlsx
```

The script will:
1. Test the database connection
2. Import categories from "Categories" sheet (if present)
3. Parse the Excel file
4. Process expenses in batches of 200
5. Show progress and summary

### Advanced Options

#### Custom Batch Size

For very large files, you can increase the batch size (default: 200):

```bash
poetry run python scripts/import_excel_local.py file.xlsx --batch-size 500
```

**Note:** Larger batches = faster import but more memory usage. Recommended: 200-500.

#### Skip Existing Expenses

If you're re-running an import and want to skip expenses that already exist (by ID):

```bash
poetry run python scripts/import_excel_local.py file.xlsx --skip-existing
```

#### Custom Database URL

Override the DATABASE_URL environment variable:

```bash
poetry run python scripts/import_excel_local.py file.xlsx --db-url "postgresql://..."
```

#### Save Logs to File

For detailed debugging, save logs to a file:

```bash
poetry run python scripts/import_excel_local.py file.xlsx --log-file import.log
```

### Complete Example

```bash
# Set database URL
export DATABASE_URL="postgresql://postgres:pass@host.railway.app:5432/railway"

# Run import with custom batch size and logging
poetry run python scripts/import_excel_local.py \
    ~/Downloads/expenses.xlsx \
    --batch-size 300 \
    --skip-existing \
    --log-file import_2024.log
```

## Step 4: Review Import Results

After the import completes, you'll see a summary:

```
============================================================
IMPORT SUMMARY
============================================================
Total rows in file:     5000
Successfully imported:  4850
Failed:                 10
Skipped (amount <= 0): 140
Uncategorized:          250
Categories imported:    5

Category matches:
  - Food & Dining: 1200
  - Transportation: 800
  - Shopping: 600
  ...

✓ Import completed successfully!
```

## Excel File Format

The script supports the same Excel format as the production import:

### Required Columns

- **Date** - Transaction date (various formats supported)
- **Amount** - Expense amount (positive numbers)
- **Description** - Expense description (or "Name" / "RawText" columns)

### Optional Columns

- **Category** - Category name (will be matched automatically)
- **Location** - Location of expense
- **Notes** - Additional notes
- **Tags** - Comma-separated tags
- **Currency** - Currency code (default: IDR)
- **ID** - Expense UUID (for skip-existing feature)

### Categories Sheet

If your Excel file has a "Categories" sheet, categories will be imported first:

| ID  | Name          | Icon | Color   | Is Default |
|-----|---------------|------|---------|------------|
| ... | Food & Dining | 🍽️  | #FF6B6B | Yes        |

## Troubleshooting

### Database Connection Failed

**Error:** `✗ Database connection failed` or `could not translate host name "postgres.railway.internal"`

**Common Cause:** You're using the internal database URL (`.railway.internal`) which only works within Railway's network.

**Solutions:**
1. **Get the public database URL:**
   - Go to Railway → PostgreSQL service → "Networking" tab
   - In "Public Networking" section, copy the public endpoint (e.g., `switchyard.proxy.rlwy.net:51922`)
   - Construct DATABASE_URL: `postgresql://postgres:PASSWORD@switchyard.proxy.rlwy.net:51922/railway`
   - Replace `PASSWORD` with your database password (from Variables tab)
   - Replace `51922` with your actual public port number
   - If public networking is disabled, enable it in Settings → Networking

2. **Verify DATABASE_URL format:**
   - ✅ Correct: `postgresql://user:pass@switchyard.proxy.rlwy.net:51922/railway` (public endpoint)
   - ❌ Wrong: `postgresql://user:pass@postgres.railway.internal:5432/railway` (internal only)
   - ❌ Wrong: Using port 5432 with public endpoint (use the port shown in Railway, e.g., 51922)

3. **Check database service status:**
   - Ensure PostgreSQL service is running in Railway
   - Check Railway logs for any database issues

4. **Network connectivity:**
   - Verify your internet connection
   - Check if Railway's public networking is enabled for your database

### No Expenses Found

**Error:** `No expenses found in Excel file`

**Solutions:**
1. Check that your Excel file has the required columns (Date, Amount, Description)
2. Verify the file is not empty
3. Check that data starts from row 2 (row 1 should be headers)
4. Ensure amounts are positive numbers

### Import Fails Partway Through

**Error:** Some batches fail but others succeed

**Solutions:**
1. Check the error messages in the summary
2. Review failed rows to identify problematic data
3. Fix the Excel file and re-run (use `--skip-existing` to avoid duplicates)
4. Check database logs in Railway for detailed errors

### Memory Issues with Very Large Files

**Error:** Script runs out of memory

**Solutions:**
1. Reduce batch size: `--batch-size 100`
2. Split Excel file into smaller files
3. Close other applications to free up memory

### Category Matching Issues

**Problem:** Many expenses are uncategorized

**Solutions:**
1. Ensure category names in Excel match exactly (case-insensitive)
2. Check that categories exist in the database
3. Use the "Categories" sheet to import categories first
4. Review category matching logic in the script

## Security Best Practices

1. **Never commit DATABASE_URL** to git
   - Add `.env` to `.gitignore` if storing locally
   - Use environment variables or Railway CLI

2. **Use Railway CLI for secure access**
   ```bash
   railway variables  # Shows variables securely
   ```

3. **Don't share DATABASE_URL** publicly
   - Treat it like a password
   - Rotate database credentials if exposed

4. **Use read-only database user** (if possible)
   - For production imports, you typically need write access
   - Consider creating a separate import user with limited permissions

## Performance Tips

1. **Optimal batch size:** 200-500 expenses per batch
   - Smaller batches = more commits = slower but safer
   - Larger batches = fewer commits = faster but more memory

2. **Network speed:** Faster connection = faster import
   - Local network: Very fast
   - Home internet: Usually fast enough
   - Mobile hotspot: May be slower

3. **Database location:** Closer to Railway servers = faster
   - Railway databases are typically in US regions
   - Your location may affect import speed

## Example: Importing 5000 Transactions

```bash
# 1. Get DATABASE_URL from Railway
export DATABASE_URL="postgresql://..."

# 2. Run import with progress tracking
cd expense-tracker/backend
poetry run python scripts/import_excel_local.py \
    ~/Downloads/all_expenses.xlsx \
    --batch-size 250 \
    --log-file import_$(date +%Y%m%d).log

# 3. Review results
# Expected time: 2-5 minutes for 5000 transactions
# Progress: Shows "Processing batch X/Y" in real-time
```

## Comparison: Production vs Local Import

| Feature            | Production API   | Local Script              |
|--------------------|------------------|---------------------------|
| **Timeout**        | 30-60 seconds    | No timeout                |
| **Batch size**     | 1 expense        | 200 expenses              |
| **Speed**          | ~1-2 sec/expense | ~0.1 sec/expense          |
| **Progress**       | Limited          | Real-time                 |
| **Error recovery** | Fails completely | Continues with next batch |
| **Large files**    | ❌ Times out      | ✅ Handles easily          |

## Need Help?

If you encounter issues:

1. Check the error messages in the summary
2. Review the log file (if using `--log-file`)
3. Check Railway database logs
4. Verify Excel file format matches requirements
5. Test with a small file first (10-20 rows)

## Related Documentation

- [Production Import API](../backend/app/api/import_api.py) - Production import endpoint
- [Excel Import Service](../backend/app/services/excel_import.py) - Excel parsing logic
- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT_GUIDE.md) - Railway setup
