from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
import shutil
import os

from app.db.database import get_db
from app.services.document_service import create_document, get_documents
from app.services.category_service import get_categories

router = APIRouter()

UPLOAD_DIR = "storage"

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc = create_document(db, file.filename, file_path, user_id=1)

    return {"id": doc.id, "filename": doc.filename}


@router.get("/documents")
def list_documents(db: Session = Depends(get_db)):
    return get_documents(db)


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    return get_categories(db)