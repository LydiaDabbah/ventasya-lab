"use client";

import { Plus, Trash2 } from "lucide-react";

const comboKey = (values) =>
  Object.entries(values || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name.toLocaleLowerCase()}:${value.toLocaleLowerCase()}`)
    .join("|");

function combinations(options) {
  return options.reduce(
    (rows, option) => rows.flatMap((row) => option.valores.map((value) => ({ ...row, [option.nombre]: value }))),
    [{}],
  );
}

export default function ProductVariantsEditor({ options, variants, stock, basePrice, onChange }) {
  const rebuild = (nextOptions) => {
    const existing = new Map((variants || []).map((variant) => [comboKey(variant.opciones), variant]));
    const nextVariants = nextOptions.length
      ? combinations(nextOptions).map((values) => ({
          id_variante: existing.get(comboKey(values))?.id_variante,
          opciones: values,
          sku: existing.get(comboKey(values))?.sku || "",
          precio: existing.get(comboKey(values))?.precio ?? null,
          stock: existing.get(comboKey(values))?.stock ?? 0,
          activo: existing.get(comboKey(values))?.activo ?? true,
          imagen_url: existing.get(comboKey(values))?.imagen_url ?? null,
        }))
      : [];
    onChange({ options: nextOptions, variants: nextVariants });
  };

  const addOption = () => {
    const number = options.length + 1;
    rebuild([...options, { nombre: `Opción ${number}`, valores: ["Valor 1"] }]);
  };

  const updateOption = (index, patch) => {
    rebuild(options.map((option, i) => (i === index ? { ...option, ...patch } : option)));
  };

  const updateVariant = (index, field, value) => {
    onChange({
      options,
      variants: variants.map((variant, i) => (i === index ? { ...variant, [field]: value } : variant)),
    });
  };

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium text-gray-900">Variantes e inventario</h3>
          <p className="text-sm text-gray-500 mt-1">Agrega opciones como Color, Talla, Aroma o Material.</p>
        </div>
        <button type="button" onClick={addOption} className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-black text-white rounded-lg">
          <Plus className="w-4 h-4" /> Agregar opción
        </button>
      </div>

      {options.length === 0 ? (
        <div className="rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium mb-1">Stock del producto</label>
          <input
            type="number"
            min="0"
            value={stock ?? ""}
            onChange={(event) => onChange({ options: [], variants: [], stock: event.target.value })}
            placeholder="Sin controlar"
            className="w-full sm:w-48 px-3 py-2 border border-gray-200 rounded-lg"
          />
          <p className="text-xs text-gray-500 mt-2">Déjalo vacío si todavía no controlas inventario.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {options.map((option, optionIndex) => (
              <div key={optionIndex} className="rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    value={option.nombre}
                    onChange={(event) => updateOption(optionIndex, { nombre: event.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg font-medium"
                    aria-label={`Nombre de opción ${optionIndex + 1}`}
                  />
                  <button type="button" onClick={() => rebuild(options.filter((_, i) => i !== optionIndex))} className="p-2 text-red-500" aria-label="Eliminar opción">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {option.valores.map((value, valueIndex) => (
                    <div key={valueIndex} className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <input
                        value={value}
                        onChange={(event) => updateOption(optionIndex, { valores: option.valores.map((v, i) => (i === valueIndex ? event.target.value : v)) })}
                        className="w-28 px-2 py-1.5 text-sm outline-none"
                        aria-label={`Valor ${valueIndex + 1}`}
                      />
                      <button type="button" disabled={option.valores.length === 1} onClick={() => updateOption(optionIndex, { valores: option.valores.filter((_, i) => i !== valueIndex) })} className="p-1.5 text-gray-400 disabled:opacity-30">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => updateOption(optionIndex, { valores: [...option.valores, `Valor ${option.valores.length + 1}`] })} className="px-2 py-1.5 text-sm border border-dashed border-gray-300 rounded-lg">
                    + Valor
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50 text-gray-500"><tr><th className="p-3 text-left">Variante</th><th className="p-3 text-left">SKU</th><th className="p-3 text-left">Precio</th><th className="p-3 text-left">Stock</th><th className="p-3 text-center">Activa</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {variants.map((variant, index) => (
                  <tr key={comboKey(variant.opciones)}>
                    <td className="p-3 font-medium">{Object.values(variant.opciones).join(" / ")}</td>
                    <td className="p-2"><input value={variant.sku || ""} onChange={(e) => updateVariant(index, "sku", e.target.value)} className="w-full px-2 py-1.5 border rounded" /></td>
                    <td className="p-2"><input type="number" min="0" step="0.01" value={variant.precio ?? ""} placeholder={String(basePrice || 0)} onChange={(e) => updateVariant(index, "precio", e.target.value === "" ? null : Number(e.target.value))} className="w-full px-2 py-1.5 border rounded" /></td>
                    <td className="p-2"><input type="number" min="0" value={variant.stock ?? 0} onChange={(e) => updateVariant(index, "stock", Math.max(0, Number(e.target.value)))} className="w-24 px-2 py-1.5 border rounded" /></td>
                    <td className="p-2 text-center"><input type="checkbox" checked={variant.activo !== false} onChange={(e) => updateVariant(index, "activo", e.target.checked)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
