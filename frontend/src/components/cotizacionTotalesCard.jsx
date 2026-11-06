"use client";

import React from "react";
import DiscountCode from "@/components/discountCode";

export function CotizacionTotalesCard({
  // valores
  subtotal,
  shippingAmount,
  envioModo,

  // descuento state (controlado desde el padre)
  codigoDescuento,
  setCodigoDescuento,
  descuentoAplicado,
  setDescuentoAplicado,
  errorDescuento,
  setErrorDescuento,

  // computados
  montoDescuento,
  total,

  // acciones
  onCrearCotizacion,
  creating,

  // errores de validación del form
  errores,
  errorGeneral,
}) {
  const fmt = (n) =>
    Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* ======================= CODIGO DE DESCUENTO ======================= */}
      <DiscountCode
        codigoDescuento={codigoDescuento}
        setCodigoDescuento={setCodigoDescuento}
        descuentoAplicado={descuentoAplicado}
        setDescuentoAplicado={setDescuentoAplicado}
        errorDescuento={errorDescuento}
        setErrorDescuento={setErrorDescuento}
        subtotal={subtotal}
        idVendedor={null} // si luego quieres restringir por vendedor aquí se pasa
        validatePath="/codigos/validate"
      />

      {/* ======================= TOTALES ======================= */}
      <div className="space-y-2 mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal:</span>
          <span>${fmt(subtotal)}</span>
        </div>

        {descuentoAplicado && (
          <div className="flex justify-between text-sm text-green-600">
            <span className="truncate">
              Descuento ({descuentoAplicado.codigo}):
            </span>
            <span className="whitespace-nowrap">-${fmt(montoDescuento)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Envío:</span>
          <span className="whitespace-nowrap">
            {envioModo === "por_definir"
              ? "Por definir"
              : envioModo === "incluido"
              ? "Incluido"
              : `$${fmt(shippingAmount)}`}
          </span>
        </div>

        <div className="border-t pt-2 mt-2 flex justify-between items-center">
          <span className="text-xl font-bold">Total:</span>
          <span className="text-2xl font-bold">${fmt(total)}</span>
        </div>
      </div>

      {/* ======================= ERRORES ======================= */}
      {Object.keys(errores || {}).length > 0 && (
        <div className="p-3 mt-4 mb-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          Faltan campos obligatorios (nombre y teléfono).
        </div>
      )}

      {errorGeneral && (
        <div className="p-3 mt-2 mb-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {errorGeneral}
        </div>
      )}

      {/* ======================= BOTON CREAR ======================= */}
      <div className="mt-4">
        <button
          onClick={onCrearCotizacion}
          disabled={creating}
          className="w-full border-2 border-black bg-black text-white py-3 rounded hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          type="button"
        >
          {creating ? "Creando cotización..." : "Crear cotización"}
        </button>
      </div>
    </div>
  );
}
