import React, { useEffect, useState } from "react";
import { Megaphone, Check, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

const ROL_LABEL = { ADMIN: "Administradores", DIRECTIVO: "Directivos", DOCENTE: "Docentes", ESTUDIANTE: "Estudiantes", FAMILIA: "Familias" };

export default function Comunicados() {
  const { usuario } = useAuth();
  const puedeCrear = ["ADMIN", "DIRECTIVO", "DOCENTE"].includes(usuario.rol);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState("");

  function cargar() {
    setCargando(true);
    api.comunicados.listar().then(setItems).catch((e) => setError(e.message)).finally(() => setCargando(false));
  }

  useEffect(cargar, []);

  async function marcarLeido(id) {
    setItems((its) => its.map((c) => (c.id === id ? { ...c, leido: true } : c)));
    try {
      await api.comunicados.marcarLeido(id);
    } catch (e) {
      cargar(); // revertir si falló
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <span className="vk-label" style={{ color: "var(--vk-purple-500)" }}>Comunicación institucional</span>
          <h1 className="vk-display" style={{ fontSize: 24, fontWeight: 800 }}>Comunicados</h1>
        </div>
        {puedeCrear && (
          <button className="vk-btn vk-btn-primary" onClick={() => setMostrarForm((v) => !v)}>
            {mostrarForm ? <X size={14} /> : <Plus size={14} />}
            {" "}{mostrarForm ? "Cancelar" : "Nuevo comunicado"}
          </button>
        )}
      </div>

      {mostrarForm && <FormularioComunicado onCreado={() => { setMostrarForm(false); cargar(); }} />}

      {error && <div style={{ color: "var(--vk-coral)", marginBottom: 12 }}>{error}</div>}
      {cargando && <div style={{ color: "var(--vk-muted)" }}>Cargando…</div>}
      {!cargando && items.length === 0 && (
        <div className="vk-card" style={{ padding: 24, color: "var(--vk-muted)", textAlign: "center" }}>
          No hay comunicados todavía.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((c) => (
          <ComunicadoCard key={c.id} comunicado={c} onLeido={() => marcarLeido(c.id)} puedeVerEstadisticas={c.esAutor || ["ADMIN", "DIRECTIVO"].includes(usuario.rol)} />
        ))}
      </div>
    </div>
  );
}

function ComunicadoCard({ comunicado: c, onLeido, puedeVerEstadisticas }) {
  const [abierto, setAbierto] = useState(false);
  const [stats, setStats] = useState(null);

  async function toggleStats() {
    if (!abierto && !stats) {
      const s = await api.comunicados.lecturas(c.id);
      setStats(s);
    }
    setAbierto((v) => !v);
  }

  return (
    <div className="vk-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Megaphone size={18} color="var(--vk-purple-500)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{c.titulo}</span>
              {c.urgente && <span className="vk-pill vk-pill-coral">Urgente</span>}
            </div>
            <div style={{ fontSize: 12, color: "var(--vk-muted)", marginTop: 2 }}>
              {c.autor} · {audienciaTexto(c)} · {formatearFecha(c.createdAt)}
            </div>
            <p style={{ fontSize: 14, marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>{c.cuerpo}</p>
          </div>
        </div>
        {!c.esAutor && c.requiereConfirmacion && (
          <button
            onClick={onLeido}
            disabled={c.leido}
            className="vk-btn"
            style={c.leido ? { background: "var(--vk-green-100)", color: "var(--vk-green)", border: "none", whiteSpace: "nowrap" } : { whiteSpace: "nowrap" }}
          >
            {c.leido ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Check size={13} /> Leído</span> : "Marcar leído"}
          </button>
        )}
      </div>

      {puedeVerEstadisticas && (
        <div style={{ marginTop: 10, borderTop: "1px solid var(--vk-line)", paddingTop: 10 }}>
          <button
            onClick={toggleStats}
            style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "var(--vk-purple-700)", fontSize: 12, fontWeight: 600, padding: 0 }}
          >
            {abierto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Ver estadísticas de lectura
          </button>
          {abierto && stats && (
            <div style={{ marginTop: 10, display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div>
                <div className="vk-display" style={{ fontSize: 20, fontWeight: 800, color: "var(--vk-purple-700)" }}>{stats.porcentajeLectura}%</div>
                <div style={{ fontSize: 11, color: "var(--vk-muted)" }}>{stats.leyeron.length} de {stats.total} leyeron</div>
              </div>
              {stats.noLeyeron.length > 0 && (
                <div style={{ fontSize: 12, color: "var(--vk-muted)", maxWidth: 320 }}>
                  <strong>No han leído:</strong> {stats.noLeyeron.slice(0, 6).map((p) => p.nombre).join(", ")}
                  {stats.noLeyeron.length > 6 ? ` y ${stats.noLeyeron.length - 6} más` : ""}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FormularioComunicado({ onCreado }) {
  const { usuario } = useAuth();
  const esDocente = usuario.rol === "DOCENTE";
  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [audienciaTipo, setAudienciaTipo] = useState(esDocente ? "GRUPO" : "TODOS");
  const [audienciaRol, setAudienciaRol] = useState("ESTUDIANTE");
  const [audienciaGrupoId, setAudienciaGrupoId] = useState("");
  const [urgente, setUrgente] = useState(false);
  const [grupos, setGrupos] = useState([]);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { api.catalogos.grupos().then(setGrupos).catch(() => {}); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await api.comunicados.crear({
        titulo, cuerpo, audienciaTipo,
        audienciaRol: audienciaTipo === "ROL" ? audienciaRol : undefined,
        audienciaGrupoId: audienciaTipo === "GRUPO" ? audienciaGrupoId : undefined,
        urgente,
      });
      onCreado();
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="vk-card" style={{ padding: 18, marginBottom: 20 }}>
      <label className="vk-label">Título</label>
      <input className="vk-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} required style={{ marginBottom: 12 }} />

      <label className="vk-label">Mensaje</label>
      <textarea className="vk-input" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} required rows={3} style={{ marginBottom: 12, resize: "vertical" }} />

      <label className="vk-label">Enviar a</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {!esDocente && (
          <button type="button" onClick={() => setAudienciaTipo("TODOS")}
            className="vk-btn" style={audienciaTipo === "TODOS" ? { background: "var(--vk-purple-100)", color: "var(--vk-purple-700)", border: "none" } : {}}>
            Toda la institución
          </button>
        )}
        {!esDocente && (
          <button type="button" onClick={() => setAudienciaTipo("ROL")}
            className="vk-btn" style={audienciaTipo === "ROL" ? { background: "var(--vk-purple-100)", color: "var(--vk-purple-700)", border: "none" } : {}}>
            Por rol
          </button>
        )}
        <button type="button" onClick={() => setAudienciaTipo("GRUPO")}
          className="vk-btn" style={audienciaTipo === "GRUPO" ? { background: "var(--vk-purple-100)", color: "var(--vk-purple-700)", border: "none" } : {}}>
          Un grupo
        </button>
      </div>

      {audienciaTipo === "ROL" && (
        <select className="vk-input" value={audienciaRol} onChange={(e) => setAudienciaRol(e.target.value)} style={{ marginBottom: 12 }}>
          {Object.entries(ROL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      )}
      {audienciaTipo === "GRUPO" && (
        <select className="vk-input" value={audienciaGrupoId} onChange={(e) => setAudienciaGrupoId(e.target.value)} required style={{ marginBottom: 12 }}>
          <option value="">Selecciona un grupo…</option>
          {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 14, cursor: "pointer" }}>
        <input type="checkbox" checked={urgente} onChange={(e) => setUrgente(e.target.checked)} />
        Marcar como urgente
      </label>

      {error && <div style={{ color: "var(--vk-coral)", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <button type="submit" disabled={enviando} className="vk-btn vk-btn-primary">
        {enviando ? "Enviando…" : "Publicar comunicado"}
      </button>
    </form>
  );
}

function audienciaTexto(c) {
  if (c.audienciaTipo === "TODOS") return "Toda la institución";
  if (c.audienciaTipo === "ROL") return ROL_LABEL[c.audienciaRol] || c.audienciaRol;
  if (c.audienciaTipo === "GRUPO") return c.audienciaGrupo;
  return "";
}

function formatearFecha(iso) {
  try {
    return new Date(iso.replace(" ", "T") + "Z").toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}
