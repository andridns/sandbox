from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class BackupResponse(BaseModel):
    id: UUID
    file_path: str
    backup_type: str
    created_at: datetime

    class Config:
        from_attributes = True
