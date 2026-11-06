"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useVendedor } from "@/context/VendedorContext";

const CartContext = createContext(undefined);
const lineKey = (idProducto, idVariante = null) => `${String(idProducto || "")}::${String(idVariante || "base")}`;

export function CartProvider({ children }) {
  const { clave } = useVendedor();

  const [items, setItems] = useState([]);
  const itemsRef = useRef([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const [isHydrated, setIsHydrated] = useState(false);
  const storageKey = clave ? `cart_${clave}` : null;
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Hydration (localStorage)
  useEffect(() => {
    if (!storageKey) {
      setIsHydrated(true);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);

        const normalized = (Array.isArray(parsed) ? parsed : []).map((it) => ({
          ...it,
          id_producto: it?.id_producto ? String(it.id_producto) : it?.id_producto,
          id_variante: it?.id_variante ? String(it.id_variante) : null,
          cart_key: lineKey(it?.id_producto, it?.id_variante),
          nota_personalizable: it?.nota_personalizable ?? null,
          personalizable:
            typeof it?.personalizable === "boolean" ? it.personalizable : false,
        }));

        setItems(normalized);
        itemsRef.current = normalized;
      }
    } catch (err) {
      console.error("❌ Error leyendo carrito:", err);
    } finally {
      setIsHydrated(true);
    }
  }, [storageKey]);

  // Persistencia (debounced)
  useEffect(() => {
    if (!storageKey || !isHydrated) return;

    const id = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(itemsRef.current));
      } catch (err) {
        console.error("❌ Error guardando carrito:", err);
      }
    }, 250);

    return () => clearTimeout(id);
  }, [items, storageKey, isHydrated]);

  // ---------- cart operations ----------
  const addItem = useCallback((producto) => {
    const id_producto = producto?.id_producto ? String(producto.id_producto) : null;
    const precio_unitario = Number(
      producto?.precio ?? producto?.precio_unitario ?? 0
    );
    if (!id_producto) return;

    const prev = itemsRef.current || [];
    const id_variante = producto?.id_variante ? String(producto.id_variante) : null;
    const key = lineKey(id_producto, id_variante);
    const existing = prev.find((it) => lineKey(it.id_producto, it.id_variante) === key);

    let nextItems;
    if (existing) {
      nextItems = prev.map((it) =>
        lineKey(it.id_producto, it.id_variante) === key
          ? {
              ...it,
              cantidad: (Number(it.cantidad) || 0) + 1,
              subtotal:
                ((Number(it.cantidad) || 0) + 1) *
                (Number(it.precio_unitario) || precio_unitario || 0),
            }
          : it
      );
    } else {
      const newItem = {
        id_producto,
        id_variante,
        cart_key: key,
        nombre_variante: producto?.nombre_variante ?? null,
        opciones_variante: producto?.opciones_variante ?? null,
        nombre_producto: producto?.nombre ?? producto?.nombre_producto ?? "",
        precio_unitario,
        cantidad: 1,
        subtotal: precio_unitario,
        imagen_url: producto?.imagen_url ?? null,
        nota_personalizable: null,
        personalizable:
          typeof producto?.personalizable === "boolean"
            ? producto.personalizable
            : false,
      };
      nextItems = [...prev, newItem];
    }

    itemsRef.current = nextItems;
    setItems(nextItems);
  }, []);

  const updateQuantity = useCallback((id_producto_raw, nuevaCantidad, id_variante_raw = null) => {
    const id_producto = id_producto_raw ? String(id_producto_raw) : id_producto_raw;
    const prev = itemsRef.current || [];
    const key = lineKey(id_producto, id_variante_raw);

    let nextItems;
    if (nuevaCantidad <= 0) {
      nextItems = prev.filter((item) => lineKey(item.id_producto, item.id_variante) !== key);
    } else {
      nextItems = prev.map((item) =>
        lineKey(item.id_producto, item.id_variante) === key
          ? {
              ...item,
              cantidad: Number(nuevaCantidad),
              subtotal: Number(nuevaCantidad) * Number(item.precio_unitario || 0),
            }
          : item
      );
    }

    itemsRef.current = nextItems;
    setItems(nextItems);
  }, []);

  const updateNotaPersonalizable = useCallback((id_producto_raw, nota, id_variante_raw = null) => {
    const id_producto = id_producto_raw ? String(id_producto_raw) : id_producto_raw;
    const prev = itemsRef.current || [];
    const key = lineKey(id_producto, id_variante_raw);

    const nextItems = prev.map((item) => {
      if (lineKey(item.id_producto, item.id_variante) !== key) return item;

      if (!item.personalizable) {
        return { ...item, nota_personalizable: null };
      }

      const clean = (nota ?? "").toString().trim();
      return { ...item, nota_personalizable: clean.length ? clean : null };
    });

    itemsRef.current = nextItems;
    setItems(nextItems);
  }, []);

  const removeItem = useCallback((id_producto_raw, id_variante_raw = null) => {
    const id_producto = id_producto_raw ? String(id_producto_raw) : id_producto_raw;
    const prev = itemsRef.current || [];
    const key = lineKey(id_producto, id_variante_raw);
    const nextItems = prev.filter((item) => lineKey(item.id_producto, item.id_variante) !== key);

    itemsRef.current = nextItems;
    setItems(nextItems);
  }, []);

  const getItemQuantity = useCallback(
    (id_producto_raw, id_variante_raw = null) => {
      const id_producto = id_producto_raw ? String(id_producto_raw) : id_producto_raw;
      const key = lineKey(id_producto, id_variante_raw);
      const found = (items || []).find((it) => lineKey(it.id_producto, it.id_variante) === key);
      return found ? Number(found.cantidad || 0) : 0;
    },
    [items]
  );

  const getItemById = useCallback(
    (id_producto_raw, id_variante_raw = null) => {
      const id_producto = id_producto_raw ? String(id_producto_raw) : id_producto_raw;
      const key = lineKey(id_producto, id_variante_raw);
      return (items || []).find((it) => lineKey(it.id_producto, it.id_variante) === key) || null;
    },
    [items]
  );

  const clearCart = useCallback(() => {
    itemsRef.current = [];
    setItems([]);
  }, []);

  const applyPriceUpdates = useCallback(
    (updatedItems) => {
      if (!Array.isArray(updatedItems)) return;

      const normalized = updatedItems.map((it) => ({
        ...it,
        id_producto: it?.id_producto ? String(it.id_producto) : it?.id_producto,
        id_variante: it?.id_variante ? String(it.id_variante) : null,
        cart_key: lineKey(it?.id_producto, it?.id_variante),
        precio_unitario: Number(it.precio_unitario || it.precio || 0),
        cantidad: Number(it.cantidad || 0),
        subtotal: Number(
          it.subtotal || Number(it.cantidad || 0) * Number(it.precio_unitario || 0)
        ),
        nombre_producto: it.nombre_producto ?? it.nombre ?? it.title ?? "",
        imagen_url: it.imagen_url ?? it.image_url ?? null,
        nota_personalizable: it?.nota_personalizable ?? null,
        personalizable:
          typeof it?.personalizable === "boolean" ? it.personalizable : false,
      }));

      const prev = itemsRef.current || [];
      const byId = new Map(normalized.map((ni) => [lineKey(ni.id_producto, ni.id_variante), ni]));

      const merged = prev.map((p) => {
        const k = lineKey(p.id_producto, p.id_variante);
        if (!byId.has(k)) return p;

        const ni = byId.get(k);
        const cantidad = Number(p.cantidad || ni.cantidad || 0);
        const precio_unitario = Number(ni.precio_unitario || p.precio_unitario || 0);

        const personalizable =
          typeof ni?.personalizable === "boolean"
            ? ni.personalizable
            : typeof p?.personalizable === "boolean"
            ? p.personalizable
            : false;

        return {
          ...p,
          precio_unitario,
          subtotal: cantidad * precio_unitario,
          personalizable,
          nota_personalizable: personalizable
            ? p?.nota_personalizable ?? ni?.nota_personalizable ?? null
            : null,
        };
      });

      itemsRef.current = merged;
      setItems(merged);

      try {
        if (storageKey) localStorage.setItem(storageKey, JSON.stringify(merged));
      } catch {}
    },
    [storageKey]
  );

  const totalItems = items.reduce(
    (sum, item) => sum + (Number(item.cantidad) || 0),
    0
  );
  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.subtotal) || 0),
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        updateNotaPersonalizable,
        removeItem,
        clearCart,
        totalItems,
        totalAmount,
        getItemQuantity,
        getItemById,
        API,
        isHydrated,
        applyPriceUpdates,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart debe usarse dentro de un CartProvider");
  }
  return context;
}
