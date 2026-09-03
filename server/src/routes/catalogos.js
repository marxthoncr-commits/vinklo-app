const express = require("express");
const db = require("../db");
const { id } = require("../id");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// ---------- Grupos ----------
router.get("/grupos", (req, res) => {
  const grupos = db.prepare("SELECT * FROM grupo WHERE institucion_id = ? ORDER BY nombre").all(req.user.institucionId);
  res.json(grupos.map((g) => ({ id: g.id, nombre: g.nombre })));
});

router.post("/grupos", requireRole("ADMIN", "DIRECTIVO"), (req, res) => {
  const { nombre } = req.body || {};
  if (!nombre) return res.status(400).json({ error: "nombre es obligatorio." });
  const newId = id();
  db.prepare("INSERT INTO grupo (id, institucion_id, nombre) VALUES (?, ?, ?)").run(newId, req.user.institucionId, nombre);
  res.status(201).json({ id: newId, nombre });
});

router.delete("/grupos/:id", requireRole("ADMIN"), (req, res) => {
  db.prepare("DELETE FROM grupo WHERE id = ? AND institucion_id = ?").run(req.params.id, req.user.institucionId);
  res.json({ ok: true });
});

// ---------- Aulas ----------
router.get("/aulas", (req, res) => {
  const aulas = db.prepare("SELECT * FROM aula WHERE institucion_id = ? ORDER BY nombre").all(req.user.institucionId);
  res.json(aulas.map((a) => ({ id: a.id, nombre: a.nombre })));
});

router.post("/aulas", requireRole("ADMIN", "DIRECTIVO"), (req, res) => {
  const { nombre } = req.body || {};
  if (!nombre) return res.status(400).json({ error: "nombre es obligatorio." });
  const newId = id();
  db.prepare("INSERT INTO aula (id, institucion_id, nombre) VALUES (?, ?, ?)").run(newId, req.user.institucionId, nombre);
  res.status(201).json({ id: newId, nombre });
});

router.delete("/aulas/:id", requireRole("ADMIN"), (req, res) => {
  db.prepare("DELETE FROM aula WHERE id = ? AND institucion_id = ?").run(req.params.id, req.user.institucionId);
  res.json({ ok: true });
});

// ---------- Bloques horarios ----------
router.get("/bloques", (req, res) => {
  const bloques = db
    .prepare("SELECT * FROM bloque_horario WHERE institucion_id = ? ORDER BY orden")
    .all(req.user.institucionId);
  res.json(bloques.map((b) => ({ id: b.id, nombre: b.nombre, horaInicio: b.hora_inicio, horaFin: b.hora_fin, orden: b.orden })));
});

router.post("/bloques", requireRole("ADMIN", "DIRECTIVO"), (req, res) => {
  const { nombre, horaInicio, horaFin, orden } = req.body || {};
  if (!nombre || !horaInicio || !horaFin) {
    return res.status(400).json({ error: "nombre, horaInicio y horaFin son obligatorios." });
  }
  const newId = id();
  db.prepare("INSERT INTO bloque_horario (id, institucion_id, nombre, hora_inicio, hora_fin, orden) VALUES (?, ?, ?, ?, ?, ?)").run(
    newId, req.user.institucionId, nombre, horaInicio, horaFin, orden || 0
  );
  res.status(201).json({ id: newId, nombre, horaInicio, horaFin, orden: orden || 0 });
});

router.delete("/bloques/:id", requireRole("ADMIN"), (req, res) => {
  db.prepare("DELETE FROM bloque_horario WHERE id = ? AND institucion_id = ?").run(req.params.id, req.user.institucionId);
  res.json({ ok: true });
});

module.exports = router;
