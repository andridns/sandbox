from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, case
from typing import Optional, List, Dict
from datetime import date
from uuid import UUID
from decimal import Decimal
import json
import logging
import traceback

from app.database import get_db
from app.models.expense import Expense
from app.models.history import ExpenseHistory
from app.models.category import Category
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from app.core.auth import get_current_user
from app.services.currency import get_exchange_rates

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/expenses", response_model=List[ExpenseResponse])
async def get_expenses(
    category_id: Optional[UUID] = Query(None, description="Single category ID (deprecated, use category_ids)"),
    category_ids: Optional[List[UUID]] = Query(None, description="Multiple category IDs for OR filtering"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    tags: Optional[str] = Query(None),  # comma-separated tags
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

    # Apply filters - support both single category_id (backward compatibility) and multiple category_ids
    if category_ids:
        query = query.filter(Expense.category_id.in_(category_ids))
    elif category_id:
        query = query.filter(Expense.category_id == category_id)
    
    if start_date:
        query = query.filter(Expense.date >= start_date)
    
    if end_date:
        query = query.filter(Expense.date <= end_date)
    
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",")]
        query = query.filter(Expense.tags.contains(tag_list))
    
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
    # Get category name if category_id exists
    category_name = None
    if db_expense.category_id:
        category = db.query(Category).filter(Category.id == db_expense.category_id).first()
        category_name = category.name if category else None
    
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
            'category_id': str(db_expense.category_id) if db_expense.category_id else None,
            'category_name': category_name,
            'tags': db_expense.tags if db_expense.tags else [],
            'location': db_expense.location,
            'notes': db_expense.notes,
            'is_recurring': db_expense.is_recurring,
            'receipt_url': db_expense.receipt_url,
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
    # Get old category name if category_id exists
    old_category_name = None
    if expense.category_id:
        old_category = db.query(Category).filter(Category.id == expense.category_id).first()
        old_category_name = old_category.name if old_category else None
    
    old_data = {
        'id': str(expense.id),
        'amount': float(expense.amount),
        'currency': expense.currency,
        'description': expense.description,
        'date': expense.date.isoformat(),
        'category_id': str(expense.category_id) if expense.category_id else None,
        'category_name': old_category_name,
        'tags': expense.tags if expense.tags else [],
        'location': expense.location,
        'notes': expense.notes,
        'is_recurring': expense.is_recurring,
        'receipt_url': expense.receipt_url,
    }
    
    update_data = expense_update.model_dump(exclude_unset=True)
    changed_fields = list(update_data.keys())
    for field, value in update_data.items():
        setattr(expense, field, value)
    
    db.commit()
    db.refresh(expense)
    
    # Log history
    if changed_fields:
        # Get new category name if category_id exists
        new_category_name = None
        if expense.category_id:
            new_category = db.query(Category).filter(Category.id == expense.category_id).first()
            new_category_name = new_category.name if new_category else None
        
        new_data = {
            'id': str(expense.id),
            'amount': float(expense.amount),
            'currency': expense.currency,
            'description': expense.description,
            'date': expense.date.isoformat(),
            'category_id': str(expense.category_id) if expense.category_id else None,
            'category_name': new_category_name,
            'tags': expense.tags if expense.tags else [],
            'location': expense.location,
            'notes': expense.notes,
            'is_recurring': expense.is_recurring,
            'receipt_url': expense.receipt_url,
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
    # #region agent log
    import os
    log_path = '/Users/andri.danusasmita/github/andridns/sandbox/.cursor/debug.log'
    import json as json_lib
    import time
    try:
        with open(log_path, 'a') as f:
            f.write(json_lib.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'A', 'location': 'expenses.py:250', 'message': 'delete_expense entry', 'data': {'expense_id': str(expense_id), 'user_id': str(current_user.id)}, 'timestamp': int(time.time() * 1000)}) + '\n')
    except: pass
    # #endregion
    
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    
    # #region agent log
    try:
        with open(log_path, 'a') as f:
            f.write(json_lib.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'A', 'location': 'expenses.py:252', 'message': 'expense query result', 'data': {'expense_found': expense is not None, 'expense_id': str(expense_id)}, 'timestamp': int(time.time() * 1000)}) + '\n')
    except: pass
    # #endregion
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Store data for history before deletion
    # Get category name if category_id exists
    category_name = None
    if expense.category_id:
        category = db.query(Category).filter(Category.id == expense.category_id).first()
        category_name = category.name if category else None
    
    old_data = {
        'id': str(expense.id),
        'amount': float(expense.amount),
        'currency': expense.currency,
        'description': expense.description,
        'date': expense.date.isoformat(),
        'category_id': str(expense.category_id) if expense.category_id else None,
        'category_name': category_name,
        'tags': expense.tags if expense.tags else [],
        'location': expense.location,
        'notes': expense.notes,
        'is_recurring': expense.is_recurring,
        'receipt_url': expense.receipt_url,
    }
    
    try:
        # #region agent log
        try:
            with open(log_path, 'a') as f:
                f.write(json_lib.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'B', 'location': 'expenses.py:265', 'message': 'before creating history entry', 'data': {'expense_id': str(expense.id)}, 'timestamp': int(time.time() * 1000)}) + '\n')
        except: pass
        # #endregion
        
        # Update any existing history entries for this expense to set expense_id to None
        # This is a workaround for PostgreSQL foreign key constraints until migration 005 is applied
        # After migration 005, PostgreSQL will automatically set expense_id to NULL via ON DELETE SET NULL
        # #region agent log
        try:
            existing_history_count = db.query(ExpenseHistory).filter(ExpenseHistory.expense_id == expense_id).count()
            with open(log_path, 'a') as f:
                f.write(json_lib.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'C', 'location': 'expenses.py:294', 'message': 'before updating existing history', 'data': {'expense_id': str(expense_id), 'existing_history_count': existing_history_count}, 'timestamp': int(time.time() * 1000)}) + '\n')
        except: pass
        # #endregion
        
        try:
            # Update existing history entries by fetching and updating individually
            # Flush after update to ensure PostgreSQL sees the changes before delete
            existing_history_entries = db.query(ExpenseHistory).filter(ExpenseHistory.expense_id == expense_id).all()
            for history_entry in existing_history_entries:
                history_entry.expense_id = None
            # Flush to make the updates visible to PostgreSQL before delete
            db.flush()
            # #region agent log
            try:
                with open(log_path, 'a') as f:
                    f.write(json_lib.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'C', 'location': 'expenses.py:307', 'message': 'existing history updated and flushed', 'data': {'updated_count': len(existing_history_entries)}, 'timestamp': int(time.time() * 1000)}) + '\n')
            except: pass
            # #endregion
        except Exception as update_error:
            # #region agent log
            try:
                with open(log_path, 'a') as f:
                    f.write(json_lib.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'C', 'location': 'expenses.py:309', 'message': 'update existing history failed', 'data': {'error': str(update_error), 'error_type': type(update_error).__name__}, 'timestamp': int(time.time() * 1000)}) + '\n')
            except: pass
            # #endregion
            logger.error(f"Failed to update existing history entries: {str(update_error)}")
            logger.error(traceback.format_exc())
            # Continue anyway - we'll try to create the new history entry
        
        # Log history BEFORE deletion
        # Set expense_id to None to avoid foreign key constraint issues
        # The old_data JSON contains all the expense information we need
        history_entry = ExpenseHistory(
            expense_id=None,  # Set to None to allow expense deletion
            action='delete',
            user_id=current_user.id,
            username=current_user.username or current_user.email or 'unknown',
            description=f"Deleted expense: {expense.description}",
            old_data=json.dumps(old_data, default=str)
        )
        db.add(history_entry)
        
        # #region agent log
        try:
            with open(log_path, 'a') as f:
                f.write(json_lib.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'B', 'location': 'expenses.py:300', 'message': 'history entry added', 'data': {'history_entry_id': str(history_entry.id)}, 'timestamp': int(time.time() * 1000)}) + '\n')
        except: pass
        # #endregion
        
        # #region agent log
        try:
            with open(log_path, 'a') as f:
                f.write(json_lib.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'D', 'location': 'expenses.py:302', 'message': 'before deleting expense', 'data': {'expense_id': str(expense.id)}, 'timestamp': int(time.time() * 1000)}) + '\n')
        except: pass
        # #endregion
        
        db.delete(expense)
        
        # #region agent log
        try:
            with open(log_path, 'a') as f:
                f.write(json_lib.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'D', 'location': 'expenses.py:305', 'message': 'expense marked for deletion', 'data': {}, 'timestamp': int(time.time() * 1000)}) + '\n')
        except: pass
        # #endregion
        
        # #region agent log
        try:
            with open(log_path, 'a') as f:
                f.write(json_lib.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'D', 'location': 'expenses.py:307', 'message': 'before commit', 'data': {}, 'timestamp': int(time.time() * 1000)}) + '\n')
        except: pass
        # #endregion
        
        db.commit()
        
        # #region agent log
        try:
            with open(log_path, 'a') as f:
                f.write(json_lib.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'D', 'location': 'expenses.py:309', 'message': 'commit successful', 'data': {}, 'timestamp': int(time.time() * 1000)}) + '\n')
        except: pass
        # #endregion
        
        logger.info(f"Successfully deleted expense {expense_id} by user {current_user.id}")
    except HTTPException:
        raise
    except Exception as e:
        # #region agent log
        try:
            with open(log_path, 'a') as f:
                f.write(json_lib.dumps({'sessionId': 'debug-session', 'runId': 'run1', 'hypothesisId': 'D', 'location': 'expenses.py:315', 'message': 'delete/commit failed', 'data': {'error': str(e), 'error_type': type(e).__name__, 'traceback': traceback.format_exc()}, 'timestamp': int(time.time() * 1000)}) + '\n')
        except: pass
        # #endregion
        db.rollback()
        logger.error(f"Failed to delete expense {expense_id}: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete expense: {str(e)}"
        )
    
    return None
