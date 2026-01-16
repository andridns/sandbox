from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date

from app.database import get_db
from app.models.budget import Budget
from app.models.expense import Expense
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse
from app.services.currency import get_exchange_rates
from app.core.auth import get_current_user

router = APIRouter()


@router.get("/budgets", response_model=List[BudgetResponse])
async def get_budgets(
    period: Optional[str] = Query(None),
    category_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all budgets with optional filters"""
    query = db.query(Budget)
    
    if period:
        query = query.filter(Budget.period == period)
    
    if category_id:
        query = query.filter(Budget.category_id == category_id)
    
    budgets = query.order_by(Budget.created_at.desc()).all()
    return budgets


@router.get("/budgets/{budget_id}", response_model=BudgetResponse)
async def get_budget(
    budget_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific budget by ID"""
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return budget


@router.get("/budgets/{budget_id}/spent")
async def get_budget_spent(
    budget_id: UUID,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get total spent amount for a budget, with currency conversion.
    Expenses in different currencies are converted to the budget's currency.
    """
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    # Use budget date range if not provided
    if not start_date:
        start_date = budget.start_date
    if not end_date:
        end_date = budget.end_date
    
    # Get expenses for this budget
    query = db.query(Expense).filter(
        Expense.date >= start_date,
        Expense.date <= end_date
    )
    
    if budget.category_id:
        query = query.filter(Expense.category_id == budget.category_id)
    
    expenses = query.all()
    
    # Get exchange rates for all unique currencies in expenses
    currencies = set(exp.currency for exp in expenses)
    rates_cache = {}
    
    for currency in currencies:
        if currency.upper() != budget.currency.upper():
            try:
                rates = await get_exchange_rates(currency)
                rates_cache[currency.upper()] = rates.get(budget.currency.upper(), 1.0)
            except Exception:
                # If conversion fails, use 1:1 (better than erroring)
                rates_cache[currency.upper()] = 1.0
    
    # Calculate total spent with conversion
    total_spent = 0.0
    for expense in expenses:
        if expense.currency.upper() == budget.currency.upper():
            total_spent += float(expense.amount)
        else:
            rate = rates_cache.get(expense.currency.upper(), 1.0)
            total_spent += float(expense.amount) * rate
    
    return {
        "budget_id": str(budget.id),
        "budget_amount": float(budget.amount),
        "budget_currency": budget.currency,
        "spent_amount": total_spent,
        "spent_currency": budget.currency,
        "remaining": float(budget.amount) - total_spent,
        "percentage": (total_spent / float(budget.amount)) * 100 if budget.amount > 0 else 0
    }


@router.post("/budgets", response_model=BudgetResponse, status_code=201)
async def create_budget(
    budget: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new budget"""
    db_budget = Budget(**budget.model_dump())
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget


@router.put("/budgets/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: UUID,
    budget_update: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a budget"""
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    update_data = budget_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(budget, field, value)
    
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/budgets/{budget_id}", status_code=204)
async def delete_budget(
    budget_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a budget"""
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    db.delete(budget)
    db.commit()
    return None
