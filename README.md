# Vinklo — Intranet institucional (MVP funcional)

Aplicación real: backend con base de datos y autenticación, frontend instalable
como app en celular y laptop (PWA). No es una maqueta — los datos se guardan
de verdad, el login es real, y el generador de horarios bloquea conflictos
reales contra la base de datos.

## Qué incluye este primer corte (y qué NO)

Alcance acordado para este MVP: **Mi día, Comunicados con confirmación de
lectura, Generador de horarios con detección de conflictos, y Panel
administrativo.**

Quedó fuera de este corte (del prompt maestro original):
- Módulo de residencia/internado.
- Sistema de reuniones como entidad propia (con documentos, prioridad, etc.).
- Sistema de pendientes/tareas.
- Documentos (biblioteca institucional).
- Búsqueda global.
- Notificaciones push reales (hay notificaciones *en la app*, no push del
  sistema operativo — eso requiere un servicio adicional, ver más abajo).
- Drag-and-drop en el generador de horarios: se construye con formulario +
  verificación en vivo, no arrastrando bloques. Funcionalmente hace lo mismo
  (crea, verifica conflictos, bloquea), pero la interacción es más simple de
  lo pedido.
- Multi-institución real: el modelo de datos ya soporta varias instituciones
  (`institucion_id` en cada tabla), pero no hay pantalla de "crear nueva
  institución" ni selector — hoy corre con una sola institución sembrada.

Si alguno de estos es crítico para el piloto, dímelo y lo priorizamos en la
siguiente iteración — mejor eso que prometerlo todo y entregarlo a medias.

## Arquitectura

```
vinklo-app/
├── server/          Backend: Node.js + Express + SQLite (better-sqlite3)
│   ├── src/
│   │   ├── db.js            Conexión y esquema de la base de datos
│   │   ├── middleware/auth.js   JWT + control de acceso por rol (RBAC)
│   │   └── routes/          auth, usuarios, catalogos, horario, comunicados, dashboard
│   ├── scripts/seed.js      Datos de demostración
│   └── data/vinklo.db       Base de datos (se crea sola al arrancar)
└── client/          Frontend: React + Vite, PWA instalable
    └── src/
        ├── api.js                Cliente HTTP hacia el backend
        ├── context/AuthContext   Sesión del usuario
        ├── components/Layout     Barra superior + navegación por rol
        └── pages/                Login, MiDia, Comunicados, Horario, Admin
```

En producción, el mismo servidor Express sirve la API (`/api/*`) **y** el
frontend ya compilado — es un solo servicio, no dos.

Nota sobre la base de datos: originalmente iba a usar Prisma, pero sus
binarios se descargan de un dominio que este entorno de desarrollo tiene
bloqueado por seguridad. Se cambió a `better-sqlite3` (SQL real, sin
binarios externos). Si más adelante quieres migrar a PostgreSQL para
producción a mayor escala, es un cambio contenido a `server/src/db.js` y los
archivos de rutas — el resto de la aplicación no se entera.

## 1. Correrlo en tu computadora (antes de desplegar nada)

Necesitas Node.js 18 o superior instalado.

```bash
# Backend
cd server
cp .env.example .env
npm install
npm run seed        # crea la base de datos con datos de prueba
npm run dev          # http://localhost:4000

# Frontend (en otra terminal)
cd client
npm install
npm run dev          # http://localhost:5173 (con proxy hacia el backend)
```

Abre `http://localhost:5173` y entra con cualquiera de estos usuarios
(contraseña `vinklo123` para todos — created in `scripts/seed.js`):

| Rol | Email |
|---|---|
| Administrador | admin@vinklo.demo |
| Directivo | directivo@vinklo.demo |
| Docente | docente@vinklo.demo |
| Estudiante | estudiante@vinklo.demo |
| Familia | familia@vinklo.demo |

**Cambia estos usuarios y contraseñas antes de usarlo con datos reales de un
colegio.** Son solo para probar.

## 2. Desplegarlo para abrirlo desde tu celular

Esto es lo que convierte "corre en mi laptop" en "lo abro desde cualquier
lado". Dos caminos, según cuánto te importa que los datos no se borren:

### Opción A — Gratis, para probar hoy mismo (los datos se resetean)

Render ofrece un plan gratuito de servicios web, pero **su disco es
efímero**: cada vez que el servicio se reinicia, se "duerme" por
inactividad, o vuelves a desplegar, el archivo de SQLite se borra y
vuelve a los datos de la semilla. Sirve perfecto para que hoy mismo
instales el ícono en tu celular y muestres la demo, no para operar el
colegio con datos reales.

