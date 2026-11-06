// src/utils/getCodigoById.js
import { fetchFromApi } from "@/utils/api";

/**
 * getCodigoById(id)
 * Obtiene un código por su identificador estable.
 */
export async function getCodigoById(id) {
  if (!id) return null;
  try {
    return await fetchFromApi(`/codigos/id/${encodeURIComponent(id)}`, { method: "GET" });
  } catch (err) {
    console.error("[getCodigoById] error fetching codes:", err);
    throw err;
  }
}
