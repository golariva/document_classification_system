import React, { useState } from "react";
import { getToken } from "../api";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Upload
      const uploadRes = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`
        },
        body: formData
      });

      const uploadData = await uploadRes.json();

      // 2. Classify
      const classifyRes = await fetch(
        `http://127.0.0.1:8000/classify/${uploadData.id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`
          }
        }
      );

      const classifyData = await classifyRes.json();

      setResult(classifyData);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Загрузка и классификация документа</h2>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <br /><br />

      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Обработка..." : "Загрузить и классифицировать"}
      </button>

      {result && (
        <div style={{ marginTop: "20px" }}>
          <h3>Результат:</h3>
          <p><b>Категория:</b> {result.category}</p>
          <p><b>Вероятность:</b> {result.probability}</p>
        </div>
      )}
    </div>
  );
}