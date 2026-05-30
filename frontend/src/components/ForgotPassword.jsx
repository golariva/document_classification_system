import { useState } from "react";
import "./LoginForm.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleReset = async () => {
    const res = await fetch(
      "http://109.73.205.67:8000/reset-password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          reset_code: resetCode,
          new_password: newPassword
        })
      }
    );

    const data = await res.json();

    if (res.ok) {
      setMessage(
        "Пароль изменен. Новый код восстановления: " +
        data.new_reset_code
      );
    } else {
      setMessage(data.detail);
    }
  };

  return (
    <main className="login-container">
      <div className="title-block">
        <h1>
          Восстановление пароля
        </h1>
      </div>

      <div className="login-card">
        <h2>Смена пароля</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type="text"
          placeholder="Код восстановления"
          value={resetCode}
          onChange={e => setResetCode(e.target.value)}
        />

        <input
          type="password"
          placeholder="Новый пароль"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
        />

        <button onClick={handleReset}>
          Сменить пароль
        </button>

        {message && (
          <p className="error">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}