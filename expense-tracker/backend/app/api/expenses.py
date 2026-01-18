from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, case
from typing import Optional, List, Dict
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
from app.services.currency import get_exchange_rates

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
    
    # Handle amount filtering with currency conversion to IDR
    if min_amount is not None or max_amount is not None:
        # Get unique currencies from expenses
        unique_currencies = db.query(Expense.currency).distinct().all()
        currencies = [curr[0] for curr in unique_currencies]
        
        # If no currencies found, apply simple filtering
        if not currencies:
            if min_amount is not None:
                query = query.filter(Expense.amount >= Decimal(str(min_amount)))
            if max_amount is not None:
                query = query.filter(Expense.amount <= Decimal(str(max_amount)))
        else:
            # Fetch exchange rates for IDR conversion
            # For each currency, fetch rates with that currency as base to get IDR rate directly
            try:
                # Build conversion rates dictionary: currency -> IDR rate
                conversion_rates: Dict[str, Decimal] = {}
                
                # Fetch USD rates once (most common base currency)
                usd_rates = await get_exchange_rates("USD")
                idr_from_usd = usd_rates.get("IDR", 1.0)
                
                for currency in currencies:
                    currency_upper = currency.upper()
                    if currency_upper == "IDR":
                        conversion_rates[currency] = Decimal("1.0")
                    elif currency_upper == "USD":
                        conversion_rates[currency] = Decimal(str(idr_from_usd))
                    else:
                        # Fetch rates for this currency (base = currency)
                        # The API returns rates[IDR] which is IDR per 1 unit of currency
                        try:
                            curr_rates = await get_exchange_rates(currency_upper)
                            idr_rate = curr_rates.get("IDR")
                            if idr_rate:
                                conversion_rates[currency] = Decimal(str(idr_rate))
                            else:
                                # Fallback: convert via USD
                                usd_rate = curr_rates.get("USD")
                                if usd_rate and usd_rate > 0:
                                    # Currency -> USD -> IDR: amount * (IDR_rate / USD_rate)
                                    conversion_rates[currency] = Decimal(str(float(idr_from_usd) / float(usd_rate)))
                                else:
                                    # If conversion not possible, use 1:1 (no conversion)
                                    conversion_rates[currency] = Decimal("1.0")
                        except Exception:
                            # Fallback: if we can't get rates, assume 1:1 (no conversion)
                            conversion_rates[currency] = Decimal("1.0")
                
                # Build CASE statement to convert amounts to IDR
                when_conditions = [
                    (Expense.currency == currency, Expense.amount * conversion_rates[currency])
                    for currency in conversion_rates.keys()
                ]
                amount_in_idr = case(*[(condition, result) for condition, result in when_conditions], else_=Expense.amount)
                
                # Filter on IDR-equivalent amounts
                if min_amount is not None:
                    query = query.filter(amount_in_idr >= Decimal(str(min_amount)))
                
                if max_amount is not None:
                    query = query.filter(amount_in_idr <= Decimal(str(max_amount)))
            except Exception as e:
                # If currency conversion fails, fall back to original filtering (by original currency amount)
                # This ensures the API doesn't break if exchange rate API is unavailable
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
