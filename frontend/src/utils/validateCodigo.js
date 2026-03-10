// src/utils/validateCodigo.js
import { fetchFromApi } from "@/utils/api";

/**
 * validateCodigo(code, opts)
 * - code: string
 * - opts: { subtotal?: number, idVendedor?: string|null, path?: string }
 *
 * Retorna objeto normalizado { id, codigo, tipo, valor, monto, descripcion, raw }
 * Lanza Error con message en caso de fallo.
 */
export async function validateCodigo(code, opts = {}) {
  if (!code || !String(code).trim()) throw new Error("Código vacío");
  const codigoUpper = String(code).trim().toUpperCase();
  const { subtotal = 0, idVendedor = null, path = "/codigos/validate" } = opts;

  const body = { codigo: codigoUpper, subtotal: Number(subtotal || 0) };
  if (idVendedor) body.id_vendedor = idVendedor;

  const res = await fetchFromApi(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // Normalización defensiva: backend puede devolver distintos nombres
  const id = res.id ?? res.uuid ?? null;
  const codigoResp = res.codigo ?? res.code ?? codigoUpper;
  const tipo = res.tipo ?? res.kind ?? (res.valor !== undefined ? "fijo" : "porcentaje");
  const valor = Number(res.valor ?? res.monto ?? res.discount_value ?? 0);
  const monto = Number(res.monto ?? res.valor ?? valor);
  const descripcion = res.descripcion ?? res.detail ?? null;

  return { id, codigo: codigoResp, tipo, valor, monto, descripcion, raw: res };
}