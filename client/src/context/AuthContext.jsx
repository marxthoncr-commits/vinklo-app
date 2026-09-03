import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, saveToken, clearToken, getToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [institucion, setInstitucion] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargarSesion = useCallback(async () => {
    if (!getToken()) {
      setCargando(false);
      return;
    }
    try {
      const data = await api.me();
      setUsuario(data.usuario);
      setInstitucion(data.institucion);
    } catch {
      clearToken();
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarSesion();
  }, [cargarSesion]);

  async function login(email, password) {
    const data = await api.login(email, password);
    saveToken(data.token);
    setUsuario({ ...data.usuario, rol: data.usuario.rol });
    await cargarSesion();
  }

  function logout() {
    clearToken();
    setUsuario(null);
    setInstitucion(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, institucion, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
