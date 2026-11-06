"use client";

import { useCart } from "@/context/CartContext";
import { useVendedor } from "@/context/VendedorContext";
import { X, Plus, Minus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function CartSheet({ isOpen, onClose }) {
  const {
    items,
    updateQuantity,
    totalAmount,
    totalItems,
  } = useCart();
  const { clave } = useVendedor();
  const router = useRouter();

  if (!isOpen) return null;

  const handleIrACotizacion = () => {
    onClose();
    if (!clave) {
      router.push("/");
      return;
    }
    router.push(`/${clave}/cotizacion`);
  };

  const handleCantidadChange = (idProducto, idVariante, value) => {
    if (value === "") {
      updateQuantity(idProducto, "", idVariante);
      return;
    }

    if (!/^\d+$/.test(value)) return;

    const numericValue = Number(value);

    if (numericValue > 99) {
      updateQuantity(idProducto, 99, idVariante);
      return;
    }

    updateQuantity(idProducto, numericValue, idVariante);
  };

  const handleCantidadBlur = (idProducto, idVariante, cantidadActual) => {
    if (cantidadActual === "" || Number(cantidadActual) < 1) {
      updateQuantity(idProducto, 1, idVariante);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">
            Cotización ({totalItems} {totalItems === 1 ? "producto" : "productos"})
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-lg">Tu carrito está vacío</p>
              <p className="text-sm mt-2">Agrega productos para comenzar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                return (
                  <div key={item.cart_key || `${item.id_producto}-${item.id_variante || "base"}`} className="flex gap-3 border-b pb-4">
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <Image
                        src={item.imagen_url || "/placeholder.svg"}
                        alt={item.nombre_producto}
                        fill
                        className="object-cover rounded"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-sm truncate">{item.nombre_producto}</h3>
                      </div>

                      {item.nombre_variante && <p className="text-xs text-gray-500 mt-0.5">{item.nombre_variante}</p>}

                      <p className="text-sm text-gray-600 mt-1">
                        $
                        {Number(item.precio_unitario || 0).toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </p>

                      <div className="flex items-center mt-2">
                        {/* BOTÓN - o BASURA */}
                        <button
                          onClick={() =>
                            updateQuantity(item.id_producto, Number(item.cantidad || 0) - 1, item.id_variante)
                          }
                          className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                            Number(item.cantidad) === 1
                              ? "border border-gray-300 hover:bg-gray-100"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                          }`}
                        >
                          {Number(item.cantidad) === 1 ? (
                            <Trash2 className="w-4 h-4 text-red-500" />
                          ) : (
                            <Minus className="w-4 h-4" />
                          )}
                        </button>

                        {/* INPUT SIN BORDE */}
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={item.cantidad}
                          onChange={(e) =>
                            handleCantidadChange(item.id_producto, item.id_variante, e.target.value)
                          }
                          onBlur={() =>
                            handleCantidadBlur(item.id_producto, item.id_variante, item.cantidad)
                          }
                          className="w-10 text-center text-sm font-semibold text-black bg-transparent border-none outline-none"
                        />

                        {/* BOTÓN + */}
                        <button
                          onClick={() =>
                            updateQuantity(item.id_producto, Number(item.cantidad || 0) + 1, item.id_variante)
                          }
                          className="w-7 h-7 flex items-center justify-center rounded bg-black text-white hover:bg-gray-800 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold">
                        $
                        {Number(item.subtotal || 0).toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Subtotal:</span>
              <span>
                ${Number(totalAmount || 0).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>

            <button
              onClick={handleIrACotizacion}
              className="w-full bg-black text-white py-3 rounded hover:bg-gray-800 transition-colors"
            >
              Continuar a cotización
            </button>
          </div>
        )}
      </div>
    </>
  );
}
