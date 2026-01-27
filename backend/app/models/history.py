from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base


class ExpenseHistory(Base):
    __tablename__ = "expense_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=True)  # Nullable for deleted expenses
    action = Column(String, nullable=False)  # 'create', 'update', 'delete'
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    username = Column(String, nullable=False)  # Store username for easy display
    description = Column(Text, nullable=True)  # Description of what changed
    old_data = Column(Text, nullable=True)  # JSON string of old expense data (for updates/deletes)
    new_data = Column(Text, nullable=True)  # JSON string of new expense data (for creates/updates)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    user = relationship("User", backref="expense_history")
    expense = relationship("Expense", backref="history")

    def __repr__(self):
        return f"<ExpenseHistory(id={self.id}, action='{self.action}', user='{self.username}', expense_id={self.expense_id})>"
