// src/hooks/useDiscountCode.js
import { useCallback, useState } from "react";
import { validateCodigo } from "@/utils/validateCodigo";

/**
 * useDiscountCode
 * - Stateless regarding "applied" (devuelve solo el resultado).
 * - Maneja applying + error.
 */
export default function useDiscountCode({ defaultPath = "/codigos/validate" } = {}) {
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  const apply = useCallback(
    async ({ codigo, subtotal = 0, idVendedor = null, path = null } = {}) => {
      setError("");

      if (!codigo || !String(codigo).trim()) {
        const msg = "Ingresa un código de descuento";
        setError(msg);
        throw new Error(msg);
      }

      setApplying(true);
      try {
        const validated = await validateCodigo(codigo, {
          subtotal,
          idVendedor,
          path: path ?? defaultPath,
        });

        // devuelve el objeto validado al consumidor (no guarda estado interno)
        return validated;
      } catch (err) {
        const msg = err?.message || "Error validando el código";
        setError(msg);
        throw err;
      } finally {
        setApplying(false);
      }
    },
    [defaultPath]
  );

  const clearError = useCallback(() => setError(""), []);

  return { applying, error, apply, clearError };
}