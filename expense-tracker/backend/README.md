# Expense Tracker Backend

Backend API for the Expense Tracker application built with FastAPI.

## Setup

1. Install dependencies using Poetry:
```bash
poetry install
```

2. Configure environment variables:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration (optional for local development)
# See .env.example for all available options
```

3. Run database migrations:
```bash
poetry run alembic upgrade head
```

4. Seed the database with default categories and sample data:
```bash
poetry run python scripts/seed_data.py
```

5. Start the development server:
```bash
poetry run uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access:
- Interactive API docs: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

## Project Structure

```
backend/
├── app/
│   ├── api/          # API route handlers
│   ├── models/       # SQLAlchemy models
│   ├── schemas/      # Pydantic schemas
│   ├── services/     # Business logic
│   ├── database.py   # Database configuration
│   └── main.py       # FastAPI application
├── alembic/          # Database migrations
├── scripts/          # Utility scripts
└── uploads/          # Uploaded files (receipts)
```

## Environment Variables

> **Note**: See `.env.example` for a complete list of all environment variables with descriptions and examples.

### Database
- `DATABASE_URL`: Database connection string (default: SQLite)
  - Development: `sqlite:///./expense_tracker.db`
  - Production: PostgreSQL connection string

### Authentication & Security
- `DEFAULT_USERNAME`: Default admin username (default: "admin")
  - Set this to change the default admin username
  - On startup, the system will create or update the user with this username

- `DEFAULT_PASSWORD`: Default admin password (default: "23052020")
  - Set this to change the default admin password
  - On every startup, if this is set, the system will update the user's password
  - **Important**: In Railway or production, set this to a strong password

- `SECRET_KEY`: Secret key for JWT tokens (auto-generated if not set)
  - Should be set in production for security
  - Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

- `GOOGLE_CLIENT_ID`: Google OAuth Client ID (required for Google Sign-In)
  - Get from [Google Cloud Console](https://console.cloud.google.com/)
  - Create OAuth 2.0 credentials for your application
  - Add authorized JavaScript origins: `http://localhost:5173` (dev) and your production URL
  - Add authorized redirect URIs: `http://localhost:5173` (dev) and your production URL

- `ALLOWED_EMAILS`: Comma-separated list of allowed email addresses for Google OAuth
  - Example: `user1@example.com,user2@example.com`
  - Only these emails will be able to sign in via Google OAuth
  - If not set, all Google-authenticated users will be allowed (not recommended for production)

### Server Configuration
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
  - Example: `http://localhost:5173,https://your-frontend.railway.app`
  - If not set, defaults to `*` (allows all origins) in development mode
  - **Important**: Set this in production to restrict CORS access

- `PORT`: Server port number (default: 8000)
  - Railway and other platforms may override this automatically
  - Set explicitly if needed: `PORT=8000`

- `ENVIRONMENT`: Environment name (optional)
  - Set to `production` for production environment
  - Used for environment-specific behavior (e.g., disabling debug endpoints)
  - Railway automatically sets `RAILWAY_ENVIRONMENT_NAME` which is also checked

### Configuring Credentials in Railway

1. Go to your Railway project settings
2. Navigate to the backend service
3. Go to the "Variables" tab
4. Add or update:
   - `DEFAULT_USERNAME`: Your desired username (e.g., "admin")
   - `DEFAULT_PASSWORD`: Your desired password (e.g., "MySecurePassword123!")
5. Redeploy the service

The credentials will be updated automatically on the next deployment/restart.

## Updating Admin Password

### Method 1: Using Environment Variable (Recommended for Production)

Set the `DEFAULT_PASSWORD` environment variable and restart/redeploy the service. The password will be automatically updated on startup.

**Local Development:**
```bash
# In backend/.env file
DEFAULT_PASSWORD=your_new_password_here
```

**Railway Production:**
1. Go to your Railway project → Backend service → Variables
2. Add or update `DEFAULT_PASSWORD` with your new password
3. Redeploy the service

### Method 2: Using Update Script (Quick Local Update)

For local development, you can use the password update script:

```bash
# Update to default password (23052020)
poetry run python scripts/update_admin_password.py

# Or specify a custom password
poetry run python scripts/update_admin_password.py your_custom_password
```

This script will:
- Find the admin user
- Update the password hash
- Keep the user active

### Method 3: Reset Database (Local Development Only)

If you want to reset everything including the password:

```bash
# Delete the SQLite database
rm expense_tracker.db

# Run migrations
poetry run alembic upgrade head

# Seed the database (creates admin with default password)
poetry run python scripts/seed_data.py
```

**Note:** This will delete all your local data!

### Default Credentials

- **Username:** `admin`
- **Default Password:** `23052020`

**⚠️ Important:** Change the default password in production! Set `DEFAULT_PASSWORD` environment variable to a strong password.

## API Endpoints

All endpoints are prefixed with `/api/v1/`

### Authentication
- **Auth**: `/auth/login`, `/auth/logout`, `/auth/google`, `/auth/me`, `/auth/debug`

### Expenses
- **Expenses**: `/expenses` (GET, POST, PUT, DELETE)
- **Expense History**: `/history` (GET), `/history/users` (GET)

### Categories
- **Categories**: `/categories` (GET, POST, PUT, DELETE)

### Budgets
- **Budgets**: `/budgets` (GET, POST, PUT, DELETE)
- **Budget Details**: `/budgets/{budget_id}` (GET), `/budgets/{budget_id}/spent` (GET)

### Reports & Analytics
- **Reports**: `/reports/summary`, `/reports/trends`, `/reports/category-breakdown`, `/reports/top-expenses`

### Export
- **Export**: `/export/csv`, `/export/excel`, `/export/pdf`, `/export/count`

### Import
- **Import**: `/import/excel` (POST)

### Other Features
- **Tags**: `/tags/suggestions` (GET)
- **Upload**: `/upload/receipt` (POST)
- **Backup**: `/backup/create` (POST), `/backup/list` (GET)
- **Currency**: `/currency/convert` (GET)
- **Admin**: `/admin/delete-all` (DELETE) - Backend endpoint only (no UI)
- **Seed**: `/seed` (POST) - Development only
