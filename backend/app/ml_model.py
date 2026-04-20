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
        "Журнал протоколов ЛЭК Бизнес-информатика",
        "Журнал протоколов ЛЭК Программная инженерия",
    ],

    # --- ГЭК ---
    "ГЭК": [
        "Итоговые заседания президиума ГЭК Бизнес-информатика",
        "Итоговые заседания президиума ГЭК Программная инженерия",
        "Журнал итоговых заседаний ГЭК Бизнес-информатика",
        "Журнал итоговых заседаний ГЭК Программная инженерия",
    ],

    # --- концепции ВКР ---
    "Концепции ВКР": [
        "Комиссия концепции ВКР англ. Бизнес-информатика",
        "Комиссия концепции ВКР англ. Программная инженерия",
        "Журнал комиссии концепции ВКР Бизнес-информатика",
        "Журнал комиссии концепции ВКР Программная инженерия",
    ],

    # --- отчёты ГЭК ---
    "Отчёты ГЭК": [
        "Отчет председателя ГЭК Бизнес-информатика",
        "Отчет председателя ГЭК Программная инженерия",
    ],

    # --- журналы ---
    "Журналы": [
        "Журнал учета выдачи студенческих билетов",
        "Журнал регистрации справок",
        "Журнал регистрации заявлений студентов",
        "Журнал регистрации актов по студентам",
        "Журнал приема-передачи документов",
    ],

    # --- документы сотрудников ---
    "Документы сотрудников": [
        "Положения об отделе",
        "Должностные инструкции работников",
        "Служебные записки отдела",
    ],

    # --- студенты ---
    "Документы студентов": [
        "Личные дела студентов",
        "Акты по работе со студентами",
        "Документы проектной деятельности студентов",
        "Заявления студентов",
    ],

    # --- дипломы ---
    "Дипломы": [
        "Книга регистрации дипломов БИ гос. образца",
        "Книга регистрации дипломов ПИ гос. образца",
        "Книга регистрации дипломов БИ НИУ ВШЭ",
        "Книга регистрации дипломов ПИ НИУ ВШЭ",
    ],

    # --- БСО ---
    "БСО": [
        "Документы по учету бланков строгой отчетности",
    ],

    # --- номенклатура ---
    "Номенклатура": [
        "Номенклатура дел отдела",
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
        stratify=labels
    )

    vectorizer = FeatureUnion([
        ("word", TfidfVectorizer(
            analyzer="word",
            ngram_range=(1, 2),
            max_features=15000,
            lowercase=True
        )),
        ("char", TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(3, 5),
            max_features=30000
        ))
    ])

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

    labels_group = sorted(set(y_test_group))

    cm = confusion_matrix(y_test_group, pred_group, labels=labels_group)

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