"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminPanel from "@/components/adminPanel";
import { useAuth } from "@/context/AuthContext";

const VALID_SECTIONS = new Set([
  "dashboard",
  "personal-info",
  "productos",
  "cotizaciones",
  "analytics",
  "settings",
]);

export default function AdminPanelSectionPage() {
  const { vendedor, loading } = useAuth();
  const params = useParams();
  const router = useRouter();

  const section = String(params?.section || "dashboard").toLowerCase();

  useEffect(() => {
    if (!VALID_SECTIONS.has(section)) {
      router.replace("/adminPanel/dashboard");
    }
  }, [router, section]);

  if (loading) return <div className="p-10">Cargando...</div>;

  if (!vendedor) return <div className="p-10">Acceso no autorizado.</div>;

  if (!VALID_SECTIONS.has(section)) return <div className="p-10">Redirigiendo...</div>;

  return <AdminPanel activeSection={section} />;
}
