// utils/createCotizacion.js
import { fetchFromApi } from "@/utils/api";

/**
 * createCotizacion(payload)
 * - Hace POST a /cotizaciones/ (endpoint de cotizaciones)
 * - Devuelve data JSON si OK, o lanza Error con message legible si falla.
 */
export async function createCotizacion(payload) {
  try {
    const data = await fetchFromApi("/cotizaciones/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return data;
  } catch (err) {
    // fetchFromApi ya lanza Error con message = detail backend cuando no ok
    const message = err?.message || (err?.detail ? err.detail : "Error al crear la cotización");
    throw new Error(message);
  }
}
