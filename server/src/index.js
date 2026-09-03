require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Health check público: se define ANTES de montar routers protegidos
// para que ningún middleware de auth pueda interceptarlo.
app.get("/api/health", (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/usuarios", require("./routes/usuarios"));
app.use("/api/catalogos", require("./routes/catalogos")); // /api/catalogos/grupos, /aulas, /bloques
app.use("/api/horario", require("./routes/horario"));
app.use("/api/comunicados", require("./routes/comunicados"));
app.use("/api/mi-dia", require("./routes/dashboard"));

// En producción, servir el frontend ya compilado (client/dist) desde este mismo servidor.
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Vinklo API escuchando en http://localhost:${PORT}`);
});
