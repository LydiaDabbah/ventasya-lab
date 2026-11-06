"use client";
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [vendedor, setVendedor] = useState(null);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchVendedor = async () => {
      try {
        const res = await fetch(`${API}/vendedores/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setVendedor(data);
        } else {
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          window.location.href = "/login";
        }
      } catch (error) {
        console.error("No se pudo validar la sesión:", error);
      }
      setLoading(false);
    };

    fetchVendedor();
  }, [API]);

  const logout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    setVendedor(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ vendedor, setVendedor, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
