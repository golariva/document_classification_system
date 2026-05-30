from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
import shutil
import os
from sqlalchemy.sql import func
import secrets

from app.db.database import get_db
from app.services.document_service import create_document, get_documents
from app.services.category_service import get_categories

from fastapi import HTTPException
from app.services.auth_service import authenticate_user, hash_password
from app.core.security import create_access_token
from app.models.user import User
from app.models.log import Log
from app.services.deps import require_admin
from app.services.deps import get_current_user
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Form
from app.utils.yandex_disk import upload_to_yandex, ensure_folder, file_exists, find_file_by_name

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

class UpdateUser(BaseModel):
    username: str
    email: str
    role: str

class UpdateCategory(BaseModel):
    name: str
    description: str | None = None
    storage_period: str | None = None

class DeleteUserRequest(BaseModel):
    password: str

UPLOAD_DIR = "storage"

os.makedirs(UPLOAD_DIR, exist_ok=True)

from app.ml_model import predict
import uuid

from app.ml_model import predict
from app.utils.file_parser import extract_text
import uuid
import shutil

@router.post("/upload-temp")
def upload_temp(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import uuid
    import os
    import shutil

    from app.models.category import Category
    from app.utils.file_parser import extract_text
    from app.ml_model import predict

    safe_filename = f"{uuid.uuid4()}_{file.filename}"

    allowed_extensions = [".txt", ".docx", ".pdf"]

    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format"
        )

    temp_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    text = extract_text(temp_path, file.filename)
    predicted_name, prob = predict(text)

    # 🔥 ищем категорию в БД
    category = db.query(Category).filter(
        Category.name == predicted_name
    ).first()

    return {
        "temp_path": temp_path,
        "filename": file.filename,
        "category": predicted_name,
        "index_code": category.index_code if category else None,
        "probability": prob
    }

