"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Download,
  Edit2,
  Save,
  X,
  Pencil,
} from "lucide-react";
import { generarPDFCotizacion } from "@/utils/generarPDFCotizacion";
import CotizacionProductos from "@/components/CotizacionProductos";
import SelectorProductosCotizacion from "@/components/SelectorProductosCotizacion";
import ModalSimple from "@/components/UI/modalSimple";
import { useVendedor } from "@/context/VendedorContext";
import { useCotizacion } from "@/context/CotizacionContext";
import { useAuth } from "@/context/AuthContext";
import DiscountCode from "@/components/DiscountCode";
import { getCodigoById } from "@/utils/getCodigoById";
import { useVolverAlCatalogo } from "@/hooks/useVolverAlCatalogo";

export default function ResumenCotizacionInner() {
  const router = useRouter();
  const { vendedor, clave } = useVendedor();
  const { vendedor: vendedorAuth, loading: authLoading } = useAuth();

  const {
    cotizacion,
    setCotizacion,
    loading,
    saving,
    error,
    subtotal,
    totalCalculado,
    updateCantidad,
    eliminarProducto,
    agregarProducto,
    saveCotizacion,
    numeroCotizacion,
    isEditable,
  } = useCotizacion();

  const [isEditing, setIsEditing] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [modalInfo, setModalInfo] = useState(null);

  const [editCliente, setEditCliente] = useState(false);
  const nombreInputRef = useRef(null);

  const [codigoDescuento, setCodigoDescuento] = useState("");
  const [descuentoAplicado, setDescuentoAplicado] = useState(null);
  const [errorDescuento, setErrorDescuento] = useState("");

  const [envio, setEnvio] = useState({
    modo: "por_definir",
    monto: 0,
  });

  const { volverAlCatalogo } = useVolverAlCatalogo();

  const eqStr = (a, b) => (a ?? "") === (b ?? "");
  const eqNum = (a, b) => Number(a || 0) === Number(b || 0);

  const descuentoObjEqual = (a, b) => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return (
      eqStr(a.id, b.id) &&
      eqStr(a.codigo, b.codigo) &&
      eqStr(a.tipo, b.tipo) &&
      eqNum(a.valor, b.valor) &&
      eqNum(a.monto, b.monto)
    );
  };

  const isVendedor = useMemo(() => {
    const authId = vendedorAuth?.id_vendedor
      ? String(vendedorAuth.id_vendedor)
      : null;

    const rutaId = vendedor?.id_vendedor
      ? String(vendedor.id_vendedor)
      : null;

    if (!authId || !rutaId) return false;
    return authId === rutaId;
  }, [vendedorAuth?.id_vendedor, vendedor?.id_vendedor]);

  const getEnvioDisplay = (envioState) => {
    if (envioState?.modo === "monto_fijo") {
      return `$${Number(envioState.monto || 0).toLocaleString("es-MX", {
        minimumFractionDigits: 2,
      })}`;
    }
    if (envioState?.modo === "incluido") return "Incluido";
    return "Por definir";
  };

  const getEnvioPreviewText = (envioState) => {
    if (envioState?.modo === "monto_fijo") {
      return `Monto: $${Number(envioState.monto || 0).toLocaleString("es-MX", {
        minimumFractionDigits: 2,
      })}`;
    }
    if (envioState?.modo === "incluido") {
      return "incluido en el precio";
    }
    return "por definir según dirección";
  };

  const normalizeEnvioFromCotizacion = (cot) => {
    const descripcion = String(cot?.descripcion_envio || "")
      .trim()
      .toLowerCase();

    const costoEnvio = Number(cot?.costo_envio ?? 0);

    let modo = "por_definir";

    if (
      descripcion === "por_definir" ||
      descripcion === "incluido" ||
      descripcion === "monto_fijo"
    ) {
      modo = descripcion;
    } else if (costoEnvio > 0) {
      modo = "monto_fijo";
    }

    return {
      modo,
      monto: modo === "monto_fijo" ? costoEnvio : 0,
    };
  };

  useEffect(() => {
    if (!cotizacion) {
      if (
        codigoDescuento !== "" ||
        descuentoAplicado !== null ||
        errorDescuento !== ""
      ) {
        setCodigoDescuento("");
        setDescuentoAplicado(null);
        setErrorDescuento("");
      }
      return;
    }

    const id = cotizacion.id_codigo_descuento ?? null;
    const monto = Number(cotizacion.descuento_aplicado ?? 0);
    const codigoFromCot = cotizacion.codigo_descuento ?? cotizacion.codigo ?? "";

    const desired = id
      ? {
          id,
          codigo: codigoFromCot || "",
          tipo: cotizacion.tipo_codigo ?? "fijo",
          valor: Number(cotizacion.valor_codigo ?? monto ?? 0),
          monto,
          descripcion: cotizacion.descripcion_codigo ?? null,
        }
      : null;

    if (!descuentoObjEqual(desired, descuentoAplicado)) {
      if (id && !codigoFromCot) {
        (async () => {
          try {
            const c = await getCodigoById(id);
            const fetched = c
              ? {
                  id: c.id,
                  codigo: c.codigo,
                  tipo: c.tipo,
                  valor: Number(c.valor ?? 0),
                  monto: Number(cotizacion.descuento_aplicado ?? c.valor ?? 0),
                  descripcion: c.descripcion ?? null,
                }
              : desired;

            if (!descuentoObjEqual(fetched, descuentoAplicado)) {
              setCodigoDescuento(fetched?.codigo || "");
              setDescuentoAplicado(fetched);
              setErrorDescuento("");
            }
          } catch (err) {
            console.error("[Resumen] getCodigoById failed:", err);
            if (!descuentoObjEqual(desired, descuentoAplicado)) {
              setCodigoDescuento(desired?.codigo ?? "");
              setDescuentoAplicado(desired);
              setErrorDescuento("");
            }
          }
        })();
      } else {
        setCodigoDescuento(desired?.codigo ?? "");
        setDescuentoAplicado(desired);
        setErrorDescuento("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cotizacion]);

  useEffect(() => {
    if (!cotizacion) return;
    setEnvio(normalizeEnvioFromCotizacion(cotizacion));
  }, [cotizacion]);

  useEffect(() => {
    if (!isEditing) return;
    if (!cotizacion) return;

    const prevId = cotizacion.id_codigo_descuento ?? null;
    const prevMonto = Number(cotizacion.descuento_aplicado ?? 0);

    const newId = descuentoAplicado?.id ?? null;
    const newMonto = Number(
      descuentoAplicado?.monto ?? descuentoAplicado?.valor ?? 0
    );

    if (eqStr(prevId, newId) && eqNum(prevMonto, newMonto)) return;

    setCotizacion((prev) => {
      if (!prev) return prev;

      const currentPrevId = prev.id_codigo_descuento ?? null;
      const currentPrevMonto = Number(prev.descuento_aplicado ?? 0);

      if (eqStr(currentPrevId, newId) && eqNum(currentPrevMonto, newMonto)) {
        return prev;
      }

      return {
        ...prev,
        id_codigo_descuento: newId,
        descuento_aplicado: newId ? newMonto : 0,
        codigo_descuento: newId
          ? (descuentoAplicado?.codigo ?? prev.codigo_descuento ?? null)
          : null,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descuentoAplicado, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    if (!cotizacion) return;

    const nextMonto =
      envio.modo === "monto_fijo" ? Number(envio.monto || 0) : 0;

    const prevEnvio = normalizeEnvioFromCotizacion(cotizacion);

    if (
      prevEnvio.modo === envio.modo &&
      Number(prevEnvio.monto || 0) === nextMonto
    ) {
      return;
    }

    setCotizacion((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        descripcion_envio: envio.modo,
        costo_envio: nextMonto,
      };
    });
  }, [envio, isEditing, cotizacion, setCotizacion]);

  const handleQuitarDescuento = () => {
    setCotizacion((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        id_codigo_descuento: null,
        descuento_aplicado: 0,
        codigo_descuento: null,
      };
    });

    if (codigoDescuento !== "") setCodigoDescuento("");
    if (descuentoAplicado !== null) setDescuentoAplicado(null);
    if (errorDescuento !== "") setErrorDescuento("");
  };

  const onChangeCliente = (field, value) => {
    setCotizacion((prev) => {
      if (!prev) return prev;
      const next = { ...prev };

      if (field === "nombre") next.nombre_cliente = value;
      if (field === "telefono") next.telefono_cliente = value;
      if (field === "email") next.email_cliente = value;
      if (field === "direccion") next.direccion = value;
      if (field === "comentarios") next.comentarios = value;

      return next;
    });
  };

  const handleChangeEnvioModo = (modo) => {
    setEnvio((prev) => ({
      modo,
      monto: modo === "monto_fijo" ? Number(prev.monto || 0) : 0,
    }));
  };

  const handleChangeEnvioMonto = (value) => {
    setEnvio((prev) => ({
      ...prev,
      modo: "monto_fijo",
      monto: Number(value || 0),
    }));
  };

  const safe = (v, placeholder = "—") => (v || v === 0 ? v : placeholder);

  const handleEntrarEdicion = () => {
    if (!isEditable) {
      setModalInfo({
        title: "No disponible",
        body: "Esta cotización no se puede editar porque no tiene un token válido.",
      });
      return;
    }

    setIsEditing(true);
    setEditCliente(false);
  };

  const handleSaveChanges = async () => {
    try {
      const res = await saveCotizacion({
        idVendedor: vendedor?.id_vendedor ?? null,
      });

      if (res?.error) {
        const title =
          res.code === "MINIMO_NO_CUMPLE"
            ? "No se cumple el mínimo"
            : "No se pudo guardar";
        setModalInfo({
          title,
          body: res.message || "Ocurrió un problema al guardar la cotización.",
        });
        return;
      }

      setIsEditing(false);
      setEditCliente(false);
      setModalInfo({
        title: "Guardado",
        body: "Cambios guardados correctamente.",
      });
    } catch (err) {
      console.error("Error al guardar:", err);
      setModalInfo({
        title: "Error",
        body: err?.message || "Error al guardar la cotización.",
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditCliente(false);

    if (cotizacion) {
      setEnvio(normalizeEnvioFromCotizacion(cotizacion));
    }
  };

  useEffect(() => {
    if (isEditing && editCliente) {
      setTimeout(() => {
        try {
          nombreInputRef.current?.focus?.();
        } catch {}
      }, 0);
    }
  }, [isEditing, editCliente]);

  const handleEnviarWhatsApp = () => {
    if (!vendedor?.telefono) {
      alert("No hay número de WhatsApp configurado para esta tienda.");
      return;
    }

    const tienda = clave || vendedor?.clave || "";
    const link = typeof window !== "undefined" ? window.location.href : "";
    const mensaje = `${tienda}\n\nHola! Te envío mi cotización:\n${link}`;
    const telefono = String(vendedor.telefono).replace(/[^\d]/g, "");
    const whatsappUrl = `https://wa.me/${telefono}?text=${encodeURIComponent(
      mensaje
    )}`;

    window.open(whatsappUrl, "_blank");
  };

  const displayedTotal =
    !isEditing && (cotizacion?.total || cotizacion?.total === 0)
      ? cotizacion.total
      : totalCalculado;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Cargando cotización...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  if (!cotizacion) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        No se encontró la cotización.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <button
            onClick={volverAlCatalogo}
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al catálogo
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Cotización #{cotizacion.numero_cotizacion || numeroCotizacion}
              </h1>
              <p className="text-gray-600">
                {isEditing
                  ? "Modo edición: modifica productos, descuento y cliente"
                  : "Resumen de tu cotización"}
              </p>
            </div>

            {!isEditing ? (
              <button
                onClick={handleEntrarEdicion}
                disabled={!isEditable}
                className={`flex items-center gap-2 px-4 py-2 border-2 rounded transition-colors font-medium ${
                  isEditable
                    ? "border-black hover:bg-gray-50"
                    : "border-gray-300 text-gray-400 cursor-not-allowed"
                }`}
              >
                <Edit2 className="w-4 h-4" />
                Editar cotización
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors font-medium disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                {!editCliente ? (
                  <h2 className="text-xl font-semibold">Datos del cliente</h2>
                ) : (
                  <div />
                )}

                {isEditing && (
                  <button
                    onClick={() => setEditCliente((v) => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-black text-white rounded hover:bg-gray-800 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    {editCliente ? "Listo" : "Editar datos"}
                  </button>
                )}
              </div>

              {isEditing && editCliente ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Nombre:</span>
                    <input
                      ref={nombreInputRef}
                      type="text"
                      value={cotizacion?.nombre_cliente ?? ""}
                      onChange={(e) => onChangeCliente("nombre", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setEditCliente(false);
                      }}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="Nombre completo"
                    />
                  </div>

                  <div>
                    <span className="text-gray-600">Teléfono:</span>
                    <input
                      type="tel"
                      value={cotizacion?.telefono_cliente ?? ""}
                      onChange={(e) =>
                        onChangeCliente("telefono", e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setEditCliente(false);
                      }}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="10 dígitos"
                    />
                  </div>

                  <div>
                    <span className="text-gray-600">Email:</span>
                    <input
                      type="email"
                      value={cotizacion?.email_cliente ?? ""}
                      onChange={(e) => onChangeCliente("email", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setEditCliente(false);
                      }}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>

                  <div>
                    <span className="text-gray-600">Dirección:</span>
                    <input
                      type="text"
                      value={cotizacion?.direccion ?? ""}
                      onChange={(e) =>
                        onChangeCliente("direccion", e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setEditCliente(false);
                      }}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="Calle, número, colonia..."
                    />
                  </div>

                  <div className="col-span-2">
                    <span className="text-gray-600">Comentarios:</span>
                    <textarea
                      rows={3}
                      value={cotizacion?.comentarios ?? ""}
                      onChange={(e) =>
                        onChangeCliente("comentarios", e.target.value)
                      }
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                      placeholder="Notas opcionales..."
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Nombre:</span>
                    <p className="font-medium">{safe(cotizacion.nombre_cliente)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Teléfono:</span>
                    <p className="font-medium">
                      {safe(cotizacion.telefono_cliente)}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium">{safe(cotizacion.email_cliente)}</p>
                  </div>

                  <div>
                    <span className="text-gray-600">Dirección:</span>
                    <p className="font-medium">{cotizacion.direccion || "—"}</p>
                  </div>

                  <div className="col-span-2">
                    <span className="text-gray-600">Comentarios:</span>
                    <p className="font-medium">
                      {safe(cotizacion.comentarios, "Sin comentarios")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <CotizacionProductos
              productos={cotizacion.productos || []}
              isEditing={isEditing}
              onUpdateQuantity={updateCantidad}
              onRemoveProduct={eliminarProducto}
              onOpenAddProductModal={() => setShowProductSelector(true)}
            />
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Envío</h2>

              {isEditing && isVendedor ? (
                <div className="space-y-4 text-sm">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="envio"
                        checked={envio.modo === "por_definir"}
                        onChange={() => handleChangeEnvioModo("por_definir")}
                        className="w-4 h-4"
                      />
                      <span>Por definir</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="envio"
                        checked={envio.modo === "incluido"}
                        onChange={() => handleChangeEnvioModo("incluido")}
                        className="w-4 h-4"
                      />
                      <span>Incluido en el precio</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="envio"
                        checked={envio.modo === "monto_fijo"}
                        onChange={() => handleChangeEnvioModo("monto_fijo")}
                        className="w-4 h-4"
                      />
                      <span>Monto fijo</span>
                    </label>
                  </div>

                  {envio.modo === "monto_fijo" && (
                    <div>
                      <label className="block text-gray-600 mb-1">
                        Monto de envío:
                      </label>
                      <input
                        type="number"
                        value={envio.monto}
                        onChange={(e) => handleChangeEnvioMonto(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  )}

                  <div>
                    <span className="text-gray-600">Preview:</span>{" "}
                    <span className="font-medium">{getEnvioPreviewText(envio)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-medium">{getEnvioDisplay(envio)}</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h2 className="text-xl font-semibold mb-4">Resumen</h2>

              {isEditing && (
                <div className="mb-4">
                  <label className="text-sm text-gray-600 block mb-2">
                    Código de descuento
                  </label>
                  <DiscountCode
                    codigoDescuento={codigoDescuento}
                    setCodigoDescuento={setCodigoDescuento}
                    descuentoAplicado={descuentoAplicado}
                    setDescuentoAplicado={setDescuentoAplicado}
                    errorDescuento={errorDescuento}
                    setErrorDescuento={setErrorDescuento}
                    subtotal={subtotal}
                    idVendedor={vendedor?.id_vendedor ?? null}
                    validatePath="/codigos/validate"
                    onRemove={handleQuitarDescuento}
                  />
                </div>
              )}

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    ${Number(subtotal || 0).toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {Number(cotizacion?.descuento_aplicado || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Descuento:</span>
                    <span className="font-medium">
                      -$
                      {Number(cotizacion.descuento_aplicado || 0).toLocaleString(
                        "es-MX",
                        { minimumFractionDigits: 2 }
                      )}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Envío:</span>
                  <span className="font-medium">{getEnvioDisplay(envio)}</span>
                </div>

                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Total:</span>
                    <span className="text-2xl font-bold">
                      ${Number(displayedTotal || 0).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {!isEditing && (
                <div className="space-y-3">
                  <button
                    onClick={handleEnviarWhatsApp}
                    className="w-full bg-black text-white py-3 rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <Send className="w-5 h-5" />
                    Enviar por WhatsApp
                  </button>

                  <button
                    onClick={() =>
                      generarPDFCotizacion({
                        cotizacion,
                        subtotal,
                        total: displayedTotal,
                        vendedor,
                      })
                    }
                    className="w-full border-2 border-black text-black py-3 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <Download className="w-5 h-5" />
                    Descargar PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SelectorProductosCotizacion
        open={showProductSelector}
        onClose={() => setShowProductSelector(false)}
        onSelectProduct={agregarProducto}
      />

      {modalInfo && (
        <ModalSimple
          title={modalInfo.title}
          onClose={() => setModalInfo(null)}
          actions={[
            <button
              key="ok"
              onClick={() => setModalInfo(null)}
              className="bg-black text-white px-4 py-2 rounded"
            >
              Entendido
            </button>,
          ]}
        >
          <p className="text-sm text-gray-700">{modalInfo.body}</p>
        </ModalSimple>
      )}
    </div>
  );
}