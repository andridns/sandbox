"""
Seed script to populate database with default categories and sample data
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal, engine, Base
from app.models.category import Category
from app.models.expense import Expense
from app.models.budget import Budget
from app.models.user import User
from app.core.auth import get_password_hash
from datetime import date, timedelta
from decimal import Decimal
import random
import os

# Create tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

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

# Sample expense descriptions
EXPENSE_DESCRIPTIONS = [
    "Lunch at restaurant",
    "Grab ride to office",
    "Monthly internet bill",
    "Netflix subscription",
    "Groceries at supermarket",
    "Coffee with friends",
    "Taxi fare",
    "Movie tickets",
    "Pharmacy medicine",
    "Book purchase",
    "Haircut",
    "Flight ticket",
    "Birthday gift",
    "Spotify premium",
    "Parking fee",
    "Dinner date",
    "Gas station",
    "Electricity bill",
    "Gym membership",
    "Concert tickets",
    "Doctor consultation",
    "Online course",
    "Skincare products",
    "Hotel booking",
    "Charity donation",
]

# Sample tags
SAMPLE_TAGS = [
    "work", "personal", "urgent", "monthly", "weekly", "food", "transport",
    "entertainment", "health", "education", "shopping", "bills", "subscription"
]

# Sample locations
SAMPLE_LOCATIONS = [
    "Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Bali", "Medan",
    "Mall", "Restaurant", "Office", "Home", "Online"
]


def seed_categories():
    """Seed default categories"""
    print("Seeding categories...")
    for cat_data in DEFAULT_CATEGORIES:
        existing = db.query(Category).filter(Category.name == cat_data["name"]).first()
        if not existing:
            category = Category(**cat_data)
            db.add(category)
    db.commit()
    print(f"✓ Seeded {len(DEFAULT_CATEGORIES)} categories")


def seed_expenses():
    """Seed sample expenses"""
    print("Seeding expenses...")
    categories = db.query(Category).all()
    
    if not categories:
        print("No categories found. Please seed categories first.")
        return
    
    # Generate expenses for the last 3 months
    today = date.today()
    expenses_created = 0
    
    for i in range(30):  # 30 sample expenses
        expense_date = today - timedelta(days=random.randint(0, 90))
        category = random.choice(categories)
        amount = Decimal(str(random.randint(10000, 500000)))  # 10k to 500k IDR
        description = random.choice(EXPENSE_DESCRIPTIONS)
        
        # Random tags (1-3 tags)
        num_tags = random.randint(1, 3)
        tags = random.sample(SAMPLE_TAGS, num_tags)
        
        # Random location (50% chance)
        location = random.choice(SAMPLE_LOCATIONS) if random.random() > 0.5 else None
        
        # Recurring flag (20% chance)
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
    
    db.commit()
    print(f"✓ Seeded {expenses_created} expenses")


def seed_budgets():
    """Seed sample budgets"""
    print("Seeding budgets...")
    categories = db.query(Category).all()
    
    if not categories:
        print("No categories found. Please seed categories first.")
        return
    
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
    
    db.commit()
    print("✓ Seeded budgets")


def seed_user():
    """Seed or update default user from environment variables"""
    print("Seeding/updating user...")
    # Get username and password from environment or use defaults
    username = os.getenv("DEFAULT_USERNAME", "admin")
    password = os.getenv("DEFAULT_PASSWORD", "23052020")
    
    existing_user = db.query(User).filter(User.username == username).first()
    
    if existing_user:
        # Update password if environment variables are explicitly set
        # This allows updating credentials via Railway env vars
        if os.getenv("DEFAULT_PASSWORD"):
            existing_user.password_hash = get_password_hash(password)
            existing_user.is_active = True
            db.commit()
            print(f"✓ Updated user '{username}' password from DEFAULT_PASSWORD environment variable")
        else:
            print(f"✓ User '{username}' already exists, skipping (set DEFAULT_PASSWORD env var to update)")
    else:
        # Create new user
        user = User(
            username=username,
            password_hash=get_password_hash(password),
            is_active=True
        )
        db.add(user)
        db.commit()
        print(f"✓ Created user '{username}' with password from environment variables")
        print(f"  ⚠️  Password set from DEFAULT_PASSWORD environment variable")


def main():
    """Main seeding function"""
    print("Starting database seeding...")
    print("-" * 50)
    
    try:
        seed_user()
        seed_categories()
        seed_expenses()
        seed_budgets()
        
        print("-" * 50)
        print("✓ Database seeding completed successfully!")
        
    except Exception as e:
        print(f"✗ Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
