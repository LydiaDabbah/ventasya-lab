// src/hooks/useVolverAlCatalogo.js
"use client";

import { useRouter } from "next/navigation";
import { useVendedor } from "@/context/VendedorContext";

export function useVolverAlCatalogo() {
  const router = useRouter();
  const { clave } = useVendedor();

  const volverAlCatalogo = () => {
    if (clave) {
      router.push(`/${clave}/productos`);
      return;
    }

    router.back();
  };

  return { volverAlCatalogo, clave };
}