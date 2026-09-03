const express = require("express");
const db = require("../db");
const { id } = require("../id");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const SELECT_ENTRY = `
  SELECT h.id, h.dia, h.materia,
         h.grupo_id as grupoId, g.nombre as grupoNombre,
         h.docente_id as docenteId, u.nombre as docenteNombre,
         h.aula_id as aulaId, a.nombre as aulaNombre,
         h.bloque_id as bloqueId, b.nombre as bloqueNombre, b.hora_inicio as horaInicio, b.hora_fin as horaFin, b.orden as orden
  FROM horario_entry h
  JOIN grupo g ON g.id = h.grupo_id
  JOIN usuario u ON u.id = h.docente_id
  JOIN aula a ON a.id = h.aula_id
  JOIN bloque_horario b ON b.id = h.bloque_id
  WHERE h.institucion_id = ?
`;

// Grilla completa del horario institucional (para el generador visual)
router.get("/", (req, res) => {
  const rows = db.prepare(`${SELECT_ENTRY} ORDER BY b.orden, h.dia`).all(req.user.institucionId);
  res.json(rows);
});

// Horario del propio usuario (docente ve sus clases, estudiante ve las de su grupo)
router.get("/mio", (req, res) => {
  const { rol, id: userId, grupoId } = req.user;
  let rows;
  if (rol === "DOCENTE") {
    rows = db.prepare(`${SELECT_ENTRY} AND h.docente_id = ? ORDER BY b.orden, h.dia`).all(req.user.institucionId, userId);
  } else if (rol === "ESTUDIANTE" && grupoId) {
    rows = db.prepare(`${SELECT_ENTRY} AND h.grupo_id = ? ORDER BY b.orden, h.dia`).all(req.user.institucionId, grupoId);
  } else {
    rows = db.prepare(`${SELECT_ENTRY} ORDER BY b.orden, h.dia`).all(req.user.institucionId);
  }
  res.json(rows);
});

function detectarConflictos(institucionId, { grupoId, docenteId, aulaId, bloqueId, dia }, ignoreId = null) {
  const params = [institucionId, dia, bloqueId];
  let sql = `${SELECT_ENTRY.replace("WHERE h.institucion_id = ?", "WHERE h.institucion_id = ? AND h.dia = ? AND h.bloque_id = ?")}`;
  if (ignoreId) {
    sql += " AND h.id != ?";
    params.push(ignoreId);
  }
  const mismosBloque = db.prepare(sql).all(...params);

  const conflictos = [];
  for (const entry of mismosBloque) {
    if (entry.docenteId === docenteId) {
      conflictos.push({
        tipo: "DOCENTE_DUPLICADO",
        mensaje: `El docente ${entry.docenteNombre} ya está asignado a ${entry.grupoNombre} en este bloque.`,
        entry,
      });
    }
    if (entry.aulaId === aulaId) {
      conflictos.push({
        tipo: "AULA_OCUPADA",
        mensaje: `El aula ${entry.aulaNombre} ya está ocupada por ${entry.grupoNombre} en este bloque.`,
        entry,
      });
    }
    if (entry.grupoId === grupoId) {
      conflictos.push({
        tipo: "CURSO_DUPLICADO",
        mensaje: `El grupo ${entry.grupoNombre} ya tiene ${entry.materia} asignada en este bloque.`,
        entry,
      });
    }
  }
  return conflictos;
}

// Verificar conflictos sin guardar (para feedback en vivo en el generador visual)
router.post("/verificar", requireRole("ADMIN", "DIRECTIVO"), (req, res) => {
  const { grupoId, docenteId, aulaId, bloqueId, dia } = req.body || {};
  if (!grupoId || !docenteId || !aulaId || !bloqueId || !dia) {
    return res.status(400).json({ error: "grupoId, docenteId, aulaId, bloqueId y dia son obligatorios." });
  }
  const conflictos = detectarConflictos(req.user.institucionId, { grupoId, docenteId, aulaId, bloqueId, dia });
  res.json({ conflictos });
});

// Crear una entrada de horario (bloquea si hay conflictos, salvo que forzar=true)
router.post("/", requireRole("ADMIN", "DIRECTIVO"), (req, res) => {
  const { grupoId, docenteId, aulaId, bloqueId, dia, materia, forzar } = req.body || {};
  if (!grupoId || !docenteId || !aulaId || !bloqueId || !dia || !materia) {
    return res.status(400).json({ error: "grupoId, docenteId, aulaId, bloqueId, dia y materia son obligatorios." });
  }
  const conflictos = detectarConflictos(req.user.institucionId, { grupoId, docenteId, aulaId, bloqueId, dia });
  if (conflictos.length > 0 && !forzar) {
    return res.status(409).json({ error: "Conflicto de horario detectado.", conflictos });
  }
  const newId = id();
  db.prepare(
    `INSERT INTO horario_entry (id, institucion_id, grupo_id, docente_id, aula_id, bloque_id, dia, materia)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(newId, req.user.institucionId, grupoId, docenteId, aulaId, bloqueId, dia, materia);

  res.status(201).json({ id: newId, conflictosIgnorados: conflictos.length > 0 ? conflictos : undefined });
});

router.delete("/:id", requireRole("ADMIN", "DIRECTIVO"), (req, res) => {
  db.prepare("DELETE FROM horario_entry WHERE id = ? AND institucion_id = ?").run(req.params.id, req.user.institucionId);
  res.json({ ok: true });
});

module.exports = router;
