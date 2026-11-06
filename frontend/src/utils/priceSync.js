// src/utils/priceSync.js
// Utilidad independiente para chequear precios y devolver diffs + updatedItems + removed/inactive
export async function priceSync({ items = [], apiBase = "http://localhost:8000", signal = undefined } = {}) {
    if (!items || items.length === 0) return { changed: false };

    const rawIds = items.map((i) => (i?.id_producto ? String(i.id_producto).trim() : "")).filter(Boolean);
  
    // Validar ids tipo UUID (si no quieres validar, elimina el regex)
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    const validIds = rawIds.filter((rid) => uuidRegex.test(rid));
    if (validIds.length === 0) return { changed: false };
  
    let controller;
    if (!signal) {
      controller = new AbortController();
      signal = controller.signal;
    }
  
    try {
      // Intento POST con { ids: [...] }
      let res;
      try {
        res = await fetch(`${apiBase}/productos/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: validIds }),
          signal,
        });
      } catch (err) {
        throw err;
      }
  
      // fallback GET ?ids=a,b,c si backend devuelve 405/404
      if (res.status === 405 || res.status === 404) {
        const qs = validIds.join(",");
        res = await fetch(`${apiBase}/productos/batch?ids=${encodeURIComponent(qs)}`, { method: "GET", signal });
      }
  
      if (!res.ok) {
        let txt = "";
        try {
          txt = await res.text();
        } catch (e) {}
        console.warn("priceSync: respuesta no OK", res.status, txt);
        return { changed: false };
      }
  
      // parse JSON
      let productosList = await res.json();
  
      if (!Array.isArray(productosList)) {
        if (Array.isArray(productosList.productos)) productosList = productosList.productos;
        else if (Array.isArray(productosList.data)) productosList = productosList.data;
        else {
          console.warn("priceSync: formato inesperado", productosList);
          return { changed: false };
        }
      }
  
      // Build lookup con activo
      const lookup = new Map();
      productosList.forEach((p) => {
        const id = String(p.id_producto ?? p.id ?? p.uuid ?? p.product_id ?? "");
        if (!id) return;
        const precio = Number(p.precio ?? p.price ?? 0);
        const activo = p.activo === undefined ? true : Boolean(p.activo);
        lookup.set(id, { raw: p, precio, activo });
      });
  
      // Detectar removed / inactive
      const foundIds = new Set(Array.from(lookup.keys()));
      const removed = []; // ids solicitados que no están en respuesta
      const inactive = []; // objetos { id, raw } encontrados pero activo=false
      validIds.forEach((id) => {
        if (!foundIds.has(id)) removed.push(id);
        else {
          const rec = lookup.get(id);
          if (!rec.activo) inactive.push({ id, raw: rec.raw });
        }
      });
  
      const diffs = [];
      let changed = false;
      const updatedItems = items.map((it) => {
        const key = String(it.id_producto);
        const master = lookup.get(key);
  
        // si no existe master -> lo devolvemos tal cual (será tratado como removed por caller)
        if (!master) return { ...it };
  
        // si existe pero está inactivo -> devolvemos tal cual (caller podrá marcar/informar)
        if (!master.activo) return { ...it };
  
        const variant = it.id_variante
          ? (master.raw.variantes || []).find((v) => String(v.id_variante) === String(it.id_variante))
          : null;
        if (it.id_variante && (!variant || variant.activo === false || Number(variant.stock || 0) < Number(it.cantidad || 0))) {
          changed = true;
          if (!inactive.some((entry) => entry.id === key)) inactive.push({ id: key, raw: master.raw });
          return { ...it, status: "inactive" };
        }
        if (!it.id_variante && (master.raw.variantes || []).length > 0) {
          changed = true;
          if (!inactive.some((entry) => entry.id === key)) inactive.push({ id: key, raw: master.raw });
          return { ...it, status: "inactive" };
        }
        if (!it.id_variante && master.raw.stock != null && Number(master.raw.stock) < Number(it.cantidad || 0)) {
          changed = true;
          if (!inactive.some((entry) => entry.id === key)) inactive.push({ id: key, raw: master.raw });
          return { ...it, status: "inactive" };
        }
        const precioNuevo = Number(variant?.precio ?? master.precio ?? 0);
        const precioActual = Number(it.precio_unitario ?? it.precio ?? 0);
        if (precioNuevo !== precioActual) {
          changed = true;
          diffs.push({
            id_producto: key,
            nombre: it.nombre_producto ?? it.nombre ?? "",
            cantidad: Number(it.cantidad || 0),
            oldPrice: Number(precioActual),
            newPrice: Number(precioNuevo),
          });
        }
        const cantidad = Number(it.cantidad || 0);
        return {
          ...it,
          precio_unitario: precioNuevo,
          subtotal: Number((precioNuevo * cantidad).toFixed(2)),
        };
      });
  
      // changed es true si hay diffs o si hay removed/inactive (queremos alertar al usuario)
      const anyProblems = changed || removed.length > 0 || inactive.length > 0;
      return {
        changed: anyProblems,
        diffs,
        productos: productosList,
        updatedItems,
        removed,
        inactive,
      };
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("priceSync: aborted");
        return { changed: false };
      }
      console.error("priceSync error:", err);
      return { changed: false };
    } finally {
      if (controller) controller = null;
    }
  }
