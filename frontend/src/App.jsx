import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginForm from "./LoginForm";
import AdminPage from "./AdminPage";
import EmployeePage from "./EmployeePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/employee" element={<EmployeePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;