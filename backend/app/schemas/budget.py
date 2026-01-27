from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from uuid import UUID


class BudgetBase(BaseModel):
    category_id: Optional[UUID] = None
    amount: float = Field(gt=0, description="Budget amount")
    currency: str = Field(default="IDR", max_length=3, description="Currency code")
    period: str = Field(pattern="^(monthly|yearly)$", description="Budget period")
    start_date: date
    end_date: date


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    category_id: Optional[UUID] = None
    amount: Optional[float] = Field(default=None, gt=0)
    currency: Optional[str] = Field(default=None, max_length=3)
    period: Optional[str] = Field(default=None, pattern="^(monthly|yearly)$")
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class BudgetResponse(BudgetBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
