"""Add performance indexes

Revision ID: 008
Revises: 007
Create Date: 2026-01-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Index on category_id for joins (prevents N+1 queries)
    op.create_index('ix_expenses_category_id', 'expenses', ['category_id'])

    # Composite index for common query pattern (date range + category filter)
    op.create_index('ix_expenses_date_category', 'expenses', ['date', 'category_id'])

    # Index for currency queries
    op.create_index('ix_expenses_currency', 'expenses', ['currency'])

    # Index for search on description (case-insensitive)
    # Works on both SQLite and PostgreSQL
    try:
        op.execute('CREATE INDEX ix_expenses_description_lower ON expenses (LOWER(description))')
    except Exception:
        # If the index creation fails (e.g., on SQLite with different syntax), skip it
        pass


def downgrade() -> None:
    # Drop indexes in reverse order
    try:
        op.execute('DROP INDEX IF EXISTS ix_expenses_description_lower')
    except Exception:
        pass
    op.drop_index('ix_expenses_currency', table_name='expenses')
    op.drop_index('ix_expenses_date_category', table_name='expenses')
    op.drop_index('ix_expenses_category_id', table_name='expenses')
