"use client";

export function CotizacionEnvioSection({ envio, onChangeEnvio, isVendedor, previewText }) {
  // Si NO es vendedor: vista solo informativa, sin controles
  if (!isVendedor) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Envío</h2>
        <p className="text-sm text-gray-600">
          El costo de envío se confirmará directamente con la tienda según tu dirección.
        </p>
      </div>
    );
  }

  // Si SÍ es vendedor: puede editar opciones de envío
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Envío</h2>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="envio"
              checked={envio.modo === "por_definir"}
              onChange={() => onChangeEnvio("por_definir")}
              className="w-4 h-4"
            />
            <span>Por definir</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="envio"
              checked={envio.modo === "incluido"}
              onChange={() => onChangeEnvio("incluido")}
              className="w-4 h-4"
            />
            <span>Incluido en el precio</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="envio"
              checked={envio.modo === "monto"}
              onChange={() => onChangeEnvio("monto", envio.monto)}
              className="w-4 h-4"
            />
            <span>Especificar monto</span>
          </label>
        </div>

        {envio.modo === "monto" && (
          <div>
            <label className="block text-sm font-medium mb-1">Monto de envío</label>
            <input
              type="number"
              value={envio.monto}
              onChange={(e) => onChangeEnvio("monto", Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
        )}

        <div className="p-3 bg-gray-50 rounded text-sm text-gray-700">
          <strong>Preview:</strong> {previewText}
        </div>
      </div>
    </div>
  );
}
