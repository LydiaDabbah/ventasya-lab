"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useVendedor } from "@/context/VendedorContext";
import { useCart } from "@/context/CartContext";

/**
 * CardProducto
 * - Normaliza id_producto a string siempre.
 * - Envía precio como Number(producto.precio) o 0.
 * - Usa getItemQuantity(producto.id_producto) (asegúrate de que getItemQuantity dependa de `items` en el CartContext).
 */
export default function CardProducto({ producto, variant = "cart" }) {
  const router = useRouter();
  const { clave } = useVendedor();
  const { addItem, updateQuantity, getItemQuantity } = useCart();

  // Normalizar id como string (evita diferencias entre UUID objects / strings)
  const idProd = producto?.id_producto ? String(producto.id_producto) : "";

  // Obtener cantidad desde el contexto (asegúrate que getItemQuantity lea `items` para forzar re-render)
  const cantidadEnCarrito = Number(getItemQuantity(idProd) || 0);

  // Formateador de precio
  const formatearPrecio = (precio) =>
    Number(precio || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Handler: agregar (normaliza y envía precio)
  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (!idProd) return;
    console.log("🧪 producto:", producto?.nombre, "personalizable:", producto?.personalizable);
    addItem({
      id_producto: idProd,
      nombre: producto?.nombre ?? producto?.nombre_producto ?? "",
      precio: Number(producto?.precio ?? producto?.precio_unitario ?? 0),
      imagen_url: producto?.imagen_url ?? null,
      personalizable: typeof producto?.personalizable === "boolean" ? producto.personalizable : false,
    });
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    if (!idProd) return;
    updateQuantity(idProd, Number(cantidadEnCarrito || 0) + 1);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (!idProd) return;
    updateQuantity(idProd, Number(cantidadEnCarrito || 0) - 1);
  };

  return (
    <div
      onClick={() => {
        if (clave && producto?.slug) {
          router.push(`/${clave}/productos/${producto.slug}`, { scroll: true });
        }
      }}
      className="group cursor-pointer"
    >
      {/* Imagen del producto */}
      <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4">
        <Image
          src={producto?.imagen_url || "/placeholder.svg?height=400&width=400"}
          alt={producto?.nombre ?? "Producto"}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badge si es popular */}
        {variant === "featured" && producto?.popular && (
          <div className="absolute top-4 left-4">
            <span className="bg-black text-white text-xs font-medium px-3 py-1 rounded-full">
              Popular
            </span>
          </div>
        )}
      </div>

      {/* Información */}
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-black leading-tight group-hover:text-gray-700 transition-colors">
          {producto?.nombre}
        </h3>

        <p className="text-md text-gray-500 font-normal">
          {formatearPrecio(producto?.precio ?? producto?.precio_unitario ?? 0)}
        </p>

        {/* Botón / controles de carrito */}
        {cantidadEnCarrito === 0 ? (
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex items-center space-x-1 text-sm text-gray-500 hover:text-black transition-colors group/button pt-1"
          >
            <span>{variant === "featured" ? "Ver detalles" : "Agregar al carrito"}</span>
            <svg
              className="w-3 h-3 group-hover/button:translate-x-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleDecrement}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>

            <span className="text-sm font-semibold text-black min-w-[20px] text-center">
              {cantidadEnCarrito}
            </span>

            <button
              type="button"
              onClick={handleIncrement}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-black hover:bg-gray-800 text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
