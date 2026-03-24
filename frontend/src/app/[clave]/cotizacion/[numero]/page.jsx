"use client";

import { useParams, useSearchParams } from "next/navigation";
import { CotizacionProvider } from "@/context/CotizacionContext";
import ResumenCotizacionInner from "@/components/ResumenCotizacionInner";

export default function ResumenCotizacionPage() {
  const params = useParams();
  const search = useSearchParams();
  const numero_orden = params.numero;
  const token = search?.get("token") || search?.get("t") || null;

  return (
    <CotizacionProvider numeroOrden={numero_orden} token={token}>
    <ResumenCotizacionInner />
  </CotizacionProvider>
  );
}
