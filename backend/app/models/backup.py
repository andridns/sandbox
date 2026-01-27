from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.database import Base


class Backup(Base):
    __tablename__ = "backups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_path = Column(String, nullable=False)
    backup_type = Column(String, nullable=False)  # 'manual' or 'automatic'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Backup(id={self.id}, type='{self.backup_type}', path='{self.file_path}')>"
