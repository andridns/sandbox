from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database import get_db
from app.models.expense import Expense
from app.models.user import User
from app.core.auth import get_current_user

router = APIRouter()


@router.get("/tags/suggestions", response_model=List[str])
async def get_tag_suggestions(
    query: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tag suggestions for autocomplete"""
    # Get all expenses with tags
    expenses = db.query(Expense).filter(Expense.tags.isnot(None)).all()
    
    # Collect all tags
    all_tags = set()
    for expense in expenses:
        if expense.tags:
            all_tags.update(expense.tags)
    
    # Filter tags that contain the query (case-insensitive)
    query_lower = query.lower()
    suggestions = [
        tag for tag in all_tags
        if query_lower in tag.lower()
    ]
    
    # Sort by relevance (exact match first, then alphabetical)
    suggestions.sort(key=lambda x: (
        0 if x.lower().startswith(query_lower) else 1,
        x.lower()
    ))
    
    return suggestions[:limit]
