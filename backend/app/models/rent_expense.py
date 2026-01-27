from sqlalchemy import Column, String, Numeric, Text, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base


class RentExpense(Base):
    __tablename__ = "rent_expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    period = Column(String(7), nullable=False, index=True)  # Format: YYYY-MM
    currency = Column(String(3), nullable=False, default="IDR")
    
    # Summary fields
    sinking_fund_idr = Column(Numeric(15, 2), nullable=False, default=0)
    service_charge_idr = Column(Numeric(15, 2), nullable=False, default=0)
    ppn_service_charge_idr = Column(Numeric(15, 2), nullable=False, default=0)
    electric_m1_total_idr = Column(Numeric(15, 2), nullable=False, default=0)
    water_m1_total_idr = Column(Numeric(15, 2), nullable=False, default=0)
    fitout_idr = Column(Numeric(15, 2), nullable=False, default=0)
    total_idr = Column(Numeric(15, 2), nullable=False, default=0)
    
    # Electricity breakdown
    electric_usage_idr = Column(Numeric(15, 2), nullable=True)
    electric_ppn_idr = Column(Numeric(15, 2), nullable=True)
    electric_area_bersama_idr = Column(Numeric(15, 2), nullable=True)
    electric_pju_idr = Column(Numeric(15, 2), nullable=True)
    electric_kwh = Column(Numeric(10, 4), nullable=True)
    electric_tarif_per_kwh = Column(Numeric(10, 4), nullable=True)
    
    # Water breakdown
    water_usage_potable_idr = Column(Numeric(15, 2), nullable=True)
    water_non_potable_idr = Column(Numeric(15, 2), nullable=True)
    water_air_limbah_idr = Column(Numeric(15, 2), nullable=True)
    water_ppn_air_limbah_idr = Column(Numeric(15, 2), nullable=True)
    water_pemeliharaan_idr = Column(Numeric(15, 2), nullable=True)
    water_area_bersama_idr = Column(Numeric(15, 2), nullable=True)
    water_m3 = Column(Numeric(10, 4), nullable=True)
    water_tarif_per_m3 = Column(Numeric(10, 4), nullable=True)
    
    # Meta
    source = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Index on period for efficient querying
    __table_args__ = (
        Index('ix_rent_expenses_period', 'period'),
    )

    def __repr__(self):
        return f"<RentExpense(id={self.id}, period='{self.period}', total_idr={self.total_idr})>"
