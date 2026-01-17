# Expense Tracker Backend

Backend API for the Expense Tracker application built with FastAPI.

## Setup

1. Install dependencies using Poetry:
```bash
poetry install
```

2. Run database migrations:
```bash
poetry run alembic upgrade head
```

3. Seed the database with default categories and sample data:
```bash
poetry run python scripts/seed_data.py
```

4. Start the development server:
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

- `DATABASE_URL`: Database connection string (default: SQLite)
  - Development: `sqlite:///./expense_tracker.db`
  - Production: PostgreSQL connection string

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

### Configuring Credentials in Railway

1. Go to your Railway project settings
2. Navigate to the backend service
3. Go to the "Variables" tab
4. Add or update:
   - `DEFAULT_USERNAME`: Your desired username (e.g., "admin")
   - `DEFAULT_PASSWORD`: Your desired password (e.g., "MySecurePassword123!")
5. Redeploy the service

The credentials will be updated automatically on the next deployment/restart.

## API Endpoints

All endpoints are prefixed with `/api/v1/`

- **Expenses**: `/expenses` (GET, POST, PUT, DELETE)
- **Categories**: `/categories` (GET, POST, PUT, DELETE)
- **Budgets**: `/budgets` (GET, POST, PUT, DELETE)
- **Reports**: `/reports/summary`, `/reports/trends`, `/reports/category-breakdown`
- **Export**: `/export/csv`, `/export/excel`, `/export/pdf`
- **Tags**: `/tags/suggestions`
- **Upload**: `/upload/receipt`
- **Backup**: `/backup/create`, `/backup/list`
