#!/usr/bin/env python3
"""
Migration script to transfer data from SQLite to PostgreSQL.

This script:
1. Connects to the SQLite database
2. Connects to the PostgreSQL database
3. Transfers all data while preserving relationships
4. Handles UUID conversion and data type differences

Usage:
    poetry run python scripts/migrate_sqlite_to_postgres.py
    # Or with explicit database URLs:
    SQLITE_URL=sqlite:///./expense_tracker.db POSTGRES_URL=postgresql://user:pass@localhost/dbname poetry run python scripts/migrate_sqlite_to_postgres.py
"""

import os
import sys
import json
from datetime import datetime
from decimal import Decimal
from uuid import UUID

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

# Import models
from app.models import (
    User, Category, Expense, Budget, RentExpense, ExpenseHistory, Backup
)


def get_database_urls():
    """Get SQLite and Postgres database URLs from environment or prompt."""
    sqlite_url = os.getenv("SQLITE_URL", "sqlite:///./expense_tracker.db")
    postgres_url = os.getenv("POSTGRES_URL") or os.getenv("DATABASE_URL")
    
    if not postgres_url:
        print("\n⚠️  PostgreSQL database URL not found.")
        print("Please provide your PostgreSQL connection string.")
        print("Example: postgresql://user:password@localhost:5432/expense_tracker")
        postgres_url = input("\nEnter PostgreSQL DATABASE_URL: ").strip()
        
        if not postgres_url:
            raise ValueError("PostgreSQL DATABASE_URL is required")
    
    # Ensure Postgres URL doesn't start with sqlite
    if postgres_url.startswith("sqlite"):
        raise ValueError("PostgreSQL URL cannot start with 'sqlite'. Please provide a valid PostgreSQL connection string.")
    
    return sqlite_url, postgres_url


def create_engines(sqlite_url, postgres_url):
    """Create SQLAlchemy engines for both databases."""
    # SQLite engine
    sqlite_engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
        poolclass=NullPool,
        echo=False
    )
    
    # Postgres engine
    postgres_engine = create_engine(
        postgres_url,
        poolclass=NullPool,
        echo=False
    )
    
    return sqlite_engine, postgres_engine


def migrate_table(
    sqlite_session,
    postgres_session,
    model_class,
    table_name,
    order_by=None,
    transform_row=None
):
    """
    Migrate a table from SQLite to Postgres.
    
    Args:
        sqlite_session: SQLite database session
        postgres_session: Postgres database session
        model_class: SQLAlchemy model class
        table_name: Name of the table
        order_by: Optional column to order by (for foreign key dependencies)
        transform_row: Optional function to transform row data before insertion
    """
    print(f"\n📦 Migrating {table_name}...")
    
    # Query all rows from SQLite
    query = sqlite_session.query(model_class)
    if order_by:
        query = query.order_by(order_by)
    
    rows = query.all()
    
    if not rows:
        print(f"   ✓ No data to migrate for {table_name}")
        return 0
    
    print(f"   Found {len(rows)} rows")
    
    migrated_count = 0
    skipped_count = 0
    
    for row in rows:
        try:
            # Convert row to dict
            row_dict = {}
            for column in model_class.__table__.columns:
                value = getattr(row, column.name)
                
                # Handle UUID conversion (SQLite stores as string, Postgres as UUID)
                if isinstance(column.type, type) and 'UUID' in str(column.type):
                    if value:
                        if isinstance(value, str):
                            value = UUID(value)
                        elif value is not None:
                            value = UUID(str(value))
                
                # Handle JSON fields (tags in Expense)
                if column.name == 'tags' and value is not None:
                    if isinstance(value, str):
                        try:
                            value = json.loads(value)
                        except json.JSONDecodeError:
                            value = []
                    elif not isinstance(value, (list, dict)):
                        value = []
                
                # Handle Decimal/Numeric fields
                if value is not None and isinstance(value, (int, float, str)):
                    if 'Numeric' in str(column.type) or 'Decimal' in str(column.type):
                        try:
                            value = Decimal(str(value))
                        except (ValueError, TypeError):
                            value = None
                
                # Handle date/datetime fields
                if isinstance(value, str) and ('Date' in str(column.type) or 'DateTime' in str(column.type)):
                    try:
                        if 'Date' in str(column.type):
                            value = datetime.strptime(value, '%Y-%m-%d').date()
                        else:
                            value = datetime.fromisoformat(value.replace('Z', '+00:00'))
                    except (ValueError, TypeError):
                        pass
                
                row_dict[column.name] = value
            
            # Apply custom transformation if provided
            if transform_row:
                row_dict = transform_row(row_dict)
            
            # Check if row already exists in Postgres (by ID)
            existing = postgres_session.query(model_class).filter(
                model_class.id == row_dict['id']
            ).first()
            
            if existing:
                print(f"   ⚠️  Skipping {table_name} row {row_dict['id']} (already exists)")
                skipped_count += 1
                continue
            
            # Create new row in Postgres
            new_row = model_class(**row_dict)
            postgres_session.add(new_row)
            migrated_count += 1
            
        except Exception as e:
            print(f"   ❌ Error migrating {table_name} row {getattr(row, 'id', 'unknown')}: {e}")
            postgres_session.rollback()
            continue
    
    # Commit all changes for this table
    try:
        postgres_session.commit()
        print(f"   ✓ Migrated {migrated_count} rows, skipped {skipped_count} existing rows")
        return migrated_count
    except Exception as e:
        postgres_session.rollback()
        print(f"   ❌ Error committing {table_name}: {e}")
        raise


