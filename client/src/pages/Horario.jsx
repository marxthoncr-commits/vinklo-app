import React, { useEffect, useState, useMemo } from "react";
import { AlertTriangle, Trash2, Plus } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

const DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"];
const DIA_CORTO = { LUNES: "Lun", MARTES: "Mar", MIERCOLES: "Mié", JUEVES: "Jue", VIERNES: "Vie" };

export default function Horario() {
  const { usuario } = useAuth();
  const esGestor = ["ADMIN", "DIRECTIVO"].includes(usuario.rol);
  return (
    <div>
      <span className="vk-label" style={{ color: "var(--vk-purple-500)" }}>Horario</span>
      <h1 className="vk-display" style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>
        {esGestor ? "Generador de horarios" : "Mi horario"}
      </h1>
      {esGestor ? <GeneradorHorario /> : <HorarioPersonal />}
    </div>
  );
}

/* ---------- Vista personal (docente / estudiante) ---------- */

function HorarioPersonal() {
  const [entries, setEntries] = useState([]);
  const [bloques, setBloques] = useState([]);

  useEffect(() => {
    api.horario.mio().then(setEntries);
    api.catalogos.bloques().then(setBloques);
  }, []);

  if (entries.length === 0 && bloques.length === 0) return null;

  return (
    <GrillaHorario
      bloques={bloques.length ? bloques : inferirBloques(entries)}
      entries={entries}
      celda={(e) => (
        <>
          <div style={{ fontWeight: 700 }}>{e.materia}</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>{e.aulaNombre}</div>
        </>
      )}
    />
  );
}

function inferirBloques(entries) {
  const map = new Map();
  entries.forEach((e) => map.set(e.bloqueId, { id: e.bloqueId, nombre: e.bloqueNombre, horaInicio: e.horaInicio, horaFin: e.horaFin, orden: e.orden }));
  return [...map.values()].sort((a, b) => a.orden - b.orden);
}

/* ---------- Generador (admin / directivo) ---------- */

