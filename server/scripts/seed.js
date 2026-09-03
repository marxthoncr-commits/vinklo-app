require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../src/db");
const { id } = require("../src/id");
// (ubicado en /scripts, no depende de Prisma — usa better-sqlite3 directamente)

console.log("Sembrando datos de demostración de Vinklo...");

// Limpieza (idempotente: se puede correr varias veces en desarrollo)
db.exec(`
  DELETE FROM comunicado_lectura;
  DELETE FROM comunicado;
  DELETE FROM horario_entry;
  DELETE FROM bloque_horario;
  DELETE FROM aula;
  DELETE FROM usuario;
  DELETE FROM grupo;
  DELETE FROM institucion;
`);

const institucionId = id();
db.prepare("INSERT INTO institucion (id, nombre, color_primario) VALUES (?, ?, ?)").run(
  institucionId, "Colegio Los Ángeles (demo)", "#4A2F7A"
);

const grupo5A = id();
const grupo4B = id();
db.prepare("INSERT INTO grupo (id, institucion_id, nombre) VALUES (?, ?, ?)").run(grupo5A, institucionId, "5to A");
db.prepare("INSERT INTO grupo (id, institucion_id, nombre) VALUES (?, ?, ?)").run(grupo4B, institucionId, "4to B");

const aula1 = id(); const aula2 = id(); const aulaLab = id();
db.prepare("INSERT INTO aula (id, institucion_id, nombre) VALUES (?, ?, ?)").run(aula1, institucionId, "Aula 204");
db.prepare("INSERT INTO aula (id, institucion_id, nombre) VALUES (?, ?, ?)").run(aula2, institucionId, "Aula 12");
db.prepare("INSERT INTO aula (id, institucion_id, nombre) VALUES (?, ?, ?)").run(aulaLab, institucionId, "Laboratorio 2");

const bloques = [
  ["Bloque 1", "08:00", "09:00", 1],
  ["Bloque 2", "09:00", "10:00", 2],
  ["Bloque 3", "10:15", "11:15", 3],
  ["Bloque 4", "11:15", "12:15", 4],
];
const bloqueIds = bloques.map(([nombre, hi, hf, orden]) => {
  const bId = id();
  db.prepare("INSERT INTO bloque_horario (id, institucion_id, nombre, hora_inicio, hora_fin, orden) VALUES (?, ?, ?, ?, ?, ?)").run(
    bId, institucionId, nombre, hi, hf, orden
  );
  return bId;
});

