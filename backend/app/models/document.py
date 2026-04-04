from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    uploaded_at = Column(TIMESTAMP, server_default=func.now())

    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    text_content = Column(Text)