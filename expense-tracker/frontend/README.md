# Expense Tracker Frontend

Frontend application for the Expense Tracker built with React, TypeScript, and Vite.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (optional for local development):
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env if you need to customize API URL or Google OAuth
# See .env.example for all available options
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Environment Variables

> **Note**: See `.env.example` for a complete list of all environment variables with descriptions and examples.

- `VITE_API_URL`: Backend API base URL (default: `http://localhost:8000/api/v1`)
  - Development: `http://localhost:8000/api/v1`
  - Production: `https://your-backend.railway.app/api/v1`

- `VITE_GOOGLE_CLIENT_ID`: Google OAuth Client ID (required for Google Sign-In)
  - Get from [Google Cloud Console](https://console.cloud.google.com/)
  - Must match the `GOOGLE_CLIENT_ID` set in the backend
  - See [Google OAuth Setup](../GOOGLE_OAUTH_SETUP.md) for detailed instructions

## Build

To build for production:
```bash
npm run build
```

The built files will be in the `dist` directory.

## Features

- **Dashboard**: Overview of expenses, budgets, and spending trends
- **Expenses**: Manage expenses with detailed filtering and search
- **Budgets**: Set and track category and total budgets
- **Reports**: View reports and export data (CSV, Excel, PDF)
- **PWA**: Progressive Web App support for offline viewing

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Query
- Chart.js
- React Router
- React Hot Toast
