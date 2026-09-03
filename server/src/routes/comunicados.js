const express = require("express");
const db = require("../db");
const { id } = require("../id");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function destinatarios(institucionId, comunicado) {
  if (comunicado.audiencia_tipo === "TODOS") {
    return db.prepare("SELECT id, nombre, email, rol FROM usuario WHERE institucion_id = ? AND activo = 1").all(institucionId);
  }
  if (comunicado.audiencia_tipo === "ROL") {
    return db
      .prepare("SELECT id, nombre, email, rol FROM usuario WHERE institucion_id = ? AND rol = ? AND activo = 1")
      .all(institucionId, comunicado.audiencia_rol);
  }
  if (comunicado.audiencia_tipo === "GRUPO") {
    return db
      .prepare("SELECT id, nombre, email, rol FROM usuario WHERE institucion_id = ? AND grupo_id = ? AND activo = 1")
      .all(institucionId, comunicado.audiencia_grupo_id);
  }
  return [];
}

function esDestinatario(usuario, comunicado) {
  if (comunicado.autor_id === usuario.id) return true;
  if (comunicado.audiencia_tipo === "TODOS") return true;
  if (comunicado.audiencia_tipo === "ROL") return comunicado.audiencia_rol === usuario.rol;
  if (comunicado.audiencia_tipo === "GRUPO") return comunicado.audiencia_grupo_id === usuario.grupoId;
  return false;
}

// Feed de comunicados relevantes para el usuario autenticado
router.get("/", (req, res) => {
  const todos = db
    .prepare(
      `SELECT c.*, u.nombre as autorNombre, g.nombre as grupoNombre
       FROM comunicado c
       JOIN usuario u ON u.id = c.autor_id
       LEFT JOIN grupo g ON g.id = c.audiencia_grupo_id
       WHERE c.institucion_id = ?
       ORDER BY c.created_at DESC`
    )
    .all(req.user.institucionId);

  const relevantes = todos.filter((c) => esDestinatario(req.user, c));

  const leidosDelUsuario = new Set(
    db.prepare("SELECT comunicado_id FROM comunicado_lectura WHERE usuario_id = ?").all(req.user.id).map((r) => r.comunicado_id)
  );

  res.json(
    relevantes.map((c) => ({
      id: c.id,
      titulo: c.titulo,
      cuerpo: c.cuerpo,
      autor: c.autorNombre,
      esAutor: c.autor_id === req.user.id,
      audienciaTipo: c.audiencia_tipo,
      audienciaRol: c.audiencia_rol,
      audienciaGrupo: c.grupoNombre,
      urgente: !!c.urgente,
      requiereConfirmacion: !!c.requiere_confirmacion,
      leido: leidosDelUsuario.has(c.id),
      createdAt: c.created_at,
    }))
  );
});

router.post("/", requireRole("ADMIN", "DIRECTIVO", "DOCENTE"), (req, res) => {
  const { titulo, cuerpo, audienciaTipo, audienciaRol, audienciaGrupoId, urgente, requiereConfirmacion } = req.body || {};
  if (!titulo || !cuerpo || !audienciaTipo) {
    return res.status(400).json({ error: "titulo, cuerpo y audienciaTipo son obligatorios." });
  }
  // Un docente no puede difundir a toda la institución ni segmentar por rol libremente;
  // solo puede comunicarse con un grupo específico (ej. su curso).
  if (req.user.rol === "DOCENTE" && audienciaTipo !== "GRUPO") {
    return res.status(403).json({ error: "Como docente, solo puedes enviar comunicados a un grupo específico." });
  }
  if (audienciaTipo === "ROL" && !audienciaRol) {
    return res.status(400).json({ error: "audienciaRol es obligatorio cuando audienciaTipo es ROL." });
  }
  if (audienciaTipo === "GRUPO" && !audienciaGrupoId) {
    return res.status(400).json({ error: "audienciaGrupoId es obligatorio cuando audienciaTipo es GRUPO." });
  }

  const newId = id();
  db.prepare(
    `INSERT INTO comunicado (id, institucion_id, autor_id, titulo, cuerpo, audiencia_tipo, audiencia_rol, audiencia_grupo_id, urgente, requiere_confirmacion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId,
    req.user.institucionId,
    req.user.id,
    titulo,
    cuerpo,
    audienciaTipo,
    audienciaTipo === "ROL" ? audienciaRol : null,
    audienciaTipo === "GRUPO" ? audienciaGrupoId : null,
    urgente ? 1 : 0,
    requiereConfirmacion === false ? 0 : 1
  );
  res.status(201).json({ id: newId });
});

router.post("/:id/leer", (req, res) => {
  const comunicado = db.prepare("SELECT * FROM comunicado WHERE id = ? AND institucion_id = ?").get(req.params.id, req.user.institucionId);
  if (!comunicado) return res.status(404).json({ error: "Comunicado no encontrado." });
  if (!esDestinatario({ ...req.user }, comunicado)) {
    return res.status(403).json({ error: "Este comunicado no está dirigido a ti." });
  }
  const lecturaId = id();
  db.prepare(
    `INSERT INTO comunicado_lectura (id, comunicado_id, usuario_id) VALUES (?, ?, ?)
     ON CONFLICT(comunicado_id, usuario_id) DO NOTHING`
  ).run(lecturaId, req.params.id, req.user.id);
  res.json({ ok: true });
});

// Estadísticas de lectura (solo el autor o ADMIN/DIRECTIVO)
router.get("/:id/lecturas", (req, res) => {
  const comunicado = db.prepare("SELECT * FROM comunicado WHERE id = ? AND institucion_id = ?").get(req.params.id, req.user.institucionId);
  if (!comunicado) return res.status(404).json({ error: "Comunicado no encontrado." });
  const puedeVer = comunicado.autor_id === req.user.id || ["ADMIN", "DIRECTIVO"].includes(req.user.rol);
  if (!puedeVer) return res.status(403).json({ error: "No tienes permiso para ver estas estadísticas." });

  const dest = destinatarios(req.user.institucionId, comunicado);
  const leidos = new Set(
    db.prepare("SELECT usuario_id FROM comunicado_lectura WHERE comunicado_id = ?").all(req.params.id).map((r) => r.usuario_id)
  );
  const leyeron = dest.filter((d) => leidos.has(d.id));
  const noLeyeron = dest.filter((d) => !leidos.has(d.id));

  res.json({
    total: dest.length,
    leyeron: leyeron.map((d) => ({ nombre: d.nombre, rol: d.rol })),
    noLeyeron: noLeyeron.map((d) => ({ nombre: d.nombre, rol: d.rol })),
    porcentajeLectura: dest.length ? Math.round((leyeron.length / dest.length) * 100) : 0,
  });
});

module.exports = router;
