# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Commands

### Backend (FastAPI + Poetry + PostgreSQL)
```bash
cd backend
poetry install                          # Install dependencies
poetry run alembic upgrade head         # Run migrations
poetry run python scripts/seed_data.py  # Seed database (creates admin/23052020)
poetry run uvicorn app.main:app --reload  # Dev server (port 8000)
```

### Frontend (React + Vite + TypeScript)
```bash
cd frontend
npm install                             # Install dependencies
npm run dev                             # Dev server (port 5173, proxies /api to :8000)
npm run build                           # Production build (tsc + vite build)
npm run lint                            # ESLint check (max warnings: 0)
```

### Full Stack
```bash
./start-dev.sh                          # Starts PostgreSQL, backend, and frontend
```

## Architecture Overview

**Monorepo Structure**: Backend and frontend are separate directories at the repository root, each with independent dependencies and build configurations.

**API Versioning**: All endpoints are versioned at `/api/v1/`. When adding new endpoints, always include this prefix.

**Database Strategy**: PostgreSQL for both development and production. All models use UUID primary keys. Alembic handles schema migrations.

**Authentication Flow**:
- JWT tokens with 7-day expiry
- Dual auth strategy: HTTP-only cookies (primary) + localStorage Bearer tokens (fallback for cross-site cookie restrictions)
- Google OAuth supported alongside local username/password
- Backend accepts tokens from both cookies and Authorization headers

**State Management**:
- Frontend: React Context for global auth state, React Query (TanStack Query v5) for server state
- Backend: SQLAlchemy ORM with dependency injection for session management

## Critical Integration Points

### Authentication Pattern (Dual Strategy)

The application uses BOTH cookies and Bearer tokens to handle various deployment scenarios:

1. **Backend** ([backend/app/core/auth.py](backend/app/core/auth.py)): The `get_current_user()` dependency checks cookies first, then falls back to the Authorization header
2. **Frontend** ([frontend/src/services/api.ts](frontend/src/services/api.ts)): Axios request interceptor automatically adds Bearer token from localStorage to ALL requests
3. **Login flow**: Backend sets HTTP-only cookie AND returns token in response body; frontend stores token in localStorage
4. **401 handling**: Frontend response interceptor clears localStorage and redirects to `/login` (except when already on login page)

**Why Both?** Cross-site cookie restrictions can cause cookie-based auth to fail in certain deployment scenarios. The Bearer token provides a reliable fallback.

**Gotcha**: When debugging auth issues, check BOTH the cookie and localStorage token. One may be valid while the other is expired.

### React Query Invalidation Strategy

After mutations that modify expenses, you MUST invalidate all related queries to ensure UI consistency:

```typescript
// After creating/updating/deleting an expense:
queryClient.invalidateQueries({ queryKey: ['expenses'] });
queryClient.invalidateQueries({ queryKey: ['history'] });
queryClient.invalidateQueries({ queryKey: ['topExpenses'] });
queryClient.invalidateQueries({ queryKey: ['summary'] });
queryClient.invalidateQueries({ queryKey: ['category-breakdown'] });
```

**Why**: Expenses affect history logs, top expenses reports, summary statistics, and category breakdowns. Invalidating all ensures data consistency across the UI.

**Pattern**: See [frontend/src/pages/Expenses.tsx](frontend/src/pages/Expenses.tsx) for examples of this pattern in action.

### Currency Conversion Caching

Currency exchange rates are cached **in-memory** (not in database) with a 1-hour TTL:

- Service: [backend/app/services/currency.py](backend/app/services/currency.py)
- Cache: Module-level `_EXCHANGE_RATE_CACHE` dictionary
- API: Free exchangerate-api.com endpoint (no auth required)
- Fallback: If API fails, uses expired cache if available

**Gotcha**: Cache is lost on server restart. For long-running operations like Excel import, rates are pre-fetched and passed to the synchronous converter to avoid multiple API calls.

### Audit Trail Pattern

All expense changes are automatically logged in the `ExpenseHistory` model:

- Fields: `action` ('create'|'update'|'delete'), `old_data` (JSON), `new_data` (JSON), `username`, `created_at`
- The `expense_id` is **nullable** to preserve history even after the expense is deleted
- JSON data stored as text columns, serialized/deserialized in the API layer
- Includes `username` for easy display without requiring joins

