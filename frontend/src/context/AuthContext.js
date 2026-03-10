"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [vendedor, setVendedor] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    // Decodifica el token para obtener la clave
    const payload = JSON.parse(atob(token.split('.')[1]));
    const clave = payload.clave;

    const fetchVendedor = async () => {
      try {
        const res = await fetch(`http://localhost:8000/vendedores/clave/${clave}`);
        if (res.ok) {
          const data = await res.json();
          setVendedor(data);
        } else {
          console.log("Token inválido o vendedor no encontrado, redirigiendo a login");
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          window.location.href = "/login";
        }
      } catch (error) {
        console.error("Error en fetch vendedor:", error);
      }
      setLoading(false);
    };

    fetchVendedor();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    setVendedor(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ vendedor, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
