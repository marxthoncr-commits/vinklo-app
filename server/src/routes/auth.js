const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { signToken, requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña son obligatorios." });
  }
  const usuario = db.prepare("SELECT * FROM usuario WHERE email = ? AND activo = 1").get(email.trim().toLowerCase());
  if (!usuario) return res.status(401).json({ error: "Credenciales incorrectas." });

  const ok = bcrypt.compareSync(password, usuario.password_hash);
  if (!ok) return res.status(401).json({ error: "Credenciales incorrectas." });

  const token = signToken(usuario);
  res.json({
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      grupoId: usuario.grupo_id,
      institucionId: usuario.institucion_id,
    },
  });
});

router.get("/me", requireAuth, (req, res) => {
  const institucion = db.prepare("SELECT * FROM institucion WHERE id = ?").get(req.user.institucionId);
  res.json({ usuario: req.user, institucion });
});

module.exports = router;
