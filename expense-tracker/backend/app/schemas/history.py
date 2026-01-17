from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class ExpenseHistoryResponse(BaseModel):
    id: UUID
    expense_id: Optional[UUID]
    action: str  # 'create', 'update', 'delete'
    user_id: UUID
    username: str
    description: Optional[str]
    old_data: Optional[str]
    new_data: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
