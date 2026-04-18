import React, { useEffect, useState } from "react";
import { getToken } from "../api";

export default function ProfilePage() {
  const token = getToken();

  const [user, setUser] = useState(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const isAdmin = user?.role === "admin";
  const [autoConfirm, setAutoConfirm] = useState(false);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/me", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setUser);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("autoConfirm") === "true";
    setAutoConfirm(saved);
  }, []);

  const changePassword = async () => {
    if (newPassword !== repeatPassword) {
      alert("Пароли не совпадают");
      return;
    }

    if (newPassword.length < 8) {
      alert("Пароль слишком слабый (мин. 8 символов)");
      return;
    }

    await fetch("http://127.0.0.1:8000/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword
      })
    });

    alert("Пароль обновлён");

    setOldPassword("");
    setNewPassword("");
    setRepeatPassword("");
  };

  if (!user) return <p style={{ padding: "30px" }}>Загрузка...</p>;

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Профиль</h1>
          <p style={styles.subtitle}>Личные данные пользователя</p>
        </div>

        <div style={styles.nav}>
            {isAdmin && (
            <button
                style={styles.navBtn}
                onClick={() => window.location.href = "/admin"}
            >
                Панель администрирования
            </button>
            )}

            {!isAdmin && (
            <button
                style={styles.navBtn}
                onClick={() => window.location.href = "/employee"}
            >
                Кабинет
            </button>
            )}

          <button
            style={{ ...styles.navBtn, ...styles.logout }}
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/";
            }}
          >
            Выйти
          </button>
        </div>
      </div>

      {/* USER INFO */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Информация</h2>

        <p><b>Почта:</b> {user.email}</p>
        <p><b>Роль:</b> {user.role}</p>
        <p><b>Логин:</b> {user.username}</p>
        <p><b>Дата и время регистрации учетной записи:</b> {user.created_at}</p>
      </div>

      {/* PASSWORD */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Смена пароля</h2>

        <div style={styles.form}>
          <input
            style={styles.input}
            type="password"
            placeholder="Старый пароль"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Новый пароль"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Повторите новый пароль"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
          />

          <button style={styles.mainButton} onClick={changePassword}>
            Сменить пароль
          </button>

          {user.role === "employee" && (
            <div style={styles.card}>
              <h2>Настройки классификации</h2>

              <div style={styles.cardTitle}>Окно подтверждения классификации документа:</div>
              <label>
                <input
                  type="checkbox"
                  checked={autoConfirm}
                  onChange={(e) => {
                    const value = e.target.checked;
                    setAutoConfirm(value);
                    localStorage.setItem("autoConfirm", value);
                  }}
                />
                Больше не спрашивать, подтверждать автоматически
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "30px",
    fontFamily: "Inter, sans-serif",
    background: "#f5f7fb",
    color: "#111827"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px"
  },

  title: {
    fontSize: "28px",
    margin: 0
  },

  subtitle: {
    margin: 0,
    opacity: 0.6
  },

  nav: {
    display: "flex",
    gap: "10px"
  },

  navBtn: {
    padding: "8px 14px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    background: "white",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  },

  logout: {
    background: "#fee2e2",
    border: "1px solid #fecaca"
  },

  card: {
    background: "white",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.06)"
  },

  cardTitle: {
    marginBottom: "15px"
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },

  input: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb"
  },

  mainButton: {
    padding: "10px 16px",
    borderRadius: "12px",
    border: "none",
    background: "#4f46e5",
    color: "white",
    cursor: "pointer"
  }
};