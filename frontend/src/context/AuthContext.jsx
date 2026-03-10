/* "use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [vendedor, setVendedor] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchVendedor = async () => {
      try {
        const res = await fetch("http://localhost:8000/vendedores/protegida", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setVendedor(data);
        } else {
          console.log("Token inválido, redireccionando a login");
          localStorage.removeItem("token");
          router.push("/login");
        }
      } catch (error) {
        console.error("Error en fetch vendedor:", error);
      }
      setLoading(false);
    };

    fetchVendedor();
  }, [router]);

  const logout = () => {
    localStorage.removeItem("token");
    setVendedor(null);
    router.push("/login");
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

 */