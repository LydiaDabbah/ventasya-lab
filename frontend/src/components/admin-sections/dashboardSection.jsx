import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { authHeaders } from "@/utils/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function formatMoney(amount) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function DashboardSection() {
  const { vendedor } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cotizaciones, setCotizaciones] = useState([]);
  const [productos, setProductos] = useState([]);
  const [versionesRecientes, setVersionesRecientes] = useState([]);

  useEffect(() => {
    if (!vendedor?.id_vendedor) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadDashboardData() {
      setLoading(true);
      setError("");

      try {
        const [cotRes, prodRes] = await Promise.all([
          fetch(`${API_BASE}/cotizaciones/?id_vendedor=${encodeURIComponent(vendedor.id_vendedor)}`, {
            signal: controller.signal,
            headers: authHeaders(),
          }),
          fetch(`${API_BASE}/productos/?id_vendedor=${encodeURIComponent(vendedor.id_vendedor)}`, {
            signal: controller.signal,
            headers: authHeaders(),
          }),
        ]);

        if (!cotRes.ok) throw new Error("No se pudieron cargar las cotizaciones");
        if (!prodRes.ok) throw new Error("No se pudieron cargar los productos");

        const [cotDataRaw, prodData] = await Promise.all([cotRes.json(), prodRes.json()]);
        const cotData = Array.isArray(cotDataRaw) ? cotDataRaw : [];

        setCotizaciones(cotData);
        setProductos(Array.isArray(prodData) ? prodData : []);

        const cotizacionesConVersiones = [...cotData]
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
          .slice(0, 12)
          .filter((cot) => Boolean(cot?.id_cotizacion));

        const versionesRequests = await Promise.allSettled(
          cotizacionesConVersiones.map(async (cot) => {
            const res = await fetch(
              `${API_BASE}/cotizaciones/versiones/por-cotizacion/${encodeURIComponent(cot.id_cotizacion)}`,
              { signal: controller.signal },
            );
            if (!res.ok) return [];
            const versions = await res.json();
            if (!Array.isArray(versions)) return [];
            return versions.map((version) => ({
              ...version,
              cotizacion_current_version_id: cot.current_version_id,
              cotizacion_status: cot.status,
            }));
          }),
        );

        const versionItems = versionesRequests.flatMap((result) =>
          result.status === "fulfilled" && Array.isArray(result.value) ? result.value : [],
        );
        setVersionesRecientes(versionItems);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Error al cargar dashboard");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => controller.abort();
  }, [vendedor?.id_vendedor]);

  const metrics = useMemo(() => {
    const totalCotizaciones = cotizaciones.length;
    const ventasTotales = cotizaciones.reduce((acc, item) => acc + Number(item.total || 0), 0);
    const promedioTicket = totalCotizaciones ? ventasTotales / totalCotizaciones : 0;
    const editablesActivas = cotizaciones.filter((item) => item.editable_token_active).length;

    const today = new Date();
    const hoy = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const cotizacionesHoy = cotizaciones.filter((item) => {
      if (!item.created_at) return false;
      const created = new Date(item.created_at);
      if (Number.isNaN(created.getTime())) return false;
      return `${created.getFullYear()}-${created.getMonth()}-${created.getDate()}` === hoy;
    }).length;

    return {
      totalCotizaciones,
      ventasTotales,
      promedioTicket,
      totalProductos: productos.length,
      editablesActivas,
      cotizacionesHoy,
    };
  }, [cotizaciones, productos]);

  const actividadReciente = useMemo(() => {
    const events = [];

    productos.forEach((prod) => {
      if (!prod?.created_at) return;
      events.push({
        id: `producto-${prod.id_producto || prod.nombre}-${prod.created_at}`,
        date: prod.created_at,
        type: "producto",
        title: `Alta de producto: ${prod.nombre || "Sin nombre"}`,
        subtitle: prod.precio != null ? `Precio base: ${formatMoney(prod.precio)}` : "Producto agregado al catálogo",
      });
    });

    cotizaciones.forEach((cot) => {
      events.push({
        id: `cotizacion-${cot.id_cotizacion || cot.numero_cotizacion}-creada`,
        date: cot.created_at,
        type: "cotizacion",
        title: `Cotización creada: ${cot.numero_cotizacion || "Sin número"}`,
        subtitle: `Cliente: ${cot.nombre_cliente || "Sin nombre"} | Total: ${formatMoney(cot.total)}`,
      });

      const statusNorm = (cot.status || "").toLowerCase();
      if (["generada", "en_proceso", "proceso"].includes(statusNorm)) {
        events.push({
          id: `cotizacion-${cot.id_cotizacion || cot.numero_cotizacion}-proceso`,
          date: cot.created_at,
          type: "proceso",
          title: `Cotización en proceso: ${cot.numero_cotizacion || "Sin número"}`,
          subtitle: "Pendiente de confirmación o cierre",
        });
      }
    });

    versionesRecientes.forEach((version) => {
      if (!version?.created_at || Number(version.version_number || 0) <= 1) return;
      const isCurrent = version.id_version === version.cotizacion_current_version_id;
      events.push({
        id: `version-${version.id_version}`,
        date: version.created_at,
        type: "version",
        title: `Cotización editada: ${version.numero_cotizacion || "Sin número"} (v${version.version_number})`,
        subtitle: isCurrent ? "Esta es la versión actual" : "Versión histórica",
      });
    });

    return events
      .filter((event) => event.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12);
  }, [cotizaciones, productos, versionesRecientes]);

  if (loading) {
    return <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-600">Cargando dashboard...</div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-black mb-2">Dashboard</h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Resumen de tu tienda {vendedor?.nombre_negocio ? `(${vendedor.nombre_negocio})` : ""}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Total cotizaciones</p>
          <p className="text-2xl font-bold text-black mt-2">{metrics.totalCotizaciones}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Monto cotizado</p>
          <p className="text-2xl font-bold text-black mt-2">{formatMoney(metrics.ventasTotales)}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Ticket promedio</p>
          <p className="text-2xl font-bold text-black mt-2">{formatMoney(metrics.promedioTicket)}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Cotizaciones hoy</p>
          <p className="text-2xl font-bold text-black mt-2">{metrics.cotizacionesHoy}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Links editables activos</p>
          <p className="text-2xl font-bold text-black mt-2">{metrics.editablesActivas}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Productos publicados</p>
          <p className="text-2xl font-bold text-black mt-2">{metrics.totalProductos}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-black">Actividad reciente</h3>
        </div>

        {actividadReciente.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">Todavía no hay actividad para mostrar.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {actividadReciente.map((activity) => (
              <div key={activity.id} className="px-4 sm:px-6 py-4 flex items-start gap-3">
                <span className="w-2.5 h-2.5 mt-2 rounded-full bg-black flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-black">{activity.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{activity.subtitle}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(activity.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
