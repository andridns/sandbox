from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=100, description="Category name")
    icon: Optional[str] = None
    color: str = Field(default="#4CAF50", max_length=7, description="Color hex code")


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    icon: Optional[str] = Field(default=None, max_length=50)
    color: Optional[str] = Field(default=None, max_length=7)


class CategoryResponse(CategoryBase):
    id: UUID
    is_default: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
