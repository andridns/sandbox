from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

from app.database import get_db
from app.models.expense import Expense
from app.models.category import Category
from app.models.user import User
from app.services.currency import get_exchange_rates
from app.core.auth import get_current_user

router = APIRouter()


@router.get("/reports/summary")
async def get_summary(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    period: Optional[str] = Query("monthly"),  # monthly or yearly
    currency: Optional[str] = Query("IDR", description="Currency to convert all amounts to"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get expense summary with optional currency conversion"""
    query = db.query(Expense)
    
    if not start_date or not end_date:
        # Default to current month/year
        today = date.today()
        if period == "yearly":
            start_date = date(today.year, 1, 1)
            end_date = date(today.year, 12, 31)
        else:
            start_date = date(today.year, today.month, 1)
            # Get last day of month
            if today.month == 12:
                end_date = date(today.year + 1, 1, 1)
            else:
                end_date = date(today.year, today.month + 1, 1)
    
    query = query.filter(Expense.date >= start_date, Expense.date <= end_date)
    
    expenses = query.all()
    total_expenses = len(expenses)
    
    # Calculate totals with currency conversion
    if currency:
        # Get unique currencies
        currencies = set(exp.currency for exp in expenses)
        rates_cache = {}
        
        # Fetch exchange rates for each currency
        for curr in currencies:
            if curr.upper() != currency.upper():
                try:
                    rates = await get_exchange_rates(curr)
                    rates_cache[curr.upper()] = rates.get(currency.upper(), 1.0)
                except Exception:
                    rates_cache[curr.upper()] = 1.0
        
        # Sum with conversion
        total_amount = Decimal("0")
        for expense in expenses:
            if expense.currency.upper() == currency.upper():
                total_amount += Decimal(str(expense.amount))
            else:
                rate = rates_cache.get(expense.currency.upper(), Decimal("1"))
                total_amount += Decimal(str(expense.amount)) * rate
    else:
        # No conversion, sum as-is
        total_amount = db.query(func.sum(Expense.amount)).filter(
            Expense.date >= start_date,
            Expense.date <= end_date
        ).scalar() or Decimal("0")
    
    avg_amount = total_amount / total_expenses if total_expenses > 0 else Decimal("0")
    
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_expenses": total_expenses,
        "total_amount": float(total_amount),
        "average_amount": float(avg_amount),
        "currency": currency or "mixed"
    }


@router.get("/reports/trends")
async def get_trends(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    period: Optional[str] = Query("monthly"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get spending trends"""
    if not start_date or not end_date:
        today = date.today()
        if period == "yearly":
            start_date = date(today.year - 1, 1, 1)
            end_date = date(today.year, 12, 31)
        else:
            # Last 6 months
            start_date = date(today.year, max(1, today.month - 5), 1)
            end_date = date(today.year, today.month, 28)
    
    query = db.query(Expense).filter(
        Expense.date >= start_date,
        Expense.date <= end_date
    )
    
    if period == "yearly":
        # Group by year
        results = db.query(
            extract('year', Expense.date).label('period'),
            func.sum(Expense.amount).label('total')
        ).filter(
            Expense.date >= start_date,
            Expense.date <= end_date
        ).group_by('period').order_by('period').all()
    else:
        # Group by month
        results = db.query(
            extract('year', Expense.date).label('year'),
            extract('month', Expense.date).label('month'),
            func.sum(Expense.amount).label('total')
        ).filter(
            Expense.date >= start_date,
            Expense.date <= end_date
        ).group_by('year', 'month').order_by('year', 'month').all()
    
    trends = []
    for result in results:
        if period == "yearly":
            trends.append({
                "period": f"{int(result.period)}",
                "total": float(result.total)
            })
        else:
            trends.append({
                "period": f"{int(result.year)}-{int(result.month):02d}",
                "total": float(result.total)
            })
    
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "trends": trends
    }


@router.get("/reports/category-breakdown")
async def get_category_breakdown(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get category-wise breakdown"""
    if not start_date or not end_date:
        today = date.today()
        start_date = date(today.year, today.month, 1)
        end_date = date(today.year, today.month, 28)
    
    results = db.query(
        Category.name,
        Category.id,
        func.sum(Expense.amount).label('total'),
        func.count(Expense.id).label('count')
    ).join(
        Expense, Category.id == Expense.category_id, isouter=True
    ).filter(
        Expense.date >= start_date,
        Expense.date <= end_date
    ).group_by(Category.id, Category.name).all()
    
    breakdown = []
    for result in results:
        breakdown.append({
            "category_id": str(result.id),
            "category_name": result.name,
            "total": float(result.total or 0),
            "count": result.count or 0
        })
    
    # Sort by total descending
    breakdown.sort(key=lambda x: x["total"], reverse=True)
    
    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "breakdown": breakdown
    }
