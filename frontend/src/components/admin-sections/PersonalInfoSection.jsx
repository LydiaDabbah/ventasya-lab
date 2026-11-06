"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { API_URL, authHeaders } from "@/utils/api";

export default function PersonalInfoSection() {
  const { vendedor, setVendedor } = useAuth();
  const [form, setForm] = useState({ nombre: "", nombre_negocio: "", email: "", telefono: "", moneda: "MXN" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!vendedor) return;
    setForm({
      nombre: vendedor.nombre || "",
      nombre_negocio: vendedor.nombre_negocio || "",
      email: vendedor.email || "",
      telefono: vendedor.telefono || "",
      moneda: vendedor.moneda || "MXN",
    });
  }, [vendedor]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/vendedores/me`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.detail || "No se pudieron guardar los cambios");
      setVendedor(body);
      setMessage("Información actualizada correctamente.");
    } catch (err) {
      setError(err.message || "No se pudieron guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-black mb-2">Información del negocio</h1>
        <p className="text-gray-600 text-sm sm:text-base">Estos datos identifican tu cuenta y tu catálogo.</p>
      </div>
      <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-5">
        {message && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {[
            ["nombre", "Nombre del responsable", "text"],
            ["nombre_negocio", "Nombre del negocio", "text"],
            ["email", "Correo", "email"],
            ["telefono", "Teléfono / WhatsApp", "tel"],
          ].map(([field, label, type]) => (
            <label key={field} className="block">
              <span className="block text-sm font-medium text-black mb-2">{label}</span>
              <input
                type={type}
                required
                value={form[field]}
                onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </label>
          ))}
          <label className="block">
            <span className="block text-sm font-medium text-black mb-2">Moneda</span>
            <select value={form.moneda} onChange={(event) => setForm((prev) => ({ ...prev, moneda: event.target.value }))} className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white">
              <option value="MXN">MXN — Peso mexicano</option>
              <option value="USD">USD — Dólar estadounidense</option>
            </select>
          </label>
          <div className="block">
            <span className="block text-sm font-medium text-black mb-2">URL del catálogo</span>
            <div className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600">/{vendedor?.clave}</div>
          </div>
        </div>
        <div className="pt-2">
          <button type="submit" disabled={saving} className="w-full sm:w-auto bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50">
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
