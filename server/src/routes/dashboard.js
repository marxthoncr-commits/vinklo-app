const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const DIAS_JS = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];

router.get("/", (req, res) => {
  const { rol, id: userId, grupoId, institucionId } = req.user;
  const hoyIdx = new Date().getDay();
  const diaHoy = DIAS_JS[hoyIdx]; // puede ser SABADO/DOMINGO -> sin clases

  const SELECT = `
    SELECT h.id, h.materia, h.dia,
           b.nombre as bloqueNombre, b.hora_inicio as horaInicio, b.hora_fin as horaFin, b.orden as orden,
           a.nombre as aulaNombre, g.nombre as grupoNombre, u.nombre as docenteNombre
    FROM horario_entry h
    JOIN bloque_horario b ON b.id = h.bloque_id
    JOIN aula a ON a.id = h.aula_id
    JOIN grupo g ON g.id = h.grupo_id
    JOIN usuario u ON u.id = h.docente_id
    WHERE h.institucion_id = ? AND h.dia = ?
  `;

  let bloquesHoy = [];
  if (["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"].includes(diaHoy)) {
    if (rol === "DOCENTE") {
      bloquesHoy = db.prepare(`${SELECT} AND h.docente_id = ? ORDER BY b.orden`).all(institucionId, diaHoy, userId);
    } else if (rol === "ESTUDIANTE" && grupoId) {
      bloquesHoy = db.prepare(`${SELECT} AND h.grupo_id = ? ORDER BY b.orden`).all(institucionId, diaHoy, grupoId);
    } else {
      bloquesHoy = db.prepare(`${SELECT} ORDER BY b.orden`).all(institucionId, diaHoy);
    }
  }

  // Comunicados no leídos relevantes (reutiliza la misma lógica de audiencia que /comunicados)
  const todos = db
    .prepare(
      `SELECT c.* FROM comunicado c WHERE c.institucion_id = ? ORDER BY c.created_at DESC`
    )
    .all(institucionId);
  const leidos = new Set(
    db.prepare("SELECT comunicado_id FROM comunicado_lectura WHERE usuario_id = ?").all(userId).map((r) => r.comunicado_id)
  );
  function esDestinatario(c) {
    if (c.autor_id === userId) return false; // no contamos como pendiente lo que uno mismo escribió
    if (c.audiencia_tipo === "TODOS") return true;
    if (c.audiencia_tipo === "ROL") return c.audiencia_rol === rol;
    if (c.audiencia_tipo === "GRUPO") return c.audiencia_grupo_id === grupoId;
    return false;
  }
  const noLeidos = todos.filter((c) => esDestinatario(c) && !leidos.has(c.id));
  const urgentesNoLeidos = noLeidos.filter((c) => c.urgente);

  res.json({
    dia: diaHoy,
    esDiaHabil: ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"].includes(diaHoy),
    bloquesHoy: bloquesHoy.map((b) => ({
      bloque: b.bloqueNombre,
      horaInicio: b.horaInicio,
      horaFin: b.horaFin,
      materia: b.materia,
      aula: b.aulaNombre,
      grupo: b.grupoNombre,
      docente: b.docenteNombre,
    })),
    comunicadosNoLeidos: noLeidos.length,
    comunicadosUrgentesNoLeidos: urgentesNoLeidos.length,
    ultimosComunicados: noLeidos.slice(0, 3).map((c) => ({ id: c.id, titulo: c.titulo, urgente: !!c.urgente })),
  });
});

module.exports = router;
