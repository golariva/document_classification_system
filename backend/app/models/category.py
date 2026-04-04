from sqlalchemy import Column, Integer, String, Text
from app.db.database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False)
    storage_path = Column(String(300), nullable=False)
    description = Column(Text)