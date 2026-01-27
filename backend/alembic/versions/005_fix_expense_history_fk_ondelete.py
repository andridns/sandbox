"""Fix expense_history foreign key ON DELETE SET NULL

Revision ID: 005
Revises: 004
Create Date: 2026-01-18 08:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    
    # Only apply to PostgreSQL (SQLite doesn't enforce foreign keys the same way)
    if bind.dialect.name == 'postgresql':
        # Find the constraint name
        inspector = sa.inspect(bind)
        foreign_keys = inspector.get_foreign_keys('expense_history')
        
        # Find the expense_id foreign key constraint
        fk_constraint_name = None
        for fk in foreign_keys:
            if 'expense_id' in fk['constrained_columns']:
                fk_constraint_name = fk['name']
                break
        
        if fk_constraint_name:
            # Drop the existing constraint
            op.drop_constraint(fk_constraint_name, 'expense_history', type_='foreignkey')
            
            # Recreate it with ON DELETE SET NULL
            op.create_foreign_key(
                fk_constraint_name,
                'expense_history',
                'expenses',
                ['expense_id'],
                ['id'],
                ondelete='SET NULL'
            )


def downgrade() -> None:
    bind = op.get_bind()
    
    # Only apply to PostgreSQL
    if bind.dialect.name == 'postgresql':
        # Find the constraint name
        inspector = sa.inspect(bind)
        foreign_keys = inspector.get_foreign_keys('expense_history')
        
        # Find the expense_id foreign key constraint
        fk_constraint_name = None
        for fk in foreign_keys:
            if 'expense_id' in fk['constrained_columns']:
                fk_constraint_name = fk['name']
                break
        
        if fk_constraint_name:
            # Drop the constraint with ON DELETE SET NULL
            op.drop_constraint(fk_constraint_name, 'expense_history', type_='foreignkey')
            
            # Recreate it without ON DELETE (default behavior)
            op.create_foreign_key(
                fk_constraint_name,
                'expense_history',
                'expenses',
                ['expense_id'],
                ['id']
            )
