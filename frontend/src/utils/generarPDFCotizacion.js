// utils/generarPDFCotizacion.js
import { jsPDF } from "jspdf";

export function generarPDFCotizacion({ cotizacion, subtotal, total, vendedor = {} }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 48;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const BLACK   = [15, 15, 15];
  const GRAY_DK = [80, 80, 80];
  const GRAY_MD = [130, 130, 130];
  const GRAY_LT = [220, 220, 220];
  const WHITE   = [255, 255, 255];

  const setColor = (rgb) => doc.setTextColor(...rgb);
  const setFill  = (rgb) => doc.setFillColor(...rgb);
  const setDraw  = (rgb) => doc.setDrawColor(...rgb);
  const fmt      = (n)   => `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
  const safe     = (v, fb = "—") => (v || v === 0 ? String(v) : fb);

  let y = 0;

  // ── HEADER ──────────────────────────────────────────────────────
  setFill(BLACK);
  doc.rect(0, 0, PAGE_W, 80, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  setColor(WHITE);
  doc.text(vendedor?.nombre_tienda || vendedor?.nombre || "Mi Tienda", MARGIN, 50);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("COTIZACIÓN", PAGE_W - MARGIN, 38, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const numCot = cotizacion?.numero_cotizacion || "—";
  doc.text(`#${numCot}`, PAGE_W - MARGIN, 57, { align: "right" });

  y = 100;

  // ── DATE ROW ─────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(GRAY_MD);
  const today = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
  doc.text(`Fecha: ${today}`, MARGIN, y);
  doc.text(`Estado: ${cotizacion?.estado || "Pendiente"}`, PAGE_W - MARGIN, y, { align: "right" });
  y += 28;

  // ── INFO BOXES ────────────────────────────────────────────────────
  const colW = (CONTENT_W - 24) / 2;

  const drawInfoBox = (x, w, title, rows) => {
    const boxH = 20 + rows.length * 20 + 14;
    setFill([248, 248, 248]);
    setDraw(GRAY_LT);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, w, boxH, 4, 4, "FD");
    setFill([235, 235, 235]);
    doc.roundedRect(x, y, w, 22, 4, 4, "F");
    doc.rect(x, y + 10, w, 12, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setColor(BLACK);
    doc.text(title, x + 12, y + 15);
    let rowY = y + 34;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    rows.forEach(([label, value]) => {
      setColor(GRAY_MD);
      doc.text(label, x + 12, rowY);
      setColor(BLACK);
      doc.text(safe(value), x + 84, rowY);
      rowY += 20;
    });
    return boxH;
  };

  const h1 = drawInfoBox(MARGIN, colW, "DATOS DEL CLIENTE", [
    ["Nombre:",    cotizacion?.nombre_cliente],
    ["Teléfono:",  cotizacion?.telefono_cliente],
    ["Email:",     cotizacion?.email_cliente],
    ["Dirección:", cotizacion?.direccion],
  ]);
  drawInfoBox(MARGIN + colW + 24, colW, "DATOS DEL VENDEDOR", [
    ["Vendedor:", vendedor?.nombre || vendedor?.nombre_vendedor],
    ["Teléfono:", vendedor?.telefono_whatsapp || vendedor?.telefono],
    ["Email:",    vendedor?.email],
  ]);
  y += h1 + 24;

  if (cotizacion?.comentarios) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setColor(GRAY_MD);
    doc.text(`Notas: ${cotizacion.comentarios}`, MARGIN, y);
    y += 20;
  }

  // ── PRODUCTS TABLE ─────────────────────────────────────────────────
  const C = {
    num:   MARGIN,
    name:  MARGIN + 28,
    price: MARGIN + 248,
    qty:   MARGIN + 360,
    sub:   MARGIN + 420,
    subW:  CONTENT_W - 420,
  };

  setFill(BLACK);
  doc.rect(MARGIN, y, CONTENT_W, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setColor(WHITE);
  doc.text("#",           C.num + 8,  y + 15);
  doc.text("PRODUCTO",    C.name + 4, y + 15);
  doc.text("P. UNITARIO", C.price + 4,y + 15);
  doc.text("CANT.",       C.qty + 4,  y + 15);
  doc.text("SUBTOTAL",    C.sub + C.subW - 8, y + 15, { align: "right" });
  y += 22;

  (cotizacion?.productos || []).forEach((item, idx) => {
    const rowH = 36;
    setFill(idx % 2 === 0 ? WHITE : [248, 249, 250]);
    doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
    setDraw(GRAY_LT);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y + rowH, MARGIN + CONTENT_W, y + rowH);
    const midY = y + 22;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(GRAY_MD);
    doc.text(String(idx + 1), C.num + 8, midY);

    setColor(BLACK);
    doc.setFont("helvetica", "bold");
    let name = item.nombre_producto || "Producto";
    const maxW = 212;
    if (doc.getTextWidth(name) > maxW) {
      while (doc.getTextWidth(name + "…") > maxW && name.length > 0) name = name.slice(0, -1);
      name += "…";
    }
    doc.text(name, C.name + 4, midY);

    doc.setFont("helvetica", "normal");
    setColor(GRAY_DK);
    doc.text(fmt(item.precio_unitario), C.price + 100, midY, { align: "right" });
    doc.text(String(item.cantidad || 0), C.qty + 52,  midY, { align: "right" });
    setColor(BLACK);
    doc.setFont("helvetica", "bold");
    doc.text(fmt(item.subtotal), C.sub + C.subW - 8, midY, { align: "right" });
    y += rowH;
  });

  y += 16;

  // ── TOTALS ────────────────────────────────────────────────────────
  const TW = 220;
  const TX = PAGE_W - MARGIN - TW;
  const LH = 22;

  const drawTotalRow = (label, value, highlight = false) => {
    if (highlight) {
      setFill(BLACK);
      doc.rect(TX, y, TW, LH + 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      setColor(WHITE);
      doc.text(label, TX + 12, y + LH - 2);
      doc.text(value, TX + TW - 8, y + LH - 2, { align: "right" });
      y += LH + 4;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setColor(GRAY_DK);
      doc.text(label, TX + 12, y + LH - 6);
      doc.text(value, TX + TW - 8, y + LH - 6, { align: "right" });
      setDraw(GRAY_LT);
      doc.setLineWidth(0.3);
      doc.line(TX, y + LH, TX + TW, y + LH);
      y += LH;
    }
  };

  drawTotalRow("Subtotal", fmt(subtotal));
  if (Number(cotizacion?.descuento_aplicado || 0) > 0)
    drawTotalRow("Descuento", `-${fmt(cotizacion.descuento_aplicado)}`);
  const envioMonto = cotizacion?.envio?.monto || cotizacion?.costo_envio;
  drawTotalRow("Envío",
    cotizacion?.envio?.modo === "monto" || envioMonto ? fmt(envioMonto)
    : cotizacion?.envio?.modo === "incluido" ? "Incluido" : "Por definir"
  );
  y += 6;
  drawTotalRow("TOTAL", fmt(total), true);

  // ── FOOTER ────────────────────────────────────────────────────────
  setFill([245, 245, 245]);
  doc.rect(0, PAGE_H - 48, PAGE_W, 48, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(GRAY_MD);
  doc.text("Este documento es una cotización y no constituye una factura oficial.", PAGE_W / 2, PAGE_H - 28, { align: "center" });
  doc.text(`Generado el ${today}`, PAGE_W / 2, PAGE_H - 14, { align: "center" });

  doc.save(`Cotizacion-${numCot}.pdf`);
}