def main():
    """Main migration function."""
    print("=" * 60)
    print("SQLite to PostgreSQL Migration Script")
    print("=" * 60)
    
    # Get database URLs
    try:
        sqlite_url, postgres_url = get_database_urls()
        print(f"\n📁 SQLite: {sqlite_url}")
        print(f"🐘 PostgreSQL: {postgres_url.split('@')[1] if '@' in postgres_url else postgres_url}")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
    
    # Create engines
    try:
        sqlite_engine, postgres_engine = create_engines(sqlite_url, postgres_url)
        print("\n✓ Connected to both databases")
    except Exception as e:
        print(f"\n❌ Error connecting to databases: {e}")
        sys.exit(1)
    
    # Create sessions
    SQLiteSession = sessionmaker(bind=sqlite_engine)
    PostgresSession = sessionmaker(bind=postgres_engine)
    
    sqlite_session = SQLiteSession()
    postgres_session = PostgresSession()
    
    try:
        # Verify Postgres connection
        postgres_session.execute(text("SELECT 1"))
        print("✓ PostgreSQL connection verified")
        
        # Verify SQLite connection
        sqlite_session.execute(text("SELECT 1"))
        print("✓ SQLite connection verified")
        
        # Migrate tables in dependency order
        total_migrated = 0
        
        # 1. Users (no dependencies)
        total_migrated += migrate_table(
            sqlite_session, postgres_session, User, "users"
        )
        
        # 2. Categories (no dependencies)
        total_migrated += migrate_table(
            sqlite_session, postgres_session, Category, "categories"
        )
        
        # 3. Expenses (depends on Categories)
        total_migrated += migrate_table(
            sqlite_session, postgres_session, Expense, "expenses",
            order_by=Expense.created_at
        )
        
        # 4. Budgets (depends on Categories)
        total_migrated += migrate_table(
            sqlite_session, postgres_session, Budget, "budgets"
        )
        
        # 5. Rent Expenses (no dependencies)
        total_migrated += migrate_table(
            sqlite_session, postgres_session, RentExpense, "rent_expenses",
            order_by=RentExpense.period
        )
        
        # 6. Expense History (depends on Users and Expenses)
        total_migrated += migrate_table(
            sqlite_session, postgres_session, ExpenseHistory, "expense_history",
            order_by=ExpenseHistory.created_at
        )
        
        # 7. Backups (no dependencies)
        total_migrated += migrate_table(
            sqlite_session, postgres_session, Backup, "backups",
            order_by=Backup.created_at
        )
        
        print("\n" + "=" * 60)
        print(f"✅ Migration completed successfully!")
        print(f"   Total rows migrated: {total_migrated}")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        postgres_session.rollback()
        sys.exit(1)
    finally:
        sqlite_session.close()
        postgres_session.close()
        sqlite_engine.dispose()
        postgres_engine.dispose()


if __name__ == "__main__":
    main()
