// db.js — conexión a SQLite (better-sqlite3) y creación del esquema.
// Base de datos real con persistencia en disco (data/vinklo.db).
// Para producción se recomienda montar un volumen persistente en el host
// (ver README de despliegue) para que el archivo no se borre en cada deploy.

const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "..", "data", "vinklo.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS institucion (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  color_primario TEXT NOT NULL DEFAULT '#4A2F7A',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS grupo (
  id TEXT PRIMARY KEY,
  institucion_id TEXT NOT NULL REFERENCES institucion(id),
  nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usuario (
  id TEXT PRIMARY KEY,
  institucion_id TEXT NOT NULL REFERENCES institucion(id),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('ADMIN','DIRECTIVO','DOCENTE','ESTUDIANTE','FAMILIA')),
  grupo_id TEXT REFERENCES grupo(id),
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS aula (
  id TEXT PRIMARY KEY,
  institucion_id TEXT NOT NULL REFERENCES institucion(id),
  nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bloque_horario (
  id TEXT PRIMARY KEY,
  institucion_id TEXT NOT NULL REFERENCES institucion(id),
  nombre TEXT NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS horario_entry (
  id TEXT PRIMARY KEY,
  institucion_id TEXT NOT NULL REFERENCES institucion(id),
  grupo_id TEXT NOT NULL REFERENCES grupo(id),
  docente_id TEXT NOT NULL REFERENCES usuario(id),
  aula_id TEXT NOT NULL REFERENCES aula(id),
  bloque_id TEXT NOT NULL REFERENCES bloque_horario(id),
  dia TEXT NOT NULL CHECK (dia IN ('LUNES','MARTES','MIERCOLES','JUEVES','VIERNES')),
  materia TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comunicado (
  id TEXT PRIMARY KEY,
  institucion_id TEXT NOT NULL REFERENCES institucion(id),
  autor_id TEXT NOT NULL REFERENCES usuario(id),
  titulo TEXT NOT NULL,
  cuerpo TEXT NOT NULL,
  audiencia_tipo TEXT NOT NULL CHECK (audiencia_tipo IN ('TODOS','ROL','GRUPO')) DEFAULT 'TODOS',
  audiencia_rol TEXT,
  audiencia_grupo_id TEXT REFERENCES grupo(id),
  urgente INTEGER NOT NULL DEFAULT 0,
  requiere_confirmacion INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comunicado_lectura (
  id TEXT PRIMARY KEY,
  comunicado_id TEXT NOT NULL REFERENCES comunicado(id),
  usuario_id TEXT NOT NULL REFERENCES usuario(id),
  leido_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(comunicado_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_horario_lookup ON horario_entry(institucion_id, dia, bloque_id);
CREATE INDEX IF NOT EXISTS idx_usuario_institucion ON usuario(institucion_id);
`);

module.exports = db;
