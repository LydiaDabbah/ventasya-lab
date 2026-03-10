"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { validateCodigo } from "@/utils/validateCodigo";
import { getCodigoById } from "@/utils/getCodigoById";

const CotizacionContext = createContext(null);

export function useCotizacion() {
  const ctx = useContext(CotizacionContext);
  if (!ctx) throw new Error("useCotizacion debe usarse dentro de <CotizacionProvider>");
  return ctx;
}

export function CotizacionProvider({ children, numeroCotizacion = null, token = null }) {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();

  const numeroFromUrl = params?.numero ?? null;
  const tokenFromUrl = search?.get("token") ?? null;

  const numero = numeroCotizacion || numeroFromUrl;
  const providedToken = token || tokenFromUrl;

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const tokenRef = useRef(providedToken ?? null);

  const [cotizacion, setCotizacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditable, setIsEditable] = useState(false);

  // =============================
  // CALCULOS
  // =============================
  const subtotal = (cotizacion?.productos || []).reduce((s, p) => {
    const itemSubtotal = Number(
      p.subtotal ?? (Number(p.precio_unitario || 0) * Number(p.cantidad || 0))
    );
    return s + itemSubtotal;
  }, 0);

  const totalCalculado = Number(
    (
      subtotal -
      Number(cotizacion?.descuento_aplicado ?? 0) +
      Number(cotizacion?.costo_envio ?? 0)
    ).toFixed(2)
  );

  // =============================
  // FETCH
  // =============================
  useEffect(() => {
    let mounted = true;

    if (!numero) {
      setLoading(false);
      setError("No hay número de cotización");
      return;
    }

    const fetchCotizacion = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API}/cotizaciones/numero/${encodeURIComponent(numero)}`);

        if (!res.ok) {
          if (res.status === 404) router.replace("/404");
          return;
        }

        const data = await res.json();
        if (!mounted) return;

        const productos = (data?.productos || []).map((p) => ({
          ...p,
          nota_personalizable: p?.nota_personalizable ?? null,
        }));

        // ✅ asegurar campo de envio aunque venga null
        setCotizacion({
          ...data,
          descripcion_envio: data?.descripcion_envio ?? "por_definir",
          costo_envio: Number(data?.costo_envio ?? 0),
          productos,
        });

        tokenRef.current = providedToken ?? tokenRef.current;

        if (
          tokenRef.current &&
          data?.editable_token === tokenRef.current &&
          data?.editable_token_active !== false
        ) {
          setIsEditable(true);
        } else {
          setIsEditable(false);
        }
      } catch (err) {
        setError(err?.message || "Error cargando cotización");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCotizacion();
    return () => (mounted = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numero]);

  // =============================
  // MUTACIONES
  // =============================
  const updateCantidad = (id_producto, nuevaCantidad) => {
    const qty = Math.max(1, Number(nuevaCantidad || 1));

    setCotizacion((prev) => {
      if (!prev) return prev;

      const productos = (prev.productos || []).map((p) =>
        String(p.id_producto) === String(id_producto)
          ? {
              ...p,
              cantidad: qty,
              subtotal: Number(
                ((Number(p.precio_unitario || 0) * qty) || 0).toFixed(2)
              ),
            }
          : p
      );

      return { ...prev, productos };
    });
  };

  const eliminarProducto = (id_producto) => {
    setCotizacion((prev) => {
      if (!prev) return prev;

      const productos = (prev.productos || []).filter(
        (p) => String(p.id_producto) !== String(id_producto)
      );

      return { ...prev, productos };
    });
  };

  const updateNotaPersonalizable = (id_producto, nota) => {
    setCotizacion((prev) => {
      if (!prev) return prev;

      const productos = (prev.productos || []).map((p) =>
        String(p.id_producto) === String(id_producto)
          ? { ...p, nota_personalizable: nota ?? null }
          : p
      );

      return { ...prev, productos };
    });
  };

  const agregarProducto = (producto, cantidadSeleccionada = 1) => {
    setCotizacion((prev) => {
      const qty = Math.max(1, Number(cantidadSeleccionada || 1));
      const pid = String(producto?.id_producto ?? "");

      if (!pid) return prev;

      const imagen_url =
        producto?.imagen_url ??
        producto?.imagen ??
        producto?.imagen_principal ??
        producto?.foto_url ??
        producto?.imagenes?.[0]?.url ??
        producto?.imagenes?.[0]?.imagen_url ??
        null;

      const nombre_producto = producto?.nombre_producto ?? producto?.nombre ?? "Producto";
      const precio_unitario = Number(producto?.precio_unitario ?? producto?.precio ?? 0);

      const prevProductos = prev?.productos || [];
      const idx = prevProductos.findIndex((p) => String(p.id_producto) === pid);

      if (idx >= 0) {
        const existente = prevProductos[idx];
        const nuevaCantidad = Math.max(1, Number(existente?.cantidad || 0) + qty);
        const precio = Number(existente?.precio_unitario ?? precio_unitario ?? 0);

        const updated = {
          ...existente,
          nombre_producto: existente?.nombre_producto ?? nombre_producto,
          precio_unitario: Number(existente?.precio_unitario ?? precio),
          imagen_url: existente?.imagen_url ?? imagen_url,
          cantidad: nuevaCantidad,
          subtotal: Number((precio * nuevaCantidad).toFixed(2)),
          nota_personalizable: existente?.nota_personalizable ?? null,
        };

        const productos = [...prevProductos];
        productos[idx] = updated;

        return { ...(prev || {}), productos };
      }

      const nuevo = {
        id_producto: producto?.id_producto,
        imagen_url,
        nombre_producto,
        precio_unitario,
        nombre: producto?.nombre ?? undefined,
        precio: producto?.precio ?? undefined,
        cantidad: qty,
        subtotal: Number((precio_unitario * qty).toFixed(2)),
        nota_personalizable: null,
      };

      return { ...(prev || {}), productos: [...prevProductos, nuevo] };
    });
  };

  // =============================
  // VALIDAR MÍNIMO SOLO AL GUARDAR
  // =============================
  const validarCodigoEnGuardado = async ({ idVendedor = null } = {}) => {
    const idCodigo = cotizacion?.id_codigo_descuento ?? null;
    const snapshotCodigo = cotizacion?.codigo_descuento ?? cotizacion?.codigo ?? "";

    if (!idCodigo && !snapshotCodigo) return { ok: true };

    let codigoParaValidar = snapshotCodigo;

    if (!codigoParaValidar && idCodigo) {
      try {
        const c = await getCodigoById(idCodigo);
        codigoParaValidar = c?.codigo ?? "";
      } catch {
        codigoParaValidar = "";
      }
    }

    if (!codigoParaValidar) {
      return {
        error: true,
        code: "CODIGO_NO_RESUELTO",
        message:
          "No pude validar el código de descuento (falta el texto del código). Quita el código y vuélvelo a aplicar.",
      };
    }

    try {
      const validated = await validateCodigo(codigoParaValidar, {
        subtotal: Number(subtotal || 0),
        idVendedor,
        path: "/codigos/validate",
      });

      const minimo = validated?.minimo_compra ?? validated?.raw?.minimo_compra ?? null;
      if (minimo != null && Number(subtotal || 0) < Number(minimo || 0)) {
        return {
          error: true,
          code: "MINIMO_NO_CUMPLE",
          message: `Este código requiere un mínimo de $${Number(minimo || 0).toLocaleString(
            "es-MX"
          )} MXN. Quita el código o modifica productos.`,
        };
      }

      return { ok: true };
    } catch (err) {
      const backendMsg = err?.message || "";

      if (
        backendMsg.toLowerCase().includes("mínimo") ||
        backendMsg.toLowerCase().includes("minimo")
      ) {
        return {
          error: true,
          code: "MINIMO_NO_CUMPLE",
          message:
            "Este código no cumple el mínimo requerido. Agrega productos o quita el código de descuento para poder guardar.",
        };
      }

      return {
        error: true,
        code: "CODIGO_INVALIDO",
        message:
          "El código de descuento no es válido. Quita el código para poder guardar la cotización.",
      };
    }
  };

  // =============================
  // SAVE
  // =============================
  const saveCotizacion = async ({ idVendedor = null } = {}) => {
    if (!cotizacion?.id_cotizacion) return { error: true };

    const valid = await validarCodigoEnGuardado({ idVendedor });
    if (valid?.error) return valid;

    setSaving(true);
    try {
      const payload = {
        telefono_cliente: cotizacion.telefono_cliente,
        nombre_cliente: cotizacion.nombre_cliente,
        email_cliente: cotizacion.email_cliente,
        comentarios: cotizacion.comentarios,
        direccion: cotizacion.direccion,
        id_codigo_descuento: cotizacion.id_codigo_descuento,
        descuento_aplicado: cotizacion.descuento_aplicado,

        // ✅ ESTE ERA EL BUG
        descripcion_envio: cotizacion.descripcion_envio ?? "por_definir",
        costo_envio: Number(cotizacion.costo_envio ?? 0),

        total: totalCalculado,

        productos: (cotizacion.productos || []).map((p) => ({
          id_producto: p.id_producto,
          cantidad: p.cantidad,
          precio_unitario: p.precio_unitario,
          nombre_producto: p.nombre_producto,
          subtotal: p.subtotal,
          nota_personalizable: p.nota_personalizable ?? null,
        })),
      };

      const res = await fetch(
        `${API}/cotizaciones/${cotizacion.id_cotizacion}/editar?token=${tokenRef.current}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        let msg = "No se pudo guardar la cotización.";
        try {
          const err = await res.json();
          msg = err?.detail || msg;
        } catch {}
        return { error: true, message: msg };
      }

      const data = await res.json();

      const productos = (data?.productos || []).map((p) => ({
        ...p,
        nota_personalizable: p?.nota_personalizable ?? null,
      }));

      setCotizacion({
        ...data,
        descripcion_envio: data?.descripcion_envio ?? "por_definir",
        costo_envio: Number(data?.costo_envio ?? 0),
        productos,
      });

      return { ok: true };
    } catch (err) {
      return { error: true, message: err?.message || "Error guardando cotización." };
    } finally {
      setSaving(false);
    }
  };

  return (
    <CotizacionContext.Provider
      value={{
        cotizacion,
        setCotizacion,
        loading,
        saving,
        error,
        subtotal,
        totalCalculado,
        updateCantidad,
        eliminarProducto,
        agregarProducto,
        updateNotaPersonalizable,
        saveCotizacion,
        numeroCotizacion: numero,
        isEditable,
      }}
    >
      {children}
    </CotizacionContext.Provider>
  );
}