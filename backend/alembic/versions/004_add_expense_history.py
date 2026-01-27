"""Add expense history table

Revision ID: 004
Revises: 097a50355fa4
Create Date: 2024-01-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '097a50355fa4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if expense_history table already exists (created by Base.metadata.create_all())
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    
    if 'expense_history' not in tables:
        # Create expense_history table
        op.create_table(
            'expense_history',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('expense_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('action', sa.String(), nullable=False),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('username', sa.String(), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('old_data', sa.Text(), nullable=True),
            sa.Column('new_data', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['expense_id'], ['expenses.id'], ),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        )
        op.create_index('ix_expense_history_created_at', 'expense_history', ['created_at'])
    else:
        # Table exists, check if index exists
        indexes = [idx['name'] for idx in inspector.get_indexes('expense_history')]
        if 'ix_expense_history_created_at' not in indexes:
            op.create_index('ix_expense_history_created_at', 'expense_history', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_expense_history_created_at', table_name='expense_history')
    op.drop_table('expense_history')
