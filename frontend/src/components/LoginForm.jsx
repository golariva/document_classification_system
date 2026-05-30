import React, { useState } from "react";
import { login } from "../api";
import { useNavigate, Link } from "react-router-dom";
import styles from "./LoginForm.module.css";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const data = await login(email, password);

      if (data.access_token) {
        localStorage.setItem("token", data.access_token);

        const payload = JSON.parse(atob(data.access_token.split(".")[1]));
        const role = payload.role;

        navigate(role === "admin" ? "/admin" : "/employee");
      } else {
        setError("Token not received");
      }
    } catch (err) {
      setError("Неверный email или пароль");
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.titleBlock}>
        <h1>Система хранения документов</h1>
      </div>

      <form className={styles.card} onSubmit={handleSubmit}>
        <h2>Вход</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Войти</button>

        <p className={styles.forgot}>
          <Link to="/forgot-password">Забыли пароль?</Link>
        </p>

        {error && <p className={styles.error}>{error}</p>}
      </form>
    </main>
  );
}