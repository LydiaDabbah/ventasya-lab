"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";

export default function CotizacionProductos({
  productos = [],
  isEditing = false,
  onUpdateQuantity = () => {},
  onUpdateNotaPersonalizable = () => {},
  onRemoveProduct = () => {},
  onOpenAddProductModal = () => {},
}) {
  const [noteDraftById, setNoteDraftById] = React.useState({});
  const [editingNoteId, setEditingNoteId] = React.useState(null);

  React.useEffect(() => {
    if (!isEditing) return;
    const next = {};
    (productos || []).forEach((item) => {
      next[`${item.id_producto}-${item.id_variante || "base"}`] = item.nota_personalizable ?? "";
    });
    setNoteDraftById(next);
  }, [isEditing, productos]);

  const openNoteEditor = (item) => {
    const id = `${item.id_producto}-${item.id_variante || "base"}`;
    setEditingNoteId(id);
    setNoteDraftById((prev) => ({
      ...prev,
      [id]: prev[id] ?? item.nota_personalizable ?? "",
    }));
  };

  const saveAndCloseNoteEditor = (item) => {
    const id = `${item.id_producto}-${item.id_variante || "base"}`;
    onUpdateNotaPersonalizable(item.id_producto, noteDraftById[id] ?? "", item.id_variante);
    setEditingNoteId(null);
  };

  const handleCantidadChange = (idProducto, idVariante, value) => {
    if (value === "") {
      onUpdateQuantity(idProducto, 1, idVariante);
      return;
    }

    if (!/^\d+$/.test(value)) return;

    const numericValue = Number(value);
    if (numericValue > 99) {
      onUpdateQuantity(idProducto, 99, idVariante);
      return;
    }

    if (numericValue < 1) {
      onUpdateQuantity(idProducto, 1, idVariante);
      return;
    }

    onUpdateQuantity(idProducto, numericValue, idVariante);
  };

  const handleCantidadBlur = (idProducto, idVariante, cantidadActual) => {
    if (cantidadActual === "" || Number(cantidadActual) < 1) {
      onUpdateQuantity(idProducto, 1, idVariante);
    }
  };

  return (
    <div>
      <div className="bg-white rounded-lg shadow">
        <div className="flex items-center justify-between p-6 pb-6">
          <h2 className="text-xl font-semibold ">Productos</h2>
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

        <div className="px-6 pb-6">
          <div className="space-y-4">
        {(productos || []).map((item) => {
          const hasNota = Boolean(item.nota_personalizable?.trim());
          const canHaveNota = item.personalizable === true || hasNota;

          return (
            <div
              key={`${item.id_producto}-${item.id_variante || "base"}`}
              className="flex gap-4 py-4 border-b first:pt-0 last:pb-0 last:border-0"
            >
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
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
              {item.nombre_variante && <p className="text-xs text-gray-500 mb-1">{item.nombre_variante}</p>}

              <p className="text-sm text-gray-600 mb-2">
                ${Number(item.precio_unitario || 0).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}{" "}
                c/u
              </p>

              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center mt-1">
                    <button
                      onClick={() => {
                        const cantidadActual = Number(item.cantidad || 0);
                        if (cantidadActual <= 1) {
                          onRemoveProduct(item.id_producto, item.id_variante);
                        } else {
                          onUpdateQuantity(item.id_producto, cantidadActual - 1, item.id_variante);
                        }
                      }}
                      className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                        Number(item.cantidad) === 1
                          ? "border border-gray-300 hover:bg-gray-100"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                      title={Number(item.cantidad) === 1 ? "Eliminar producto" : "Reducir cantidad"}
                    >
                      {Number(item.cantidad) === 1 ? (
                        <Trash2 className="w-4 h-4 text-red-500" />
                      ) : (
                        <span className="text-sm font-semibold">-</span>
                      )}
                    </button>

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

                    <button
                      onClick={() =>
                        onUpdateQuantity(
                          item.id_producto,
                          Math.min(99, Number(item.cantidad || 0) + 1),
                          item.id_variante
                        )
                      }
                      className="w-7 h-7 flex items-center justify-center rounded bg-black text-white hover:bg-gray-800 transition-colors"
                      title="Aumentar cantidad"
                    >
                      <span className="text-sm font-semibold">+</span>
                    </button>
                  </div>

                  {canHaveNota && (
                    <div>
                      {editingNoteId === `${item.id_producto}-${item.id_variante || "base"}` ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={noteDraftById[`${item.id_producto}-${item.id_variante || "base"}`] ?? ""}
                            onChange={(e) =>
                              setNoteDraftById((prev) => ({
                                ...prev,
                                [`${item.id_producto}-${item.id_variante || "base"}`]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                saveAndCloseNoteEditor(item);
                              }
                            }}
                            placeholder="Ej: color azul"
                            className="flex-1 px-2.5 py-1.5 text-sm border border-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-gray-200 focus:border-gray-200"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => saveAndCloseNoteEditor(item)}
                            className="px-3 py-1.5 text-xs font-medium bg-black text-white rounded hover:bg-gray-800"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {hasNota ? (
                            <span className="text-sm text-gray-500 truncate">
                              Nota: {item.nota_personalizable}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">Sin nota</span>
                          )}
                          <button
                            type="button"
                            onClick={() => openNoteEditor(item)}
                            className="text-sm text-gray-700 hover:text-black underline underline-offset-2"
                          >
                            Editar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-gray-600">Cantidad:</span>{" "}
                    <span className="font-medium">{item.cantidad}</span>
                  </p>
                  {hasNota ? (
                    <p className="text-sm text-gray-500 break-words">
                      Nota: {item.nota_personalizable}
                    </p>
                  ) : (
                    <p className="text-sm invisible select-none">Nota: —</p>
                  )}
                </div>
              )}
            </div>

            <div className="text-right flex flex-col justify-start items-end">
              <div className="font-semibold text-lg sm:text-base leading-none text-gray-900 mt-0.5 sm:mt-0">
                ${Number(item.subtotal || 0).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
            </div>
          );
        })}
          </div>
        </div>
      </div>
    </div>
  );
}
