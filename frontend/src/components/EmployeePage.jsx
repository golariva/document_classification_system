import React, { useState, useEffect } from "react";
import { getToken } from "../api";

export default function EmployeePage() {
  const [file, setFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const token = getToken();

  const fetchDocuments = async () => {
    const res = await fetch("http://127.0.0.1:8000/documents", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await res.json();
    setDocuments(data);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://127.0.0.1:8000/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json();
    setResult(data);

    setLoading(false);
    fetchDocuments();
  };

  return (
    <div style={styles.container}>
      <h1>Загрузка документа</h1>

      <div style={styles.card}>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button onClick={handleUpload} disabled={loading}>
          {loading ? "Загрузка..." : "Загрузить"}
        </button>

        {result && (
          <div style={styles.result}>
            <h3>Результат:</h3>
            <p>Файл: {result.filename}</p>
            <p>Категория: {result.category || "—"}</p>
            <p>Вероятность: {result.probability || "—"}</p>
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h2>Мои документы</h2>
        {documents.map(doc => (
          <div key={doc.id} style={styles.doc}>
            {doc.filename}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "40px",
    fontFamily: "sans-serif",
    background: "#f3f4f6",
    minHeight: "100vh"
  },
  card: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "20px",
    boxShadow: "0 10px 20px rgba(0,0,0,0.1)"
  },
  result: {
    marginTop: "15px",
    padding: "10px",
    background: "#eef2ff",
    borderRadius: "8px"
  },
  doc: {
    padding: "8px",
    borderBottom: "1px solid #ddd"
  }
};