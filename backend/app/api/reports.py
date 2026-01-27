from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional, List
from datetime import date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

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
    period: Optional[str] = Query("monthly"),  # monthly, quarterly, semester, yearly
    category_id: Optional[str] = Query(None, description="Single category ID (deprecated, use category_ids)"),
    category_ids: Optional[List[str]] = Query(None, description="Multiple category IDs for OR filtering"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get spending trends grouped by period"""
    
    # Build base query
    query = db.query(Expense)
    
    # Filter by category if provided - support both single category_id (backward compatibility) and multiple category_ids
    if category_ids:
        try:
            uuid_list = [UUID(cid) for cid in category_ids]
            query = query.filter(Expense.category_id.in_(uuid_list))
        except (ValueError, TypeError):
            pass  # Invalid UUID, ignore filter
    elif category_id:
        try:
            query = query.filter(Expense.category_id == UUID(category_id))
        except ValueError:
            pass  # Invalid UUID, ignore filter
    
    if period == "yearly":
        # Group by year
        results = db.query(
            extract('year', Expense.date).label('year'),
            func.sum(Expense.amount).label('total')
        )
        if category_ids:
            try:
                uuid_list = [UUID(cid) for cid in category_ids]
                results = results.filter(Expense.category_id.in_(uuid_list))
            except (ValueError, TypeError):
                pass
        elif category_id:
            try:
                results = results.filter(Expense.category_id == UUID(category_id))
            except ValueError:
                pass
        results = results.group_by('year').order_by('year').all()
        
        trends = []
        for result in results:
            trends.append({
                "period": f"{int(result.year)}",
                "total": float(result.total or 0)
            })
    elif period == "quarterly":
        # Group by quarter (every 3 months)
        # Calculate quarter: (month - 1) // 3 + 1
        results = db.query(
            extract('year', Expense.date).label('year'),
            extract('month', Expense.date).label('month'),
            func.sum(Expense.amount).label('total')
        )
        if category_ids:
            try:
                uuid_list = [UUID(cid) for cid in category_ids]
                results = results.filter(Expense.category_id.in_(uuid_list))
            except (ValueError, TypeError):
                pass
        elif category_id:
            try:
                results = results.filter(Expense.category_id == UUID(category_id))
            except ValueError:
                pass
        results = results.group_by('year', 'month').order_by('year', 'month').all()
        
        # Group months into quarters
        quarterly_data = {}
        for result in results:
            quarter = ((int(result.month) - 1) // 3) + 1
            key = f"{int(result.year)}-Q{quarter}"
            if key not in quarterly_data:
                quarterly_data[key] = 0.0
            quarterly_data[key] += float(result.total or 0)
        
        trends = []
        for key in sorted(quarterly_data.keys()):
            trends.append({
                "period": key,
                "total": quarterly_data[key]
            })
    elif period == "semester":
        # Group by semester (every 6 months)
        # Semester 1: Jan-Jun (months 1-6), Semester 2: Jul-Dec (months 7-12)
        results = db.query(
            extract('year', Expense.date).label('year'),
            extract('month', Expense.date).label('month'),
            func.sum(Expense.amount).label('total')
        )
        if category_ids:
            try:
                uuid_list = [UUID(cid) for cid in category_ids]
                results = results.filter(Expense.category_id.in_(uuid_list))
            except (ValueError, TypeError):
                pass
        elif category_id:
            try:
                results = results.filter(Expense.category_id == UUID(category_id))
            except ValueError:
                pass
        results = results.group_by('year', 'month').order_by('year', 'month').all()
        
        # Group months into semesters
        semester_data = {}
        for result in results:
            semester = 1 if int(result.month) <= 6 else 2
            key = f"{int(result.year)}-S{semester}"
            if key not in semester_data:
                semester_data[key] = 0.0
            semester_data[key] += float(result.total or 0)
        
        trends = []
        for key in sorted(semester_data.keys()):
            trends.append({
                "period": key,
                "total": semester_data[key]
            })
    else:  # monthly
        # Group by month
        results = db.query(
            extract('year', Expense.date).label('year'),
            extract('month', Expense.date).label('month'),
            func.sum(Expense.amount).label('total')
        )
        if category_ids:
            try:
                uuid_list = [UUID(cid) for cid in category_ids]
                results = results.filter(Expense.category_id.in_(uuid_list))
            except (ValueError, TypeError):
                pass
        elif category_id:
            try:
                results = results.filter(Expense.category_id == UUID(category_id))
            except ValueError:
                pass
        results = results.group_by('year', 'month').order_by('year', 'month').all()
        
        trends = []
        for result in results:
            trends.append({
                "period": f"{int(result.year)}-{int(result.month):02d}",
                "total": float(result.total or 0)
            })
    
    return {
        "period": period,
        "trends": trends
    }


@router.get("/reports/category-breakdown")
async def get_category_breakdown(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    period_type: Optional[str] = Query(None, description="Period type: monthly, quarterly, semester, yearly"),
    period_value: Optional[str] = Query(None, description="Specific period value (e.g., '2025', '2025-03', '2025-Q1', '2025-S1')"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get category-wise breakdown with optional period-based filtering and IDR conversion"""
    
    # Calculate date range based on period_value or period_type if start_date/end_date not provided
    today = date.today()
    
    if not start_date or not end_date:
        if period_value:
            # Parse specific period value (same logic as top-expenses)
            if "-Q" in period_value:
                # Quarterly format: "2025-Q1"
                parts = period_value.split("-Q")
                if len(parts) == 2:
                    year = int(parts[0])
                    quarter = int(parts[1])
                    start_month = ((quarter - 1) * 3) + 1
                    end_month = quarter * 3
                    start_date = date(year, start_month, 1)
                    if end_month == 12:
                        end_date = date(year, 12, 31)
                    else:
                        end_date = date(year, end_month + 1, 1) - timedelta(days=1)
                else:
                    start_date = date(today.year, 1, 1)
                    end_date = date(today.year, 12, 31)
            elif "-S" in period_value:
                # Semester format: "2025-S1" or "2025-S2"
                parts = period_value.split("-S")
                if len(parts) == 2:
                    year = int(parts[0])
                    semester = int(parts[1])
                    if semester == 1:
                        # Semester 1: Jan-Jun
                        start_date = date(year, 1, 1)
                        end_date = date(year, 6, 30)
                    elif semester == 2:
                        # Semester 2: Jul-Dec
                        start_date = date(year, 7, 1)
                        end_date = date(year, 12, 31)
                    else:
                        # Invalid semester, fallback to current year
                        start_date = date(today.year, 1, 1)
                        end_date = date(today.year, 12, 31)
                else:
                    start_date = date(today.year, 1, 1)
                    end_date = date(today.year, 12, 31)
            elif "-" in period_value:
                # Monthly format: "2025-03"
                parts = period_value.split("-")
                if len(parts) == 2:
                    year = int(parts[0])
                    month = int(parts[1])
                    start_date = date(year, month, 1)
                    if month == 12:
                        end_date = date(year, 12, 31)
                    else:
                        end_date = date(year, month + 1, 1) - timedelta(days=1)
                else:
                    start_date = date(today.year, today.month, 1)
                    if today.month == 12:
                        end_date = date(today.year, 12, 31)
                    else:
                        end_date = date(today.year, today.month + 1, 1) - timedelta(days=1)
            elif period_value.isdigit():
                # Yearly format: "2025"
                year = int(period_value)
                start_date = date(year, 1, 1)
                end_date = date(year, 12, 31)
            else:
                # Fallback to current period based on period_type
                if period_type == "yearly":
                    start_date = date(today.year, 1, 1)
                    end_date = date(today.year, 12, 31)
                elif period_type == "semester":
                    current_semester = 1 if today.month <= 6 else 2
                    if current_semester == 1:
                        start_date = date(today.year, 1, 1)
                        end_date = date(today.year, 6, 30)
                    else:
                        start_date = date(today.year, 7, 1)
                        end_date = date(today.year, 12, 31)
                elif period_type == "quarterly":
                    current_quarter = ((today.month - 1) // 3) + 1
                    start_month = ((current_quarter - 1) * 3) + 1
                    end_month = current_quarter * 3
                    start_date = date(today.year, start_month, 1)
                    if end_month == 12:
                        end_date = date(today.year, 12, 31)
                    else:
                        end_date = date(today.year, end_month + 1, 1) - timedelta(days=1)
                else:  # monthly or default
                    start_date = date(today.year, today.month, 1)
                    if today.month == 12:
                        end_date = date(today.year, 12, 31)
                    else:
                        end_date = date(today.year, today.month + 1, 1) - timedelta(days=1)
        elif period_type:
            # Use period_type to determine current period
            if period_type == "yearly":
                start_date = date(today.year, 1, 1)
                end_date = date(today.year, 12, 31)
            elif period_type == "semester":
                current_semester = 1 if today.month <= 6 else 2
                if current_semester == 1:
                    start_date = date(today.year, 1, 1)
                    end_date = date(today.year, 6, 30)
                else:
                    start_date = date(today.year, 7, 1)
                    end_date = date(today.year, 12, 31)
            elif period_type == "quarterly":
                current_quarter = ((today.month - 1) // 3) + 1
                start_month = ((current_quarter - 1) * 3) + 1
                end_month = current_quarter * 3
                start_date = date(today.year, start_month, 1)
                if end_month == 12:
                    end_date = date(today.year, 12, 31)
                else:
                    end_date = date(today.year, end_month + 1, 1) - timedelta(days=1)
            else:  # monthly
                start_date = date(today.year, today.month, 1)
                if today.month == 12:
                    end_date = date(today.year, 12, 31)
                else:
                    end_date = date(today.year, today.month + 1, 1) - timedelta(days=1)
        else:
            # Default to current month
            start_date = date(today.year, today.month, 1)
            if today.month == 12:
                end_date = date(today.year, 12, 31)
            else:
                end_date = date(today.year, today.month + 1, 1) - timedelta(days=1)
    
    # Use efficient JOIN query to get expenses with categories in one query
    # This avoids N+1 query problems that would occur with Postgres
    # Start from Expense table and LEFT JOIN to Category to handle expenses without categories
    results = db.query(
        Expense.category_id.label('category_id'),
        Category.name.label('category_name'),
        Expense.currency,
        func.sum(Expense.amount).label('total'),
        func.count(Expense.id).label('count')
    ).outerjoin(
        Category, Expense.category_id == Category.id
    ).filter(
        Expense.date >= start_date,
        Expense.date <= end_date
    ).group_by(
        Expense.category_id, Category.name, Expense.currency
    ).all()
    
    if not results:
        return {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "breakdown": []
        }
    
    # Get unique currencies from results and fetch exchange rates for IDR conversion
    currencies = set(result.currency for result in results if result.currency)
    conversion_rates = {}
    
    for curr in currencies:
        currency_upper = curr.upper()
        if currency_upper == "IDR":
            conversion_rates[currency_upper] = Decimal("1.0")
        else:
            try:
                rates = await get_exchange_rates(currency_upper)
                idr_rate = rates.get("IDR")
                if idr_rate:
                    conversion_rates[currency_upper] = Decimal(str(idr_rate))
                else:
                    # Fallback: try via USD
                    usd_rate = rates.get("USD")
                    if usd_rate and usd_rate > 0:
                        usd_rates = await get_exchange_rates("USD")
                        idr_from_usd = usd_rates.get("IDR", 1.0)
                        conversion_rates[currency_upper] = Decimal(str(float(idr_from_usd) / float(usd_rate)))
                    else:
                        conversion_rates[currency_upper] = Decimal("1.0")
            except Exception:
                conversion_rates[currency_upper] = Decimal("1.0")
    
    # Group by category and calculate totals in IDR
    category_totals = {}
    category_counts = {}
    category_names = {}
    
    for result in results:
        category_id = str(result.category_id) if result.category_id else None
        category_name = result.category_name if result.category_name else "Uncategorized"
        
        # Store category name (handle both None and string category_id)
        category_names[category_id] = category_name
        
        # Convert to IDR
        currency_upper = result.currency.upper() if result.currency else "IDR"
        rate = conversion_rates.get(currency_upper, Decimal("1.0"))
        amount_in_idr = Decimal(str(result.total or 0)) * rate
        
        # Accumulate totals
        if category_id not in category_totals:
            category_totals[category_id] = Decimal("0")
            category_counts[category_id] = 0
        
        category_totals[category_id] += amount_in_idr
        category_counts[category_id] += (result.count or 0)
    
    # Build breakdown list
    breakdown = []
    for category_id, total in category_totals.items():
        category_name = category_names.get(category_id, "Uncategorized")
        
        breakdown.append({
            "category_id": category_id or "",
            "category_name": category_name,
            "total": float(total),
            "count": category_counts[category_id]
        })
    
    # Sort by total descending
    breakdown.sort(key=lambda x: x["total"], reverse=True)
    
    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "breakdown": breakdown
    }


@router.get("/reports/top-expenses")
async def get_top_expenses(
    period_type: Optional[str] = Query("monthly", description="Period type: monthly, quarterly, semester, yearly"),
    period_value: Optional[str] = Query(None, description="Specific period value (e.g., '2025', '2025-03', '2025-Q1', '2025-S1')"),
    category_id: Optional[str] = Query(None, description="Single category ID (deprecated, use category_ids)"),
    category_ids: Optional[List[str]] = Query(None, description="Multiple category IDs for OR filtering"),
    limit: int = Query(500, ge=1, le=500, description="Number of top expenses to return"),
    skip: int = Query(0, ge=0, description="Number of expenses to skip for pagination"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get top expenses filtered by period and category, sorted by IDR amount descending"""
    
    # Calculate date range based on period_value or period_type
    today = date.today()
    
    if period_value:
        # Parse specific period value
        # Yearly: "2025"
        # Monthly: "2025-03"
        # Quarterly: "2025-Q1"
        # Semester: "2025-S1"
        if "-Q" in period_value:
            # Quarterly format: "2025-Q1"
            parts = period_value.split("-Q")
            if len(parts) == 2:
                year = int(parts[0])
                quarter = int(parts[1])
                start_month = ((quarter - 1) * 3) + 1
                end_month = quarter * 3
                start_date = date(year, start_month, 1)
                if end_month == 12:
                    end_date = date(year, 12, 31)
                else:
                    end_date = date(year, end_month + 1, 1) - timedelta(days=1)
            else:
                # Fallback to current year
                start_date = date(today.year, 1, 1)
                end_date = date(today.year, 12, 31)
        elif "-S" in period_value:
            # Semester format: "2025-S1" or "2025-S2"
            parts = period_value.split("-S")
            if len(parts) == 2:
                year = int(parts[0])
                semester = int(parts[1])
                if semester == 1:
                    # Semester 1: Jan-Jun
                    start_date = date(year, 1, 1)
                    end_date = date(year, 6, 30)
                elif semester == 2:
                    # Semester 2: Jul-Dec
                    start_date = date(year, 7, 1)
                    end_date = date(year, 12, 31)
                else:
                    # Invalid semester, fallback to current year
                    start_date = date(today.year, 1, 1)
                    end_date = date(today.year, 12, 31)
            else:
                # Fallback to current year
                start_date = date(today.year, 1, 1)
                end_date = date(today.year, 12, 31)
        elif "-" in period_value:
            # Monthly format: "2025-03"
            parts = period_value.split("-")
            if len(parts) == 2:
                year = int(parts[0])
                month = int(parts[1])
                start_date = date(year, month, 1)
                # Get last day of month
                if month == 12:
                    end_date = date(year, 12, 31)
                else:
                    end_date = date(year, month + 1, 1) - timedelta(days=1)
            else:
                # Fallback to current month
                start_date = date(today.year, today.month, 1)
                if today.month == 12:
                    end_date = date(today.year, 12, 31)
                else:
                    end_date = date(today.year, today.month + 1, 1) - timedelta(days=1)
        elif period_value.isdigit():
            # Yearly format: "2025"
            year = int(period_value)
            start_date = date(year, 1, 1)
            end_date = date(year, 12, 31)
        else:
            # Fallback to current period based on period_type
            if period_type == "yearly":
                start_date = date(today.year, 1, 1)
                end_date = date(today.year, 12, 31)
            elif period_type == "semester":
                current_semester = 1 if today.month <= 6 else 2
                if current_semester == 1:
                    start_date = date(today.year, 1, 1)
                    end_date = date(today.year, 6, 30)
                else:
                    start_date = date(today.year, 7, 1)
                    end_date = date(today.year, 12, 31)
            elif period_type == "quarterly":
                current_quarter = ((today.month - 1) // 3) + 1
                start_month = ((current_quarter - 1) * 3) + 1
                end_month = current_quarter * 3
                start_date = date(today.year, start_month, 1)
                if end_month == 12:
                    end_date = date(today.year, 12, 31)
                else:
                    end_date = date(today.year, end_month + 1, 1) - timedelta(days=1)
            else:  # monthly
                start_date = date(today.year, today.month, 1)
                if today.month == 12:
                    end_date = date(today.year, 12, 31)
                else:
                    end_date = date(today.year, today.month + 1, 1) - timedelta(days=1)
    else:
        # Use period_type to determine current period
        if period_type == "yearly":
            start_date = date(today.year, 1, 1)
            end_date = date(today.year, 12, 31)
        elif period_type == "semester":
            # Current semester: S1 (Jan-Jun), S2 (Jul-Dec)
            current_semester = 1 if today.month <= 6 else 2
            if current_semester == 1:
                start_date = date(today.year, 1, 1)
                end_date = date(today.year, 6, 30)
            else:
                start_date = date(today.year, 7, 1)
                end_date = date(today.year, 12, 31)
        elif period_type == "quarterly":
            # Current quarter: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)
            current_quarter = ((today.month - 1) // 3) + 1
            start_month = ((current_quarter - 1) * 3) + 1
            end_month = current_quarter * 3
            start_date = date(today.year, start_month, 1)
            # Get last day of end month
            if end_month == 12:
                end_date = date(today.year, 12, 31)
            else:
                end_date = date(today.year, end_month + 1, 1) - timedelta(days=1)
        else:  # monthly
            start_date = date(today.year, today.month, 1)
            # Get last day of current month
            if today.month == 12:
                end_date = date(today.year, 12, 31)
            else:
                end_date = date(today.year, today.month + 1, 1) - timedelta(days=1)
    
    # Build base query
    query = db.query(Expense).filter(
        Expense.date >= start_date,
        Expense.date <= end_date
    )
    
    # Filter by category if provided
    if category_ids:
        try:
            uuid_list = [UUID(cid) for cid in category_ids]
            query = query.filter(Expense.category_id.in_(uuid_list))
        except (ValueError, TypeError):
            pass  # Invalid UUID, ignore filter
    elif category_id:
        try:
            query = query.filter(Expense.category_id == UUID(category_id))
        except ValueError:
            pass  # Invalid UUID, ignore filter
    
    # Get all expenses matching the filters
    expenses = query.all()
    
    if not expenses:
        return {
            "period_type": period_type,
            "period_value": period_value,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "expenses": [],
            "has_more": False,
            "total_count": 0
        }
    
    # Get unique currencies and fetch exchange rates
    currencies = set(exp.currency for exp in expenses)
    conversion_rates = {}
    
    # Fetch exchange rates for IDR conversion
    for curr in currencies:
        currency_upper = curr.upper()
        if currency_upper == "IDR":
            conversion_rates[currency_upper] = Decimal("1.0")
        else:
            try:
                rates = await get_exchange_rates(currency_upper)
                idr_rate = rates.get("IDR")
                if idr_rate:
                    conversion_rates[currency_upper] = Decimal(str(idr_rate))
                else:
                    # Fallback: try via USD
                    usd_rate = rates.get("USD")
                    if usd_rate and usd_rate > 0:
                        usd_rates = await get_exchange_rates("USD")
                        idr_from_usd = usd_rates.get("IDR", 1.0)
                        conversion_rates[currency_upper] = Decimal(str(float(idr_from_usd) / float(usd_rate)))
                    else:
                        conversion_rates[currency_upper] = Decimal("1.0")
            except Exception:
                conversion_rates[currency_upper] = Decimal("1.0")
    
    # Calculate IDR amounts and create list with expenses
    expenses_with_idr = []
    for expense in expenses:
        currency_upper = expense.currency.upper()
        rate = conversion_rates.get(currency_upper, Decimal("1.0"))
        amount_in_idr = Decimal(str(expense.amount)) * rate
        
        expenses_with_idr.append({
            "expense": expense,
            "amount_in_idr": float(amount_in_idr)
        })
    
    # Sort by IDR amount descending
    expenses_with_idr.sort(key=lambda x: x["amount_in_idr"], reverse=True)
    
    # Calculate total count before pagination
    total_count = len(expenses_with_idr)
    
    # Apply pagination: skip and limit
    paginated_expenses = expenses_with_idr[skip:skip + limit]
    
    # Check if there are more expenses
    has_more = (skip + limit) < total_count
    
    # Convert to response format
    from app.schemas.expense import ExpenseResponse
    result_expenses = []
    for item in paginated_expenses:
        expense_dict = {
            "id": str(item["expense"].id),
            "amount": float(item["expense"].amount),
            "currency": item["expense"].currency,
            "description": item["expense"].description,
            "category_id": str(item["expense"].category_id) if item["expense"].category_id else None,
            "date": item["expense"].date.isoformat(),
            "tags": item["expense"].tags if item["expense"].tags else [],
            "receipt_url": item["expense"].receipt_url,
            "location": item["expense"].location,
            "notes": item["expense"].notes,
            "is_recurring": item["expense"].is_recurring,
            "created_at": item["expense"].created_at.isoformat() if item["expense"].created_at else None,
            "updated_at": item["expense"].updated_at.isoformat() if item["expense"].updated_at else None,
            "amount_in_idr": item["amount_in_idr"]
        }
        result_expenses.append(expense_dict)
    
    return {
        "period_type": period_type,
        "period_value": period_value,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "expenses": result_expenses,
        "has_more": has_more,
        "total_count": total_count
    }
