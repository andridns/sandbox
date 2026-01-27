from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional
from datetime import date
import csv
import io

from app.database import get_db
from app.models.expense import Expense
from app.models.user import User
from app.core.auth import get_current_user

router = APIRouter()


@router.get("/export/csv")
async def export_csv(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export expenses to CSV"""
    # Use eager loading to prevent N+1 queries when accessing category
    query = db.query(Expense).options(joinedload(Expense.category))

    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)

    expenses = query.order_by(Expense.date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header - simplified without removed fields
    writer.writerow([
        "Date", "Amount", "Currency", "Description", "Category"
    ])

    # Data rows
    for expense in expenses:
        writer.writerow([
            expense.date.isoformat(),
            str(expense.amount),
            expense.currency,
            expense.description,
            expense.category.name if expense.category else ""
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=expenses.csv"}
    )


@router.get("/export/count")
async def get_expense_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the total count of expenses/transactions in the database"""
    count = db.query(func.count(Expense.id)).scalar()
    return {"count": count}
