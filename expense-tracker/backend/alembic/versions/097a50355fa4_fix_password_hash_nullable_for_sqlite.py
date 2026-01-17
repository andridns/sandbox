"""fix_password_hash_nullable_for_sqlite

Revision ID: 097a50355fa4
Revises: 003
Create Date: 2026-01-17 11:05:40.312448

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '097a50355fa4'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    
    # Only fix SQLite databases - PostgreSQL already handled in migration 003
    if bind.dialect.name == 'sqlite':
        # Check current column definition
        columns = {col['name']: col for col in inspector.get_columns('users')}
        indexes = [idx['name'] for idx in inspector.get_indexes('users')]
        
        # Check if password_hash needs to be made nullable
        # SQLite doesn't enforce NOT NULL constraints, but SQLAlchemy does
        # We'll recreate the table to ensure proper schema
        if 'password_hash' in columns:
            # Create new table with correct schema
            op.create_table(
                'users_new',
                sa.Column('id', sa.String(36), nullable=False, primary_key=True),  # SQLite stores UUID as string
                sa.Column('username', sa.String(), nullable=True),
                sa.Column('email', sa.String(), nullable=True),
                sa.Column('password_hash', sa.String(), nullable=True),  # Now nullable for OAuth users
                sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
                sa.Column('auth_provider', sa.String(), nullable=False, server_default='local'),
                sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
                sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            )
            
            # Copy data from old table to new table
            # Handle case where auth_provider might not exist in old data
            if 'auth_provider' in columns:
                op.execute("""
                    INSERT INTO users_new (id, username, email, password_hash, is_active, auth_provider, created_at, updated_at)
                    SELECT 
                        id,
                        username,
                        email,
                        password_hash,
                        is_active,
                        auth_provider,
                        created_at,
                        updated_at
                    FROM users
                """)
            else:
                op.execute("""
                    INSERT INTO users_new (id, username, email, password_hash, is_active, auth_provider, created_at, updated_at)
                    SELECT 
                        id,
                        username,
                        email,
                        password_hash,
                        is_active,
                        'local' as auth_provider,
                        created_at,
                        updated_at
                    FROM users
                """)
            
            # Drop old table
            op.drop_table('users')
            
            # Rename new table
            op.rename_table('users_new', 'users')
            
            # Recreate indexes
            if 'ix_users_username' not in indexes:
                op.create_index('ix_users_username', 'users', ['username'], unique=True)
            if 'email' in columns and 'ix_users_email' not in indexes:
                op.create_index('ix_users_email', 'users', ['email'], unique=True)


def downgrade() -> None:
    # For downgrade, we'd need to make password_hash NOT NULL again
    # But this is complex for SQLite, so we'll leave it as-is
    # In practice, you'd recreate the table again with NOT NULL constraint
    pass
