"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useVendedor } from "./VendedorContext";
import { fetchFromApi } from "@/utils/api";

const PaginaPrincipalContext = createContext();

export const PaginaPrincipalProvider = ({ children }) => {
  const { idVendedor } = useVendedor();
  const [datosVisuales, setDatosVisuales] = useState({});
  const [productosPopulares, setProductosPopulares] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);

  console.log(idVendedor)
  useEffect(() => {
    if (!idVendedor) return;


    const fetchTodo = async () => {
      try {
        const [visuales, populares, cats] = await Promise.all([
        fetchFromApi(`/vendedor-datos/por-vendedor/${idVendedor}`),
          fetchFromApi(`/producto-categoria-sistema/por-vendedor/${idVendedor}`),
          fetchFromApi(`/categorias/por-vendedor/${idVendedor}`),
        ]);

        const visualesMap = {};
        visuales.forEach((item) => {
          visualesMap[item.clave] = item.valor;
        });

        const filtradosPopulares = populares.filter(
          (item) => item.categoria === "populares"
        );

        setDatosVisuales(visualesMap);
        setProductosPopulares(filtradosPopulares.map((p) => p.id_producto));
        setCategorias(cats);
        console.log(datosVisuales)
      } catch (err) {
        console.error("❌ Error al cargar datos de PaginaPrincipal:", err);
      } finally {
        setCargando(false);
      }
    };

    fetchTodo();
  }, [idVendedor]);

  return (
    <PaginaPrincipalContext.Provider
      value={{ datosVisuales, productosPopulares, categorias, cargando }}
    >
      {children}
    </PaginaPrincipalContext.Provider>
  );
};

export const usePaginaPrincipal = () => useContext(PaginaPrincipalContext);
