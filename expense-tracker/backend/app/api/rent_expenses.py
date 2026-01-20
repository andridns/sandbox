from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional, List
from decimal import Decimal
from uuid import UUID

from app.database import get_db
from app.models.rent_expense import RentExpense
from app.models.user import User
from app.core.auth import get_current_user
from app.schemas.rent_expense import (
    RentExpenseResponse,
    RentExpenseTrend,
    RentExpenseTrendItem,
    RentExpenseBreakdown,
    RentExpenseBreakdownItem,
)

router = APIRouter()


@router.get("/rent-expenses", response_model=List[RentExpenseResponse])
async def get_rent_expenses(
    period: Optional[str] = Query(None, description="Filter by period (YYYY-MM format)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all rent expenses, optionally filtered by period"""
    query = db.query(RentExpense)
    
    if period:
        query = query.filter(RentExpense.period == period)
    
    rent_expenses = query.order_by(RentExpense.period.desc()).all()
    return rent_expenses


# IMPORTANT: These specific routes must come BEFORE the parameterized route
# Otherwise FastAPI will match /trends and /breakdown to /{period}
@router.get("/rent-expenses/trends", response_model=RentExpenseTrend)
async def get_rent_expense_trends(
    period_type: Optional[str] = Query("monthly", description="Period type: 'monthly' or 'yearly'"),
    categories: Optional[List[str]] = Query(None, description="Filter by categories (electricity, water, service_charge, sinking_fund, fitout)"),
    usage_view: Optional[str] = Query("cost", description="View type: 'cost', 'electricity_usage', or 'water_usage'"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get rent expense trends grouped by period, optionally filtered by categories or showing usage data"""
    
    # Get all expenses
    all_expenses = db.query(RentExpense).all()
    
    # Handle usage views (electricity kWh or water m³)
    if usage_view == "electricity_usage":
        # Show electricity usage in kWh
        period_totals = {}
        for expense in all_expenses:
            if expense.electric_kwh is None:
                continue  # Skip if no usage data
            
            if period_type == "yearly":
                period_key = expense.period[:4]  # Extract year
            else:
                period_key = expense.period
            
            if period_key not in period_totals:
                period_totals[period_key] = 0.0
            period_totals[period_key] += float(expense.electric_kwh)
        
        trends = []
        for period_key in sorted(period_totals.keys()):
            trends.append({
                "period": period_key,
                "total": period_totals[period_key]
            })
        
        return {
            "period_type": period_type,
            "trends": trends
        }
    
    elif usage_view == "water_usage":
        # Show water usage in m³
        period_totals = {}
        for expense in all_expenses:
            if expense.water_m3 is None:
                continue  # Skip if no usage data
            
            if period_type == "yearly":
                period_key = expense.period[:4]  # Extract year
            else:
                period_key = expense.period
            
            if period_key not in period_totals:
                period_totals[period_key] = 0.0
            period_totals[period_key] += float(expense.water_m3)
        
        trends = []
        for period_key in sorted(period_totals.keys()):
            trends.append({
                "period": period_key,
                "total": period_totals[period_key]
            })
        
        return {
            "period_type": period_type,
            "trends": trends
        }
    
    else:
        # Cost view - build the sum expression based on selected categories
        if categories and len(categories) > 0:
            # Calculate sum based on selected categories
            period_totals = {}
            for expense in all_expenses:
                total = 0.0
                if 'electricity' in categories:
                    total += float(expense.electric_m1_total_idr or 0)
                if 'water' in categories:
                    total += float(expense.water_m1_total_idr or 0)
                if 'service_charge' in categories:
                    total += float(expense.service_charge_idr or 0) + float(expense.ppn_service_charge_idr or 0)
                if 'sinking_fund' in categories:
                    total += float(expense.sinking_fund_idr or 0)
                if 'fitout' in categories:
                    total += float(expense.fitout_idr or 0)
                
                if period_type == "yearly":
                    period_key = expense.period[:4]  # Extract year
                else:
                    period_key = expense.period
                
                if period_key not in period_totals:
                    period_totals[period_key] = 0.0
                period_totals[period_key] += total
            
            # Convert to trends list
            trends = []
            for period_key in sorted(period_totals.keys()):
                trends.append({
                    "period": period_key,
                    "total": period_totals[period_key]
                })
            
            return {
                "period_type": period_type,
                "trends": trends
            }
        else:
            # No categories selected, use total
            if period_type == "yearly":
                # Group by year - extract first 4 characters of period
                year_expr = func.substr(RentExpense.period, 1, 4).label('year')
                results = db.query(
                    year_expr,
                    func.sum(RentExpense.total_idr).label('total')
                ).group_by(year_expr).order_by(year_expr).all()
                
                trends = []
                for result in results:
                    trends.append({
                        "period": str(result.year),
                        "total": float(result.total or 0)
                    })
            else:  # monthly
                # Group by month (period is already in YYYY-MM format)
                results = db.query(
                    RentExpense.period,
                    func.sum(RentExpense.total_idr).label('total')
                ).group_by(RentExpense.period).order_by(RentExpense.period).all()
                
                trends = []
                for result in results:
                    trends.append({
                        "period": result.period,
                        "total": float(result.total or 0)
                    })
            
            return {
                "period_type": period_type,
                "trends": trends
            }


@router.get("/rent-expenses/breakdown", response_model=RentExpenseBreakdown)
async def get_rent_expense_breakdown(
    period: Optional[str] = Query(None, description="Filter by period (YYYY-MM format)"),
    category: Optional[str] = Query(None, description="Filter by category (electricity, water, service_charge, sinking_fund, fitout)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get rent expense breakdown by category"""
    
    query = db.query(RentExpense)
    
    if period:
        query = query.filter(RentExpense.period == period)
    
    rent_expenses = query.all()
    
    if not rent_expenses:
        return {
            "period": period,
            "breakdown": []
        }
    
    # Calculate totals for each category
    breakdown_data = {
        "electricity": 0.0,
        "water": 0.0,
        "service_charge": 0.0,
        "sinking_fund": 0.0,
        "fitout": 0.0,
    }
    
    count = len(rent_expenses)
    
    for expense in rent_expenses:
        breakdown_data["electricity"] += float(expense.electric_m1_total_idr or 0)
        breakdown_data["water"] += float(expense.water_m1_total_idr or 0)
        breakdown_data["service_charge"] += float(expense.service_charge_idr or 0) + float(expense.ppn_service_charge_idr or 0)
        breakdown_data["sinking_fund"] += float(expense.sinking_fund_idr or 0)
        breakdown_data["fitout"] += float(expense.fitout_idr or 0)
    
    # Filter by category if specified
    if category:
        if category not in breakdown_data:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
        breakdown_data = {category: breakdown_data[category]}
    
    # Convert to list format
    breakdown = []
    for cat, total in breakdown_data.items():
        if total > 0:  # Only include categories with values
            breakdown.append({
                "category": cat,
                "total": total,
                "count": count
            })
    
    # Sort by total descending
    breakdown.sort(key=lambda x: x["total"], reverse=True)
    
    return {
        "period": period,
        "breakdown": breakdown
    }


@router.get("/rent-expenses/{period}", response_model=RentExpenseResponse)
async def get_rent_expense_by_period(
    period: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get rent expense for a specific period"""
    rent_expense = db.query(RentExpense).filter(RentExpense.period == period).first()
    
    if not rent_expense:
        raise HTTPException(status_code=404, detail=f"Rent expense not found for period {period}")
    
    return rent_expense
