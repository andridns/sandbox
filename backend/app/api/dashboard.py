from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from app.database import get_db
from app.models.expense import Expense
from app.models.user import User
from app.services.cache import cache
from app.services.currency import convert_currency
from app.core.auth import get_current_user

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_data(
    start_date: Optional[date] = Query(None, description="Start date for filtering expenses"),
    end_date: Optional[date] = Query(None, description="End date for filtering expenses"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Combined dashboard endpoint with caching.
    Returns summary, category breakdown, top expenses, and monthly trend in a single request.
    """

    # Generate cache key based on date range
    cache_key = f"dashboard:{start_date}:{end_date}"

    # Check cache first
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data

    # Build base query with eager loading
    query = db.query(Expense).options(joinedload(Expense.category))

    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)

    expenses = query.all()

    # Calculate summary and category breakdown
    total_idr = Decimal('0')
    category_totals = {}

    for expense in expenses:
        # Convert to IDR
        if expense.currency == "IDR":
            amount_idr = expense.amount
        else:
            try:
                converted = await convert_currency(float(expense.amount), expense.currency, "IDR")
                amount_idr = Decimal(str(converted))
            except Exception:
                # If conversion fails, use original amount
                amount_idr = expense.amount

        total_idr += amount_idr

        # Aggregate by category
        cat_name = expense.category.name if expense.category else "Uncategorized"
        if cat_name not in category_totals:
            category_totals[cat_name] = {
                "total": Decimal('0'),
                "count": 0
            }
        category_totals[cat_name]["total"] += amount_idr
        category_totals[cat_name]["count"] += 1

    # Top expenses (last 10, sorted by date descending)
    top_expenses_list = sorted(expenses, key=lambda e: e.date, reverse=True)[:10]

    # Monthly trend (last 6 months of IDR expenses only - simplified for performance)
    six_months_ago = date.today() - timedelta(days=180)
    trend_query = db.query(
        extract('year', Expense.date).label('year'),
        extract('month', Expense.date).label('month'),
        func.sum(Expense.amount).label('total')
    ).filter(
        Expense.currency == "IDR",
        Expense.date >= six_months_ago
    ).group_by('year', 'month').order_by('year', 'month').all()

    # Build response
    result = {
        "summary": {
            "total": float(total_idr),
            "currency": "IDR",
            "expense_count": len(expenses),
            "date_range": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None
            }
        },
        "category_breakdown": [
            {
                "category": cat,
                "total": float(data["total"]),
                "count": data["count"],
                "percentage": float((data["total"] / total_idr * 100) if total_idr > 0 else 0)
            }
            for cat, data in sorted(category_totals.items(), key=lambda x: x[1]["total"], reverse=True)
        ],
        "top_expenses": [
            {
                "id": str(e.id),
                "description": e.description,
                "amount": float(e.amount),
                "currency": e.currency,
                "date": e.date.isoformat(),
                "category": e.category.name if e.category else None
            }
            for e in top_expenses_list
        ],
        "monthly_trend": [
            {
                "year": int(row.year),
                "month": int(row.month),
                "total": float(row.total)
            }
            for row in trend_query
        ]
    }

    # Cache for 5 minutes
    cache.set(cache_key, result, ttl_seconds=300)

    return result
