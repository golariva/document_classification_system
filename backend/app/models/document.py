from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base
from sqlalchemy.orm import relationship

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    uploaded_at = Column(TIMESTAMP, server_default=func.now())
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    text_content = Column(Text)
    status = Column(String, default="active")  # active | missing | deleted
    category = relationship("Category")