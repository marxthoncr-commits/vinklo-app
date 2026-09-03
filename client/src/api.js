const BASE = "/api";

function getToken() {
  return localStorage.getItem("vinklo_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    const err = new Error(data?.error || `Error ${res.status}`);
    err.status = res.status;
    err.conflictos = data?.conflictos;
    throw err;
  }
  return data;
}

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  me: () => request("/auth/me"),

  miDia: () => request("/mi-dia"),

  comunicados: {
    listar: () => request("/comunicados"),
    crear: (payload) => request("/comunicados", { method: "POST", body: payload }),
    marcarLeido: (id) => request(`/comunicados/${id}/leer`, { method: "POST" }),
    lecturas: (id) => request(`/comunicados/${id}/lecturas`),
  },

  horario: {
    grid: () => request("/horario"),
    mio: () => request("/horario/mio"),
    verificar: (payload) => request("/horario/verificar", { method: "POST", body: payload }),
    crear: (payload) => request("/horario", { method: "POST", body: payload }),
    eliminar: (id) => request(`/horario/${id}`, { method: "DELETE" }),
  },

  catalogos: {
    grupos: () => request("/catalogos/grupos"),
    crearGrupo: (nombre) => request("/catalogos/grupos", { method: "POST", body: { nombre } }),
    eliminarGrupo: (id) => request(`/catalogos/grupos/${id}`, { method: "DELETE" }),

    aulas: () => request("/catalogos/aulas"),
    crearAula: (nombre) => request("/catalogos/aulas", { method: "POST", body: { nombre } }),
    eliminarAula: (id) => request(`/catalogos/aulas/${id}`, { method: "DELETE" }),

    bloques: () => request("/catalogos/bloques"),
    crearBloque: (payload) => request("/catalogos/bloques", { method: "POST", body: payload }),
    eliminarBloque: (id) => request(`/catalogos/bloques/${id}`, { method: "DELETE" }),
  },

  usuarios: {
    listar: () => request("/usuarios"),
    crear: (payload) => request("/usuarios", { method: "POST", body: payload }),
    actualizar: (id, payload) => request(`/usuarios/${id}`, { method: "PATCH", body: payload }),
    desactivar: (id) => request(`/usuarios/${id}`, { method: "DELETE" }),
  },
};

export function saveToken(token) {
  localStorage.setItem("vinklo_token", token);
}
export function clearToken() {
  localStorage.removeItem("vinklo_token");
}
export { getToken };
