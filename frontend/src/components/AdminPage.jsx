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
  const [page, setPage] = useState(1);
  const limit = 20;
  const [totalLogs, setTotalLogs] = useState(0);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const totalPages = Math.ceil(totalLogs / limit);

  const [editUser, setEditUser] = useState({
    username: "",
    email: "",
    role: "employee"
  });

  const [editCategory, setEditCategory] = useState({
    name: "",
    description: "",
    storage_period: ""
  });

  const [users, setUsers] = useState([]);

  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "employee"
  });

  const [newCategory, setNewCategory] = useState({
    name: "",
    storage_path: "",
    description: "",
    index_code: "",
    storage_period: "",
    parent_id: ""
  });

  const updateUser = async (id) => {
    const res = await fetch(`http://109.73.205.67:8000/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(editUser)
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.detail);
      return;
    }

    setEditingUserId(null);
    fetchUsers();
  };

  const updateCategory = async (id) => {
    await fetch(`http://109.73.205.67:8000/categories/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(editCategory)
    });

    setEditingCategoryId(null);
    fetchCategories();
  };

  const fetchUsers = async () => {
    const res = await fetch("http://109.73.205.67:8000/users", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    setUsers(data);
  };

  const addUser = async () => {
    const res = await fetch(
      "http://109.73.205.67:8000/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.detail);
      return;
    }

    alert(
      `Пользователь создан\nКод восстановления: ${data.reset_code}`
    );

    setNewUser({
      username: "",
      email: "",
      password: "",
      role: "employee"
    });

    fetchUsers();
  };

  const deleteUser = async (id) => {
    const password = prompt("Введите ваш пароль для подтверждения:");

    if (!password) return;

    await fetch(`http://109.73.205.67:8000/users/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ password })
    });

    fetchUsers();
  };

  const changeRole = async (id, role) => {
    await fetch(`http://109.73.205.67:8000/users/${id}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ role })
    });

    fetchUsers();
  };

  useEffect(() => {
    if (tab === "users") fetchUsers();
  }, [tab]);

  const fetchReports = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const query = `?from_date=${fromDate2}&to_date=${toDate2}`;

    setAnimate(false);

    const [c, d, m] = await Promise.all([
      fetch(`http://109.73.205.67:8000/reports/documents-by-category${query}`, { headers }).then(r => r.json()),
      fetch(`http://109.73.205.67:8000/reports/documents-dynamics${query}`, { headers }).then(r => r.json()),
      fetch(`http://109.73.205.67:8000/reports/model-metrics${query}`, { headers }).then(r => r.json())
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
    const res = await fetch("http://109.73.205.67:8000/categories", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    data.sort((a, b) => a.id - b.id);
    setCategories(data);
  };

  const fetchLogs = async () => {
    const skip = (page - 1) * limit;

    const res = await fetch(
      `http://109.73.205.67:8000/logs?search=${logSearch}&type=${logType}&from_date=${fromDate1}&to_date=${toDate1}&skip=${skip}&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const data = await res.json();
    setLogs(data.items || []);
    setTotalLogs(data.total || 0);
  };

  useEffect(() => {
    setPage(1);
  }, [logSearch, logType, fromDate1, toDate1]);

  useEffect(() => {
    if (tab === "logs") {
      fetchLogs();
    }
  }, [tab, logSearch, logType, fromDate1, toDate1, page]);

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

    await fetch("http://109.73.205.67:8000/categories", {
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
    const res = await fetch(`http://109.73.205.67:8000/categories/${id}/can-delete`, {
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

      await fetch(`http://109.73.205.67:8000/categories/${id}?force=true`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
    } else {
      await fetch(`http://109.73.205.67:8000/categories/${id}`, {
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
          className={tab === "users" ? styles.mainButton : styles.navBtn}
          onClick={() => setTab("users")}
        >
          Пользователи
        </button>

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

      {tab === "users" && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Пользователи</h2>

          <div className={styles.form}>
            <input
              className={styles.input}
              placeholder="Имя"
              value={newUser.username}
              onChange={(e) =>
                setNewUser({ ...newUser, username: e.target.value })
              }
            />

            <input
              className={styles.input}
              placeholder="Email"
              value={newUser.email}
              onChange={(e) =>
                setNewUser({ ...newUser, email: e.target.value })
              }
            />

            <input
              className={styles.input}
              placeholder="Пароль"
              value={newUser.password}
              onChange={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
            />

            <select
              className={styles.input}
              value={newUser.role}
              onChange={(e) =>
                setNewUser({ ...newUser, role: e.target.value })
              }
            >
              <option value="employee">employee</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <button className={styles.mainButton} onClick={addUser}>
            Добавить
          </button>

          {users.map((u) => (
            <div key={u.id} className={styles.doc}>

              {editingUserId === u.id ? (
                <div className={styles.form}>
                  <input
                    className={styles.input}
                    value={editUser.username}
                    onChange={(e) =>
                      setEditUser({ ...editUser, username: e.target.value })
                    }
                  />

                  <input
                    className={styles.input}
                    value={editUser.email}
                    onChange={(e) =>
                      setEditUser({ ...editUser, email: e.target.value })
                    }
                  />

                  <select
                    className={styles.input}
                    value={editUser.role}
                    onChange={(e) =>
                      setEditUser({ ...editUser, role: e.target.value })
                    }
                  >
                    <option value="employee">employee</option>
                    <option value="admin">admin</option>
                  </select>

                  <button
                    className={styles.smallBtn}
                    onClick={() => updateUser(u.id)}
                  >
                    сохранить
                  </button>

                  <button
                    className={styles.smallBtn}
                    onClick={() => setEditingUserId(null)}
                  >
                    отмена
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <b>{u.username}</b>

                    <div className={styles.path}>
                      {u.email}
                    </div>

                    <div className={styles.path}>
                      Роль: {u.role}
                    </div>

                    <div className={styles.path}>
                      Код восстановления: <b>{u.reset_code}</b>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className={styles.smallBtn}
                      onClick={() => {
                        setEditingUserId(u.id);

                        setEditUser({
                          username: u.username,
                          email: u.email,
                          role: u.role
                        });
                      }}
                    >
                      редактировать
                    </button>

                    <button
                      className={styles.smallBtn}
                      onClick={() => deleteUser(u.id)}
                    >
                      удалить
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ================= CATEGORIES ================= */}
      {tab === "categories" && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Категории</h2>

          <div className={styles.form}>
            <input
              className={styles.input}
              placeholder="Название"
              value={newCategory.name}
              onChange={(e) =>
                setNewCategory({ ...newCategory, name: e.target.value })
              }
            />

            <input
              className={styles.input}
              placeholder="Путь хранения"
              value={newCategory.storage_path}
              onChange={(e) =>
                setNewCategory({ ...newCategory, storage_path: e.target.value })
              }
            />

            <input
              className={styles.input}
              placeholder="Описание"
              value={newCategory.description}
              onChange={(e) =>
                setNewCategory({ ...newCategory, description: e.target.value })
              }
            />

            <input
              className={styles.input}
              placeholder="Код индекса"
              value={newCategory.index_code}
              onChange={(e) =>
                setNewCategory({ ...newCategory, index_code: e.target.value })
              }
            />

            <input
              className={styles.input}
              placeholder="Срок хранения"
              value={newCategory.storage_period}
              onChange={(e) =>
                setNewCategory({ ...newCategory, storage_period: e.target.value })
              }
            />

            <input
              className={styles.input}
              placeholder="ID родителя"
              value={newCategory.parent_id}
              onChange={(e) =>
                setNewCategory({ ...newCategory, parent_id: e.target.value })
              }
            />

            <button className={styles.mainButton} onClick={handleAddCategory}>
              Добавить
            </button>
          </div>

          {categories.map((cat) => (
            <div key={cat.id} className={styles.doc}>

              {editingCategoryId === cat.id ? (
                <div className={styles.form}>
                  <input
                    className={styles.input}
                    value={editCategory.name}
                    onChange={(e) =>
                      setEditCategory({
                        ...editCategory,
                        name: e.target.value
                      })
                    }
                  />

                  <input
                    className={styles.input}
                    value={editCategory.description}
                    onChange={(e) =>
                      setEditCategory({
                        ...editCategory,
                        description: e.target.value
                      })
                    }
                  />

                  <input
                    className={styles.input}
                    value={editCategory.storage_period}
                    onChange={(e) =>
                      setEditCategory({
                        ...editCategory,
                        storage_period: e.target.value
                      })
                    }
                  />

                  <button
                    className={styles.smallBtn}
                    onClick={() => updateCategory(cat.id)}
                  >
                    сохранить
                  </button>

                  <button
                    className={styles.smallBtn}
                    onClick={() => setEditingCategoryId(null)}
                  >
                    отмена
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <b>{cat.name}</b>

                    <div className={styles.path}>
                      {cat.storage_path}
                    </div>

                    <div className={styles.path}>
                      {cat.description || "Без описания"}
                    </div>

                    <div className={styles.path}>
                      Срок хранения: {cat.storage_period || "не указан"}
                    </div>

                    <div className={styles.path}>
                      Идентификатор: {cat.id}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className={styles.smallBtn}
                      onClick={() => {
                        setEditingCategoryId(cat.id);

                        setEditCategory({
                          name: cat.name || "",
                          description: cat.description || "",
                          storage_period: cat.storage_period || ""
                        });
                      }}
                    >
                      редактировать
                    </button>

                    <button
                      className={styles.smallBtn}
                      onClick={() => deleteCategory(cat.id)}
                    >
                      удалить
                    </button>
                  </div>
                </>
              )}

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
              <option value="ЗАГРУЗКА ДОКУМЕНТА">Загрузка документа</option>
              <option value="КЛАССИФИЦИРОВАН ДОКУМЕНТ">Классификация документа</option>
              <option value="УДАЛЕН ДОКУМЕНТ">Удаление документа</option>
              <option value="ОТКЛОНЕНА КЛАССИФИКАЦИЯ">Отклонение документа</option>
              <option value="ЗАГРУЗКА ДОКУМЕНТА С ДРУГОЙ КАТЕГОРИЕЙ">Другая категория</option>
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

          <div className={styles.pagination}>
            <button
              className={styles.smallBtn}
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Назад
            </button>

            <span>
              Страница {page} из {Math.ceil(totalLogs / limit)}
            </span>

            <button
              className={styles.smallBtn}
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Вперёд
            </button>
          </div>
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