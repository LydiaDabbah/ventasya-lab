// src/utils/getCodigoById.js
import { fetchFromApi } from "@/utils/api";

/**
 * getCodigoById(id)
 * - Llama a GET /codigos/ (lista) y busca el id.
 * - Devuelve null si no existe o lanza error si falla la petición.
 *
 * Nota: tu backend no tiene GET /codigos/{id} — solo /codigos/ y /codigos/{codigo}.
 * Por eso hacemos esta búsqueda en la lista. Si añades GET /codigos/id -> reemplaza aquí.
 */
export async function getCodigoById(id) {
  if (!id) return null;
  try {
    const list = await fetchFromApi(`/codigos/`, { method: "GET" });
    if (!Array.isArray(list)) return null;
    const found = list.find((c) => String(c.id) === String(id) || String(c.id) === String(id).toLowerCase());
    return found ?? null;
  } catch (err) {
    console.error("[getCodigoById] error fetching codes:", err);
    throw err;
  }
}