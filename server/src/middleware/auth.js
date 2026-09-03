const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "vinklo_dev_secret_change_in_production";

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No autenticado. Falta el token." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, institucionId, rol, nombre, email, grupoId }
    next();
  } catch (e) {
    return res.status(401).json({ error: "Sesión inválida o expirada." });
  }
}

// Uso: requireRole('ADMIN', 'DIRECTIVO')
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "No autenticado." });
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: `Tu rol (${req.user.rol}) no tiene permiso para esta acción.` });
    }
    next();
  };
}

function signToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      institucionId: usuario.institucion_id,
      rol: usuario.rol,
      nombre: usuario.nombre,
      email: usuario.email,
      grupoId: usuario.grupo_id || null,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

module.exports = { requireAuth, requireRole, signToken, JWT_SECRET };
