import React, { useState, useEffect } from "react";
import { getToken } from "../api";
import styles from "./EmployeePage.module.css";

export default function EmployeePage() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
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
  const [correctCategory, setCorrectCategory] = useState("");
  const [showSelect, setShowSelect] = useState(false);
  const [tempQueue, setTempQueue] = useState([]);
  const [autoConfirm, setAutoConfirm] = useState(
    localStorage.getItem("autoConfirm") === "true"
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [classifyProgress, setClassifyProgress] = useState(0);
  const [classifying, setClassifying] = useState(false);

  const limit = 5;
  const token = getToken();

  const fetchCategories = async () => {
    const res = await fetch("http://109.73.205.67:8000/categories", {
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
        `http://109.73.205.67:8000/documents?skip=${(page - 1) * limit}&limit=${limit}&search=${search}&category=${categoryId}`,
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

  const confirmUpload = async (data, confirmed, trueCategoryId = null) => {
    const formData = new FormData();

    formData.append("temp_path", data.temp_path);
    formData.append("filename", data.filename);
    formData.append("category_name", data.category);
    formData.append("probability", data.probability);
    formData.append("is_confirmed", confirmed ? "true" : "false");

    if (!confirmed && trueCategoryId) {
      formData.append("true_category_id", trueCategoryId);
    }

    try {
      const res = await fetch("http://109.73.205.67:8000/confirm-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const result = await res.json(); // 👈 ВАЖНО
      fetchDocuments();

      return {
        filename: data.filename,
        category: result.category,
        probability: result.probability
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const handleUpload = async () => {
    const shouldAuto = localStorage.getItem("autoConfirm") === "true";

    if (!files.length) return;

    setResults([]);
    setTempQueue([]);
    setTempData(null);
    setCurrentIndex(0);

    const queue = [];
    const finalResults = [];

    for (let f of files) {
      const formData = new FormData();
      formData.append("file", f);

      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "http://109.73.205.67:8000/upload-temp");
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.onload = () => resolve(JSON.parse(xhr.responseText));
        xhr.onerror = reject;

        xhr.send(formData);
      });

      queue.push(data);
    }

    setUploading(false);

    if (shouldAuto) {
      for (const item of queue) {
        const res = await confirmUpload(item, true);
        if (res) finalResults.push(res);
      }

      setResults(finalResults);
      setFiles([]);
      return;
    }

    // ручной режим
    setTempQueue(queue);
    setCurrentIndex(0);
    setTempData(queue[0]);
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
            multiple
            onChange={(e) => {
              setFiles(Array.from(e.target.files));
            }}
          />

          <div className={styles.fileInner}>
            <span>Выберите файл</span>
              <span className={styles.fileName}>
                {files.length ? `Файлов: ${files.length}` : "Файлы не выбраны"}
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

        {uploading && (
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {classifying && (
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${classifyProgress}%` }}
            />
            <span>Классификация... {classifyProgress}%</span>
          </div>
        )}

        {results.length > 0 && !tempData && (
          <div className={styles.result}>
            <h3>Результаты загрузки</h3>

            {results.map((t, i) => (
              <div key={i} className={styles.doc}>
                <div>
                  <b>{t.filename}</b>
                  <div>
                    Определенная категория: {t.category}
                  </div>
                  <div>
                    Вероятность принадлжености: {(t.probability * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
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

                {!showSelect && (
                  <div className={styles.modalActions}>
                    <button
                      className={styles.confirmBtn}
                      onClick={async () => {
                        const res = await confirmUpload(tempData, true);

                        if (res) {
                          setResults(prev => [...prev, res]);
                        }

                        const nextIndex = currentIndex + 1;

                        if (nextIndex < tempQueue.length) {
                          setCurrentIndex(nextIndex);
                          setTempData(tempQueue[nextIndex]);
                        } else {
                          setTempData(null);
                          setTempQueue([]);
                        }

                        setFiles([]);
                        fetchDocuments();
                      }}
                    >
                      Подтвердить
                    </button>

                    <button
                      className={styles.secondaryBtn}
                      onClick={() => setShowSelect(true)}
                    >
                      Выбрать другую категорию
                    </button>

                    <button
                      className={styles.cancelBtn}
                      onClick={async () => {
                        await confirmUpload(tempData, false);

                        const nextIndex = currentIndex + 1;

                        if (nextIndex < tempQueue.length) {
                          setCurrentIndex(nextIndex);
                          setTempData(tempQueue[nextIndex]);
                        } else {
                          setTempData(null);
                          setTempQueue([]);
                        }

                        setShowSelect(false);
                        setCorrectCategory("");
                        setFiles([]);

                        fetchDocuments();
                      }}
                    >
                      Отклонить
                    </button>
                  </div>
                )}
                {showSelect && (
                  <div className={styles.selectBlock}>
                    <select
                      className={styles.select}
                      value={correctCategory}
                      onChange={(e) => setCorrectCategory(e.target.value)}
                    >
                      <option value="">Выберите категорию</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <button
                      className={styles.confirmBtn}
                      disabled={!correctCategory}
                      onClick={async () => {
                        const res = await confirmUpload(
                          tempData,
                          false,
                          correctCategory
                        );

                        if (res) {
                          setResults(prev => [...prev, res]);
                        }

                        const nextIndex = currentIndex + 1;

                        if (nextIndex < tempQueue.length) {
                          setCurrentIndex(nextIndex);
                          setTempData(tempQueue[nextIndex]);
                        } else {
                          setTempData(null);
                          setTempQueue([]);
                        }

                        setShowSelect(false);
                        setCorrectCategory("");
                        setFiles([]);

                        fetchDocuments();
                      }}
                    >
                      Сохранить
                    </button>

                    <button
                      className={styles.cancelBtn}
                      onClick={() => {
                        setShowSelect(false);
                        setCorrectCategory("");
                      }}
                    >
                      Назад
                    </button>
                  </div>
                )}

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