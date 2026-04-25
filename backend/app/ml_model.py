import os
import joblib

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion
from sklearn.linear_model import LogisticRegression

from sklearn.metrics import confusion_matrix
import numpy as np

group_map = {
    # --- ЛЭК ---
    "ЛЭК": [
        "Протоколы ЛЭК ВКР Бизнес-информатика",
        "Протоколы ЛЭК ВКР Программная инженерия",
    ],

    # --- ГЭК ---
    "ГЭК": [
        "Итоговые заседания президиума ГЭК Бизнес-информатика",
        "Итоговые заседания президиума ГЭК Программная инженерия",
    ],

    # --- концепции ВКР ---
    "Концепции ВКР": [
        "Комиссия концепции ВКР англ. Бизнес-информатика",
        "Комиссия концепции ВКР англ. Программная инженерия",
    ],

    # --- отчёты ГЭК ---
    "Отчёты ГЭК": [
        "Отчет председателя ГЭК Бизнес-информатика",
        "Отчет председателя ГЭК Программная инженерия",
    ],

    # --- документы сотрудников ---
    "Документы сотрудников": [
        "Положения об отделе",
        "Должностные инструкции работников",
        "Служебные записки отдела",
    ],

    # --- студенты ---
    "Документы студентов": [
        "Акты по работе со студентами",
        "Акты приема-передачи документов",
    ],

    # --- номенклатура ---
    "Номенклатура": [
        "Номенклатура дел отдела",
    ],

    "Документы студентов": [
        "Документы проектной деятельности студентов",
    ],
}

MODEL_PATH = "storage/model.pkl"
VECTORIZER_PATH = "storage/vectorizer.pkl"

def to_group(label, mapping):
    for group, labels in mapping.items():
        if label in labels:
            return group
    return "UNKNOWN"

def train_model(texts, labels):

    X_train_text, X_test_text, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels,
        shuffle=True
    )

    vectorizer = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 3),
        max_features=10000,
        lowercase=True,
        min_df=2
    )

    X_train = vectorizer.fit_transform(X_train_text)
    X_test = vectorizer.transform(X_test_text)

    model = LogisticRegression(
        max_iter=5000,
        C=4.0,
        class_weight="balanced",
        solver="lbfgs",
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    pred = model.predict(X_test)

    import pandas as pd
    import seaborn as sns
    import matplotlib.pyplot as plt
    from sklearn.metrics import confusion_matrix

    y_test_group = [to_group(l, group_map) for l in y_test]
    pred_group = [to_group(l, group_map) for l in pred]

    labels_group = sorted(set(y_test))

    cm = confusion_matrix(y_test, pred, labels=labels_group)

    cm_df = pd.DataFrame(
        cm,
        index=labels_group,
        columns=labels_group
    )

    plt.figure(figsize=(10, 7))

    sns.heatmap(
        cm_df,
        annot=True,
        fmt="d",
        cmap="Blues"
    )

    plt.title("Матрица несоответствий")
    plt.xlabel("Предсказаная категория")
    plt.ylabel("Верная категория")

    plt.tight_layout()
    plt.savefig("storage/confusion_matrix_grouped.png", dpi=300)
    plt.show()

    acc = accuracy_score(y_test, pred)

    precision, recall, f1, _ = precision_recall_fscore_support(
        y_test,
        pred,
        average="macro",
        zero_division=0
    )

    print("Accuracy:", acc)
    print("Precision:", precision)
    print("Recall:", recall)
    print("F1:", f1)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)

    import json

    metrics = {
        "accuracy": float(acc),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1)
    }

    with open("storage/model_metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)

def predict(text):

    if not os.path.exists(MODEL_PATH):
        return None, None

    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)

    X = vectorizer.transform([text])

    probs = model.predict_proba(X)[0]
    pred = model.predict(X)[0]

    confidence = float(probs.max())

    print("\nTEXT:", text[:200])
    print("PRED:", pred)
    print("CONF:", confidence)

    if confidence < 0.45:
        return "UNKNOWN", confidence

    return pred, confidence