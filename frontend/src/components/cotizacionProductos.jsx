"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";

export default function CotizacionProductos({
  productos = [],
  isEditing = false,
  onUpdateQuantity = () => {},
  onRemoveProduct = () => {},
  onOpenAddProductModal = () => {},
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Productos</h2>
        {isEditing && (
          <button
            onClick={onOpenAddProductModal}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-black text-white rounded hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar producto
          </button>
        )}
      </div>

      <div className="space-y-4">
        {(productos || []).map((item) => (
          <div
            key={String(item.id_producto)}
            className="flex gap-4 pb-4 border-b last:border-0"
          >
            <div className="relative w-20 h-20 flex-shrink-0">
              <img
                src={item.imagen_url || "/placeholder.svg"}
                alt={item.nombre_producto || "Producto"}
                className="w-full h-full object-cover rounded"
                loading="lazy"
                onError={(e) => {
                  try {
                    const cur = e.currentTarget;
                    if (!cur) return;
                    const curSrc = cur.getAttribute("src") || "";
                    if (curSrc.includes("/placeholder.svg")) {
                      cur.onerror = null;
                      return;
                    }
                    cur.src = "/placeholder.svg";
                    cur.onerror = null;
                  } catch {}
                }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 mb-1">
                {item.nombre_producto}
              </h3>

              <p className="text-sm text-gray-600 mb-2">
                ${Number(item.precio_unitario || 0).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}{" "}
                c/u
              </p>

              {isEditing ? (
                <div className="flex items-center gap-2 text-sm">
                  <label className="text-gray-600">Cantidad:</label>
                  <input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(e) =>
                      onUpdateQuantity(
                        item.id_producto,
                        parseInt(e.target.value || "1", 10)
                      )
                    }
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center font-medium focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              ) : (
                <p className="text-sm">
                  <span className="text-gray-600">Cantidad:</span>{" "}
                  <span className="font-medium">{item.cantidad}</span>
                </p>
              )}
            </div>

            <div className="text-right flex flex-col justify-between items-end">
              <div className="font-semibold text-gray-900">
                ${Number(item.subtotal || 0).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </div>

              {isEditing && (
                <button
                  onClick={() => onRemoveProduct(item.id_producto)}
                  className="text-red-500 hover:text-red-700 transition-colors text-sm flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}