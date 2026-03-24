"use client";

import React from "react";
import useDiscountCode from "@/hooks/useDiscountCode";

/**
 * DiscountCode (UI)
 * - Componente controlado: mantiene estados en el padre.
 * - Usa useDiscountCode -> validateCodigo para validar.
 * - ✅ NUEVO: onRemove() para avisar al padre (y limpiar context).
 */
export default function DiscountCode({
  codigoDescuento,
  setCodigoDescuento,
  descuentoAplicado,
  setDescuentoAplicado,
  errorDescuento,
  setErrorDescuento,
  subtotal = 0,
  idVendedor = null,
  validatePath = "/codigos/validate",

  // ✅ NUEVO
  onRemove,
}) {
  const { applying, error: hookError, apply, clearError } = useDiscountCode({
    defaultPath: validatePath,
  });

  React.useEffect(() => {
    if (hookError) setErrorDescuento(hookError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hookError]);

  const onApplyClick = async () => {
    setErrorDescuento("");
    try {
      const validated = await apply({ codigo: codigoDescuento, subtotal, idVendedor });
      setDescuentoAplicado(validated);
      setCodigoDescuento(validated.codigo);
      setErrorDescuento("");
    } catch (err) {
      setDescuentoAplicado(null);
      setErrorDescuento(err?.message || "Código inválido");
    }
  };

  const onRemoveClick = () => {
    // limpiar UI local
    setDescuentoAplicado(null);
    setCodigoDescuento("");
    setErrorDescuento("");
    clearError();

    // ✅ avisar al padre para limpiar CotizacionContext
    onRemove?.();
  };

  const fmt = (n) =>
    Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 });

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
       
        {!descuentoAplicado ? (
          <>
            <input
              type="text"
              value={codigoDescuento}
              onChange={(e) => {
                setCodigoDescuento(e.target.value);
                if (errorDescuento) setErrorDescuento("");
              }}
              className="w-full sm:w-64 lg:w-56 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
              placeholder="Código de descuento"
              aria-label="Código de descuento"
            />

            <button
              onClick={onApplyClick}
              className="px-4 py-2 bg-black text-white text-sm rounded hover:bg-gray-800 transition-colors whitespace-nowrap disabled:opacity-60"
              type="button"
              disabled={applying}
            >
              {applying ? "Aplicando..." : "Aplicar"}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded px-3 py-2 min-w-0">
              <span className="text-sm font-medium text-green-800 whitespace-nowrap">
                {descuentoAplicado.codigo}
              </span>
              <span className="text-xs text-green-700 whitespace-nowrap">
                {descuentoAplicado.tipo === "porcentaje"
                  ? `${descuentoAplicado.valor}%`
                  : `-$${fmt(descuentoAplicado.valor ?? descuentoAplicado.monto)}`}
              </span>
            </div>

            <button
              onClick={onRemoveClick}
              className="text-sm text-red-500 hover:text-red-700 font-medium whitespace-nowrap"
              type="button"
            >
              Quitar
            </button>
          </div>
        )}
      </div>

      {(errorDescuento || hookError) && (
        <p className="text-red-500 text-xs mt-2">{errorDescuento || hookError}</p>
      )}
    </div>
  );
}
