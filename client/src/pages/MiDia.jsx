import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Megaphone, AlertTriangle } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

const DIA_LABEL = { LUNES: "lunes", MARTES: "martes", MIERCOLES: "miércoles", JUEVES: "jueves", VIERNES: "viernes", SABADO: "sábado", DOMINGO: "domingo" };

export default function MiDia() {
  const { usuario } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.miDia().then(setData).catch((e) => setError(e.message));
  }, []);

  const horaActual = new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <div style={{ marginBottom: 4 }}>
        <span className="vk-label" style={{ color: "var(--vk-purple-500)" }}>Mi día</span>
      </div>
      <h1 className="vk-display" style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        Hola, {usuario.nombre.split(" ")[0]}
      </h1>
      <p style={{ color: "var(--vk-muted)", fontSize: 14, marginBottom: 24 }}>
        Hoy es {data ? DIA_LABEL[data.dia] : "…"} · son las {horaActual}
      </p>

      {error && <div style={{ color: "var(--vk-coral)" }}>{error}</div>}

      {data && (
        <>
          {data.comunicadosNoLeidos > 0 && (
            <Link to="/comunicados" className="vk-card" style={{
              display: "flex", alignItems: "center", gap: 12, padding: 14, marginBottom: 20,
              background: data.comunicadosUrgentesNoLeidos > 0 ? "var(--vk-coral-100)" : "var(--vk-lavender)",
              border: "none",
            }}>
              {data.comunicadosUrgentesNoLeidos > 0 ? (
                <AlertTriangle size={18} color="var(--vk-coral)" />
              ) : (
                <Megaphone size={18} color="var(--vk-purple-700)" />
              )}
              <span style={{ fontSize: 14, fontWeight: 600, color: data.comunicadosUrgentesNoLeidos > 0 ? "var(--vk-coral)" : "var(--vk-purple-700)" }}>
                {data.comunicadosNoLeidos} comunicado{data.comunicadosNoLeidos > 1 ? "s" : ""} sin leer
                {data.comunicadosUrgentesNoLeidos > 0 ? " · hay urgentes" : ""}
              </span>
            </Link>
          )}

          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--vk-muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 12 }}>
            Próximamente
          </h2>

          {!data.esDiaHabil && (
            <div className="vk-card" style={{ padding: 20, color: "var(--vk-muted)", fontSize: 14 }}>
              Hoy no hay clases programadas (fin de semana).
            </div>
          )}

          {data.esDiaHabil && data.bloquesHoy.length === 0 && (
            <div className="vk-card" style={{ padding: 20, color: "var(--vk-muted)", fontSize: 14 }}>
              No tienes bloques asignados hoy todavía. Si eres directivo o administrador, puedes crearlos desde
              {" "}<Link to="/horario" style={{ color: "var(--vk-purple-700)", fontWeight: 600 }}>Horario</Link>.
            </div>
          )}

          {data.esDiaHabil && data.bloquesHoy.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.bloquesHoy.map((b, i) => (
                <div key={i} className="vk-card" style={{ display: "flex", alignItems: "center", gap: 16, padding: 14 }}>
                  <div style={{ textAlign: "center", minWidth: 56 }}>
                    <div className="vk-display" style={{ fontWeight: 700, fontSize: 14, color: "var(--vk-purple-700)" }}>{b.horaInicio}</div>
                    <div style={{ fontSize: 11, color: "var(--vk-muted)" }}>{b.horaFin}</div>
                  </div>
                  <div style={{ width: 1, alignSelf: "stretch", background: "var(--vk-line)" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{b.materia}</div>
                    <div style={{ fontSize: 12, color: "var(--vk-muted)" }}>
                      {b.grupo} · {b.aula} · {b.docente}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
