import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import MiDia from "./pages/MiDia.jsx";
import Comunicados from "./pages/Comunicados.jsx";
import Horario from "./pages/Horario.jsx";
import Admin from "./pages/Admin.jsx";

function Protegida({ children }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Cargando />;
  if (!usuario) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function Cargando() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--vk-muted)" }}>
      Cargando Vinklo…
    </div>
  );
}

function RutaInicio() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Cargando />;
  return <Navigate to={usuario ? "/mi-dia" : "/login"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RutaInicio />} />
          <Route path="/login" element={<Login />} />
          <Route path="/mi-dia" element={<Protegida><MiDia /></Protegida>} />
          <Route path="/comunicados" element={<Protegida><Comunicados /></Protegida>} />
          <Route path="/horario" element={<Protegida><Horario /></Protegida>} />
          <Route path="/admin" element={<Protegida><Admin /></Protegida>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
