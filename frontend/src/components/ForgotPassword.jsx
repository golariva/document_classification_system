import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ForgotPassword.module.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const handleReset = async () => {
    const res = await fetch("http://109.73.205.67:8000/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        reset_code: resetCode,
        new_password: newPassword
      })
    });

    const data = await res.json();

    if (res.ok) {
      setMessage("Пароль изменен. Новый код восстановления: " + data.new_reset_code);
    } else {
      setMessage(data.detail);
    }
  };

  return (
    <main className={styles.forgotContainer}>
      <div className={styles.forgotCard}>
        <h2>Восстановление пароля</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="text"
          placeholder="Код восстановления"
          value={resetCode}
          onChange={(e) => setResetCode(e.target.value)}
        />

        <input
          type="password"
          placeholder="Новый пароль"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <button onClick={handleReset}>
          Сменить пароль
        </button>

        <button
          className={styles.secondary}
          onClick={() => navigate("/")}
        >
          Назад к авторизации
        </button>

        {message && (
          <p className={styles.message}>
            {message}
          </p>
        )}
      </div>
    </main>
  );
}