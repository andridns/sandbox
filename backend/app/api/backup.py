from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import os
import json
from pathlib import Path

from app.database import get_db
from app.models.expense import Expense
from app.models.category import Category
from app.models.backup import Backup
from app.models.user import User
from app.schemas.backup import BackupResponse
from app.core.auth import get_current_user

router = APIRouter()

# Backup directory
BACKUP_DIR = Path(__file__).parent.parent.parent / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/backup/create", response_model=BackupResponse)
async def create_backup(
    backup_type: str = "manual",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a manual backup"""
    if backup_type not in ["manual", "automatic"]:
        raise HTTPException(status_code=400, detail="Invalid backup type")
    
    # Collect all data
    expenses = db.query(Expense).all()
    categories = db.query(Category).all()

    # Convert to dictionaries
    backup_data = {
        "expenses": [
            {
                "id": str(exp.id),
                "amount": float(exp.amount),
                "currency": exp.currency,
                "description": exp.description,
                "category_id": str(exp.category_id) if exp.category_id else None,
                "date": exp.date.isoformat(),
                "created_at": exp.created_at.isoformat() if exp.created_at else None,
                "updated_at": exp.updated_at.isoformat() if exp.updated_at else None
            }
            for exp in expenses
        ],
        "categories": [
            {
                "id": str(cat.id),
                "name": cat.name,
                "icon": cat.icon,
                "color": cat.color,
                "is_default": cat.is_default,
                "created_at": cat.created_at.isoformat() if cat.created_at else None,
                "updated_at": cat.updated_at.isoformat() if cat.updated_at else None,
            }
            for cat in categories
        ],
        "backup_date": datetime.now().isoformat(),
        "backup_type": backup_type
    }
    
    # Save to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{backup_type}_{timestamp}.json"
    file_path = BACKUP_DIR / filename
    
    with open(file_path, "w") as f:
        json.dump(backup_data, f, indent=2)
    
    # Create backup record
    db_backup = Backup(
        file_path=str(file_path),
        backup_type=backup_type
    )
    db.add(db_backup)
    db.commit()
    db.refresh(db_backup)
    
    return db_backup


@router.get("/backup/list", response_model=List[BackupResponse])
async def list_backups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all backups"""
    backups = db.query(Backup).order_by(Backup.created_at.desc()).all()
    return backups