@router.post("/confirm-upload")
def confirm_upload(
    temp_path: str = Form(...),
    filename: str = Form(...),
    category_name: str = Form(...),
    probability: float = Form(...),
    is_confirmed: bool = Form(...),
    true_category_id: int = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.category import Category
    from app.models.classification_result import ClassificationResult

    model_category = db.query(Category).filter(
        Category.name == category_name
    ).first()

    if not model_category:
        model_category = db.query(Category).first()

    # =========================
    # CASE 1: пользователь выбрал другую категорию
    # =========================
    if true_category_id:
        cat = db.query(Category).get(true_category_id)

        os.makedirs(cat.storage_path, exist_ok=True)
        final_path = os.path.join(cat.storage_path, filename)

        shutil.move(temp_path, final_path)

        ensure_folder(f"/{cat.storage_path}")
        upload_to_yandex(final_path, f"/{cat.storage_path}/{filename}")

        doc = create_document(
            db,
            filename,
            f"/{cat.storage_path}/{filename}",
            user_id=current_user.id,
            category_id=cat.id
        )

        db.add(Log(
            user_id=current_user.id,
            document_id=doc.id,
            action_type="КЛАССИФИЦИРОВАН ДОКУМЕНТ",
            description=f"Модель классифицировала файл '{filename}' как '{category_name}' с вероятностью {probability:.2f}"
        ))
        db.commit()

        db.add(Log(
            user_id=current_user.id,
            document_id=doc.id,
            action_type="ЗАГРУЗКА ДОКУМЕНТА С ДРУГОЙ КАТЕГОРИЕЙ",
            description=f"Файл '{filename}' перенесён из '{model_category.name}' в '{cat.name}'"
        ))
        db.commit()

        db.add(ClassificationResult(
            category_id=model_category.id,
            true_category_id=cat.id,
            probability=probability,
            is_confirmed=False,
            document_id=doc.id
        ))
        db.commit()

        return {"id": doc.id, "filename": filename, "category": cat.name, "probability": probability}

    # =========================
    # CASE 2: reject (ОТКЛОНЕНО)
    # =========================
    if not is_confirmed:

        # ❌ файл НЕ сохраняем вообще
        if os.path.exists(temp_path):
            os.remove(temp_path)

        db.add(Log(
            user_id=current_user.id,
            action_type="КЛАССИФИЦИРОВАН ДОКУМЕНТ",
            description=(
                f"Модель классифицировала '{filename}' как '{model_category.name}' "
                f"с вероятностью {probability:.2f}. Пользователь ОТКЛОНИЛ загрузку"
            )
        ))

        db.add(Log(
            user_id=current_user.id,
            action_type="ОТКЛОНЕНА КЛАССИФИКАЦИЯ",
            description=f"Пользователь отменил загрузку файла '{filename}'"
        ))

        db.commit()

        db.add(ClassificationResult(
            category_id=model_category.id,
            true_category_id=None,
            probability=probability,
            is_confirmed=False
        ))

        db.commit()

        return {
            "filename": filename,
            "category": model_category.name,
            "probability": probability
        }

    # =========================
    # CASE 3: confirm (ПОДТВЕРДИЛ)
    # =========================
    os.makedirs(model_category.storage_path, exist_ok=True)
    final_path = os.path.join(model_category.storage_path, filename)

    shutil.move(temp_path, final_path)

    ensure_folder(f"/{model_category.storage_path}")
    upload_to_yandex(final_path, f"/{model_category.storage_path}/{filename}")

    doc = create_document(
        db,
        filename,
        f"/{model_category.storage_path}/{filename}",
        user_id=current_user.id,
        category_id=model_category.id
    )

    db.add(Log(
        user_id=current_user.id,
        document_id=doc.id,
        action_type="КЛАССИФИЦИРОВАН ДОКУМЕНТ",
        description=f"Модель классифицировала файл '{filename}' как '{category_name}' с вероятностью {probability:.2f}"
    ))
    db.commit()

    db.add(Log(
        user_id=current_user.id,
        document_id=doc.id,
        action_type="ЗАГРУЗКА ДОКУМЕНТА",
        description=f"Файл '{filename}' загружен в '{model_category.name}'"
    ))
    db.commit()

    db.add(ClassificationResult(
        category_id=model_category.id,
        true_category_id=None,
        probability=probability,
        is_confirmed=True,
        document_id=doc.id
    ))
    db.commit()

    return {"id": doc.id, "filename": filename, "category": model_category.name, "probability": probability}

@router.get("/documents")
def list_documents(
    skip: int = 0,
    limit: int = 5,
    search: str = "",
    status: str = "",
    category: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.document import Document
    from app.models.category import Category

    query = db.query(Document).filter(
        Document.user_id == current_user.id
    )

    # 🔍 поиск по названию
    if search:
        query = query.filter(Document.filename.ilike(f"%{search}%"))

    # 🎯 фильтр по статусу
    if status:
        query = query.filter(Document.status == status)

    if category and category.isdigit():
        query = query.filter(Document.category_id == int(category))

    total = query.count()

    documents = query\
        .order_by(Document.id.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()

    for doc in documents:
        exists = file_exists(doc.file_path)

        if not exists and doc.status != "missing":
            doc.status = "missing"

            db.add(Log(
                user_id=current_user.id,
                document_id=doc.id,
                action_type="УДАЛЕН ДОКУМЕНТ",
                description=f"Файл '{doc.filename}' удалён с Яндекс.Диска (категория '{doc.category.name if doc.category else 'неизвестно'}')"
            ))

        # (опционально) если файл вернулся
        if exists and doc.status == "missing":
            doc.status = "ok"

    db.commit()

    return {
        "items": [
            {
                "id": doc.id,
                "filename": doc.filename,
                "file_path": doc.file_path,
                "status": doc.status,
                "category": doc.category.name if doc.category else None
            }
            for doc in documents
        ],
        "total": total
    }


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
    from app.ml_model import predict
    from app.utils.file_parser import extract_text

    doc = db.query(Document).get(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    text = extract_text(doc.file_path, doc.filename)

    predicted_name, prob = predict(text)

    cat = db.query(Category).filter(
        Category.name == predicted_name
    ).first()

    if not cat:
        cat = db.query(Category).first()

    result = ClassificationResult(
        document_id=doc.id,
        category_id=cat.id,
        probability=prob
    )

    db.add(result)
    db.commit()

    return {
        "category": cat.name,
        "probability": prob
    }

from pydantic import BaseModel
import uuid

class ResetRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    reset_code: str
    new_password: str


@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == data.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid data"
        )

    if user.reset_code != data.reset_code:
        raise HTTPException(
            status_code=403,
            detail="Wrong reset code"
        )

    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Weak password"
        )

    user.password_hash = hash_password(
        data.new_password
    )

    # новый код после восстановления
    user.reset_code = generate_reset_code()

    db.commit()

    return {
        "message": "Пароль изменен",
        "new_reset_code": user.reset_code
    }

@router.post("/categories")
def create_category(data: dict, db: Session = Depends(get_db)):
    from app.models.category import Category

    if data.get("parent_id") == "":
        data["parent_id"] = None

    cat = Category(**data)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.get("/categories/{id}/can-delete")
def can_delete_category(id: int, db: Session = Depends(get_db)):
    from app.models.document import Document
    from app.models.category import Category

    cat = db.query(Category).get(id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    docs_count = db.query(Document).filter(
        Document.category_id == id
    ).count()

    return {
        "can_delete": docs_count == 0,
        "documents_count": docs_count
    }

@router.delete("/categories/{id}")
def delete_category(id: int, force: bool = False, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.category import Category
    from app.models.document import Document

    cat = db.query(Category).get(id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    docs = db.query(Document).filter(Document.category_id == id).all()

    if docs and not force:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Category has documents",
                "documents_count": len(docs)
            }
        )

    # удалить документы
    for d in docs:
        db.delete(d)

    # удалить категорию
    db.delete(cat)
    db.commit()

    return {"ok": True}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "username": current_user.username,
        "created_at": current_user.created_at.strftime("%d.%m.%Y %H:%M")
    }

from pydantic import BaseModel
from app.services.auth_service import verify_password, hash_password

class ChangePassword(BaseModel):
    old_password: str
    new_password: str


@router.post("/change-password")
def change_password(
    data: ChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Wrong old password")

    # минимальная проверка сложности
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Weak password")

    current_user.password_hash = hash_password(data.new_password)
    db.commit()

    return {"message": "Password updated"}

@router.get("/logs")
def get_logs(
    search: str = "",
    type: str = "",
    from_date: str = None,
    to_date: str = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    query = db.query(Log)

    if search:
        query = query.filter(Log.description.ilike(f"%{search}%"))

    if type:
        query = query.filter(Log.action_type == type)

    if from_date:
        query = query.filter(Log.created_at >= from_date)

    if to_date:
        query = query.filter(Log.created_at <= to_date)

    total = query.count()

    logs = query.order_by(Log.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()

    return {
        "items": logs,
        "total": total
    }

@router.get("/reports/documents-by-category")
def documents_by_category(
    from_date: str = None,
    to_date: str = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    from app.models.document import Document
    from app.models.category import Category

    query = db.query(
        Category.name,
        func.count(Document.id)
    ).join(Document, Document.category_id == Category.id)

    if from_date:
        query = query.filter(Document.uploaded_at >= from_date)

    if to_date:
        query = query.filter(Document.uploaded_at <= to_date)

    result = query.group_by(Category.name).all()

    return [{"category": r[0], "count": r[1]} for r in result]

from sqlalchemy import func

@router.get("/reports/documents-dynamics")
def documents_dynamics(
    from_date: str = None,
    to_date: str = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    from app.models.document import Document

    query = db.query(
        func.date(Document.uploaded_at),
        func.count(Document.id)
    )

    if from_date:
        query = query.filter(Document.uploaded_at >= from_date)

    if to_date:
        query = query.filter(Document.uploaded_at <= to_date)

    result = query.group_by(
        func.date(Document.uploaded_at)
    ).order_by(
        func.date(Document.uploaded_at)
    ).all()

    return [{"date": str(r[0]), "count": r[1]} for r in result]

from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score

@router.get("/reports/classification-metrics")
def classification_metrics(db: Session = Depends(get_db), user=Depends(get_current_user)):
    from app.models.classification_result import ClassificationResult

    results = db.query(ClassificationResult).all()

    if not results:
        return {
            "accuracy": 0,
            "precision": 0,
            "recall": 0,
            "f1": 0,
            "total": 0
        }

    y_true = []
    y_pred = []

    for r in results:
        if r.is_confirmed is None:
            continue

        # ВАЖНО:
        # сейчас считаем:
        # confirmed = correct prediction
        # rejected = wrong prediction

        y_pred.append(1)  # модель "угадала" (упрощение)
        y_true.append(1 if r.is_confirmed else 0)

    total = db.query(ClassificationResult).count()
    confirmed = db.query(ClassificationResult).filter(
        ClassificationResult.is_confirmed == True
    ).count()

    return {
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "f1": f1_score(y_true, y_pred, zero_division=0),
        "total": total,
        "confirmed": confirmed,
        "rejected": total - confirmed
    }
@router.get("/reports/model-metrics")
def get_model_metrics(db: Session = Depends(get_db)):
    import os
    import json
    from app.models.classification_result import ClassificationResult

    path = "storage/model_metrics.json"

    # метрики модели (из файла)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            model_metrics = json.load(f)
    else:
        model_metrics = {
            "accuracy": 0,
            "precision": 0,
            "recall": 0,
            "f1": 0
        }

    # метрики из БД
    total = db.query(ClassificationResult).count()

    confirmed = db.query(ClassificationResult).filter(
        ClassificationResult.is_confirmed == True
    ).count()

    rejected = db.query(ClassificationResult).filter(
        ClassificationResult.is_confirmed == False
    ).count()

    return {
        **model_metrics,
        "total": total,
        "confirmed": confirmed,
        "rejected": rejected
    }

@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    users = db.query(User).order_by(User.id.asc()).all()

    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "reset_code": u.reset_code,
            "created_at": u.created_at.strftime("%d.%m.%Y %H:%M")
        }
        for u in users
    ]

def generate_reset_code():
    return secrets.token_hex(4).upper()

@router.post("/users")
def create_user(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    exists = db.query(User).filter(User.email == data["email"]).first()

    if exists:
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        username=data["username"],
        email=data["email"],
        password_hash=hash_password(data["password"]),
        role=data["role"],
        reset_code=generate_reset_code()
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "ok": True,
        "reset_code": user.reset_code
    }

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    data: DeleteUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).get(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 1. нельзя удалить самого себя
    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete yourself"
        )

    # 2. проверка пароля УДАЛЯЕМОГО пользователя
    from app.services.auth_service import verify_password

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=403,
            detail="Wrong user password"
        )

    db.delete(user)
    db.commit()

    return {"ok": True}

@router.put("/users/{user_id}/role")
def change_role(
    user_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).get(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = data["role"]
    db.commit()

    return {"ok": True}

@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    data: UpdateUser,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).get(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id and data.role != user.role:
        raise HTTPException(
            status_code=400,
            detail="You cannot change your own role"
        )

    exists = db.query(User).filter(
        User.email == data.email,
        User.id != user.id
    ).first()

    if exists:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    user.username = data.username
    user.email = data.email
    user.role = data.role

    db.commit()

    return {"ok": True}

@router.put("/categories/{category_id}")
def update_category(
    category_id: int,
    data: UpdateCategory,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    from app.models.category import Category

    category = db.query(Category).get(category_id)

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    category.name = data.name
    category.description = data.description
    category.storage_period = data.storage_period

    db.commit()

    return {"ok": True}