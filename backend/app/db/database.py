from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import DATABASE_URL

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from app.models.user import User
from app.models.document import Document
from app.models.category import Category
from app.models.log import Log
from app.models.classification_result import ClassificationResult

Base.metadata.create_all(bind=engine)