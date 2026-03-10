"use client";

import React, { useMemo, useState } from "react";
import { Popover } from "@headlessui/react";
import { StickyNote } from "lucide-react";

export default function NotaProductoButton({ nota, onChange }) {
  const [draft, setDraft] = useState(nota ?? "");
  const hasNota = useMemo(() => (nota ?? "").trim().length > 0, [nota]);

  return (
    <Popover className="relative">
      <Popover.Button
        className="inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-100 transition"
        title={hasNota ? "Ver/editar nota" : "Agregar nota"}
        onClick={() => setDraft(nota ?? "")}
      >
        <StickyNote className={`h-5 w-5 ${hasNota ? "text-gray-900" : "text-gray-400"}`} />
      </Popover.Button>

      <Popover.Panel className="absolute z-50 mt-2 w-72 right-0 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
        <div className="text-sm font-medium text-gray-900">Nota del producto</div>

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder="Ej: Color rosa, agregar nombre, sin cebolla, etc."
          className="mt-2 w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
        />

        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            className="text-sm text-gray-500 hover:text-gray-700"
            onClick={() => {
              setDraft("");
              onChange?.(null);
            }}
          >
            Quitar
          </button>

          <button
            type="button"
            className="rounded-lg bg-black px-3 py-2 text-sm text-white hover:bg-gray-800"
            onClick={() => onChange?.(draft)}
          >
            Guardar
          </button>
        </div>
      </Popover.Panel>
    </Popover>
  );
}