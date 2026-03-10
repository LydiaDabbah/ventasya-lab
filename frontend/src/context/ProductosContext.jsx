"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useVendedor } from "./VendedorContext";
import { fetchFromApi } from "@/utils/api";

const ProductosContext = createContext();

export const ProductosProvider = ({ children }) => {
  const { idVendedor } = useVendedor();

  const [productos, setProductos] = useState([]);
  const [productoCategorias, setProductoCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarProductos = useCallback(
    async (signal) => {
      if (!idVendedor) return;

      setLoading(true);

      try {
        const [productosRes, relacionesRes] = await Promise.all([
          fetchFromApi(`/productos?id_vendedor=${idVendedor}`, { signal }),
          fetchFromApi(`/producto-categorias/por-vendedor/${idVendedor}`, { signal }),
        ]);

        const activos = (productosRes || []).filter((p) => {
          if (typeof p.activo === "boolean") return p.activo === true;
          return true;
        });

        const normalized = (activos || []).map((p) => ({
          ...p,
          personalizable: typeof p?.personalizable === "boolean" ? p.personalizable : false,
        }));

        setProductos(normalized);
        setProductoCategorias(relacionesRes || []);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("❌ Error al cargar productos o relaciones:", error);
        }
      } finally {
        setLoading(false);
      }
    },
    [idVendedor]
  );
  


  useEffect(() => {
    if (!idVendedor) {
      setProductos([]);
      setProductoCategorias([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    cargarProductos(controller.signal);

    return () => controller.abort();
  }, [idVendedor, cargarProductos]);

  const reloadProductos = async () => {
    const controller = new AbortController();
    await cargarProductos(controller.signal);
  };

  return (
    <ProductosContext.Provider
      value={{
        productos,
        productoCategorias,
        loading,
        reloadProductos,
      }}
    >
      {children}
    </ProductosContext.Provider>
  );
};

export const useProductos = () => {
  const ctx = useContext(ProductosContext);
  if (!ctx) throw new Error("useProductos debe usarse dentro de ProductosProvider");
  return ctx;
};