function crearUsuario({ nombre, email, password, rol, grupoId }) {
  const uId = id();
  db.prepare(
    "INSERT INTO usuario (id, institucion_id, nombre, email, password_hash, rol, grupo_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(uId, institucionId, nombre, email, bcrypt.hashSync(password, 10), rol, grupoId || null);
  return uId;
}

const admin = crearUsuario({ nombre: "Marina Rojas", email: "admin@vinklo.demo", password: "vinklo123", rol: "ADMIN" });
const directivo = crearUsuario({ nombre: "Jorge Salinas", email: "directivo@vinklo.demo", password: "vinklo123", rol: "DIRECTIVO" });
const docenteTorres = crearUsuario({ nombre: "Carlos Torres", email: "docente@vinklo.demo", password: "vinklo123", rol: "DOCENTE" });
const docenteMedina = crearUsuario({ nombre: "Rosa Medina", email: "rmedina@vinklo.demo", password: "vinklo123", rol: "DOCENTE" });
const estudianteAna = crearUsuario({ nombre: "Ana Paredes", email: "estudiante@vinklo.demo", password: "vinklo123", rol: "ESTUDIANTE", grupoId: grupo4B });
crearUsuario({ nombre: "Bruno Salas", email: "bruno@vinklo.demo", password: "vinklo123", rol: "ESTUDIANTE", grupoId: grupo4B });
crearUsuario({ nombre: "Camila Ruiz", email: "camila@vinklo.demo", password: "vinklo123", rol: "ESTUDIANTE", grupoId: grupo5A });
const familia = crearUsuario({ nombre: "Lucía Paredes", email: "familia@vinklo.demo", password: "vinklo123", rol: "FAMILIA" });

// Horario de ejemplo (lunes) para 4to B
const horarioEjemplo = [
  { grupoId: grupo4B, docenteId: docenteTorres, aulaId: aula2, bloqueId: bloqueIds[0], dia: "LUNES", materia: "Matemática" },
  { grupoId: grupo4B, docenteId: docenteMedina, aulaId: aula2, bloqueId: bloqueIds[1], dia: "LUNES", materia: "Comunicación" },
  { grupoId: grupo4B, docenteId: docenteTorres, aulaId: aulaLab, bloqueId: bloqueIds[2], dia: "LUNES", materia: "Ciencias" },
  { grupoId: grupo5A, docenteId: docenteMedina, aulaId: aula1, bloqueId: bloqueIds[0], dia: "LUNES", materia: "Historia" },
  { grupoId: grupo5A, docenteId: docenteTorres, aulaId: aula1, bloqueId: bloqueIds[1], dia: "LUNES", materia: "Matemática" },
];
for (const h of horarioEjemplo) {
  db.prepare(
    "INSERT INTO horario_entry (id, institucion_id, grupo_id, docente_id, aula_id, bloque_id, dia, materia) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id(), institucionId, h.grupoId, h.docenteId, h.aulaId, h.bloqueId, h.dia, h.materia);
}

// Comunicados de ejemplo
function crearComunicado({ autorId, titulo, cuerpo, audienciaTipo, audienciaRol, audienciaGrupoId, urgente }) {
  const cId = id();
  db.prepare(
    `INSERT INTO comunicado (id, institucion_id, autor_id, titulo, cuerpo, audiencia_tipo, audiencia_rol, audiencia_grupo_id, urgente, requiere_confirmacion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  ).run(cId, institucionId, autorId, titulo, cuerpo, audienciaTipo, audienciaRol || null, audienciaGrupoId || null, urgente ? 1 : 0);
  return cId;
}

const c1 = crearComunicado({
  autorId: directivo, titulo: "Cambio de horario: viernes clases hasta 12 m.",
  cuerpo: "Por actividad institucional, el viernes las clases terminarán a las 12:00 m. para todos los grados.",
  audienciaTipo: "TODOS", urgente: true,
});
crearComunicado({
  autorId: admin, titulo: "Reunión de padres — segundo bimestre",
  cuerpo: "Se convoca a la reunión de padres de familia el próximo lunes a las 6:00 p.m. en el auditorio.",
  audienciaTipo: "ROL", audienciaRol: "FAMILIA",
});
crearComunicado({
  autorId: docenteTorres, titulo: "Salida pedagógica al museo — 4to B",
  cuerpo: "El jueves 4 de septiembre saldremos al museo de 9:00 a.m. a 1:00 p.m. Se requiere autorización firmada.",
  audienciaTipo: "GRUPO", audienciaGrupoId: grupo4B,
});

// Marcar como leído por algunos usuarios (para ver estadísticas de lectura reales)
db.prepare("INSERT INTO comunicado_lectura (id, comunicado_id, usuario_id) VALUES (?, ?, ?)").run(id(), c1, docenteTorres);
db.prepare("INSERT INTO comunicado_lectura (id, comunicado_id, usuario_id) VALUES (?, ?, ?)").run(id(), c1, familia);

console.log("Listo. Usuarios de prueba (contraseña 'vinklo123' para todos):");
console.log("  admin@vinklo.demo       (ADMIN)");
console.log("  directivo@vinklo.demo   (DIRECTIVO)");
console.log("  docente@vinklo.demo     (DOCENTE — Carlos Torres)");
console.log("  rmedina@vinklo.demo     (DOCENTE — Rosa Medina)");
console.log("  estudiante@vinklo.demo  (ESTUDIANTE — Ana Paredes, 4to B)");
console.log("  familia@vinklo.demo     (FAMILIA — apoderada de Ana)");
