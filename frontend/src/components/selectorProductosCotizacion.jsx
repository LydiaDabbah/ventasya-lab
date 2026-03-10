"use client"

import { useState } from "react"
import { X } from "lucide-react"
import AllProducts from "@/components/AllProducts"

export default function SelectorProductosCotizacion({
  open,
  onClose,
  onSelectProduct, // (producto, cantidad)
}) {
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState(1)

  if (!open) return null

  const handleAgregarClick = (producto) => {
    if (!producto || cantidadSeleccionada < 1) return
    onSelectProduct(producto, cantidadSeleccionada)
    setCantidadSeleccionada(1)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-xl font-semibold">Agregar productos a la cotización</h3>
            <p className="text-sm text-gray-500">
              Elige productos del catálogo y define una cantidad.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black rounded-full p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cantidad global arriba */}
        <div className="px-6 py-3 border-b flex items-center gap-3">
          <label className="text-sm text-gray-600">Cantidad:</label>
          <input
            type="number"
            min={1}
            value={cantidadSeleccionada}
            onChange={(e) => setCantidadSeleccionada(parseInt(e.target.value) || 1)}
            className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-center"
          />
          <span className="text-xs text-gray-400">
            Se aplicará a cada producto que agregues
          </span>
        </div>

        {/* Contenido scrollable con AllProducts */}
        <div className="px-2 pb-4 overflow-y-auto flex-1">
          <AllProducts onSelectProduct={handleAgregarClick} />
        </div>
      </div>
    </div>
  )
}
