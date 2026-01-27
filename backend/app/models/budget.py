from sqlalchemy import Column, String, Numeric, Date, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)  # null for total budget
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="IDR")
    period = Column(String, nullable=False)  # 'monthly' or 'yearly'
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship
    category = relationship("Category", backref="budgets")

    def __repr__(self):
        return f"<Budget(id={self.id}, amount={self.amount}, period='{self.period}')>"
