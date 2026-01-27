from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from decimal import Decimal


class RentExpenseBase(BaseModel):
    period: str = Field(..., description="Period in YYYY-MM format")
    currency: str = Field(default="IDR", max_length=3, description="Currency code")
    
    # Summary fields
    sinking_fund_idr: float = Field(default=0, description="Sinking fund amount in IDR")
    service_charge_idr: float = Field(default=0, description="Service charge amount in IDR")
    ppn_service_charge_idr: float = Field(default=0, description="PPN service charge amount in IDR")
    electric_m1_total_idr: float = Field(default=0, description="Total electricity amount in IDR")
    water_m1_total_idr: float = Field(default=0, description="Total water amount in IDR")
    fitout_idr: float = Field(default=0, description="Fitout amount in IDR")
    total_idr: float = Field(default=0, description="Total amount in IDR")
    
    # Electricity breakdown
    electric_usage_idr: Optional[float] = None
    electric_ppn_idr: Optional[float] = None
    electric_area_bersama_idr: Optional[float] = None
    electric_pju_idr: Optional[float] = None
    electric_kwh: Optional[float] = None
    electric_tarif_per_kwh: Optional[float] = None
    
    # Water breakdown
    water_usage_potable_idr: Optional[float] = None
    water_non_potable_idr: Optional[float] = None
    water_air_limbah_idr: Optional[float] = None
    water_ppn_air_limbah_idr: Optional[float] = None
    water_pemeliharaan_idr: Optional[float] = None
    water_area_bersama_idr: Optional[float] = None
    water_m3: Optional[float] = None
    water_tarif_per_m3: Optional[float] = None
    
    # Meta
    source: Optional[str] = None


class RentExpenseCreate(RentExpenseBase):
    pass


class RentExpenseResponse(RentExpenseBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RentExpenseTrendItem(BaseModel):
    period: str = Field(..., description="Period value (e.g., '2021-12' or '2021')")
    total: float = Field(..., description="Total amount for this period")


class RentExpenseTrend(BaseModel):
    period_type: str = Field(..., description="Period type: 'monthly' or 'yearly'")
    trends: List[RentExpenseTrendItem] = Field(default_factory=list)


class RentExpenseBreakdownItem(BaseModel):
    category: str = Field(..., description="Category name (e.g., 'electricity', 'water', 'service_charge')")
    total: float = Field(..., description="Total amount for this category")
    count: int = Field(default=0, description="Number of periods included")


class RentExpenseBreakdown(BaseModel):
    period: Optional[str] = Field(None, description="Period filter applied (if any)")
    breakdown: List[RentExpenseBreakdownItem] = Field(default_factory=list)
