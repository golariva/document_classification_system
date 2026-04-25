import os
import joblib
import re
import random

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.svm import LinearSVC

MODEL_PATH = "storage/model_svm.pkl"
VECTORIZER_PATH = "storage/vectorizer_svm.pkl"


def clean(text):
    text = text.lower()
    text = re.sub(r"\d+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text


def augment(text):
    noise = [" ", " документ", " файл", " форма", " версия", " копия"]
    return text + random.choice(noise)


def train_model(texts, labels):
    texts = [clean(x) for x in texts]

    X_train_text, X_test_text, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels
    )

    X_train_text = [augment(x) for x in X_train_text]

    vectorizer = CountVectorizer(
        analyzer="word",
        ngram_range=(1,3),
        max_features=10000,
        min_df=2
    )

    X_train = vectorizer.fit_transform(X_train_text)
    X_test = vectorizer.transform(X_test_text)

    model = LinearSVC(
        C=1.0,
        class_weight="balanced",
        max_iter=5000
    )

    model.fit(X_train, y_train)

    pred = model.predict(X_test)

    acc = accuracy_score(y_test, pred)
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_test,
        pred,
        average="macro",
        zero_division=0
    )

    print("\n===== Linear SVM =====")
    print("Accuracy:", acc)
    print("Precision:", precision)
    print("Recall:", recall)
    print("F1:", f1)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)