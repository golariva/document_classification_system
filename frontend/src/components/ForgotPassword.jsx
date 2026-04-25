import { useState } from "react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleReset = async () => {
    const res = await fetch("http://109.73.205.67:8000/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    setMessage(data.message);
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Восстановление пароля</h2>

      <input
        type="email"
        placeholder="Введите email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      <button onClick={handleReset}>
        Отправить
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}