1. Sube esta carpeta a un repositorio de GitHub.
2. En [render.com](https://render.com), crea un **Web Service** nuevo
   apuntando a ese repo.
3. Configura:
   - **Build Command:** `cd client && npm install && npm run build && cd ../server && npm install`
   - **Start Command:** `cd server && npm run seed && npm start`
   - **Variables de entorno:** `JWT_SECRET` (cualquier texto largo aleatorio), `PORT` (Render lo define solo, no lo toques).

   El `npm run seed` en el Start Command es intencional **solo en esta
   opción gratuita**: como el disco se borra igual en cada reinicio, conviene
   regenerar los datos de prueba automáticamente en vez de arrancar con una
   base vacía. **No uses este mismo Start Command en la Opción B** — ahí
   volvería a borrar tus datos reales en cada reinicio (ver más abajo).
4. Despliega. Render te da una URL tipo `https://vinklo-xxxx.onrender.com`.
5. Ábrela desde tu celular → verás el prompt de "Agregar a pantalla de
   inicio" (o hazlo manualmente desde el menú del navegador). En laptop,
   Chrome/Edge mostrarán un ícono de instalación en la barra de direcciones.

### Opción B — Con datos persistentes de verdad (recomendado para uso real)

Para que la información no se borre, el servicio necesita un disco
persistente. Esto ya no es gratis en ninguna plataforma seria — cuenta con
unos **USD 5–7 al mes**:

- **Railway** (plan Hobby, ~USD 5/mes): soporta volúmenes persistentes.
  Monta un volumen en `/data`, y cambia `DATABASE_PATH` a `/data/vinklo.db`.
- **Render** (plan Starter, ~USD 7/mes): permite adjuntar un disco
  persistente al servicio; monta en `/data` igual que arriba.

El resto del proceso de despliegue es idéntico a la Opción A, con dos
diferencias importantes:
- **Start Command:** usa solo `cd server && npm start` (sin `npm run seed`
  — si lo incluyes, borrarás los datos reales cada vez que el servicio
  reinicie).
- **Primer arranque:** después del primer deploy, corre el seed **una sola
  vez** desde la terminal/shell que ofrece Railway o Render para ese
  servicio (`npm run seed`), ya con el volumen persistente montado. Después
  de eso, entra con `admin@vinklo.demo` y ve creando ahí los usuarios,
  grupos y horarios reales del colegio desde el Panel administrativo —
  reemplazando poco a poco a los usuarios de demostración.

Antes de comprometerte con un plan pagado, valida el prototipo con la
Opción A gratuita.

## 3. Instalarlo como app (PWA)

Una vez que la URL esté en línea (Opción A o B):

- **Android (Chrome):** abre la URL → menú (⋮) → "Instalar aplicación" o
  "Agregar a pantalla de inicio".
- **iPhone (Safari):** abre la URL → botón compartir → "Agregar a pantalla
  de inicio". (iOS no soporta el prompt automático de instalación de Chrome;
  este es el único camino en iPhone.)
- **Laptop (Chrome/Edge):** aparecerá un ícono de instalación (⊕ o similar)
  en la barra de direcciones → "Instalar Vinklo".

Una vez instalada, abre como cualquier otra app — sin barra del navegador.

## 4. Notificaciones push reales (no incluidas todavía)

Lo que existe hoy son notificaciones *dentro* de la app (comunicados no
leídos, alertas en "Mi día"). Para que el celular reciba una notificación
push aunque la app esté cerrada, se necesita:
- Integrar el Web Push API (con claves VAPID) en el backend, o
- Un servicio como Firebase Cloud Messaging.

No está en este MVP porque no era parte del alcance que definimos, pero es
una extensión natural de la Fase 2 si el piloto va bien.

## 5. Seguridad — qué revisar antes de usar con datos reales de menores

- Cambia `JWT_SECRET` por un valor propio, largo y aleatorio, en producción.
- Cambia las contraseñas de los usuarios de demostración (o elimínalos).
- Sirve la app solo por HTTPS (Render/Railway lo hacen automáticamente).
- Este MVP no incluye: registro de auditoría de acciones administrativas,
  política formal de retención de datos, ni cumplimiento normativo
  verificado — son pendientes reales antes de un uso institucional serio,
  no solo detalles menores.

## Próximo paso sugerido

No despliegues esto directamente como "el sistema del colegio". Úsalo
primero como demo con la Opción A gratuita, valida con 2–3 personas reales
del colegio (un directivo, un docente, un padre), y recién después decide
si pasa a la Opción B con datos reales.
