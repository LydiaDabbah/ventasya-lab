// src/utils/pdfCotizacion.js

export async function generarPdfCotizacion({
    items,
    cliente,
    envio,
    vendedor,
    subtotal,
    shippingAmount,
    total,
  }) {
    if (!items || items.length === 0) return;
  
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
  
    const doc = new jsPDF();
  
    // 🇲🇽 Encabezado
    doc.setFontSize(16);
    doc.text(vendedor?.nombre_negocio || vendedor?.nombre || "Cotización VentasYa", 14, 20);
  
    doc.setFontSize(11);
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-MX")}`, 14, 28);
  
    // Datos del cliente
    let y = 34;
  
    if (cliente?.nombre) {
      doc.text(`Cliente: ${cliente.nombre}`, 14, y);
      y += 6;
    }
  
    if (cliente?.telefono) {
      doc.text(`Teléfono: ${cliente.telefono}`, 14, y);
      y += 6;
    }
  
    if (cliente?.email) {
      doc.text(`Email: ${cliente.email}`, 14, y);
      y += 6;
    }
  
    if (cliente?.direccion) {
      doc.text("Dirección:", 14, y);
      y += 6;
      // dividir dirección en líneas si es muy larga
      const dirLines = doc.splitTextToSize(cliente.direccion, 180);
      doc.text(dirLines, 14, y);
      y += dirLines.length * 6;
    }
  
    // Envío
    const getEnvioText = () => {
      if (!envio) return "Envío: por definir según dirección";
  
      if (envio.modo === "por_definir") return "Envío: por definir según dirección";
      if (envio.modo === "incluido") return "Envío: incluido en el precio";
  
      const monto =
        typeof shippingAmount === "number"
          ? shippingAmount
          : envio.modo === "monto"
            ? Number(envio.monto || 0)
            : 0;
  
      return `Envío: $${monto.toLocaleString("es-MX", {
        minimumFractionDigits: 2,
      })}`;
    };
  
    doc.text(getEnvioText(), 14, y);
    y += 10;
  
    // Tabla de productos
    autoTable(doc, {
      startY: y,
      head: [["Producto", "Cant.", "Precio unit.", "Subtotal"]],
      body: items.map((item) => [
        item.nombre_producto,
        item.cantidad.toString(),
        `$${item.precio_unitario.toLocaleString("es-MX", {
          minimumFractionDigits: 2,
        })}`,
        `$${item.subtotal.toLocaleString("es-MX", {
          minimumFractionDigits: 2,
        })}`,
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [0, 0, 0], textColor: 255 },
    });
  
    const finalY = doc.lastAutoTable.finalY || y + 10;
  
    // Totales
    doc.setFontSize(12);
    doc.text(
      `Subtotal: $${subtotal.toLocaleString("es-MX", {
        minimumFractionDigits: 2,
      })}`,
      14,
      finalY + 10
    );
  
    const envioTexto =
      envio?.modo === "por_definir"
        ? "Por definir"
        : envio?.modo === "incluido"
          ? "Incluido"
          : `$${shippingAmount.toLocaleString("es-MX", {
              minimumFractionDigits: 2,
            })}`;
  
    doc.text(`Envío: ${envioTexto}`, 14, finalY + 16);
  
    doc.setFontSize(14);
    doc.text(
      `TOTAL: $${total.toLocaleString("es-MX", {
        minimumFractionDigits: 2,
      })}`,
      14,
      finalY + 26
    );
  
    // Nota
    doc.setFontSize(9);
    doc.text(
      "Esta cotización es informativa y puede cambiar sin previo aviso.",
      14,
      finalY + 36
    );
  
    doc.save("cotizacion.pdf");
  }
  
  