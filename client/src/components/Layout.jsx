import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { CalendarClock, Megaphone, CalendarDays, Settings, LogOut, Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_ITEMS = [
  { to: "/mi-dia", label: "Mi día", icon: CalendarClock, roles: ["ADMIN", "DIRECTIVO", "DOCENTE", "ESTUDIANTE"] },
  { to: "/comunicados", label: "Comunicados", icon: Megaphone, roles: ["ADMIN", "DIRECTIVO", "DOCENTE", "ESTUDIANTE", "FAMILIA"] },
  { to: "/horario", label: "Horario", icon: CalendarDays, roles: ["ADMIN", "DIRECTIVO", "DOCENTE", "ESTUDIANTE"] },
  { to: "/admin", label: "Administración", icon: Settings, roles: ["ADMIN", "DIRECTIVO"] },
];

const ROL_LABEL = {
  ADMIN: "Administrador", DIRECTIVO: "Directivo", DOCENTE: "Docente",
  ESTUDIANTE: "Estudiante", FAMILIA: "Familia / apoderado",
};

export default function Layout({ children }) {
  const { usuario, institucion, logout } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = React.useState(false);
  const items = NAV_ITEMS.filter((i) => i.roles.includes(usuario.rol));

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div
        style={{ background: "var(--vk-purple-900)" }}
        className="vk-topbar"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setMenuAbierto((v) => !v)}
              className="vk-hide-desktop"
              style={{ background: "transparent", border: "none", color: "white", cursor: "pointer" }}
            >
              <Menu size={20} />
            </button>
            <div
              className="vk-display"
              style={{
                width: 30, height: 30, borderRadius: 8, background: "var(--vk-amber)",
                color: "var(--vk-purple-900)", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 15,
              }}
            >
              V
            </div>
            <span className="vk-display" style={{ color: "white", fontWeight: 700, fontSize: 17 }}>Vinklo</span>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }} className="vk-hide-mobile">
              · {institucion?.nombre}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }} className="vk-hide-mobile">
              <div style={{ color: "white", fontSize: 13, fontWeight: 600 }}>{usuario.nombre}</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{ROL_LABEL[usuario.rol]}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              style={{
                background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10,
                width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", cursor: "pointer",
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="vk-body-grid">
        <aside className={`vk-sidebar ${menuAbierto ? "vk-sidebar-open" : ""}`}>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenuAbierto(false)}
              className={({ isActive }) => `vk-nav-item ${isActive ? "active" : ""}`}
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </aside>
        <main className="vk-main">{children}</main>
      </div>

      <style>{`
        .vk-body-grid { display: grid; grid-template-columns: 220px 1fr; }
        .vk-sidebar { padding: 20px 14px; display: flex; flex-direction: column; gap: 4px; }
        .vk-main { padding: 24px 28px 60px 28px; max-width: 980px; }
        .vk-hide-desktop { display: none; }
        @media (max-width: 800px) {
          .vk-body-grid { grid-template-columns: 1fr; }
          .vk-hide-desktop { display: inline-flex; }
          .vk-sidebar {
            position: fixed; top: 56px; left: 0; right: 0; bottom: 0; z-index: 20;
            background: var(--vk-bg); border-top: 1px solid var(--vk-line);
            transform: translateX(-100%); transition: transform 0.2s ease;
          }
          .vk-sidebar-open { transform: translateX(0); }
          .vk-main { padding: 18px 16px 60px 16px; }
        }
      `}</style>
    </div>
  );
}
