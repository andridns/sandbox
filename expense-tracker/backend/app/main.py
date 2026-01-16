from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.database import engine, Base
from app.api import expenses, categories, budgets, reports, export, tags, upload, backup, currency, import_api

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Expense Tracker API",
    description="Backend API for Expense Tracker application",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
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
