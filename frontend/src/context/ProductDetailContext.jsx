"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { fetchFromApi } from "@/utils/api";
import { useProductos } from "./ProductosContext";

const ProductDetailContext = createContext(null);

export const ProductDetailProvider = ({ slug, children }) => {
  const { productos } = useProductos();

  const [producto, setProducto] = useState(null);
  const [imagenesAdicionales, setImagenesAdicionales] = useState([]);
  const [datosAdicionales, setDatosAdicionales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // ✅ siempre resetea al cambiar slug/productos
    setLoading(true);
    setProducto(null);
    setImagenesAdicionales([]);
    setDatosAdicionales([]);

    if (!slug || (productos || []).length === 0) {
      setLoading(false);
      return;
    }

    const prod = (productos || []).find((p) => p.slug === slug);

    if (!prod) {
      setLoading(false);
      return;
    }

    // ✅ set producto local
    setProducto({
      ...prod,
      personalizable: typeof prod?.personalizable === "boolean" ? prod.personalizable : false,
    });

    const fetchAll = async () => {
      try {
        const [imgs, datos] = await Promise.all([
          fetchFromApi(`/imagenes/por-producto/${prod.id_producto}`),
          fetchFromApi(`/producto-datos-adicionales/por-producto/${prod.id_producto}`),
        ]);

        if (cancelled) return;

        setImagenesAdicionales(imgs || []);
        setDatosAdicionales(datos || []);
      } catch (err) {
        if (!cancelled) console.error("❌ Error cargando ProductDetailContext:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [slug, productos]);

  return (
    <ProductDetailContext.Provider value={{ producto, imagenesAdicionales, datosAdicionales, loading }}>
      {children}
    </ProductDetailContext.Provider>
  );
};

export const useProductDetail = () => {
  const ctx = useContext(ProductDetailContext);
  if (!ctx) throw new Error("useProductDetail debe usarse dentro de ProductDetailProvider");
  return ctx;
};