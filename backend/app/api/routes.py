from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
import shutil
import os

from app.db.database import get_db
from app.services.document_service import create_document, get_documents
from app.services.category_service import get_categories

from fastapi import HTTPException
from app.services.auth_service import authenticate_user
from app.core.security import create_access_token
from app.models.user import User
from app.services.deps import require_admin
from app.services.deps import get_current_user
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Form

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

UPLOAD_DIR = "storage"

os.makedirs(UPLOAD_DIR, exist_ok=True)

from app.ml_model import predict
import uuid

from app.ml_model import predict
from app.utils.file_parser import extract_text
import uuid
import shutil

@router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. временно сохраняем файл
    safe_filename = f"{uuid.uuid4()}_{file.filename}"
    temp_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 2. извлекаем текст (txt + docx)
    text = extract_text(temp_path, file.filename)

    # 3. классификация
    category, prob = predict(text)

    if not category:
        category = "unknown"

    # 4. создаём папку категории
    category_folder = os.path.join(UPLOAD_DIR, category)
    os.makedirs(category_folder, exist_ok=True)

    # 5. финальный путь (БЕЗ UUID 👇)
    final_path = os.path.join(category_folder, file.filename)

    # 6. перемещаем файл
    shutil.move(temp_path, final_path)

    # 7. сохраняем в БД
    doc = create_document(db, file.filename, final_path, user_id=current_user.id)

    return {
        "id": doc.id,
        "filename": doc.filename,
        "category": category,
        "probability": prob
    }

@router.get("/documents")
def list_documents(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Можно фильтровать по пользователю
    return [doc for doc in get_documents(db) if doc.user_id == current_user.id]


@router.get("/categories")
def list_categories(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return get_categories(db)

from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Form

@router.post("/login")
def login_json(data: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/admin-only")
def admin_panel(user: User = Depends(require_admin)):
    return {"message": "Welcome admin"}

@router.post("/classify/{document_id}")
def classify_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.document import Document
    from app.models.category import Category
    from app.models.classification_result import ClassificationResult
    import random

    doc = db.query(Document).get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    categories = db.query(Category).all()
    if not categories:
        raise HTTPException(status_code=400, detail="No categories")

    category = random.choice(categories)
    probability = round(random.uniform(0.7, 0.99), 2)

    result = ClassificationResult(
        document_id=doc.id,
        category_id=category.id,
        probability=probability
    )

    db.add(result)
    db.commit()

    return {
        "category": category.name,
        "probability": probability
    }