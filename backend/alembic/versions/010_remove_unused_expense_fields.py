"""Remove unused expense fields

Revision ID: 010
Revises: 009
Create Date: 2026-01-27 20:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop unused columns from expenses table
    op.drop_column('expenses', 'tags')
    op.drop_column('expenses', 'location')
    op.drop_column('expenses', 'notes')
    op.drop_column('expenses', 'is_recurring')
    op.drop_column('expenses', 'receipt_url')


def downgrade() -> None:
    # Recreate columns (for rollback)
    op.add_column('expenses', sa.Column('receipt_url', sa.String(), nullable=True))
    op.add_column('expenses', sa.Column('is_recurring', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('expenses', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('expenses', sa.Column('location', sa.String(), nullable=True))
    op.add_column('expenses', sa.Column('tags', postgresql.JSON(astext_type=sa.Text()), nullable=True))
