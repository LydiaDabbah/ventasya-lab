"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchFromApi } from "@/utils/api";

const VendedorContext = createContext();

export const VendedorProvider = ({ children }) => {
  const { clave } = useParams();
  const [idVendedor, setIdVendedor] = useState(null);
  const [vendedor, setVendedor] = useState(null);
  const [vendedorNotFound, setVendedorNotFound] = useState(false);
  const [validated, setValidated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchVendedor = async () => {
      try {
        const data = await fetchFromApi(`/vendedores/clave/${clave}`);
        if (!data?.id_vendedor) {
          console.error("❌ Vendedor no encontrado");
          setVendedorNotFound(true);
          return;
        }
        setIdVendedor(data.id_vendedor);
        setVendedor(data);            // 👈 guardas todo el objeto
      } catch (error) {
        console.error("❌ Error al obtener vendedor:", error);
        setVendedorNotFound(true);
      } finally {
        setValidated(true);
      }
    };

    if (clave) fetchVendedor();
  }, [clave]);

  if (!validated) return null;
  if (vendedorNotFound) {
    router.replace("/404");
    return null;
  }

  return (
    <VendedorContext.Provider value={{ idVendedor, vendedor, clave, }}>
      {children}
    </VendedorContext.Provider>
  );
};

export const useVendedor = () => useContext(VendedorContext);
