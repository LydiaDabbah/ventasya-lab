"use client";
import { useEffect, useState } from "react";
import { fetchFromApi } from "@/utils/api";

// ✅ Log al cargar el componente
console.log("🧪 API:", process.env.NEXT_PUBLIC_API_URL);

export default function Page() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProductos = async () => {
      setLoading(true);
      try {
        const data = await fetchFromApi("/productos");
        setProductos(data);
      } catch (err) {
        console.error("❌ Error al cargar productos:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Producs</h1>
      {loading && <p>Cargando productos...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!loading && !error && (
        <pre className="bg-red-500 text-sm p-4 rounded">
          {JSON.stringify(productos, null, 2)}
        </pre>
      )}
    </div>
    
  );
}
