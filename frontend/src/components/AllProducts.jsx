"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useProductos } from "@/context/ProductosContext";
import { usePaginaPrincipal } from "@/context/PaginaPrincipalContext";
import CardProducto from "./cardProducto";

export default function AllProducts({ onSelectProduct }) {
  const { productos, productoCategorias } = useProductos();
  const { categorias, datosVisuales } = usePaginaPrincipal();

  const [categoriaActiva, setCategoriaActiva] = useState("todos");

  // Dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectCategoria = (id) => {
    setCategoriaActiva(id);
    setDropdownOpen(false);
  };

  const categoriasOrdenadas = useMemo(() => {
    const collator = new Intl.Collator("es-MX", {
      sensitivity: "base",
      numeric: true,
    });
    return [...(categorias || [])].sort((a, b) =>
      collator.compare(String(a?.nombre || ""), String(b?.nombre || ""))
    );
  }, [categorias]);

  const categoriaNombre = useMemo(() => {
    if (categoriaActiva === "todos") return "Todas";
    const found = categoriasOrdenadas.find(
      (c) => String(c.id_categoria) === String(categoriaActiva)
    );
    return found?.nombre || "Categoría";
  }, [categoriaActiva, categoriasOrdenadas]);

  const productosFiltrados = useMemo(() => {
    if (categoriaActiva === "todos") return productos || [];
    return (productos || []).filter((prod) =>
      (productoCategorias || []).some(
        (rel) => rel.id_producto === prod.id_producto && rel.id_categoria === categoriaActiva
      )
    );
  }, [productos, productoCategorias, categoriaActiva]);

  const totalProductos = (productos || []).length;
  const mostrados = (productosFiltrados || []).length;
  const tituloAllProducts = String(datosVisuales?.titulo || "").trim() || "Nuestra colección";
  const subtituloAllProducts =
    String(datosVisuales?.subtitulo || "").trim() ||
    "Descubre nuestros productos, seleccionados con cuidado para ti.";

  return (
    <section className="bg-white py-12 lg:py-16">
      <div className="mx-4 md:mx-auto md:max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 sm:px-6 md:px-10 lg:px-8 xl:px-8">
        {/* Título separado (más arriba) */}
        <div className="mb-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-black pb-2">
            {onSelectProduct ? "Elige productos para tu cotización" : tituloAllProducts}
          </h2>
          <p className=" text-sm md:text-base  text-gray-600">
            {onSelectProduct ? "" : subtituloAllProducts}
          </p>
        </div>

        {/* Controles pegados a la grid */}
        <div className="mb-4 flex items-center justify-between gap-3">
          {/* Izquierda: dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm sm:text-base text-black font-medium hover:underline underline-offset-4"
            >
              <span className="text-gray-500 font-normal">Categoría:</span>
              <span className="font-semibold">{categoriaNombre}</span>
              <svg
                className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 max-h-80 overflow-auto">
                <button
                  type="button"
                  onClick={() => handleSelectCategoria("todos")}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    categoriaActiva === "todos"
                      ? "bg-black text-white"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Todas
                </button>

                {categoriasOrdenadas.map((cat) => (
                  <button
                    key={cat.id_categoria}
                    type="button"
                    onClick={() => handleSelectCategoria(cat.id_categoria)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      categoriaActiva === cat.id_categoria
                        ? "bg-black text-white"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Derecha: contador */}
          <div className="text-xs sm:text-sm text-gray-500">
            Mostrando <span className="text-gray-700 font-medium">{mostrados}</span> de{" "}
            <span className="text-gray-700 font-medium">{totalProductos}</span>
          </div>
        </div>

        {/* Grid */}
        {/* Grid o Estado vacío */}
{mostrados === 0 ? (
  <div className="py-20 flex flex-col items-center justify-center text-center">
    <div className="max-w-md">
      <h3 className="text-lg font-semibold text-black mb-2">
        No hay productos en esta categoría
      </h3>

      <p className="text-sm text-gray-500 mb-6">
        Intenta seleccionar otra categoría o vuelve a ver todos los productos.
      </p>

      <button
        onClick={() => handleSelectCategoria("todos")}
        className="text-sm font-medium text-black underline underline-offset-4 hover:opacity-70 transition-opacity"
      >
        Ver todos los productos
      </button>
    </div>
  </div>
) : (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
    {(productosFiltrados || []).map((producto, index) => (
      <div
        key={producto.id_producto}
        className="opacity-0 animate-fade-in"
        style={{
          animationDelay: `${index * 100}ms`,
          animationFillMode: "forwards",
        }}
      >
        {onSelectProduct ? (
          <button
            type="button"
            onClick={() => onSelectProduct(producto)}
            className="w-full text-left border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow bg-white"
          >
            <div className="aspect-square w-full bg-gray-100 relative overflow-hidden">
              <img
                src={producto.imagen_url || "/placeholder.svg"}
                alt={producto.nombre || "Producto"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>

            <div className="p-3">
              <h3 className="font-medium text-sm line-clamp-2 mb-1">
                {producto.nombre}
              </h3>
              <p className="text-xs text-gray-500 mb-2">
                ${Number(producto.precio || 0).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </p>
              <span className="inline-flex text-xs px-2 py-1 rounded-full border border-gray-300">
                Agregar a cotización
              </span>
            </div>
          </button>
        ) : (
          <CardProducto producto={producto} />
        )}
      </div>
    ))}
  </div>
)}
      </div>
    </section>
  );
}
