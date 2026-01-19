# Expense Tracker

A comprehensive full-stack expense tracking application built with FastAPI (Python) backend and React frontend.

## Features

- **Expense Management**: Track expenses with detailed information including amount, description, category, tags, receipt photos, location, notes, and recurring flag
- **Multi-Currency Support**: Support for IDR (primary) and other currencies with automatic conversion
- **Budget Tracking**: Set and track both category budgets and total monthly/yearly budgets
- **Comprehensive Dashboard**: View summaries, charts, and budget progress
- **Advanced Filtering**: Filter expenses by category, date range, tags, amount range, and search
- **Expense History**: Track all changes to expenses with audit log
- **Reports & Analytics**: Monthly/yearly summaries, category breakdowns, and spending trends
- **Export**: Export data to CSV, Excel, or PDF
- **PWA Support**: Progressive Web App with offline viewing capability
- **Material Design**: Modern, elegant UI with green color scheme

## Project Structure

```
expense-tracker/
├── backend/          # FastAPI backend
├── frontend/         # React frontend
└── README.md
```

## Quick Start

### Backend

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies with Poetry:
```bash
poetry install
```

3. Run database migrations:
```bash
poetry run alembic upgrade head
```

4. Seed the database:
```bash
poetry run python scripts/seed_data.py
```

**Default Login Credentials:**
- Username: `admin`
- Password: `23052020`

5. Start the server:
```bash
poetry run uvicorn app.main:app --reload
```

Backend API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

### Frontend

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Configure environment variables (optional):
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env if you need to customize API URL or Google OAuth
# See .env.example for all available options
```

3. Install dependencies:
```bash
npm install
```

4. Start the development server:
```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`

## Technology Stack

### Backend
- FastAPI (Python web framework)
- SQLAlchemy (ORM)
- Pydantic (data validation)
- Alembic (database migrations)
- Poetry (dependency management)
- PostgreSQL (production) / SQLite (development)

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- React Query (data fetching)
- Chart.js (visualizations)
- React Router (routing)
- React Hot Toast (notifications)
- Vite PWA Plugin (PWA support)

## Development

### Backend Development

- API endpoints are versioned: `/api/v1/`
- Database models are in `backend/app/models/`
- API routes are in `backend/app/api/`
- Pydantic schemas are in `backend/app/schemas/`

### Frontend Development

- Components are in `frontend/src/components/`
- Pages are in `frontend/src/pages/`
- API client is in `frontend/src/services/api.ts`
- Types are in `frontend/src/types/`

## Environment Variables

### Backend
- `DATABASE_URL`: Database connection string (default: SQLite)

## Documentation

### Importing Large Excel Files

If you need to import large Excel files (5000+ transactions) and the production server times out, you can use the local import script to import directly from your local machine.

**See [LOCAL_EXCEL_IMPORT.md](./LOCAL_EXCEL_IMPORT.md) for detailed instructions.**

**Quick Example:**
```bash
# 1. Get public database URL from Railway:
#    Railway Dashboard → PostgreSQL service → Networking tab
#    Copy the public endpoint (e.g., switchyard.proxy.rlwy.net:51922)

# 2. Set DATABASE_URL with public endpoint
export DATABASE_URL="postgresql://postgres:PASSWORD@switchyard.proxy.rlwy.net:51922/railway"

# 3. Run the import script
cd backend
poetry run python scripts/import_excel_local.py /path/to/file.xlsx
```

**Important:** Use the public endpoint from Railway's Networking tab (e.g., `switchyard.proxy.rlwy.net:PORT`), not the internal URL (`postgres.railway.internal`).

### Additional Documentation

- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT_GUIDE.md) - Complete deployment guide
- [Google OAuth Setup](./GOOGLE_OAUTH_SETUP.md) - Google authentication setup
- [Custom Domain Setup](./CUSTOM_DOMAIN_SETUP.md) - Setting up custom domains
- [Local Excel Import](./LOCAL_EXCEL_IMPORT.md) - Import large Excel files locally

## License

MIT
