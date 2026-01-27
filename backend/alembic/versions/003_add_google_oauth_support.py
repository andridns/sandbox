"""Add Google OAuth support

Revision ID: 003
Revises: 002
Create Date: 2024-01-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('users')]
    indexes = [idx['name'] for idx in inspector.get_indexes('users')]
    
    # Add email column if it doesn't exist
    if 'email' not in columns:
        op.add_column('users', sa.Column('email', sa.String(), nullable=True))
    
    # Create email index if it doesn't exist
    if 'ix_users_email' not in indexes:
        op.create_index('ix_users_email', 'users', ['email'], unique=True)
    
    # Make password_hash nullable (for OAuth users) - check current nullable status
    if 'password_hash' in columns:
        # SQLite doesn't support ALTER COLUMN, so we skip this for SQLite
        # PostgreSQL and other databases will handle this
        if bind.dialect.name != 'sqlite':
            # Check if it's already nullable by trying to query
            # For SQLite, the column is already nullable if created with nullable=True
            try:
                op.alter_column('users', 'password_hash', nullable=True)
            except Exception:
                pass  # Column might already be nullable
    
    # Make username nullable (for OAuth users)
    if 'username' in columns and bind.dialect.name != 'sqlite':
        try:
            op.alter_column('users', 'username', nullable=True)
        except Exception:
            pass  # Column might already be nullable
    
    # Add auth_provider column if it doesn't exist
    if 'auth_provider' not in columns:
        op.add_column('users', sa.Column('auth_provider', sa.String(), nullable=False, server_default='local'))


def downgrade() -> None:
    op.drop_column('users', 'auth_provider')
    op.alter_column('users', 'username', nullable=False)
    op.alter_column('users', 'password_hash', nullable=False)
    op.drop_index('ix_users_email', table_name='users')
    op.drop_column('users', 'email')
