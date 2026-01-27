"""
Import API endpoints for Excel file imports
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from pathlib import Path
from app.database import get_db
from app.models.expense import Expense
from app.models.category import Category
from app.services.excel_import import ExcelImportService
from app.services.category_matcher import CategoryMatcher
from app.schemas.expense import ExpenseCreate
from decimal import Decimal
from datetime import date, datetime

router = APIRouter()

# Max file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024

# Allowed extensions
ALLOWED_EXTENSIONS = {".xlsx", ".xls"}


@router.post("/import/excel")
async def import_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Import expenses from Excel file with smart categorization
    """
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    contents = await file.read()
    
    # Check file size
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    # Parse Excel file
    import_service = ExcelImportService(contents)
    expenses_data, parse_errors = import_service.parse()
    
    if not expenses_data and not parse_errors:
        raise HTTPException(
            status_code=400,
            detail="No data found in Excel file"
        )
    
    # Initialize category matcher
    category_matcher = CategoryMatcher(db)
    
    # Process expenses
    imported_count = 0
    failed_rows: List[Dict] = []
    category_matches: Dict[str, int] = {}
    uncategorized_count = 0
    
    for idx, expense_data in enumerate(expenses_data, start=1):
        try:
            # Smart category matching
            description = expense_data.get('description', '')
            matched_category = category_matcher.match(description)
            
            if matched_category:
                expense_data['category_id'] = str(matched_category.id)
                category_name = matched_category.name
                category_matches[category_name] = category_matches.get(category_name, 0) + 1
            else:
                expense_data['category_id'] = None
                uncategorized_count += 1
            
            # Ensure date is a date object (not datetime) before database import
            expense_date = expense_data['date']
            if isinstance(expense_date, datetime):
                expense_date = expense_date.date()
            elif not isinstance(expense_date, date):
                # Fallback to today if somehow not a date/datetime
                expense_date = date.today()
            
            # Convert to ExpenseCreate format
            expense_create = ExpenseCreate(
                amount=expense_data['amount'],
                currency=expense_data.get('currency', 'IDR'),
                description=expense_data['description'],
                category_id=expense_data.get('category_id'),
                date=expense_date,
                tags=expense_data.get('tags', []),
                location=expense_data.get('location'),
                notes=expense_data.get('notes'),
                is_recurring=False
            )
            
            # Create expense
            db_expense = Expense(**expense_create.model_dump())
            db.add(db_expense)
            db.commit()
            db.refresh(db_expense)
            
            imported_count += 1
            
        except Exception as e:
            db.rollback()
            failed_rows.append({
                "row": idx + 1,  # +1 because we start from row 2 (row 1 is header)
                "error": str(e),
                "data": expense_data
            })
    
    # Prepare response
    return {
        "success": True,
        "summary": {
            "total_rows": len(expenses_data),
            "imported": imported_count,
            "failed": len(failed_rows) + len(parse_errors),
            "uncategorized": uncategorized_count,
        },
        "category_matches": category_matches,
        "errors": parse_errors + [f"Row {row['row']}: {row['error']}" for row in failed_rows],
        "failed_rows": failed_rows[:10]  # Limit to first 10 failed rows
    }
