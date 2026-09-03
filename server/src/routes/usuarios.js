const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { id } = require("../id");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// Listar usuarios de la institución del usuario autenticado
router.get("/", requireRole("ADMIN", "DIRECTIVO"), (req, res) => {
  const usuarios = db
    .prepare(
      `SELECT u.id, u.nombre, u.email, u.rol, u.grupo_id as grupoId, u.activo,
              g.nombre as grupoNombre
       FROM usuario u LEFT JOIN grupo g ON g.id = u.grupo_id
       WHERE u.institucion_id = ?
       ORDER BY u.rol, u.nombre`
    )
    .all(req.user.institucionId);
  res.json(usuarios);
});

router.post("/", requireRole("ADMIN"), (req, res) => {
  const { nombre, email, password, rol, grupoId } = req.body || {};
  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ error: "nombre, email, password y rol son obligatorios." });
  }
  const rolesValidos = ["ADMIN", "DIRECTIVO", "DOCENTE", "ESTUDIANTE", "FAMILIA"];
  if (!rolesValidos.includes(rol)) return res.status(400).json({ error: "Rol inválido." });

  const existente = db.prepare("SELECT id FROM usuario WHERE email = ?").get(email.trim().toLowerCase());
  if (existente) return res.status(409).json({ error: "Ya existe un usuario con ese email." });

  const nuevoId = id();
  const passwordHash = bcrypt.hashSync(password, 10);
  db.prepare(
    `INSERT INTO usuario (id, institucion_id, nombre, email, password_hash, rol, grupo_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(nuevoId, req.user.institucionId, nombre, email.trim().toLowerCase(), passwordHash, rol, grupoId || null);

  res.status(201).json({ id: nuevoId, nombre, email, rol, grupoId: grupoId || null });
});

router.patch("/:id", requireRole("ADMIN"), (req, res) => {
  const usuario = db.prepare("SELECT * FROM usuario WHERE id = ? AND institucion_id = ?").get(req.params.id, req.user.institucionId);
  if (!usuario) return res.status(404).json({ error: "Usuario no encontrado." });

  const { nombre, rol, grupoId, activo, password } = req.body || {};
  db.prepare(
    `UPDATE usuario SET nombre = ?, rol = ?, grupo_id = ?, activo = ?, password_hash = ? WHERE id = ?`
  ).run(
    nombre ?? usuario.nombre,
    rol ?? usuario.rol,
    grupoId !== undefined ? grupoId : usuario.grupo_id,
    activo !== undefined ? (activo ? 1 : 0) : usuario.activo,
    password ? bcrypt.hashSync(password, 10) : usuario.password_hash,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete("/:id", requireRole("ADMIN"), (req, res) => {
  const usuario = db.prepare("SELECT * FROM usuario WHERE id = ? AND institucion_id = ?").get(req.params.id, req.user.institucionId);
  if (!usuario) return res.status(404).json({ error: "Usuario no encontrado." });
  if (usuario.id === req.user.id) return res.status(400).json({ error: "No puedes desactivarte a ti mismo." });
  db.prepare("UPDATE usuario SET activo = 0 WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