function GeneradorHorario() {
  const [entries, setEntries] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [grupoFiltro, setGrupoFiltro] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);

  function cargarTodo() {
    api.horario.grid().then(setEntries);
    api.catalogos.grupos().then((g) => { setGrupos(g); if (g[0] && !grupoFiltro) setGrupoFiltro(g[0].id); });
    api.catalogos.aulas().then(setAulas);
    api.catalogos.bloques().then(setBloques);
    api.usuarios.listar().then((us) => setDocentes(us.filter((u) => u.rol === "DOCENTE")));
  }

  useEffect(cargarTodo, []);

  const entriesGrupo = useMemo(() => entries.filter((e) => e.grupoId === grupoFiltro), [entries, grupoFiltro]);

  async function eliminar(id) {
    await api.horario.eliminar(id);
    cargarTodo();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <select className="vk-input" style={{ width: "auto", minWidth: 160 }} value={grupoFiltro} onChange={(e) => setGrupoFiltro(e.target.value)}>
          {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
        <button className="vk-btn vk-btn-primary" onClick={() => setMostrarForm((v) => !v)}>
          <Plus size={14} /> Agregar bloque
        </button>
      </div>

      {mostrarForm && (
        <FormularioHorario
          grupos={grupos} aulas={aulas} bloques={bloques} docentes={docentes}
          grupoSugerido={grupoFiltro}
          onCreado={() => { setMostrarForm(false); cargarTodo(); }}
        />
      )}

      {grupos.length === 0 ? (
        <div className="vk-card" style={{ padding: 20, color: "var(--vk-muted)" }}>
          Primero crea grupos, aulas y bloques horarios desde Administración.
        </div>
      ) : (
        <GrillaHorario
          bloques={bloques}
          entries={entriesGrupo}
          celda={(e) => (
            <>
              <div style={{ fontWeight: 700 }}>{e.materia}</div>
              <div style={{ fontSize: 11, opacity: 0.75 }}>{e.docenteNombre} · {e.aulaNombre}</div>
              <button
                onClick={(ev) => { ev.stopPropagation(); eliminar(e.id); }}
                title="Eliminar"
                style={{ position: "absolute", top: 4, right: 4, background: "transparent", border: "none", cursor: "pointer", color: "var(--vk-coral)", padding: 2 }}
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        />
      )}
    </div>
  );
}

function FormularioHorario({ grupos, aulas, bloques, docentes, grupoSugerido, onCreado }) {
  const [grupoId, setGrupoId] = useState(grupoSugerido || "");
  const [docenteId, setDocenteId] = useState("");
  const [aulaId, setAulaId] = useState("");
  const [bloqueId, setBloqueId] = useState("");
  const [dia, setDia] = useState("LUNES");
  const [materia, setMateria] = useState("");
  const [conflictos, setConflictos] = useState([]);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const listo = grupoId && docenteId && aulaId && bloqueId && dia;

  useEffect(() => {
    if (!listo) { setConflictos([]); return; }
    setVerificando(true);
    const t = setTimeout(() => {
      api.horario.verificar({ grupoId, docenteId, aulaId, bloqueId, dia })
        .then((r) => setConflictos(r.conflictos))
        .catch(() => setConflictos([]))
        .finally(() => setVerificando(false));
    }, 300);
    return () => clearTimeout(t);
  }, [grupoId, docenteId, aulaId, bloqueId, dia]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await api.horario.crear({ grupoId, docenteId, aulaId, bloqueId, dia, materia });
      onCreado();
    } catch (err) {
      setError(err.message);
      if (err.conflictos) setConflictos(err.conflictos);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="vk-card" style={{ padding: 18, marginBottom: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 12 }}>
        <div>
          <label className="vk-label">Grupo</label>
          <select className="vk-input" value={grupoId} onChange={(e) => setGrupoId(e.target.value)} required>
            <option value="">Selecciona…</option>
            {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="vk-label">Docente</label>
          <select className="vk-input" value={docenteId} onChange={(e) => setDocenteId(e.target.value)} required>
            <option value="">Selecciona…</option>
            {docentes.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="vk-label">Aula</label>
          <select className="vk-input" value={aulaId} onChange={(e) => setAulaId(e.target.value)} required>
            <option value="">Selecciona…</option>
            {aulas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="vk-label">Bloque</label>
          <select className="vk-input" value={bloqueId} onChange={(e) => setBloqueId(e.target.value)} required>
            <option value="">Selecciona…</option>
            {bloques.map((b) => <option key={b.id} value={b.id}>{b.nombre} ({b.horaInicio}-{b.horaFin})</option>)}
          </select>
        </div>
        <div>
          <label className="vk-label">Día</label>
          <select className="vk-input" value={dia} onChange={(e) => setDia(e.target.value)}>
            {DIAS.map((d) => <option key={d} value={d}>{DIA_CORTO[d]}</option>)}
          </select>
        </div>
        <div>
          <label className="vk-label">Materia</label>
          <input className="vk-input" value={materia} onChange={(e) => setMateria(e.target.value)} required placeholder="Ej. Matemática" />
        </div>
      </div>

      {verificando && <div style={{ fontSize: 12, color: "var(--vk-muted)", marginBottom: 10 }}>Verificando disponibilidad…</div>}

      {conflictos.length > 0 && (
        <div style={{ background: "var(--vk-coral-100)", borderRadius: 10, padding: 12, marginBottom: 12 }}>
          {conflictos.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "var(--vk-coral)", marginBottom: i < conflictos.length - 1 ? 6 : 0 }}>
              <AlertTriangle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
              {c.mensaje}
            </div>
          ))}
        </div>
      )}

      {error && conflictos.length === 0 && <div style={{ color: "var(--vk-coral)", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <button type="submit" disabled={enviando || conflictos.length > 0} className="vk-btn vk-btn-primary">
        {enviando ? "Guardando…" : conflictos.length > 0 ? "Resuelve el conflicto para guardar" : "Guardar bloque"}
      </button>
    </form>
  );
}

/* ---------- Grilla semanal reutilizable ---------- */

function GrillaHorario({ bloques, entries, celda }) {
  const bloquesOrdenados = [...bloques].sort((a, b) => a.orden - b.orden);
  const porCelda = new Map();
  entries.forEach((e) => porCelda.set(`${e.dia}-${e.bloqueId}`, e));

  if (bloquesOrdenados.length === 0) {
    return <div className="vk-card" style={{ padding: 20, color: "var(--vk-muted)" }}>No hay bloques horarios configurados aún.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="vk-table" style={{ minWidth: 640 }}>
        <thead>
          <tr>
            <th style={{ width: 90 }}>Bloque</th>
            {DIAS.map((d) => <th key={d}>{DIA_CORTO[d]}</th>)}
          </tr>
        </thead>
        <tbody>
          {bloquesOrdenados.map((b) => (
            <tr key={b.id}>
              <td style={{ fontSize: 12, color: "var(--vk-muted)" }}>
                <div style={{ fontWeight: 700, color: "var(--vk-ink)" }}>{b.nombre}</div>
                {b.horaInicio}-{b.horaFin}
              </td>
              {DIAS.map((d) => {
                const e = porCelda.get(`${d}-${b.id}`);
                return (
                  <td key={d} style={{ padding: 4, verticalAlign: "top" }}>
                    {e ? (
                      <div className="vk-card" style={{ position: "relative", padding: "8px 10px", background: "var(--vk-lavender)", border: "none", fontSize: 12 }}>
                        {celda(e)}
                      </div>
                    ) : (
                      <div style={{ height: 40 }} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
