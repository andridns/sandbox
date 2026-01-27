"""Remove payment_method column from expenses table

Revision ID: 006
Revises: 005
Create Date: 2026-01-18 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the payment_method column from expenses table
    op.drop_column('expenses', 'payment_method')


def downgrade() -> None:
    # Re-add the payment_method column (nullable=False with default 'Cash' for existing rows)
    op.add_column('expenses', 
        sa.Column('payment_method', sa.String(), nullable=False, server_default='Cash')
    )
