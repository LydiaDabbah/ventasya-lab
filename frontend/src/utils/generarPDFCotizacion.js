import { jsPDF } from "jspdf";

export async function generarPDFCotizacion({
  cotizacion,
  subtotal,
  total,
  vendedor = {},
  cotizacionUrl = "",
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();

  const M = 50;
  const IW = PAGE_W - M * 2;
  const FOOTER_Y = PAGE_H - 28;
  const CONTENT_BOTTOM = PAGE_H - 80;

  const C = {
    black: [20, 20, 20],
    white: [255, 255, 255],
    text: [30, 30, 30],
    darkGray: [90, 90, 90],
    midGray: [120, 120, 120],
    lightGray: [210, 210, 210],
    accent: [20, 20, 20],
  };

  const fmt = (n) =>
    `$${Number(n || 0).toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const safe = (v, fb = "—") => (v || v === 0 ? String(v) : fb);
  const getComentarioCotizacion = (cot) =>
    cot?.comentarios ?? cot?.comentario ?? cot?.notas ?? cot?.nota ?? null;
  const getNotaProducto = (item) =>
    item?.nota_personalizable ?? item?.nota ?? item?.comentario ?? item?.observaciones ?? null;

  const fecha = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const numero = safe(cotizacion?.numero_cotizacion || cotizacion?.numero_orden, "—");
  const tienda = vendedor?.nombre_tienda || vendedor?.nombre_negocio || vendedor?.nombre || "Mi Tienda";
  const vendedorNombre = vendedor?.nombre || vendedor?.nombre_vendedor || "";
  const vendedorEmail = vendedor?.email || vendedor?.correo || "";
  const vendedorTel = vendedor?.telefono_whatsapp || vendedor?.telefono || "";
  const comentarioCotizacion = String(getComentarioCotizacion(cotizacion) || "").trim() || "Sin comentarios";

  let y = 0;

  const text = (str, x, yy, { size = 9, color = C.text, style = "normal" } = {}) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(String(str), x, yy);
  };

  const textRight = (str, rightX, yy, opts = {}) => {
    doc.setFont("helvetica", opts.style || "normal");
    doc.setFontSize(opts.size || 9);
    doc.setTextColor(...(opts.color || C.text));
    doc.text(String(str), rightX, yy, { align: "right" });
  };

  // Letter-spacing simulado — solo para labels en mayúsculas (FOLIO, FECHA, CLIENTE, headers tabla)
  const textSpaced = (str, x, yy, { size = 7, color = C.midGray, spacing = 0.6 } = {}) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    let cx = x;
    for (const ch of String(str)) {
      doc.text(ch, cx, yy);
      cx += doc.getTextWidth(ch) + spacing;
    }
    return cx - spacing; // retorna x final
  };

  const textSpacedRight = (str, rightX, yy, { size = 7, color = C.midGray, spacing = 0.6 } = {}) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    let totalW = 0;
    for (const ch of String(str)) totalW += doc.getTextWidth(ch) + spacing;
    totalW -= spacing;
    let cx = rightX - totalW;
    for (const ch of String(str)) {
      doc.text(ch, cx, yy);
      cx += doc.getTextWidth(ch) + spacing;
    }
  };

  const line = (x1, yy, x2, { color = C.lightGray, thickness = 0.5 } = {}) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(thickness);
    doc.line(x1, yy, x2, yy);
  };

  // ─── FOOTER ───────────────────────────────────────────────────────────────
  const drawFooterOnCurrentPage = () => {
    line(M, FOOTER_Y - 20, PAGE_W - M, { color: C.lightGray, thickness: 0.5 });
    text("Este documento es una cotización, no una factura fiscal.", M, FOOTER_Y - 8, { size: 7, color: C.midGray });
    text("Los precios pueden cambiar sin previo aviso.", M, FOOTER_Y, { size: 7, color: C.midGray });
    textRight(tienda, PAGE_W - M, FOOTER_Y - 8, { size: 8, color: C.text, style: "bold" });
    const contactParts = [];
    if (vendedorEmail) contactParts.push(vendedorEmail);
    if (vendedorTel) contactParts.push(`WhatsApp: ${vendedorTel}`);
    if (cotizacionUrl) contactParts.push(cotizacionUrl);
    textRight(contactParts.join("  |  "), PAGE_W - M, FOOTER_Y, { size: 7, color: C.midGray });
  };

  const ensureSpace = (needed, drawTableHeader = null) => {
    if (y + needed <= CONTENT_BOTTOM) return;
    doc.addPage();
    y = M;
    if (drawTableHeader) drawTableHeader();
  };

  // ─── ENCABEZADO ───────────────────────────────────────────────────────────
  // baseline compartido: nombre tienda, contacto, folio y fecha alineados juntos
  const nameY = 68;       // baseline nombre tienda
  const contactY = 83;    // baseline línea de contacto (WhatsApp, email)

  // Nombre tienda
  text(tienda, M, nameY, { style: "bold", size: 18, color: C.text });

  // Contacto — mismo baseline que folio/fecha value
  const contactLine = [vendedorEmail, vendedorTel ? `WhatsApp ${vendedorTel}` : ""].filter(Boolean).join(" · ");
  if (contactLine) text(contactLine, M, contactY, { size: 8, color: C.midGray });

  // Divisor vertical alineado entre folio y fecha
  const dividerX = PAGE_W - M - 85;
  doc.setDrawColor(...C.lightGray);
  doc.setLineWidth(0.5);
  doc.line(dividerX, nameY - 14, dividerX, contactY + 2);

  // FOLIO — etiqueta spaced arriba, valor en contactY (alineado con WhatsApp)
  textSpacedRight("FOLIO", dividerX - 16, nameY - 4, { size: 7, color: C.midGray, spacing: 0.6 });
  textRight(`# ${numero}`, dividerX - 16, contactY, { style: "bold", size: 9, color: C.text });

  // FECHA — etiqueta spaced arriba, valor en contactY (alineado con WhatsApp)
  textSpaced("FECHA", dividerX + 12, nameY - 4, { size: 7, color: C.midGray, spacing: 0.6 });
  text(fecha, dividerX + 12, contactY, { size: 9, color: C.text });

  // Línea negra bajo encabezado
  y = contactY + 16;
  line(M, y, PAGE_W - M, { color: C.black, thickness: 1.2 });
  y += 26;

  // ─── CLIENTE ──────────────────────────────────────────────────────────────
  textSpaced("CLIENTE", M, y, { size: 7, color: C.midGray, spacing: 0.6 });
  y += 15;

  const colL = M;
  const colR = M + IW / 2 + 10;
  const labelSize = 7;
  const valueSize = 9;
  const rowGap = 26;

  // Fila 1: Nombre | Dirección
  text("Nombre", colL, y, { size: labelSize, color: C.midGray });
  text("Dirección", colR, y, { size: labelSize, color: C.midGray });
  y += 12;
  text(safe(cotizacion?.cliente?.nombre || cotizacion?.nombre_cliente), colL, y, { size: valueSize });
  const direccion = safe(cotizacion?.cliente?.direccion || cotizacion?.direccion);
  const dirLines = doc.splitTextToSize(direccion, IW / 2 - 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(valueSize);
  doc.setTextColor(...C.darkGray);
  doc.text(dirLines, colR, y);
  y += rowGap;

  // Fila 2: Teléfono | Comentarios
  text("Teléfono", colL, y, { size: labelSize, color: C.midGray });
  text("Comentarios", colR, y, { size: labelSize, color: C.midGray });
  y += 12;
  text(safe(cotizacion?.cliente?.telefono || cotizacion?.telefono_cliente), colL, y, { size: valueSize });
  const comentarioLines = doc.splitTextToSize(comentarioCotizacion, IW / 2 - 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(valueSize);
  doc.setTextColor(...C.darkGray);
  doc.text(comentarioLines.slice(0, 2), colR, y);
  y += rowGap;

  // Fila 3: Email
  text("Email", colL, y, { size: labelSize, color: C.midGray });
  y += 12;
  text(safe(cotizacion?.cliente?.email || cotizacion?.email_cliente), colL, y, { size: valueSize, color: C.darkGray });
  y += rowGap + 14;

  // ─── TABLA PRODUCTOS ──────────────────────────────────────────────────────
  const cols = {
    producto: M,
    precio: M + IW - 150,
    cantidad: M + IW - 80,
    total: M + IW,
  };

  const drawProductsHeader = () => {
    // headers con letter-spacing sutil
    textSpaced("Producto", cols.producto, y, { size: 8, color: C.midGray, spacing: 0.5 });
    textSpacedRight("Precio unit.", cols.precio + 55, y, { size: 8, color: C.midGray, spacing: 0.5 });
    textSpacedRight("Cant.", cols.cantidad + 15, y, { size: 8, color: C.midGray, spacing: 0.5 });
    textSpacedRight("Subtotal", cols.total, y, { size: 8, color: C.midGray, spacing: 0.5 });
    y += 7;
    line(M, y, PAGE_W - M, { color: C.black, thickness: 1.2 });
    y += 16;
  };

  drawProductsHeader();

  let subtotalCalc = 0;
  (cotizacion?.productos || []).forEach((p) => {
    const precio = Number(p?.precio_unitario || 0);
    const cantidad = Number(p?.cantidad || 0);
    const subtotalRow = Number(p?.subtotal ?? precio * cantidad);
    subtotalCalc += subtotalRow;

    const nota = String(getNotaProducto(p) || "").trim();
    const need = nota ? 44 : 30;
    ensureSpace(need, drawProductsHeader);

    const nombreBase = p?.nombre_producto || p?.nombre || "Producto";
    const nombreCorto = String(nombreBase).length > 42 ? `${String(nombreBase).substring(0, 42)}...` : String(nombreBase);

    text(nombreCorto, cols.producto, y, { size: 9 });
    textRight(fmt(precio), cols.precio + 55, y, { size: 9, color: C.darkGray });
    textRight(String(cantidad), cols.cantidad + 15, y, { size: 9, color: C.darkGray });
    textRight(fmt(subtotalRow), cols.total, y, { size: 9, style: "bold" });

    if (nota) {
      y += 14;
      text(`Nota: ${nota}`, cols.producto, y, { size: 8, color: C.midGray });
    }

    y += 12;
    line(M, y, PAGE_W - M, { color: C.lightGray, thickness: 0.5 });
    y += 14;
  });

  // ─── TOTALES ──────────────────────────────────────────────────────────────
  ensureSpace(100);
  y += 12;

  const tx = PAGE_W - M - 150;
  const vx = PAGE_W - M;
  const totalRowH = 20;

  const descuento = Number(cotizacion?.descuento_aplicado || cotizacion?.descuento?.monto || 0);
  const subtotalVal = Number(subtotal ?? subtotalCalc);
  const envioVal =
    cotizacion?.envio?.modo === "monto" || Number(cotizacion?.costo_envio || 0) > 0
      ? fmt(cotizacion?.envio?.monto || cotizacion?.costo_envio || 0)
      : cotizacion?.envio?.modo === "incluido"
        ? "Incluido"
        : "Por definir";
  const totalVal = Number(total ?? subtotalVal - descuento + Number(cotizacion?.costo_envio || 0));

  const drawTotalRow = (label, value, { bold = false } = {}) => {
    textRight(label, tx + 70, y, { style: "normal", size: 9, color: C.midGray });
    textRight(value, vx, y, { style: bold ? "bold" : "normal", size: bold ? 10 : 9, color: C.text });
    y += totalRowH;
  };

  drawTotalRow("Subtotal:", fmt(subtotalVal));
  if (descuento > 0) drawTotalRow("Descuento:", `-${fmt(descuento)}`);
  drawTotalRow("Envío:", envioVal);

  y += 4;
  line(tx + 30, y, vx, { color: C.black, thickness: 0.8 });
  y += 16;
  drawTotalRow("Total:", fmt(totalVal), { bold: true });

  // ─── FOOTER EN TODAS LAS PÁGINAS ──────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    drawFooterOnCurrentPage();
  }

  doc.save(`Cotizacion-${numero}.pdf`);
}