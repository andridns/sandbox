import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os
from dotenv import load_dotenv
from app.database import engine, Base
from app.api import expenses, categories, budgets, reports, export, tags, upload, backup, currency, import_api, auth, admin, history, rent_expenses

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

# Suppress harmless bcrypt version warnings from passlib
logging.getLogger("passlib.handlers.bcrypt").setLevel(logging.ERROR)

logger = logging.getLogger(__name__)

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    logger.info(f"Loaded environment variables from {env_path}")
else:
    logger.warning(f"No .env file found at {env_path}")

logger.info("Starting Expense Tracker API")

# Try to import seed module, but don't fail if it doesn't exist
try:
    from app.api import seed
    SEED_AVAILABLE = True
except ImportError as e:
    SEED_AVAILABLE = False
    logger.warning(f"Seed module not available: {e}")

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Expense Tracker API",
    description="Backend API for Expense Tracker application",
    version="1.0.0"
)

# CORS configuration - allow origins from environment variable or default to localhost
# In development, allow all origins for easier mobile testing
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_env:
    allowed_origins = allowed_origins_env.split(",")
else:
    # Development mode: allow all origins for mobile testing
    allowed_origins = ["*"]

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# Auth routes (public)
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])

# Protected routes (require authentication)
app.include_router(expenses.router, prefix="/api/v1", tags=["expenses"])
app.include_router(categories.router, prefix="/api/v1", tags=["categories"])
app.include_router(budgets.router, prefix="/api/v1", tags=["budgets"])
app.include_router(reports.router, prefix="/api/v1", tags=["reports"])
app.include_router(export.router, prefix="/api/v1", tags=["export"])
app.include_router(tags.router, prefix="/api/v1", tags=["tags"])
app.include_router(upload.router, prefix="/api/v1", tags=["upload"])
app.include_router(backup.router, prefix="/api/v1", tags=["backup"])
app.include_router(currency.router, prefix="/api/v1", tags=["currency"])
app.include_router(import_api.router, prefix="/api/v1", tags=["import"])
app.include_router(admin.router, prefix="/api/v1", tags=["admin"])
app.include_router(history.router, prefix="/api/v1", tags=["history"])
app.include_router(rent_expenses.router, prefix="/api/v1", tags=["rent-expenses"])

# Include seed router if available
if SEED_AVAILABLE:
    app.include_router(seed.router, prefix="/api/v1", tags=["seed"])

# Mount static files for receipts
uploads_dir = Path(__file__).parent.parent / "uploads"
if uploads_dir.exists():
    app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.get("/")
async def root():
    return {"message": "Expense Tracker API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
