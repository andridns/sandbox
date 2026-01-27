"""Add rent_expenses table

Revision ID: 007
Revises: 006
Create Date: 2026-01-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create rent_expenses table
    op.create_table(
        'rent_expenses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('period', sa.String(7), nullable=False),  # Format: YYYY-MM
        sa.Column('currency', sa.String(3), nullable=False, server_default='IDR'),
        
        # Summary fields
        sa.Column('sinking_fund_idr', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('service_charge_idr', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('ppn_service_charge_idr', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('electric_m1_total_idr', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('water_m1_total_idr', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('fitout_idr', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('total_idr', sa.Numeric(15, 2), nullable=False, server_default='0'),
        
        # Electricity breakdown
        sa.Column('electric_usage_idr', sa.Numeric(15, 2), nullable=True),
        sa.Column('electric_ppn_idr', sa.Numeric(15, 2), nullable=True),
        sa.Column('electric_area_bersama_idr', sa.Numeric(15, 2), nullable=True),
        sa.Column('electric_pju_idr', sa.Numeric(15, 2), nullable=True),
        sa.Column('electric_kwh', sa.Numeric(10, 4), nullable=True),
        sa.Column('electric_tarif_per_kwh', sa.Numeric(10, 4), nullable=True),
        
        # Water breakdown
        sa.Column('water_usage_potable_idr', sa.Numeric(15, 2), nullable=True),
        sa.Column('water_non_potable_idr', sa.Numeric(15, 2), nullable=True),
        sa.Column('water_air_limbah_idr', sa.Numeric(15, 2), nullable=True),
        sa.Column('water_ppn_air_limbah_idr', sa.Numeric(15, 2), nullable=True),
        sa.Column('water_pemeliharaan_idr', sa.Numeric(15, 2), nullable=True),
        sa.Column('water_area_bersama_idr', sa.Numeric(15, 2), nullable=True),
        sa.Column('water_m3', sa.Numeric(10, 4), nullable=True),
        sa.Column('water_tarif_per_m3', sa.Numeric(10, 4), nullable=True),
        
        # Meta
        sa.Column('source', sa.String(255), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    # Create index on period for efficient querying
    op.create_index('ix_rent_expenses_period', 'rent_expenses', ['period'])


def downgrade() -> None:
    op.drop_index('ix_rent_expenses_period', table_name='rent_expenses')
    op.drop_table('rent_expenses')
