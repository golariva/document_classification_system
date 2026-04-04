from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base

class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"))

    action_type = Column(String(100), nullable=False)
    description = Column(Text)

    created_at = Column(TIMESTAMP, server_default=func.now())