from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import distinct
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.history import ExpenseHistory
from app.models.user import User
from app.schemas.history import ExpenseHistoryResponse
from app.core.auth import get_current_user

router = APIRouter()


@router.get("/history", response_model=List[ExpenseHistoryResponse])
async def get_expense_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    action: Optional[str] = Query(None, description="Filter by action: create, update, or delete"),
    username: Optional[str] = Query(None, description="Filter by username"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get expense history/audit log"""
    query = db.query(ExpenseHistory)
    
    # Apply filters
    if action:
        query = query.filter(ExpenseHistory.action == action)
    
    if username:
        # Exact match for dropdown selection
        query = query.filter(ExpenseHistory.username == username)
    
    # Order by created_at descending (most recent first)
    query = query.order_by(ExpenseHistory.created_at.desc())
    
    # Pagination
    history = query.offset(skip).limit(limit).all()
    return history


@router.get("/history/users", response_model=List[str])
async def get_unique_usernames(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of unique usernames from expense history"""
    usernames = db.query(distinct(ExpenseHistory.username)).order_by(ExpenseHistory.username).all()
    return [username[0] for username in usernames if username[0]]
