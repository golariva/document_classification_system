from sqlalchemy import Column, Integer, Float, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base

class ClassificationResult(Base):
    __tablename__ = "classification_results"

    id = Column(Integer, primary_key=True, index=True)

    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"))

    probability = Column(Float)
    is_confirmed = Column(Boolean, default=False)

    classified_at = Column(TIMESTAMP, server_default=func.now())