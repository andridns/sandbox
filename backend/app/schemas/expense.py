from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date as date_type, datetime
from uuid import UUID


class ExpenseBase(BaseModel):
    amount: float = Field(gt=0, description="Expense amount")
    currency: str = Field(default="IDR", max_length=3, description="Currency code")
    description: str = Field(min_length=1, max_length=500, description="Expense description")
    category_id: Optional[UUID] = None
    date: date_type
    tags: Optional[List[str]] = Field(default_factory=list, description="Tags")
    receipt_url: Optional[str] = None
    location: Optional[str] = Field(default=None, max_length=200, description="Location")
    notes: Optional[str] = None
    is_recurring: bool = False


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)
    currency: Optional[str] = Field(default=None, max_length=3)
    description: Optional[str] = Field(default=None, min_length=1, max_length=500)
    category_id: Optional[UUID] = None
    date: Optional[date_type] = None
    tags: Optional[List[str]] = None
    receipt_url: Optional[str] = None
    location: Optional[str] = Field(default=None, max_length=200)
    notes: Optional[str] = None
    is_recurring: Optional[bool] = None


class ExpenseResponse(ExpenseBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
