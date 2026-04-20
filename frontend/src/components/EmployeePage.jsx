import React, { useState, useEffect } from "react";
import { getToken } from "../api";
import styles from "./EmployeePage.module.css";

export default function EmployeePage() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [documents, setDocuments] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [tempData, setTempData] = useState(null);
  const [autoConfirm, setAutoConfirm] = useState(
    localStorage.getItem("autoConfirm") === "true"
  );

  const limit = 5;
  const token = getToken();

  const fetchCategories = async () => {
    const res = await fetch("http://127.0.0.1:8000/categories", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    setCategories(data);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchDocuments = async () => {
    setLoadingDocs(true);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/documents?skip=${(page - 1) * limit}&limit=${limit}&search=${search}&category=${categoryId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await res.json();
      setDocuments(data.items || []);
      setTotalPages(data.total ? Math.ceil(data.total / limit) : 1);
    } catch (e) {
      console.error(e);
    }

    setLoadingDocs(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, search, categoryId]);

  const confirmUpload = async (data, confirmed) => {
    const formData = new FormData();

    formData.append("temp_path", data.temp_path);
    formData.append("filename", data.filename);
    formData.append("category_name", data.category);
    formData.append("probability", data.probability);
    formData.append("is_confirmed", confirmed);

    await fetch("http://127.0.0.1:8000/confirm-upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    setTempData(null);

    if (confirmed) {
      setResult(data); // показываем результат только если подтвердили
    }

    fetchDocuments();
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setResult(null);
    setTempData(null);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    xhr.open("POST", "http://127.0.0.1:8000/upload-temp");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    // 🔥 прогресс загрузки
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setProgress(percent);
      }
    };

    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText);

      setUploading(false);

      if (autoConfirm) {
        confirmUpload(data, true);
        setResult(data);
      } else {
        setTempData(data);
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      console.error("Upload error");
    };

    xhr.send(formData);
  };

  return (
    <div className={styles.page}>

      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Кабинет сотрудника</h1>
          <p className={styles.subtitle}>
            Система классификации документов
          </p>
        </div>

        <div className={styles.nav}>
          <button className={styles.navBtn} onClick={fetchDocuments}>
            Обновить
          </button>

          <button
            className={styles.navBtn}
            onClick={() => (window.location.href = "/profile")}
          >
            Профиль
          </button>

          <button
            className={styles.navBtn}
            onClick={() =>
              window.open("https://disk.yandex.ru/client/disk", "_blank")
            }
          >
            Яндекс.Диск
          </button>

          <button
            className={`${styles.navBtn} ${styles.logout}`}
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/";
            }}
          >
            Выйти
          </button>
        </div>
      </div>

      {/* UPLOAD */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Загрузка документа</h2>

        <label className={styles.fileBox}>
          <input
            type="file"
            className={styles.hiddenInput}
            onChange={(e) => {
              setFile(e.target.files[0]);
              setFileName(e.target.files[0]?.name || "");
            }}
          />

          <div className={styles.fileInner}>
            <span>Выберите файл</span>
            <span className={styles.fileName}>
              {fileName || "Файл не выбран"}
            </span>
          </div>
        </label>

        <button
          className={styles.mainButton}
          onClick={handleUpload}
          disabled={loading}
        >
          {loading ? "Обработка..." : "Загрузить и классифицировать"}
        </button>

        {/* PROGRESS */}
        {uploading && (
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* RESULT */}
        {result && !tempData && (
          <div className={styles.result}>
            <h3>Результат</h3>
            <p>
              <b>Файл:</b> {result.filename}
            </p>
            <p>
              <b>Категория:</b> {result.category || "unknown"}
            </p>
            <p>
              <b>Индекс категории:</b> {result.index_code || "unknown"}
            </p>
            <p>
              <b>Вероятность:</b>{" "}
              {(result.probability * 100).toFixed(1)}%
            </p>
          </div>
        )}

        {/* MODAL */}
        {tempData && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h3>Подтвердить классификацию</h3>

              <p>
                <b>Файл:</b> {tempData.filename}
              </p>
              <p>
                <b>Категория:</b> {tempData.category}
              </p>
              <p>
                <b>Индекс категории:</b> {tempData.index_code || "unknown"}
              </p>
              <p>
                <b>Вероятность:</b>{" "}
                {(tempData.probability * 100).toFixed(1)}%
              </p>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={autoConfirm}
                  onChange={(e) => {
                    setAutoConfirm(e.target.checked);
                    localStorage.setItem(
                      "autoConfirm",
                      e.target.checked
                    );
                  }}
                />
                Больше не спрашивать
              </label>

              <div className={styles.modalActions}>
                <button
                  className={styles.confirmBtn}
                  onClick={() => confirmUpload(tempData, true)}
                >
                  Подтвердить
                </button>

                <button
                  className={styles.cancelBtn}
                  onClick={() => confirmUpload(tempData, false)}
                >
                  Отклонить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SEARCH */}
      <div className={styles.searchBar}>
        <input
          className={styles.input}
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className={styles.input}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <button
          className={styles.mainButton}
          onClick={() => {
            setPage(1);
            fetchDocuments();
          }}
        >
          Найти
        </button>
      </div>

      {/* DOCS */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Документы</h2>

        {loadingDocs ? (
          <p>Загрузка...</p>
        ) : documents.length === 0 ? (
          <p className={styles.empty}>Пока нет документов</p>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className={styles.doc}>
              <div>
                <b>{doc.filename}</b>
                <div className={styles.path}>{doc.file_path}</div>
              </div>

              <div className={styles.docRight}>
                <div
                  className={`${styles.status} ${
                    doc.status === "missing"
                      ? styles.statusRed
                      : doc.status === "moved"
                      ? styles.statusOrange
                      : ""
                  }`}
                >
                  {doc.status === "missing" && "Файл удалён"}
                  {doc.status === "moved" && "Файл перемещён"}
                </div>

                <button
                  className={styles.smallBtn}
                  onClick={() =>
                    window.open(
                      `https://disk.yandex.ru/client/disk/${doc.file_path}`,
                      "_blank"
                    )
                  }
                >
                  открыть
                </button>
              </div>
            </div>
          ))
        )}

        {/* PAGINATION */}
        <div className={styles.pagination}>
          <button
            className={styles.smallBtn}
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Назад
          </button>

          <span>
            Страница {page} из {totalPages}
          </span>

          <button
            className={styles.smallBtn}
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Вперед
          </button>
        </div>
      </div>
    </div>
  );
}