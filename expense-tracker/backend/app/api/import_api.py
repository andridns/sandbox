"""
Import API endpoints for Excel file imports
"""
import logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
from pathlib import Path
from app.database import get_db
from app.models.expense import Expense
from app.models.category import Category
from app.models.user import User
from app.services.excel_import import ExcelImportService
from app.services.category_matcher import CategoryMatcher
from app.schemas.expense import ExpenseCreate
from app.core.auth import get_current_user
from decimal import Decimal
from datetime import date, datetime

logger = logging.getLogger(__name__)

router = APIRouter()

# Max file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024

# Allowed extensions
ALLOWED_EXTENSIONS = {".xlsx", ".xls"}


@router.post("/import/excel")
async def import_excel(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Import expenses from Excel file with smart categorization
    """
    logger.info(f"Starting Excel import. Filename: {file.filename}")
    
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    logger.debug(f"File extension: {file_ext}")
    if file_ext not in ALLOWED_EXTENSIONS:
        error_msg = f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        logger.error(error_msg)
        raise HTTPException(
            status_code=400,
            detail=error_msg
        )
    
    # Read file content
    logger.debug("Reading file content")
    contents = await file.read()
    file_size = len(contents)
    logger.info(f"File read successfully. Size: {file_size} bytes ({file_size / 1024:.2f} KB)")
    
    # Check file size
    if file_size > MAX_FILE_SIZE:
        error_msg = f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
        logger.error(f"{error_msg}. Actual size: {file_size / 1024 / 1024:.2f}MB")
        raise HTTPException(
            status_code=400,
            detail=error_msg
        )
    
    # Parse Excel file
    logger.info("Parsing Excel file")
    import_service = ExcelImportService(contents)
    expenses_data, parse_errors = import_service.parse()
    logger.info(f"Excel parsing complete. Found {len(expenses_data)} valid rows, {len(parse_errors)} parse errors")
    
    if parse_errors:
        logger.warning(f"Parse errors encountered: {parse_errors[:5]}")  # Log first 5 errors
    
    if not expenses_data and not parse_errors:
        error_msg = "No data found in Excel file"
        logger.error(error_msg)
        raise HTTPException(
            status_code=400,
            detail=error_msg
        )
    
    # Initialize category matcher
    logger.debug("Initializing category matcher")
    category_matcher = CategoryMatcher(db)
    
    # Process expenses
    imported_count = 0
    failed_rows: List[Dict] = []
    category_matches: Dict[str, int] = {}
    uncategorized_count = 0
    
    # Get all categories for type mapping
    logger.debug("Loading categories from database")
    all_categories = db.query(Category).all()
    category_name_map = {cat.name.lower(): cat for cat in all_categories}
    logger.info(f"Loaded {len(all_categories)} categories from database")
    
    # Type to category name mapping (common mappings)
    type_to_category = {
        'food': 'Food & Dining',
        'misc': 'Other',
        'childcare': 'Other',  # Could be a new category, but map to Other for now
        'income': None,  # Skip income entries (they're not expenses)
        'taxes': 'Bills & Utilities',
        'housing': 'Bills & Utilities',
        'vacation': 'Travel',
        'travel': 'Travel',
        'transportation': 'Transportation',
        'shopping': 'Shopping',
        'entertainment': 'Entertainment',
        'healthcare': 'Healthcare',
        'education': 'Education',
        'personal care': 'Personal Care',
        'gifts': 'Gifts & Donations',
        'subscription': 'Subscriptions',
    }
    logger.debug(f"Type to category mapping configured with {len(type_to_category)} mappings")
    
    skipped_count = 0
    
    logger.info(f"Processing {len(expenses_data)} expense rows")
    for idx, expense_data in enumerate(expenses_data, start=1):
        try:
            # Skip if amount is 0 or negative (like income entries, taxes, etc.)
            amount = expense_data.get('amount', 0)
            if amount <= 0:
                skipped_count += 1
                logger.debug(f"Row {idx + 1}: Skipping row with amount {amount}")
                continue
            
            logger.debug(f"Row {idx + 1}: Processing expense - Amount: {amount}, Description: {expense_data.get('description', 'N/A')[:50]}")
            matched_category = None
            
            # First, try to match Type column to category
            if 'category' in expense_data and expense_data['category']:
                type_value = str(expense_data['category']).strip().lower()
                logger.debug(f"Row {idx + 1}: Type value from file: '{type_value}'")
                
                # Check direct type mapping
                if type_value in type_to_category:
                    category_name = type_to_category[type_value]
                    logger.debug(f"Row {idx + 1}: Found direct type mapping: '{type_value}' -> '{category_name}'")
                    if category_name and category_name.lower() in category_name_map:
                        matched_category = category_name_map[category_name.lower()]
                        logger.info(f"Row {idx + 1}: Matched category via type mapping: {matched_category.name}")
                
                # If no direct mapping, try to find category by similar name
                if not matched_category:
                    logger.debug(f"Row {idx + 1}: No direct mapping, trying fuzzy match")
                    for cat_name, category in category_name_map.items():
                        if type_value in cat_name or cat_name in type_value:
                            matched_category = category
                            logger.info(f"Row {idx + 1}: Matched category via fuzzy match: {matched_category.name}")
                            break
            
            # If no match from Type column, use smart category matching on description
            if not matched_category:
                description = expense_data.get('description', '')
                logger.debug(f"Row {idx + 1}: No type match, trying smart category matching on description: '{description[:50]}'")
                matched_category = category_matcher.match(description)
                if matched_category:
                    logger.info(f"Row {idx + 1}: Matched category via smart matching: {matched_category.name}")
            
            if matched_category:
                expense_data['category_id'] = matched_category.id
                category_name = matched_category.name
                category_matches[category_name] = category_matches.get(category_name, 0) + 1
                logger.debug(f"Row {idx + 1}: Category assigned: {category_name} (ID: {matched_category.id})")
            else:
                expense_data['category_id'] = None
                uncategorized_count += 1
                logger.debug(f"Row {idx + 1}: No category matched, leaving uncategorized")
            
            # Ensure date is a date object (not datetime) before database import
            # Extract exact date from source datetime if needed
            expense_date = expense_data['date']
            if isinstance(expense_date, datetime):
                expense_date = expense_date.date()
                logger.debug(f"Row {idx + 1}: Converted datetime to date: {expense_date}")
            elif not isinstance(expense_date, date):
                # Fallback to today if somehow not a date/datetime
                expense_date = date.today()
                logger.warning(f"Row {idx + 1}: Invalid date type, using today: {expense_date}")
            
            # Convert to ExpenseCreate format
            expense_create = ExpenseCreate(
                amount=expense_data['amount'],
                currency=expense_data.get('currency', 'IDR'),
                description=expense_data['description'],
                category_id=expense_data.get('category_id'),
                date=expense_date,
                tags=expense_data.get('tags', []),
                payment_method=expense_data.get('payment_method', 'Cash'),
                location=expense_data.get('location'),
                notes=expense_data.get('notes'),
                is_recurring=False
            )
            logger.debug(f"Row {idx + 1}: Created ExpenseCreate object with date: {expense_date}")
            
            # Create expense
            logger.debug(f"Row {idx + 1}: Saving to database")
            db_expense = Expense(**expense_create.model_dump())
            db.add(db_expense)
            db.commit()
            
            imported_count += 1
            logger.info(f"Row {idx + 1}: Successfully imported expense (ID: {db_expense.id})")
            
        except Exception as e:
            db.rollback()
            error_info = {
                "row": idx + 1,  # +1 because we start from row 2 (row 1 is header)
                "error": str(e),
                "data": expense_data
            }
            logger.exception(f"Row {idx + 1}: Failed to import expense - {str(e)}")
            logger.debug(f"Row {idx + 1}: Failed row data: {expense_data}")
            failed_rows.append(error_info)
    
    # Prepare response
    summary = {
        "total_rows": len(expenses_data),
        "imported": imported_count,
        "failed": len(failed_rows) + len(parse_errors),
        "uncategorized": uncategorized_count,
        "skipped": skipped_count,
    }
    
    logger.info(f"Import complete. Summary: {summary}")
    logger.info(f"Category matches: {category_matches}")
    if failed_rows:
        logger.warning(f"Failed rows: {len(failed_rows)}")
        for failed_row in failed_rows[:5]:  # Log first 5 failed rows
            logger.warning(f"Failed row {failed_row['row']}: {failed_row['error']}")
    
    return {
        "success": True,
        "summary": summary,
        "category_matches": category_matches,
        "errors": parse_errors + [f"Row {row['row']}: {row['error']}" for row in failed_rows],
        "failed_rows": failed_rows[:10]  # Limit to first 10 failed rows
    }
