from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pathlib import Path
import os

from app.database import get_db
from app.models.expense import Expense
from app.models.budget import Budget
from app.models.category import Category
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter()


@router.delete("/admin/delete-all", status_code=200)
async def delete_all_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete all expenses, budgets, and custom categories (keeps default categories)"""
    try:
        # Delete all expenses
        db.query(Expense).delete()
        
        # Delete all budgets
        db.query(Budget).delete()
        
        # Delete custom categories (keep default ones)
        db.query(Category).filter(Category.is_default == False).delete()
        
        # Optionally delete uploaded receipts
        uploads_dir = Path(__file__).parent.parent.parent / "uploads" / "receipts"
        if uploads_dir.exists():
            for file_path in uploads_dir.iterdir():
                if file_path.is_file():
                    try:
                        file_path.unlink()
                    except Exception as e:
                        # Log error but continue
                        pass
        
        db.commit()
        
        return {
            "message": "All data deleted successfully",
            "deleted": {
                "expenses": "all",
                "budgets": "all",
                "custom_categories": "all",
                "receipts": "all"
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting data: {str(e)}"
        )
