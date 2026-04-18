from sqlalchemy.orm import Session
from app.models.document import Document

def create_document(db: Session, filename: str, file_path: str, user_id: int, category_id: int):
    doc = Document(
        filename=filename,
        file_path=file_path,
        user_id=user_id,
        category_id=category_id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def get_documents(db: Session):
    return db.query(Document).all()