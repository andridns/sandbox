"""Add users table

Revision ID: 002
Revises: 001
Create Date: 2024-01-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if users table already exists (created by Base.metadata.create_all())
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()
    
    if 'users' not in tables:
        # Create users table
        op.create_table(
            'users',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('username', sa.String(), nullable=False, unique=True),
            sa.Column('password_hash', sa.String(), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index('ix_users_username', 'users', ['username'])
    else:
        # Table exists, check if index exists
        indexes = [idx['name'] for idx in inspector.get_indexes('users')]
        if 'ix_users_username' not in indexes:
            op.create_index('ix_users_username', 'users', ['username'])


def downgrade() -> None:
    op.drop_index('ix_users_username', table_name='users')
    op.drop_table('users')
