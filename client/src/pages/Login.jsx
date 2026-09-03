import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const DEMO_USERS = [
  { email: "admin@vinklo.demo", rol: "Administrador" },
  { email: "directivo@vinklo.demo", rol: "Directivo" },
  { email: "docente@vinklo.demo", rol: "Docente" },
  { email: "estudiante@vinklo.demo", rol: "Estudiante" },
  { email: "familia@vinklo.demo", rol: "Familia" },
];

export default function Login() {
  const { login, usuario } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  React.useEffect(() => {
    if (usuario) navigate("/mi-dia");
  }, [usuario]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await login(email, password);
      navigate("/mi-dia");
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--vk-purple-900)", padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="vk-display" style={{ color: "white", fontWeight: 800, fontSize: 30 }}>Vinklo</div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 4 }}>
            Todo lo que necesitas saber, organizar y comunicar — en un solo lugar.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="vk-card" style={{ padding: 24 }}>
          <label className="vk-label">Correo institucional</label>
          <input
            className="vk-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu.correo@colegio.edu"
            required
            style={{ marginBottom: 14 }}
          />
          <label className="vk-label">Contraseña</label>
          <input
            className="vk-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            style={{ marginBottom: 16 }}
          />
          {error && (
            <div style={{ background: "var(--vk-coral-100)", color: "var(--vk-coral)", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={cargando} className="vk-btn vk-btn-primary" style={{ width: "100%" }}>
            {cargando ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <div className="vk-card" style={{ padding: 16, marginTop: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
            Usuarios de demostración (contraseña: vinklo123)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => { setEmail(u.email); setPassword("vinklo123"); }}
                style={{
                  background: "transparent", border: "none", textAlign: "left", cursor: "pointer",
                  color: "rgba(255,255,255,0.85)", fontSize: 13, padding: "4px 6px", borderRadius: 6,
                }}
              >
                {u.rol} — <span style={{ color: "rgba(255,255,255,0.55)" }}>{u.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
