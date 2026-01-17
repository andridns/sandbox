from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import Optional, List
from datetime import date
from uuid import UUID
from decimal import Decimal
import json

from app.database import get_db
from app.models.expense import Expense
from app.models.history import ExpenseHistory
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from app.core.auth import get_current_user

router = APIRouter()


@router.get("/expenses", response_model=List[ExpenseResponse])
async def get_expenses(
    category_id: Optional[UUID] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    tags: Optional[str] = Query(None),  # comma-separated tags
    payment_method: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get expenses with advanced filtering"""
    query = db.query(Expense)

    # Apply filters
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    
    if start_date:
        query = query.filter(Expense.date >= start_date)
    
    if end_date:
        query = query.filter(Expense.date <= end_date)
    
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",")]
        query = query.filter(Expense.tags.contains(tag_list))
    
    if payment_method:
        query = query.filter(Expense.payment_method == payment_method)
    
    if min_amount is not None:
        query = query.filter(Expense.amount >= Decimal(str(min_amount)))
    
    if max_amount is not None:
        query = query.filter(Expense.amount <= Decimal(str(max_amount)))
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Expense.description.ilike(search_term),
                Expense.notes.ilike(search_term),
                Expense.location.ilike(search_term)
            )
        )

    # Order by date descending
    query = query.order_by(Expense.date.desc(), Expense.created_at.desc())
    
    # Pagination
    expenses = query.offset(skip).limit(limit).all()
    return expenses


@router.post("/expenses", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    expense: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new expense"""
    db_expense = Expense(**expense.model_dump())
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    
    # Log history
    history_entry = ExpenseHistory(
        expense_id=db_expense.id,
        action='create',
        user_id=current_user.id,
        username=current_user.username or current_user.email or 'unknown',
        description=f"Created expense: {db_expense.description}",
        new_data=json.dumps({
            'id': str(db_expense.id),
            'amount': float(db_expense.amount),
            'currency': db_expense.currency,
            'description': db_expense.description,
            'date': db_expense.date.isoformat(),
        }, default=str)
    )
    db.add(history_entry)
    db.commit()
    
    return db_expense


@router.get("/expenses/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific expense by ID"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: UUID,
    expense_update: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an expense"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Store old data for history
    old_data = {
        'id': str(expense.id),
        'amount': float(expense.amount),
        'currency': expense.currency,
        'description': expense.description,
        'date': expense.date.isoformat(),
    }
    
    update_data = expense_update.model_dump(exclude_unset=True)
    changed_fields = list(update_data.keys())
    for field, value in update_data.items():
        setattr(expense, field, value)
    
    db.commit()
    db.refresh(expense)
    
    # Log history
    if changed_fields:
        new_data = {
            'id': str(expense.id),
            'amount': float(expense.amount),
            'currency': expense.currency,
            'description': expense.description,
            'date': expense.date.isoformat(),
        }
        history_entry = ExpenseHistory(
            expense_id=expense.id,
            action='update',
            user_id=current_user.id,
            username=current_user.username or current_user.email or 'unknown',
            description=f"Updated expense: {expense.description} (changed: {', '.join(changed_fields)})",
            old_data=json.dumps(old_data, default=str),
            new_data=json.dumps(new_data, default=str)
        )
        db.add(history_entry)
        db.commit()
    
    return expense


@router.delete("/expenses/{expense_id}", status_code=204)
async def delete_expense(
    expense_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an expense"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Store data for history before deletion
    old_data = {
        'id': str(expense.id),
        'amount': float(expense.amount),
        'currency': expense.currency,
        'description': expense.description,
        'date': expense.date.isoformat(),
    }
    
    # Log history BEFORE deletion
    history_entry = ExpenseHistory(
        expense_id=expense.id,  # Keep reference even after deletion
        action='delete',
        user_id=current_user.id,
        username=current_user.username or current_user.email or 'unknown',
        description=f"Deleted expense: {expense.description}",
        old_data=json.dumps(old_data, default=str)
    )
    db.add(history_entry)
    
    db.delete(expense)
    db.commit()
    return None
