# ml_model_bert.py
# Нейросетевой вариант для твоей задачи:
# RuBERT tiny + классификация документов
# Подходит лучше всего для русского текста при малом датасете (~500 примеров)

import os
import numpy as np
import pandas as pd
import torch

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer
)

MODEL_DIR = "storage/bert_model"

MODEL_NAME = "cointegrated/rubert-tiny2"


def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=1)

    acc = accuracy_score(labels, preds)

    precision, recall, f1, _ = precision_recall_fscore_support(
        labels,
        preds,
        average="macro",
        zero_division=0
    )

    return {
        "accuracy": acc,
        "precision": precision,
        "recall": recall,
        "f1": f1
    }


def train_model(texts, labels):

    # кодирование классов
    unique_labels = sorted(list(set(labels)))

    label2id = {x: i for i, x in enumerate(unique_labels)}
    id2label = {i: x for x, i in label2id.items()}

    y = [label2id[x] for x in labels]

    X_train, X_test, y_train, y_test = train_test_split(
        texts,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    train_df = pd.DataFrame({
        "text": X_train,
        "label": y_train
    })

    test_df = pd.DataFrame({
        "text": X_test,
        "label": y_test
    })

    train_ds = Dataset.from_pandas(train_df)
    test_ds = Dataset.from_pandas(test_df)

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    def tokenize(batch):
        return tokenizer(
            batch["text"],
            truncation=True,
            padding="max_length",
            max_length=256
        )

    train_ds = train_ds.map(tokenize, batched=True)
    test_ds = test_ds.map(tokenize, batched=True)

    train_ds.set_format(
        type="torch",
        columns=["input_ids", "attention_mask", "label"]
    )

    test_ds.set_format(
        type="torch",
        columns=["input_ids", "attention_mask", "label"]
    )

    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=len(unique_labels),
        id2label=id2label,
        label2id=label2id
    )

    args = TrainingArguments(
        output_dir="storage/bert_output",
        eval_strategy="epoch",
        save_strategy="epoch",
        logging_strategy="epoch",

        num_train_epochs=6,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,

        learning_rate=2e-5,
        weight_decay=0.01,

        load_best_model_at_end=True,
        metric_for_best_model="f1",

        report_to="none"
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_ds,
        eval_dataset=test_ds,
        compute_metrics=compute_metrics
    )

    trainer.train()

    metrics = trainer.evaluate()

    print("\n===== RuBERT tiny =====")
    print("Accuracy:", metrics["eval_accuracy"])
    print("Precision:", metrics["eval_precision"])
    print("Recall:", metrics["eval_recall"])
    print("F1:", metrics["eval_f1"])

    trainer.save_model(MODEL_DIR)
    tokenizer.save_pretrained(MODEL_DIR)


def predict(text):

    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)

    model.eval()

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=256
    )

    with torch.no_grad():
        outputs = model(**inputs)

    probs = torch.softmax(outputs.logits, dim=1)[0]

    pred_id = torch.argmax(probs).item()

    label = model.config.id2label[pred_id]
    confidence = float(probs[pred_id])

    return label, confidence