**Pattern**: When modifying expense endpoints, ensure history records are created with proper old_data/new_data snapshots. See [backend/app/models/history.py](backend/app/models/history.py) and existing expense endpoints for examples.

## Database & Migrations

**PostgreSQL Required**: SQLite was used initially but the project migrated to PostgreSQL for both development and production to ensure proper UUID support, JSON columns, and production parity.

**Migration Workflow**:
```bash
cd backend
# Create migration after modifying models
poetry run alembic revision --autogenerate -m "description of change"
# Review generated migration in alembic/versions/
# Apply migration
poetry run alembic upgrade head
```

**UUID Pattern**: All models use `UUID(as_uuid=True)` primary keys with `default=uuid.uuid4`. Always use UUID type for foreign keys and import from the `uuid` module.

**Seed Data**: The [backend/scripts/seed_data.py](backend/scripts/seed_data.py) script creates the default admin user (credentials from environment variables, defaults to admin/23052020) and sample expense categories. Safe to run multiple times (uses upsert logic).

## Important Gotchas

1. **Bcrypt Warnings**: Passlib/bcrypt version warnings are intentionally suppressed in [backend/app/core/auth.py](backend/app/core/auth.py) and [backend/app/main.py](backend/app/main.py). Bcrypt 5.0+ works correctly; the warnings are harmless compatibility notices.

2. **Railway Deployment**: When deploying to Railway, you MUST set the "Root Directory" to either `backend` or `frontend` in the service settings. Without this, Railway cannot find the Dockerfile.

3. **CORS Configuration**: Backend uses `allow_credentials=True` which requires explicit origins (cannot use `*`) in production. This is necessary for cookie-based authentication to work across domains.

4. **Excel Import Category Matching**: Uses a keyword-based algorithm in [backend/app/services/category_matcher.py](backend/app/services/category_matcher.py), NOT an external AI API. It has predefined keywords for common categories in both English and Indonesian.

5. **Infinite Scrolling**: Frontend uses React Query's `useInfiniteQuery` with 500 items per page for the expenses list. Always implement `getNextPageParam` to determine if more pages exist.

6. **Protected Routes**: The `ProtectedRoute` component in [frontend/src/components/ProtectedRoute.tsx](frontend/src/components/ProtectedRoute.tsx) shows a loading spinner during auth checks. Don't add routes requiring authentication outside this wrapper.

7. **Google OAuth**: Requires both `GOOGLE_CLIENT_ID` (backend env var) and `VITE_GOOGLE_CLIENT_ID` (frontend env var) to match the same OAuth client. Backend validates the token and checks against an email whitelist if configured.

8. **Test Command**: The project uses pytest for backend testing. Run tests with `cd backend && poetry run pytest`.

## Deployment Notes

### Railway-Specific Configuration
- **Root Directory**: Must be set to `backend` or `frontend` in Railway service settings
- **Builder**: Use "Dockerfile" (not Railpack/Nixpacks)
- **Backend Environment Variables**: `DATABASE_URL`, `ALLOWED_ORIGINS`, `PORT` (auto-set by Railway)
- **Frontend Environment Variables**: `VITE_API_URL` (must point to backend URL + `/api/v1`)

### Local Development
- Use `./start-dev.sh` from repository root to start all services
- Script automatically starts PostgreSQL via Homebrew if not running
- Logs are written to `/tmp/expense-tracker-{backend|frontend}.log`
- Frontend dev server (port 5173) proxies `/api` and `/uploads` requests to backend (port 8000)

## Key Files for Reference

- [backend/app/core/auth.py](backend/app/core/auth.py) - Dual authentication strategy (cookie + Bearer), JWT handling, Google OAuth verification
- [frontend/src/services/api.ts](frontend/src/services/api.ts) - API client with token interceptors, automatic 401 handling, request/response structure
- [backend/app/services/currency.py](backend/app/services/currency.py) - Exchange rate caching pattern, async/sync conversion utilities
- [backend/app/models/history.py](backend/app/models/history.py) - Audit trail pattern for tracking all expense changes
- [frontend/src/pages/Expenses.tsx](frontend/src/pages/Expenses.tsx) - React Query infinite query pattern and query invalidation examples
- [backend/app/database.py](backend/app/database.py) - Database session management and engine configuration
- [frontend/src/contexts/AuthContext.tsx](frontend/src/contexts/AuthContext.tsx) - Global authentication state management
