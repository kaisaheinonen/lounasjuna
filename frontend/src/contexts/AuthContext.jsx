import { createContext, useContext, useState, useEffect } from "react";

const API_BASE = "http://localhost:3001/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("lounasjuna_token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((u) => setUser(u))
      .catch(() => localStorage.removeItem("lounasjuna_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem("lounasjuna_token", data.token);
    setUser(data.user);
  };

  const register = async (username, password, displayName) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, displayName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem("lounasjuna_token", data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("lounasjuna_token");
    setUser(null);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("lounasjuna_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, getAuthHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
