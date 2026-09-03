import React, { useEffect, useState } from "react";
import { Users, Layers, DoorOpen, Clock3, Plus, Trash2 } from "lucide-react";
import { api } from "../api";

const TABS = [
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "grupos", label: "Grupos", icon: Layers },
  { id: "aulas", label: "Aulas", icon: DoorOpen },
  { id: "bloques", label: "Bloques horarios", icon: Clock3 },
];

export default function Admin() {
  const [tab, setTab] = useState("usuarios");
  return (
    <div>
      <span className="vk-label" style={{ color: "var(--vk-purple-500)" }}>Panel administrativo</span>
      <h1 className="vk-display" style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>Administración</h1>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="vk-btn"
            style={tab === t.id ? { background: "var(--vk-purple-700)", color: "white", border: "none" } : {}}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "usuarios" && <TabUsuarios />}
      {tab === "grupos" && <TabCatalogo tipo="grupos" campos={["nombre"]} />}
      {tab === "aulas" && <TabCatalogo tipo="aulas" campos={["nombre"]} />}
      {tab === "bloques" && <TabBloques />}
    </div>
  );
}

const ROLES = ["ADMIN", "DIRECTIVO", "DOCENTE", "ESTUDIANTE", "FAMILIA"];

function TabUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: "", email: "", password: "", rol: "ESTUDIANTE", grupoId: "" });
  const [error, setError] = useState("");

  function cargar() {
    api.usuarios.listar().then(setUsuarios);
    api.catalogos.grupos().then(setGrupos);
  }
  useEffect(cargar, []);

  async function crear(e) {
    e.preventDefault();
    setError("");
    try {
      await api.usuarios.crear({ ...nuevo, grupoId: nuevo.grupoId || undefined });
      setNuevo({ nombre: "", email: "", password: "", rol: "ESTUDIANTE", grupoId: "" });
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActivo(u) {
    await api.usuarios.actualizar(u.id, { activo: u.activo ? 0 : 1 });
    cargar();
  }

  return (
    <div>
      <button className="vk-btn vk-btn-primary" onClick={() => setMostrarForm((v) => !v)} style={{ marginBottom: 16 }}>
        <Plus size={14} /> {mostrarForm ? "Cancelar" : "Nuevo usuario"}
      </button>

      {mostrarForm && (
        <form onSubmit={crear} className="vk-card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div>
              <label className="vk-label">Nombre</label>
              <input className="vk-input" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />
            </div>
            <div>
              <label className="vk-label">Email</label>
              <input className="vk-input" type="email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} required />
            </div>
            <div>
              <label className="vk-label">Contraseña</label>
              <input className="vk-input" type="text" value={nuevo.password} onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })} required />
            </div>
            <div>
              <label className="vk-label">Rol</label>
              <select className="vk-input" value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {nuevo.rol === "ESTUDIANTE" && (
              <div>
                <label className="vk-label">Grupo</label>
                <select className="vk-input" value={nuevo.grupoId} onChange={(e) => setNuevo({ ...nuevo, grupoId: e.target.value })}>
                  <option value="">Sin grupo</option>
                  {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                </select>
              </div>
            )}
          </div>
          {error && <div style={{ color: "var(--vk-coral)", fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <button type="submit" className="vk-btn vk-btn-primary">Crear usuario</button>
        </form>
      )}

      <div className="vk-card" style={{ overflow: "hidden" }}>
        <table className="vk-table">
          <thead>
            <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Grupo</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                <td style={{ color: "var(--vk-muted)" }}>{u.email}</td>
                <td><span className="vk-pill vk-pill-purple">{u.rol}</span></td>
                <td>{u.grupoNombre || "—"}</td>
                <td>
                  <span className={`vk-pill ${u.activo ? "vk-pill-green" : "vk-pill-coral"}`}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td>
                  <button onClick={() => toggleActivo(u)} className="vk-btn" style={{ padding: "4px 10px", fontSize: 12 }}>
                    {u.activo ? "Desactivar" : "Reactivar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabCatalogo({ tipo, campos }) {
  const [items, setItems] = useState([]);
  const [valor, setValor] = useState("");

  const metodos = {
    grupos: { listar: api.catalogos.grupos, crear: api.catalogos.crearGrupo, eliminar: api.catalogos.eliminarGrupo },
    aulas: { listar: api.catalogos.aulas, crear: api.catalogos.crearAula, eliminar: api.catalogos.eliminarAula },
  }[tipo];

  function cargar() { metodos.listar().then(setItems); }
  useEffect(cargar, [tipo]);

  async function crear(e) {
    e.preventDefault();
    if (!valor.trim()) return;
    await metodos.crear(valor.trim());
    setValor("");
    cargar();
  }

  async function eliminar(id) {
    await metodos.eliminar(id);
    cargar();
  }

  return (
    <div>
      <form onSubmit={crear} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input className="vk-input" placeholder={`Nombre del ${tipo === "grupos" ? "grupo (ej. 5to A)" : "aula (ej. Aula 12)"}`} value={valor} onChange={(e) => setValor(e.target.value)} />
        <button className="vk-btn vk-btn-primary" type="submit"><Plus size={14} /></button>
      </form>
      <div className="vk-card">
        {items.length === 0 && <div style={{ padding: 16, color: "var(--vk-muted)" }}>Todavía no hay nada aquí.</div>}
        {items.map((it, i) => (
          <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i < items.length - 1 ? "1px solid var(--vk-line)" : "none" }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{it.nombre}</span>
            <button onClick={() => eliminar(it.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--vk-coral)" }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabBloques() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ nombre: "", horaInicio: "", horaFin: "", orden: "" });

  function cargar() { api.catalogos.bloques().then(setItems); }
  useEffect(cargar, []);

  async function crear(e) {
    e.preventDefault();
    await api.catalogos.crearBloque({ ...form, orden: Number(form.orden) || items.length + 1 });
    setForm({ nombre: "", horaInicio: "", horaFin: "", orden: "" });
    cargar();
  }

  async function eliminar(id) {
    await api.catalogos.eliminarBloque(id);
    cargar();
  }

  return (
    <div>
      <form onSubmit={crear} className="vk-card" style={{ padding: 16, marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, alignItems: "end" }}>
        <div>
          <label className="vk-label">Nombre</label>
          <input className="vk-input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Bloque 1" required />
        </div>
        <div>
          <label className="vk-label">Hora inicio</label>
          <input className="vk-input" type="time" value={form.horaInicio} onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} required />
        </div>
        <div>
          <label className="vk-label">Hora fin</label>
          <input className="vk-input" type="time" value={form.horaFin} onChange={(e) => setForm({ ...form, horaFin: e.target.value })} required />
        </div>
        <div>
          <label className="vk-label">Orden</label>
          <input className="vk-input" type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })} placeholder="1" />
        </div>
        <button className="vk-btn vk-btn-primary" type="submit"><Plus size={14} /> Agregar</button>
      </form>
      <div className="vk-card">
        {items.length === 0 && <div style={{ padding: 16, color: "var(--vk-muted)" }}>Todavía no hay bloques configurados.</div>}
        {items.sort((a, b) => a.orden - b.orden).map((it, i) => (
          <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i < items.length - 1 ? "1px solid var(--vk-line)" : "none" }}>
            <span style={{ fontSize: 14 }}><strong>{it.nombre}</strong> · {it.horaInicio}–{it.horaFin}</span>
            <button onClick={() => eliminar(it.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--vk-coral)" }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
