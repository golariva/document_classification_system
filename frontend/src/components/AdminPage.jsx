import React, { useEffect, useState } from "react";
import { getToken } from "../api";
import styles from "./AdminPage.module.css";

export default function AdminPage() {
  const token = getToken();

  const [tab, setTab] = useState("categories");
  const [categories, setCategories] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logSearch, setLogSearch] = useState("");
  const [logType, setLogType] = useState("");
  const [fromDate1, setFromDate1] = useState("");
  const [toDate1, setToDate1] = useState("");
  const [fromDate2, setFromDate2] = useState("");
  const [toDate2, setToDate2] = useState("");
  const [reportCats, setReportCats] = useState([]);
  const [reportDynamics, setReportDynamics] = useState([]);
  const [reportMetrics, setReportMetrics] = useState(null);
  const maxCats = Math.max(...reportCats.map(c => c.count), 1);
  const maxDyn = Math.max(...reportDynamics.map(d => d.count), 1);
  const [animKey, setAnimKey] = useState(0);
  const [animate, setAnimate] = useState(false);

  const [newCategory, setNewCategory] = useState({
    name: "",
    storage_path: "",
    description: "",
    index_code: "",
    storage_period: "",
    parent_id: ""
  });

  const fetchReports = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const query = `?from_date=${fromDate2}&to_date=${toDate2}`;

    setAnimate(false);

    const [c, d, m] = await Promise.all([
      fetch(`http://127.0.0.1:8000/reports/documents-by-category${query}`, { headers }).then(r => r.json()),
      fetch(`http://127.0.0.1:8000/reports/documents-dynamics${query}`, { headers }).then(r => r.json()),
      fetch(`http://127.0.0.1:8000/reports/classification-metrics${query}`, { headers }).then(r => r.json())
    ]);

    setReportCats(c);
    setReportDynamics(d);
    setReportMetrics(m);

    setTimeout(() => setAnimate(true), 80);
  };

  useEffect(() => {
    if (tab === "reports") {
      fetchReports();
    }
  }, [tab]);

  {reportCats.map((c, index) => {
    const percent = (c.count / maxCats) * 100;

    return (
      <div
        key={c.category}
        className={styles.barRow}
        style={{
          transitionDelay: `${index * 80}ms`
        }}
      >
        <span>{c.category}</span>

        <div className={styles.bar}>
          <div
            className={styles.barFill}
            style={{
              width: animate ? `${percent}%` : "0%"
            }}
          />
        </div>

        <span>{c.count}</span>
      </div>
    );
  })}

  {reportDynamics.map((d, index) => {
    const percent = (d.count / maxDyn) * 100;

    return (
      <div
        key={d.date}
        className={styles.barRow}
        style={{
          transitionDelay: `${index * 80}ms`
        }}
      >
        <span>{new Date(d.date).toLocaleDateString()}</span>

        <div className={styles.bar}>
          <div
            className={styles.barFill}
            style={{
              width: animate ? `${percent}%` : "0%"
            }}
          />
        </div>

        <span>{d.count}</span>
      </div>
    );
  })}

  const fetchCategories = async () => {
    const res = await fetch("http://127.0.0.1:8000/categories", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setCategories(data);
  };

  const fetchLogs = async () => {
    const res = await fetch(
      `http://127.0.0.1:8000/logs?search=${logSearch}&type=${logType}&from_date=${fromDate1}&to_date=${toDate1}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const data = await res.json();
    setLogs(data);
  };

  useEffect(() => {
    if (tab === "logs") {
      fetchLogs();
    }
  }, [logSearch, logType]);

  useEffect(() => {
    fetchCategories();
    fetchLogs();
  }, []);

  const handleAddCategory = async () => {
    if (!newCategory.name) return;

    const payload = {
      ...newCategory,
      parent_id: newCategory.parent_id === "" ? null : Number(newCategory.parent_id)
    };

    await fetch("http://127.0.0.1:8000/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    setNewCategory({
      name: "",
      storage_path: "",
      description: "",
      index_code: "",
      storage_period: "",
      parent_id: ""
    });

    fetchCategories();
  };

  const checkDelete = async (id) => {
    const res = await fetch(`http://127.0.0.1:8000/categories/${id}/can-delete`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      console.error(await res.text());
      return { documents_count: 0 };
    }

    return await res.json();
  };

  const deleteCategory = async (id) => {
    const check = await checkDelete(id);

    if (check.documents_count > 0) {
      const confirmDelete = window.confirm(
        `В категории ${check.documents_count} документов. Удалить ВСЁ?`
      );

      if (!confirmDelete) return;

      await fetch(`http://127.0.0.1:8000/categories/${id}?force=true`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
    } else {
      await fetch(`http://127.0.0.1:8000/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
    }

    fetchCategories();
  };

  return (
    <div className={styles.page}>

      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Панель администрирования</h1>
          <p className={styles.subtitle}>Управление системой</p>
        </div>

        <div className={styles.nav}>
          <button className={styles.navBtn} onClick={fetchCategories}>
            Обновить
          </button>

          <button
            className={styles.navBtn}
            onClick={() => (window.location.href = "/profile")}
          >
            Профиль
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

      {/* TABS */}
      <div className={styles.nav}>
        <button
          className={tab === "categories" ? styles.mainButton : styles.navBtn}
          onClick={() => setTab("categories")}
        >
          Категории
        </button>

        <button
          className={tab === "logs" ? styles.mainButton : styles.navBtn}
          onClick={() => setTab("logs")}
        >
          Логи
        </button>

        <button
          className={tab === "reports" ? styles.mainButton : styles.navBtn}
          onClick={() => setTab("reports")}
        >
          Отчеты
        </button>
      </div>

      {/* ================= CATEGORIES ================= */}
      {tab === "categories" && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Категории</h2>

          <div className={styles.form}>
            <input className={styles.input} placeholder="Название" />
            <input className={styles.input} placeholder="Путь хранения" />
            <input className={styles.input} placeholder="Описание" />
            <input className={styles.input} placeholder="Код индекса" />
            <input className={styles.input} placeholder="Срок хранения" />
            <input className={styles.input} placeholder="ID родителя" />
          </div>

          <button className={styles.mainButton} onClick={handleAddCategory}>
            Добавить
          </button>

          {categories.map((cat) => (
            <div key={cat.id} className={styles.doc}>
              <div>
                <b>{cat.name}</b>
                <div className={styles.path}>{cat.storage_path}</div>
              </div>

              <button
                className={styles.smallBtn}
                onClick={() => deleteCategory(cat.id)}
              >
                удалить
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ================= LOGS ================= */}
      {tab === "logs" && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Логи системы</h2>

          <div className={styles.form}>
            <input
              className={styles.input}
              placeholder="Поиск..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
            />

            <select
              className={styles.input}
              value={logType}
              onChange={(e) => setLogType(e.target.value)}
            >
              <option value="">Все типы</option>
              <option value="ЗАГРУЗКА ДОКУМЕНТА">Загрузка</option>
              <option value="КЛАССИФИЦИРОВАН ДОКУМЕНТ">Классификация</option>
              <option value="УДАЛЕН ДОКУМЕНТ">Удаление</option>
              <option value="ОТКЛОНЕНА КЛАССИФИКАЦИЯ">Отклонение</option>
            </select>

            <input
              className={styles.input}
              type="date"
              value={fromDate1}
              onChange={(e) => setFromDate1(e.target.value)}
            />

            <input
              className={styles.input}
              type="date"
              value={toDate1}
              onChange={(e) => setToDate1(e.target.value)}
            />

            <button className={styles.mainButton} onClick={fetchLogs}>
              Применить
            </button>
          </div>

          {logs.map((log) => (
            <div key={log.id} className={styles.doc}>
              <div>
                <b>{log.action_type}</b>
                <div className={styles.path}>{log.description}</div>
              </div>

              <div className={styles.path}>
                {new Date(log.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= REPORTS ================= */}
      {tab === "reports" && (
        <div className={styles.reportsPage}>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Отчеты и аналитика</h2>

            <div className={styles.form}>
              <input
                className={styles.input}
                type="date"
                value={fromDate2}
                onChange={(e) => setFromDate2(e.target.value)}
              />

              <input
                className={styles.input}
                type="date"
                value={toDate2}
                onChange={(e) => setToDate2(e.target.value)}
              />

              <button 
                className={styles.mainButton}
                onClick={fetchReports}
              >
                Сформировать
              </button>
            </div>
          </div>

          <div className={styles.card}>
            <h3>Документы по категориям</h3>

            <div key={`cats-${animKey}`}>
              {reportCats.map((c) => (
                <div key={c.category} className={styles.barRow}>
                  <span>{c.category}</span>

                  <div className={styles.bar}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${Math.min(c.count * 10, 100)}%` }}
                    />
                  </div>

                  <span>{c.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <h3>Динамика документов</h3>

            <div key={`cats-${animKey}`}>
              {reportDynamics.map((d) => (
                <div key={d.date} className={styles.barRow}>
                  <span>{new Date(d.date).toLocaleDateString()}</span>

                  <div className={styles.bar}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${Math.min(d.count * 10, 100)}%` }}
                    />
                  </div>

                  <span>{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <h3>Метрики</h3>

            {reportMetrics && (
              <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                  <h4>Accuracy</h4>
                  <p>{(reportMetrics.accuracy * 100).toFixed(1)}%</p>
                  <h4>Precision</h4>
                  <p>{(reportMetrics.precision * 100).toFixed(1)}%</p>
                  <h4>Recall</h4>
                  <p>{(reportMetrics.recall * 100).toFixed(1)}%</p>
                  <h4>F1-score</h4>
                  <p>{(reportMetrics.f1 * 100).toFixed(1)}%</p>
                </div>

                <div className={styles.metricCard}>
                  <h4>Всего</h4>
                  <p>{reportMetrics.total}</p>
                </div>

                <div className={styles.metricCard}>
                  <h4>Подтверждено</h4>
                  <p>{reportMetrics.confirmed}</p>
                </div>

                <div className={styles.metricCard}>
                  <h4>Отклонено</h4>
                  <p>{reportMetrics.rejected}</p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}