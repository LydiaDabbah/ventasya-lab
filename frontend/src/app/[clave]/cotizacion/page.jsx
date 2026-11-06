"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/context/CartContext";
import { useVendedor } from "@/context/VendedorContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { CotizacionClienteForm } from "@/components/cotizacionClienteForm";
import { CotizacionEnvioSection } from "@/components/cotizacionEnvio";
import { CotizacionTotalesCard } from "@/components/cotizacionTotalesCard";
import { fetchFromApi } from "@/utils/api";
import { priceSync } from "@/utils/priceSync";
import { createCotizacion } from "@/utils/createCotizacion";
import { useVolverAlCatalogo } from "@/hooks/useVolverAlCatalogo";

function ModalPortal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

export default function CotizacionPage() {
  const router = useRouter();
  const {
    items = [],
    totalAmount = 0,
    clearCart,
    API: cartApi,
    applyPriceUpdates,
    removeItem,
  } = useCart();

  const { vendedor: vendedorRuta, clave } = useVendedor();
  const { vendedor: vendedorAuth, loading: authLoading } = useAuth();

  const [cliente, setCliente] = useState({
    nombre: "",
    telefono: "",
    email: "",
    direccion: "",
    comentarios: "",
  });

  const [envio, setEnvio] = useState({ modo: "por_definir", monto: 0 });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [creating, setCreating] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const [codigoDescuento, setCodigoDescuento] = useState("");
  const [descuentoAplicado, setDescuentoAplicado] = useState(null);
  const [errorDescuento, setErrorDescuento] = useState("");

  const [checkingPrices, setCheckingPrices] = useState(false);
  const [priceDiffsResult, setPriceDiffsResult] = useState(null);
  const [justRemovedIds, setJustRemovedIds] = useState([]);

  const { volverAlCatalogo } = useVolverAlCatalogo();

  const subtotal = Number(totalAmount || 0);
  const shippingAmount = envio.modo === "monto" ? Number(envio.monto || 0) : 0;

  const montoDescuento = React.useMemo(() => {
    if (
      descuentoAplicado &&
      (descuentoAplicado.monto !== undefined ||
        descuentoAplicado.descuento !== undefined)
    ) {
      return Number(
        descuentoAplicado.monto ?? descuentoAplicado.descuento ?? 0
      );
    }
    if (!descuentoAplicado) return 0;
    if (descuentoAplicado.tipo === "porcentaje") {
      const val = Number(descuentoAplicado.valor || 0);
      return subtotal * (val / 100);
    }
    return Number(descuentoAplicado.valor || 0);
  }, [descuentoAplicado, subtotal]);

  const total = React.useMemo(
    () => Math.max(0, subtotal + shippingAmount - montoDescuento),
    [subtotal, shippingAmount, montoDescuento]
  );

  const isVendedor = React.useMemo(() => {
    if (!vendedorAuth?.id_vendedor) return false;
    if (!vendedorRuta?.id_vendedor) return false;
    return vendedorAuth.id_vendedor === vendedorRuta.id_vendedor;
  }, [vendedorAuth, vendedorRuta]);

  useEffect(() => {
    let mounted = true;
    if (!items || items.length === 0) return;

    (async () => {
      try {
        setCheckingPrices(true);
        const apiBase =
          cartApi || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await priceSync({ items, apiBase });

        if (!mounted) return;

        if (res && res.changed) {
          setPriceDiffsResult(res);
          document.body.style.overflow = "hidden";
        } else {
          setPriceDiffsResult(null);
          document.body.style.overflow = "";
        }
      } catch (err) {
        console.error("Error verificando precios on cotizacion mount:", err);
        setPriceDiffsResult(null);
        document.body.style.overflow = "";
      } finally {
        if (mounted) setCheckingPrices(false);
      }
    })();

    return () => {
      mounted = false;
      document.body.style.overflow = "";
    };
  }, [items.length, items, cartApi]);

  const handleChangeCliente = (field, value) =>
    setCliente((p) => ({ ...p, [field]: value }));
  const handleChangeEnvio = (modo, monto = 0) => setEnvio({ modo, monto });

  const validar = () => {
    const errs = {};
    if (!cliente.nombre.trim()) errs.nombre = "Requerido";
    if (!cliente.telefono.trim()) errs.telefono = "Requerido";
    setErrores(errs);
    setErrorGeneral("");
    const esValido = Object.keys(errs).length === 0;
    if (!esValido && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (navigator?.vibrate) navigator.vibrate(60);
    }
    return esValido;
  };

  const handleCrearCotizacion = async () => {
    if (
      priceDiffsResult &&
      (priceDiffsResult.removed?.length || 0) +
        (priceDiffsResult.inactive?.length || 0) >
        0
    ) {
      window.alert(
        "Hay productos no disponibles en la cotización. Quita o reemplaza esos productos antes de crear la cotización."
      );
      return;
    }

    if (
      priceDiffsResult &&
      priceDiffsResult.diffs &&
      priceDiffsResult.diffs.length > 0
    ) {
      const ok = window.confirm(
        "Hay cambios de precio. ¿Deseas aplicar los precios nuevos antes de crear la cotización?"
      );
      if (ok) {
        if (
          typeof applyPriceUpdates === "function" &&
          Array.isArray(priceDiffsResult.updatedItems)
        ) {
          applyPriceUpdates(priceDiffsResult.updatedItems);
          setPriceDiffsResult(null);
        }
      }
    }

    if (!items.length) return;
    if (!validar()) return;

    if (!vendedorRuta?.id_vendedor) {
      setErrorGeneral(
        "No se encontró el vendedor. Intenta recargar o volver al catálogo."
      );
      return;
    }

    const payload = {
      id_vendedor: vendedorRuta.id_vendedor,
      telefono_cliente: cliente.telefono,
      nombre_cliente: cliente.nombre,
      email_cliente: cliente.email || null,
      direccion: cliente.direccion || null,
      comentarios: cliente.comentarios || null,
      id_codigo_descuento: descuentoAplicado?.id || null,
      costo_envio: shippingAmount || 0,
      descripcion_envio:
        envio.modo === "por_definir"
          ? "Por definir"
          : envio.modo === "incluido"
          ? "Incluido"
          : "Monto especificado",
      productos: items.map((it) => ({
        id_producto: it.id_producto,
        id_variante: it.id_variante || null,
        cantidad: Number(it.cantidad || 0),
        nota_personalizable: it.nota_personalizable?.trim()
          ? it.nota_personalizable.trim()
          : null,
      })),
    };

    try {
      setCreating(true);
      setErrorGeneral("");

      const data = await createCotizacion(payload);

      if (!data) {
        throw new Error("Respuesta vacía del servidor al crear la cotización.");
      }

      const token = data?.editable_token ?? data?.token ?? null;
      const tokenActive =
        data?.editable_token_active === undefined
          ? true
          : Boolean(data.editable_token_active);

      const numero =
        data?.numero_cotizacion ?? data?.numero_orden ?? data?.numero ?? null;

      setRedirecting(true);
      clearCart();

      if (numero) {
        if (clave) {
          if (token && tokenActive) {
            router.push(
              `/${encodeURIComponent(
                clave
              )}/cotizacion/${encodeURIComponent(
                numero
              )}?token=${encodeURIComponent(token)}`
            );
          } else {
            router.push(
              `/${encodeURIComponent(clave)}/cotizacion/${encodeURIComponent(
                numero
              )}`
            );
          }
        } else {
          if (token && tokenActive) {
            router.push(
              `/cotizacion/${encodeURIComponent(
                numero
              )}?token=${encodeURIComponent(token)}`
            );
          } else {
            router.push(`/cotizacion/${encodeURIComponent(numero)}`);
          }
        }
        return;
      }

      router.push("/");
    } catch (err) {
      console.error("❌ Error creando cotización:", err);
      setErrorGeneral(
        err?.message ||
          "No se pudo crear la cotización. Revisa los datos o intenta de nuevo."
      );
      setRedirecting(false);
    } finally {
      setCreating(false);
    }
  };

  const envioPreviewText =
    envio.modo === "por_definir"
      ? "Envío: por definir según dirección"
      : envio.modo === "incluido"
      ? "Envío: incluido en el precio"
      : `Envío: $${shippingAmount.toLocaleString("es-MX", {
          minimumFractionDigits: 2,
        })}`;

  const aceptarPreciosNuevos = () => {
    if (
      priceDiffsResult &&
      Array.isArray(priceDiffsResult.updatedItems) &&
      typeof applyPriceUpdates === "function"
    ) {
      applyPriceUpdates(priceDiffsResult.updatedItems);
    }
    setPriceDiffsResult(null);
    setJustRemovedIds([]);
    document.body.style.overflow = "";
  };

  const ignorarCambios = () => {
    setPriceDiffsResult(null);
    setJustRemovedIds([]);
    document.body.style.overflow = "";
  };

  const handleRemoveFromModal = (id) => {
    try {
      removeItem(id);
      setJustRemovedIds((prev) =>
        prev.includes(id) ? prev : [...prev, id]
      );
      setPriceDiffsResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          removed: (prev.removed || []).filter((r) => String(r) !== String(id)),
          inactive: (prev.inactive || []).filter(
            (obj) => String(obj.id) !== String(id)
          ),
        };
      });
    } catch (err) {
      console.error("Error quitando item desde modal:", err);
    }
  };

  if (authLoading) return null;

  if (redirecting) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Creando cotización...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !redirecting && !creating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">
          No hay productos en tu cotización
        </h1>
        <button
          onClick={volverAlCatalogo}
          className="flex items-center gap-2 text-blue-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al catálogo
        </button>
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

          <h1 className="text-3xl font-bold mb-2">Cotización</h1>
          <p className="text-gray-600">
            Revisa tus productos y completa tus datos para generar la cotización.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">
            <CotizacionClienteForm
              cliente={cliente}
              onChangeCliente={handleChangeCliente}
              errores={errores}
              setErrores={setErrores}
            />
            <CotizacionEnvioSection
              envio={envio}
              onChangeEnvio={handleChangeEnvio}
              isVendedor={isVendedor}
              previewText={envioPreviewText}
            />
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Resumen de productos</h2>
                <span className="text-sm text-gray-500">
                  {items.length} {items.length === 1 ? "producto" : "productos"}
                </span>
              </div>

              <div className="space-y-4 max-h-[502px] overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.cart_key || `${item.id_producto}-${item.id_variante || "base"}`}
                    className="flex gap-4 pb-4 border-b last:border-0"
                  >
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={item.imagen_url || "/placeholder.svg"}
                        alt={item.nombre_producto}
                        fill
                        className="object-cover rounded"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">
                        {item.nombre_producto}
                      </h3>
                      {item.nombre_variante && <p className="text-xs text-gray-500">{item.nombre_variante}</p>}

                      {item.status === "removed" && (
                        <div className="text-xs text-red-600 mt-1">
                          No disponible
                        </div>
                      )}
                      {item.status === "inactive" && (
                        <div className="text-xs text-yellow-700 mt-1">
                          Inactivo
                        </div>
                      )}

                      <p className="text-sm text-gray-600">
                        {item.cantidad} x $
                        {Number(item.precio_unitario || 0).toLocaleString(
                          "es-MX",
                          { minimumFractionDigits: 2 }
                        )}
                      </p>

                      {item.nota_personalizable?.trim() ? (
                        <p className="text-xs text-gray-500 mt-1 break-words">
                          Nota: {item.nota_personalizable}
                        </p>
                      ) : null}
                    </div>

                    <div className="text-right font-semibold">
                      $
                      {Number(item.subtotal || 0).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <CotizacionTotalesCard
              subtotal={subtotal}
              shippingAmount={shippingAmount}
              envioModo={envio.modo}
              codigoDescuento={codigoDescuento}
              setCodigoDescuento={setCodigoDescuento}
              descuentoAplicado={descuentoAplicado}
              setDescuentoAplicado={setDescuentoAplicado}
              errorDescuento={errorDescuento}
              setErrorDescuento={setErrorDescuento}
              montoDescuento={montoDescuento}
              total={total}
              onCrearCotizacion={handleCrearCotizacion}
              creating={creating}
              errores={errores}
              errorGeneral={errorGeneral}
            />
          </div>
        </div>
      </div>

      {priceDiffsResult && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60" />

            <div className="relative max-h-[85vh] overflow-y-auto w-full mx-auto sm:max-w-2xl bg-white rounded-lg shadow-xl p-4 sm:p-6 z-[10000]">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    Cambios en la cotización
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Encontramos diferencias en precios o productos no
                    disponibles. Revisa antes de continuar.
                  </p>
                </div>
                <button
                  onClick={ignorarCambios}
                  className="p-2 rounded hover:bg-gray-100"
                  aria-label="Cerrar"
                >
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {(priceDiffsResult.removed?.length || 0) +
                  (priceDiffsResult.inactive?.length || 0) >
                  0 && (
                  <div>
                    <h4 className="font-medium">Productos no disponibles</h4>
                    <div className="mt-2 space-y-2">
                      {priceDiffsResult.removed?.map((id) => {
                        const it = items.find(
                          (x) => String(x.id_producto) === String(id)
                        );
                        const wasJustRemoved = justRemovedIds.includes(
                          String(id)
                        );
                        return (
                          <div
                            key={`removed-${id}`}
                            className="flex justify-between items-center border-b pb-2"
                          >
                            <div>
                              <div className="font-medium">
                                {it?.nombre_producto ?? id}
                              </div>
                              <div className="text-xs text-gray-500">
                                El producto ya no existe
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {wasJustRemoved ? (
                                <div className="text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                                  Se quitó
                                </div>
                              ) : (
                                <button
                                  className="bg-red-50 text-red-600 px-3 py-1 rounded text-sm"
                                  onClick={() => handleRemoveFromModal(id)}
                                >
                                  Quitar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {priceDiffsResult.inactive?.map((obj) => {
                        const id = obj.id;
                        const it = items.find(
                          (x) => String(x.id_producto) === String(id)
                        );
                        const wasJustRemoved = justRemovedIds.includes(
                          String(id)
                        );
                        return (
                          <div
                            key={`inactive-${id}`}
                            className="flex justify-between items-center border-b pb-2"
                          >
                            <div>
                              <div className="font-medium">
                                {it?.nombre_producto ?? id}
                              </div>
                              <div className="text-xs text-gray-500">
                                Producto inactivo / descontinuado
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {wasJustRemoved ? (
                                <div className="text-sm text-green-700 bg-green-50 px-2 py-1 rounded">
                                  Se quitó
                                </div>
                              ) : (
                                <button
                                  className="bg-red-50 text-red-600 px-3 py-1 rounded text-sm"
                                  onClick={() => handleRemoveFromModal(id)}
                                >
                                  Quitar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {priceDiffsResult.diffs && priceDiffsResult.diffs.length > 0 && (
                  <div>
                    <h4 className="font-medium">Cambios en los precios</h4>
                    <div className="mt-2 space-y-2">
                      {priceDiffsResult.diffs.map((d) => (
                        <div
                          key={d.id_producto}
                          className="flex justify-between items-center border-b pb-2"
                        >
                          <div>
                            <div className="font-medium">{d.nombre}</div>
                            <div className="text-xs text-gray-500">
                              Cantidad: {d.cantidad}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm line-through text-red-500">
                              $
                              {Number(d.oldPrice || 0).toLocaleString("es-MX", {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                            <div className="text-sm font-semibold">
                              $
                              {Number(d.newPrice || 0).toLocaleString("es-MX", {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 bg-gray-200 py-2 rounded"
                  onClick={ignorarCambios}
                >
                  Cerrar
                </button>
                <button
                  className="flex-1 bg-black text-white py-2 rounded"
                  onClick={() => {
                    const hasProblems =
                      (priceDiffsResult.removed?.length || 0) +
                      (priceDiffsResult.inactive?.length || 0);
                    if (hasProblems) {
                      window.alert(
                        "Quita los productos no disponibles antes de aceptar cambios."
                      );
                      return;
                    }
                    aceptarPreciosNuevos();
                  }}
                >
                  Aceptar cambios
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {checkingPrices && (
        <div className="fixed bottom-4 right-4 z-50 bg-white px-3 py-2 rounded shadow text-sm text-gray-700">
          Verificando precios...
        </div>
      )}
    </div>
  );
}
