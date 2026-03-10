"use client";
import AdminPanel from "@/components/adminPanel";
import { useAuth } from "@/context/AuthContext";

export default function AdminPanelPage() {
  const { vendedor, loading, logout } = useAuth();

  if (loading) return <div className="p-10">Cargando...</div>;

  if (!vendedor) return <div className="p-10">Acceso no autorizado.</div>;

  return (
    <div >
     
      <AdminPanel />
    </div>
  );
}
