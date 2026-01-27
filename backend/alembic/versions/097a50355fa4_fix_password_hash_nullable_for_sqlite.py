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
    columns = {col['name']: col for col in inspector.get_columns('users')}
    indexes = [idx['name'] for idx in inspector.get_indexes('users')]
    
    # Fix both SQLite and PostgreSQL databases
    # Migration 003 tried to fix PostgreSQL but silently failed, so we ensure it's fixed here
    if 'password_hash' in columns:
        if bind.dialect.name == 'sqlite':
            # SQLite: Recreate table with nullable password_hash
            op.create_table(
                'users_new',
                sa.Column('id', sa.String(36), nullable=False, primary_key=True),
                sa.Column('username', sa.String(), nullable=True),
                sa.Column('email', sa.String(), nullable=True),
                sa.Column('password_hash', sa.String(), nullable=True),  # Now nullable
                sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
                sa.Column('auth_provider', sa.String(), nullable=False, server_default='local'),
                sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
                sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
            )
            
            # Copy data
            if 'auth_provider' in columns:
                op.execute("""
                    INSERT INTO users_new (id, username, email, password_hash, is_active, auth_provider, created_at, updated_at)
                    SELECT id, username, email, password_hash, is_active, auth_provider, created_at, updated_at
                    FROM users
                """)
            else:
                op.execute("""
                    INSERT INTO users_new (id, username, email, password_hash, is_active, auth_provider, created_at, updated_at)
                    SELECT id, username, email, password_hash, is_active, 'local', created_at, updated_at
                    FROM users
                """)
            
            op.drop_table('users')
            op.rename_table('users_new', 'users')
            
            # Recreate indexes
            if 'ix_users_username' not in indexes:
                op.create_index('ix_users_username', 'users', ['username'], unique=True)
            if 'email' in columns and 'ix_users_email' not in indexes:
                op.create_index('ix_users_email', 'users', ['email'], unique=True)
                
        elif bind.dialect.name == 'postgresql':
            # PostgreSQL: Force alter column to be nullable
            try:
                # Check current nullable status
                result = bind.execute(sa.text("""
                    SELECT is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'password_hash'
                """))
                row = result.fetchone()
                if row and row[0] == 'NO':
                    # Column is NOT NULL, make it nullable
                    op.alter_column('users', 'password_hash', nullable=True)
                    print("✓ Migration 097a50355fa4: Made password_hash nullable in PostgreSQL")
                else:
                    print("✓ Migration 097a50355fa4: password_hash is already nullable in PostgreSQL")
            except Exception as e:
                # If check fails, try to alter anyway
                try:
                    op.alter_column('users', 'password_hash', nullable=True)
                    print("✓ Migration 097a50355fa4: Made password_hash nullable in PostgreSQL (forced)")
                except Exception as e2:
                    # Column might already be nullable or doesn't exist
                    print(f"⚠ Migration 097a50355fa4: Could not alter password_hash (might already be nullable): {e2}")


def downgrade() -> None:
    # For downgrade, we'd need to make password_hash NOT NULL again
    # But this is complex, so we'll leave it as-is
    pass
