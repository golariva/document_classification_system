import React, { useState } from "react";
import { login } from "../api";
import { useNavigate } from "react-router-dom";
import "./LoginForm.css";

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
    <main className="login-container">
      <header>
        <div className="title-block">
          <h1>
            Система организации хранения документов согласно номенклатуре дел учебного офиса
          </h1>
        </div>
      </header>

      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Вход в систему</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <button type="submit">Войти</button>

        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}