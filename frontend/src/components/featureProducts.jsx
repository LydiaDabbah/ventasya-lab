"use client";
import { useRouter } from "next/navigation"; // arriba del todo


import { useState, useRef, useEffect } from "react";
import { useProductos } from "@/context/ProductosContext"; // Ajusta el path si es distinto
import { usePaginaPrincipal } from "@/context/PaginaPrincipalContext";
import CardProducto from "./cardProducto";
import { useVendedor } from "@/context/VendedorContext";

export default function FeaturedProducts() {
  const { productos } = useProductos(); // Todos los productos del vendedor
  const { productosPopulares } = usePaginaPrincipal(); // IDs populares
  const { clave } = useVendedor();
  const router = useRouter();

  // Filtrar productos populares
  const productosFiltrados = productos.filter((p) =>
    productosPopulares.includes(p.id_producto)
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef(null);

  // Responsive products to show
  const getProductsToShow = () => {
    if (typeof window !== "undefined") {
      if (window.innerWidth >= 1280) return 4;
      if (window.innerWidth >= 1024) return 3;
      if (window.innerWidth >= 640) return 2;
      return 1;
    }
    return 4;
  };

  const [productsToShow, setProductsToShow] = useState(getProductsToShow);
  const maxIndex = Math.max(0, productosFiltrados.length - productsToShow);

  useEffect(() => {
    const handleResize = () => {
      const newCount = getProductsToShow();
      setProductsToShow(newCount);
      const newMaxIndex = Math.max(0, productosFiltrados.length - newCount);
      if (currentIndex > newMaxIndex) {
        setCurrentIndex(newMaxIndex);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentIndex, productosFiltrados.length]);

  const nextProduct = () => setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
  const prevProduct = () => setCurrentIndex((prev) => Math.max(prev - 1, 0));

  const translatePercentage = (currentIndex / productosFiltrados.length) * 100;

  if (productosFiltrados.length === 0) return null;

  return (
    <section className="bg-white py-16">
      <div className="px-6 md:px-12 lg:px-8">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-black">Productos Populares</h2>
        </div>

        <div className="relative">
          <button
            onClick={prevProduct}
            className={`absolute left-0 top-1/3 -translate-y-1/2 z-10 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition ${
              currentIndex === 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={currentIndex === 0}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={nextProduct}
            className={`absolute right-0 top-1/3 -translate-y-1/2 z-10 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition ${
              currentIndex >= maxIndex ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={currentIndex >= maxIndex}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div ref={carouselRef} className="overflow-hidden mx-16">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{
                transform: `translateX(-${translatePercentage}%)`,
                width: `${(productosFiltrados.length / productsToShow) * 100}%`,
              }}
            >
              {productosFiltrados.map((producto) => (
                <div
                  key={producto.id_producto}
                  className="flex-shrink-0 px-3"
                  style={{ width: `${100 / productosFiltrados.length}%` }}
                >
                  <CardProducto producto={producto} variant="featured" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <button   onClick={() => router.push(`/${clave}/productos`)} className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition">
            Ver todos los productos
          </button>
        </div>
      </div>
    </section>
  );
}
