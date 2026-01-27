"""
API endpoint to seed the database manually
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.category import Category
from app.models.expense import Expense
from app.models.budget import Budget
from datetime import date, timedelta
from decimal import Decimal
import random

router = APIRouter()

# Default categories with icons and colors
DEFAULT_CATEGORIES = [
    {"name": "Food & Dining", "icon": "🍽️", "color": "#FF6B6B", "is_default": True},
    {"name": "Transportation", "icon": "🚗", "color": "#4ECDC4", "is_default": True},
    {"name": "Shopping", "icon": "🛍️", "color": "#FFE66D", "is_default": True},
    {"name": "Bills & Utilities", "icon": "💡", "color": "#95E1D3", "is_default": True},
    {"name": "Entertainment", "icon": "🎬", "color": "#F38181", "is_default": True},
    {"name": "Healthcare", "icon": "🏥", "color": "#AA96DA", "is_default": True},
    {"name": "Education", "icon": "📚", "color": "#FCBAD3", "is_default": True},
    {"name": "Personal Care", "icon": "💅", "color": "#FFD3A5", "is_default": True},
    {"name": "Travel", "icon": "✈️", "color": "#A8E6CF", "is_default": True},
    {"name": "Gifts & Donations", "icon": "🎁", "color": "#FFAAA5", "is_default": True},
    {"name": "Subscriptions", "icon": "📱", "color": "#FFD93D", "is_default": True},
    {"name": "Other", "icon": "📦", "color": "#6C757D", "is_default": True},
]

EXPENSE_DESCRIPTIONS = [
    "Lunch at restaurant", "Grab ride to office", "Monthly internet bill",
    "Netflix subscription", "Groceries at supermarket", "Coffee with friends",
    "Taxi fare", "Movie tickets", "Pharmacy medicine", "Book purchase",
    "Haircut", "Flight ticket", "Birthday gift", "Spotify premium", "Parking fee",
    "Dinner date", "Gas station", "Electricity bill", "Gym membership", "Concert tickets",
    "Doctor consultation", "Online course", "Skincare products", "Hotel booking", "Charity donation",
]

SAMPLE_TAGS = [
    "work", "personal", "urgent", "monthly", "weekly", "food", "transport",
    "entertainment", "health", "education", "shopping", "bills", "subscription"
]

SAMPLE_LOCATIONS = [
    "Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Bali", "Medan",
    "Mall", "Restaurant", "Office", "Home", "Online"
]


@router.post("/seed")
async def seed_database(db: Session = Depends(get_db)):
    """
    Seed the database with default categories and sample data.
    Only seeds if database is empty (no categories exist).
    """
    try:
        # Check if categories already exist
        existing_categories = db.query(Category).count()
        if existing_categories > 0:
            return {
                "message": "Database already has data. Skipping seed.",
                "categories_count": existing_categories
            }
        
        # Seed categories
        categories_created = 0
        for cat_data in DEFAULT_CATEGORIES:
            category = Category(**cat_data)
            db.add(category)
            categories_created += 1
        db.commit()
        
        # Get created categories for expenses
        categories = db.query(Category).all()
        
        # Seed expenses
        today = date.today()
        expenses_created = 0
        
        for i in range(30):  # 30 sample expenses
            expense_date = today - timedelta(days=random.randint(0, 90))
            category = random.choice(categories)
            amount = Decimal(str(random.randint(10000, 500000)))  # 10k to 500k IDR
            description = random.choice(EXPENSE_DESCRIPTIONS)
            
            num_tags = random.randint(1, 3)
            tags = random.sample(SAMPLE_TAGS, num_tags)
            location = random.choice(SAMPLE_LOCATIONS) if random.random() > 0.5 else None
            is_recurring = random.random() < 0.2
            
            expense = Expense(
                amount=amount,
                currency="IDR",
                description=description,
                category_id=category.id,
                date=expense_date,
                tags=tags,
                location=location,
                is_recurring=is_recurring,
                notes=f"Sample expense #{i+1}" if random.random() > 0.7 else None
            )
            db.add(expense)
            expenses_created += 1
        
        # Seed budgets
        today = date.today()
        
        # Create monthly total budget
        total_budget = Budget(
            category_id=None,
            amount=Decimal("5000000"),  # 5M IDR
            currency="IDR",
            period="monthly",
            start_date=date(today.year, today.month, 1),
            end_date=date(today.year, today.month, 28)
        )
        db.add(total_budget)
        
        # Create category budgets for top 5 categories
        top_categories = categories[:5]
        budgets_created = 1
        for category in top_categories:
            category_budget = Budget(
                category_id=category.id,
                amount=Decimal(str(random.randint(500000, 2000000))),  # 500k to 2M IDR
                currency="IDR",
                period="monthly",
                start_date=date(today.year, today.month, 1),
                end_date=date(today.year, today.month, 28)
            )
            db.add(category_budget)
            budgets_created += 1
        
        db.commit()
        
        return {
            "message": "Database seeded successfully!",
            "categories_created": categories_created,
            "expenses_created": expenses_created,
            "budgets_created": budgets_created
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error seeding database: {str(e)}")
