from app.db.database import SessionLocal
from app.models.category import Category

db = SessionLocal()

categories = db.query(Category).all()

cat_map = {c.id: c for c in categories}

def build_path(cat):
    path = []

    cur = cat
    while cur:
        # 🔥 ТОЛЬКО index_code
        path.append(cur.index_code)
        cur = cat_map.get(cur.parent_id)

    path.reverse()

    return "/".join(path)


# обновляем storage_path
for c in categories:
    c.storage_path = build_path(c)

db.commit()
db.close()

print("storage_path пересобран (только index_code)")