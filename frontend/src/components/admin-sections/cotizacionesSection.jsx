"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronRight, ChevronUp, Copy, ExternalLink, Eye, Funnel, Search, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { authHeaders } from "@/utils/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const statusOptions = [
  { value: "pendiente", label: "Pendiente", color: "bg-yellow-100 text-yellow-700", optionBg: "#FEF9C3", optionText: "#A16207" },
  { value: "enviada", label: "Enviada", color: "bg-blue-100 text-blue-700", optionBg: "#DBEAFE", optionText: "#1D4ED8" },
  { value: "aceptada", label: "Aceptada", color: "bg-green-100 text-green-700", optionBg: "#DCFCE7", optionText: "#15803D" },
  { value: "en_proceso", label: "En proceso", color: "bg-purple-100 text-purple-700", optionBg: "#F3E8FF", optionText: "#7E22CE" },
  { value: "completada", label: "Completa", color: "bg-gray-100 text-gray-700", optionBg: "#F3F4F6", optionText: "#374151" },
  { value: "cancelada", label: "Cancelada", color: "bg-red-100 text-red-700", optionBg: "#FEE2E2", optionText: "#B91C1C" },
];

const statusConfig = Object.fromEntries(statusOptions.map((s) => [s.value, { label: s.label, color: s.color }]));
const STATUS_PILL_BASE = "inline-flex items-center justify-center w-[104px] h-7 px-2 text-xs rounded-full";

function StatusDropdown({ value, onChange, size = "text-xs", className = "" }) {
  const [open, setOpen] = useState(false);
  const [hoveredOption, setHoveredOption] = useState("");
  const ref = useRef(null);
  const current = statusOptions.find((s) => s.value === value) || statusOptions[0];

  useEffect(() => {
    function onDocClick(event) {
      if (!ref.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={ref} className={`relative inline-flex ${open ? "z-50" : ""} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{ backgroundColor: current.optionBg }}
        className={`appearance-none ${STATUS_PILL_BASE} pl-3 pr-7 ${size} text-center font-normal border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black text-black`}
      >
        {current.label}
      </button>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black opacity-70" />

      {open && (
        <div className="absolute z-30 right-0 top-full mt-1 min-w-[140px] bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {statusOptions.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onChange(option.value);
                }}
                onMouseEnter={() => setHoveredOption(option.value)}
                onMouseLeave={() => setHoveredOption("")}
                style={{
                  backgroundColor: active
                    ? option.optionBg
                    : hoveredOption === option.value
                      ? "#F3F4F6"
                      : "#FFFFFF",
                }}
                className={`w-full text-left px-3 py-1.5 ${size} font-normal text-black transition-colors`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatMoney(amount) {
  return `$${Number(amount || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateFilterLabel(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${String(y).slice(-2)}`;
}

function canEdit(status) {
  return true;
}

function canActivateVersion(status) {
  return normalizeStatus(status) === "pendiente";
}

function normalizeStatus(status) {
  const normalized = (status || "").toLowerCase();
  if (["generada", "borrador"].includes(normalized)) return "pendiente";
  if (["aprobada", "aceptada", "cerrada"].includes(normalized)) return "aceptada";
  if (["proceso", "en proceso"].includes(normalized)) return "en_proceso";
  if (normalized in statusConfig) return normalized;
  return "pendiente";
}

export default function CotizacionesSection() {
  const { vendedor } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [cotizaciones, setCotizaciones] = useState([]);
  const [versionesByCotizacion, setVersionesByCotizacion] = useState({});

  const [busqueda, setBusqueda] = useState("");
  const [statusFiltros, setStatusFiltros] = useState([]);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [applyingVersionId, setApplyingVersionId] = useState("");
  const [preview, setPreview] = useState(null);
  const [sortBy, setSortBy] = useState("fecha");
  const [sortDir, setSortDir] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFiltroDropdownOpen, setStatusFiltroDropdownOpen] = useState(false);
  const [fechaDropdownOpen, setFechaDropdownOpen] = useState(false);
  const [ordenDropdownOpen, setOrdenDropdownOpen] = useState(false);
  const statusFiltroRef = useRef(null);
  const ordenDropdownRef = useRef(null);

  const fetchVersiones = useCallback(async (idCotizacion, signal) => {
    const res = await fetch(
      `${API_BASE}/cotizaciones/versiones/por-cotizacion/${encodeURIComponent(idCotizacion)}`,
      { signal, headers: authHeaders() },
    );
    if (!res.ok) throw new Error("No se pudieron cargar versiones");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }, []);

  const loadCotizaciones = useCallback(async (signal) => {
    if (!vendedor?.id_vendedor) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${API_BASE}/cotizaciones/?id_vendedor=${encodeURIComponent(vendedor.id_vendedor)}`,
        { signal, headers: authHeaders() },
      );

      if (!res.ok) {
        throw new Error("No se pudieron cargar las cotizaciones");
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      const normalized = list.map((cot) => ({ ...cot, status: normalizeStatus(cot.status) }));
      setCotizaciones(normalized);

      const versionesEntries = await Promise.allSettled(
        normalized
          .filter((cot) => cot?.id_cotizacion)
          .map(async (cot) => [cot.id_cotizacion, await fetchVersiones(cot.id_cotizacion, signal)]),
      );

      const versionsMap = {};
      versionesEntries.forEach((entry) => {
        if (entry.status === "fulfilled") {
          const [idCotizacion, versions] = entry.value;
          versionsMap[idCotizacion] = versions;
        }
      });

      const withClientName = normalized.map((cot) => {
        const versions = versionsMap[cot.id_cotizacion] || [];
        const currentVersion =
          versions.find((v) => v.id_version === cot.current_version_id) ||
          [...versions].sort((a, b) => Number(b.version_number || 0) - Number(a.version_number || 0))[0];

        return {
          ...cot,
          nombre_cliente:
            cot.nombre_cliente ||
            currentVersion?.nombre_cliente ||
            currentVersion?.telefono_cliente ||
            null,
        };
      });

      setCotizaciones(withClientName);
      setVersionesByCotizacion(versionsMap);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Error cargando cotizaciones");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [fetchVersiones, vendedor?.id_vendedor]);

  useEffect(() => {
    const controller = new AbortController();
    loadCotizaciones(controller.signal);
    return () => controller.abort();
  }, [loadCotizaciones]);

  useEffect(() => {
    function onClickOutside(event) {
      if (statusFiltroRef.current && !statusFiltroRef.current.contains(event.target)) {
        setStatusFiltroDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const getCurrentVersion = useCallback(
    (cotizacion) => {
      const versions = versionesByCotizacion[cotizacion.id_cotizacion] || [];
      if (versions.length === 0) {
        return {
          id_version: cotizacion.current_version_id || null,
          version_number: "-",
          total: cotizacion.total || 0,
          created_at: cotizacion.created_at,
          productos: cotizacion.productos || [],
          is_current: true,
        };
      }

      const byCurrentId = versions.find((v) => v.id_version === cotizacion.current_version_id);
      if (byCurrentId) return { ...byCurrentId, is_current: true };

      const latest = [...versions].sort((a, b) => Number(b.version_number || 0) - Number(a.version_number || 0))[0];
      return { ...latest, is_current: true };
    },
    [versionesByCotizacion],
  );

  const cotizacionesFiltradas = useMemo(() => {
    const filtered = cotizaciones.filter((cot) => {
      const matchBusqueda =
        busqueda.trim() === "" ||
        (cot.numero_cotizacion || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (cot.nombre_cliente || "").toLowerCase().includes(busqueda.toLowerCase());

      const matchStatus =
        statusFiltros.length === 0 || statusFiltros.includes(cot.status || "");

      const currentVersion = getCurrentVersion(cot);
      const fechaBase = currentVersion?.created_at || cot?.created_at || null;
      const fecha = fechaBase ? new Date(fechaBase) : null;

      let matchFecha = true;
      if (fecha && !Number.isNaN(fecha.getTime())) {
        if (fechaDesde) {
          const from = new Date(`${fechaDesde}T00:00:00`);
          if (fecha < from) matchFecha = false;
        }
        if (fechaHasta) {
          const to = new Date(`${fechaHasta}T23:59:59`);
          if (fecha > to) matchFecha = false;
        }
      } else if (fechaDesde || fechaHasta) {
        matchFecha = false;
      }

      return matchBusqueda && matchStatus && matchFecha;
    });

    return filtered.sort((a, b) => {
      const aVersion = getCurrentVersion(a);
      const bVersion = getCurrentVersion(b);

      let comparison = 0;

      if (sortBy === "cotizacion") {
        comparison = String(a?.numero_cotizacion || "").localeCompare(String(b?.numero_cotizacion || ""), "es", {
          numeric: true,
          sensitivity: "base",
        });
      } else if (sortBy === "total") {
        comparison = Number(aVersion?.total || 0) - Number(bVersion?.total || 0);
      } else if (sortBy === "estado") {
        const aStatus = statusConfig[normalizeStatus(a?.status)]?.label || String(a?.status || "");
        const bStatus = statusConfig[normalizeStatus(b?.status)]?.label || String(b?.status || "");
        comparison = aStatus.localeCompare(bStatus, "es", { sensitivity: "base" });
      } else {
        const aDate = new Date(aVersion?.created_at || a?.created_at || 0).getTime();
        const bDate = new Date(bVersion?.created_at || b?.created_at || 0).getTime();
        comparison = aDate - bDate;
      }

      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [busqueda, cotizaciones, statusFiltros, fechaDesde, fechaHasta, getCurrentVersion, sortBy, sortDir]);

  const handleSort = useCallback((field) => {
    if (sortBy === field && sortDir === "desc") {
      setSortDir("asc");
      return;
    }
    setSortBy(field);
    setSortDir("desc");
  }, [sortBy, sortDir]);

  const sortValue = `${sortBy}_${sortDir}`;
  const sortOptions = [
    { value: "fecha_desc", label: "Fecha (nuevo a viejo)" },
    { value: "fecha_asc", label: "Fecha (viejo a nuevo)" },
    { value: "total_desc", label: "Total (mayor a menor)" },
    { value: "total_asc", label: "Total (menor a mayor)" },
    { value: "cotizacion_asc", label: "Cotizacion (A-Z)" },
    { value: "cotizacion_desc", label: "Cotizacion (Z-A)" },
    { value: "estado_asc", label: "Estado (A-Z)" },
    { value: "estado_desc", label: "Estado (Z-A)" },
  ];
  const sortLabel = sortOptions.find((opt) => opt.value === sortValue)?.label || "Ordenar";
  const handleSortSelect = useCallback((value) => {
    const [field, dir] = String(value || "").split("_");
    if (!field || !dir) return;
    setSortBy(field);
    setSortDir(dir);
    if (ordenDropdownRef.current) {
      ordenDropdownRef.current.open = false;
    }
    setOrdenDropdownOpen(false);
  }, []);

  const SortIcon = useCallback(
    ({ field }) => {
      if (sortBy !== field) return null;
      return sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />;
    },
    [sortBy, sortDir],
  );

  const fechaFiltroLabel = useMemo(() => {
    const desde = formatDateFilterLabel(fechaDesde);
    const hasta = formatDateFilterLabel(fechaHasta);
    if (desde && hasta) return `${desde} - ${hasta}`;
    if (desde) return `${desde} -`;
    if (hasta) return `- ${hasta}`;
    return "Fecha";
  }, [fechaDesde, fechaHasta]);

  const ensureExpandedLoaded = async (idCotizacion) => {
    if (versionesByCotizacion[idCotizacion]) return;

    try {
      const versions = await fetchVersiones(idCotizacion);
      setVersionesByCotizacion((prev) => ({ ...prev, [idCotizacion]: versions }));
    } catch (err) {
      setError(err.message || "Error al cargar historial de versiones");
    }
  };

  const toggleExpand = async (idCotizacion) => {
    if (expandedId === idCotizacion) {
      setExpandedId(null);
      return;
    }
    setExpandedId(idCotizacion);
    await ensureExpandedLoaded(idCotizacion);
  };

  const buildCotizacionPath = (cotizacion) => {
    const basePath = vendedor?.clave
      ? `/${encodeURIComponent(vendedor.clave)}/cotizacion/${encodeURIComponent(cotizacion.numero_cotizacion)}`
      : `/cotizacion/${encodeURIComponent(cotizacion.numero_cotizacion)}`;

    const isPendiente = normalizeStatus(cotizacion.status) === "pendiente";
    const token = cotizacion?.editable_token || null;
    const tokenActive =
      cotizacion?.editable_token_active === undefined
        ? true
        : Boolean(cotizacion.editable_token_active);

    if (isPendiente && token && tokenActive) {
      return `${basePath}?token=${encodeURIComponent(token)}`;
    }

    return basePath;
  };

  const handleCopyLink = (cotizacion) => {
    const link = `${window.location.origin}${buildCotizacionPath(cotizacion)}`;

    navigator.clipboard.writeText(link);
    setCopiedId(cotizacion.numero_cotizacion);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = async (cotizacionId, newStatus) => {
    if (!cotizacionId) return;

    let previousStatus = null;
    setError("");
    setActionMessage("");

    setCotizaciones((prev) =>
      prev.map((cot) => {
        if (cot.id_cotizacion !== cotizacionId) return cot;
        previousStatus = cot.status;
        return { ...cot, status: newStatus };
      }),
    );

    try {
      const query = vendedor?.id_vendedor
        ? `?id_vendedor=${encodeURIComponent(vendedor.id_vendedor)}`
        : "";

      const res = await fetch(
        `${API_BASE}/cotizaciones/${encodeURIComponent(cotizacionId)}/status${query}`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ status: newStatus }),
        },
      );

      if (!res.ok) {
        let message = "No se pudo actualizar el estado";
        try {
          const data = await res.json();
          message = data?.detail || data?.error || message;
        } catch {}
        throw new Error(message);
      }

      const updated = await res.json();
      const persistedStatus = normalizeStatus(updated?.status || newStatus);

      setCotizaciones((prev) =>
        prev.map((cot) =>
          cot.id_cotizacion === cotizacionId
            ? { ...cot, status: persistedStatus }
            : cot,
        ),
      );
      setActionMessage("Estado actualizado correctamente.");
    } catch (err) {
      setCotizaciones((prev) =>
        prev.map((cot) =>
          cot.id_cotizacion === cotizacionId
            ? { ...cot, status: previousStatus || cot.status }
            : cot,
        ),
      );
      setError(err.message || "Error al actualizar estado");
    }
  };

  const handleSetActiveVersion = async (cotizacion, version) => {
    if (!vendedor?.id_vendedor) return;

    setApplyingVersionId(version.id_version);
    setError("");
    setActionMessage("");

    try {
      const res = await fetch(
        `${API_BASE}/cotizaciones/versiones/activar/${encodeURIComponent(version.id_version)}?id_vendedor=${encodeURIComponent(vendedor.id_vendedor)}`,
        {
          method: "PATCH",
          headers: authHeaders(),
        },
      );

      if (!res.ok) {
        let message = "No se pudo activar la versión";
        try {
          const data = await res.json();
          message = data?.detail || message;
        } catch {}
        throw new Error(message);
      }

      const updated = await res.json();

      setCotizaciones((prev) =>
        prev.map((cot) =>
          cot.id_cotizacion === cotizacion.id_cotizacion
            ? {
                ...cot,
                current_version_id: updated.current_version_id || cot.current_version_id,
                total: updated.total ?? cot.total,
                status: normalizeStatus(updated.status ?? cot.status),
              }
            : cot,
        ),
      );

      setActionMessage("Versión activada correctamente.");
    } catch (err) {
      setError(err.message || "Error al activar versión");
    } finally {
      setApplyingVersionId("");
    }
  };

  const handleOpenPreview = (cotizacion, version) => {
    setPreview({ cotizacion, version });
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black">Cotizaciones</h1>
        <p className="text-sm text-gray-500 mt-1">Gestiona tus cotizaciones y su historial de versiones.</p>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>}
      {actionMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">{actionMessage}</div>
      )}

      <div className="mb-6 md:bg-white md:rounded-xl md:border md:border-gray-200 md:p-6">
        <div className="flex items-center justify-between mb-3 md:hidden">
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="inline-flex items-center justify-center w-10 h-10 border border-gray-200 rounded-lg bg-white text-black"
            aria-label={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
            title={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          >
            <Funnel className="w-4 h-4" />
          </button>
          <p className="text-xs text-gray-500">Mostrando {cotizacionesFiltradas.length} de {cotizaciones.length}</p>
        </div>

        <div className={`${showFilters ? "flex" : "hidden"} md:flex flex-col md:flex-row gap-4 mb-6`}>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por número o cliente..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="relative min-w-[190px]" ref={statusFiltroRef}>
            <button
              type="button"
              onClick={() => setStatusFiltroDropdownOpen((prev) => !prev)}
              className={`w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm font-normal text-left relative focus:outline-none focus:ring-2 focus:ring-black ${
                statusFiltros.length === 0 ? "bg-white text-black" : "bg-black text-white"
              }`}
            >
              {statusFiltros.length === 0
                ? "Todos los estados"
                : statusFiltros.length === 1
                  ? (statusOptions.find((s) => s.value === statusFiltros[0])?.label || "Todos los estados")
                  : `${statusFiltros.length} estados`}
              <ChevronDown
                className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-transform duration-200 ${
                  statusFiltros.length === 0 ? "text-black" : "text-white"
                } ${statusFiltroDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            {statusFiltroDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFiltros([]);
                    setStatusFiltroDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-sm text-left font-normal transition-colors ${
                    statusFiltros.length === 0 ? "bg-black text-white" : "text-black hover:bg-gray-100"
                  }`}
                >
                  Todos los estados
                </button>
                {statusOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setStatusFiltros((prev) =>
                        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
                      );
                    }}
                    className={`w-full px-4 py-2 text-sm text-left font-normal transition-colors flex items-center justify-between ${
                      statusFiltros.includes(value) ? "bg-black text-white" : "text-black hover:bg-gray-100"
                    }`}
                  >
                    <span>{label}</span>
                    {statusFiltros.includes(value) && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <details
            className="relative min-w-[190px]"
            onToggle={(e) => setFechaDropdownOpen(e.currentTarget.open)}
          >
            <summary
              className={`list-none cursor-pointer w-full md:w-auto md:min-w-[190px] px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-normal inline-flex items-center justify-between gap-2 whitespace-nowrap ${
                fechaDesde || fechaHasta ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              {fechaFiltroLabel}
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${fechaDropdownOpen ? "rotate-180" : ""}`} />
            </summary>
            <div className="absolute left-0 md:left-auto md:right-0 mt-2 z-20 w-full md:w-[280px] bg-white border border-gray-200 rounded-lg shadow-lg p-3 space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 whitespace-nowrap w-12">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
                  aria-label="Fecha desde"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 whitespace-nowrap w-12">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
                  aria-label="Fecha hasta"
                />
              </div>
              <div className="pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setFechaDesde("");
                    setFechaHasta("");
                  }}
                  className="w-full px-3 py-2 text-sm font-normal text-black border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </details>
          <details
            ref={ordenDropdownRef}
            className="relative min-w-[190px] md:hidden"
            onToggle={(e) => setOrdenDropdownOpen(e.currentTarget.open)}
          >
            <summary
              className={`list-none cursor-pointer w-full md:w-auto md:min-w-[190px] px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-normal inline-flex items-center justify-between gap-2 whitespace-nowrap ${
                sortValue !== "fecha_desc" ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              {`Ordenar por: ${sortLabel}`}
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${ordenDropdownOpen ? "rotate-180" : ""}`} />
            </summary>
            <div className="absolute left-0 md:left-auto md:right-0 mt-2 z-20 w-full md:w-[280px] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSortSelect(option.value)}
                  className={`w-full px-4 py-2 text-sm text-left font-normal transition-colors ${
                    sortValue === option.value ? "bg-gray-100 text-black" : "text-black hover:bg-gray-100"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </details>
        </div>

        <div className="hidden md:flex mb-4 flex-wrap items-center gap-3 text-xs text-gray-500">
          <p>Mostrando {cotizacionesFiltradas.length} de {cotizaciones.length} cotizaciones.</p>
          {(fechaDesde || fechaHasta) && (
            <p>
              Rango: {fechaDesde || "inicio"} a {fechaHasta || "hoy"}.
            </p>
          )}
        </div>
        {loading ? (
          <div className="text-sm text-gray-500 py-6">Cargando cotizaciones...</div>
        ) : (
          <div>
            <div className="hidden md:block xl:hidden overflow-x-auto">
              <table className="w-full table-fixed text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="w-8 px-1 pb-2" />
                    <th
                      onClick={() => handleSort("cotizacion")}
                      className="px-1 text-left pb-2 text-[11px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-black transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        Cotizacion
                        <SortIcon field="cotizacion" />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort("total")}
                      className="w-[108px] px-1 text-center pb-2 text-[11px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-black transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        Total
                        <SortIcon field="total" />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort("fecha")}
                      className="w-[108px] px-1 text-center pb-2 text-[11px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-black transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        Fecha
                        <SortIcon field="fecha" />
                      </span>
                    </th>
                    <th className="w-[64px] px-1 text-center pb-2 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Version</th>
                    <th
                      onClick={() => handleSort("estado")}
                      className="w-[116px] px-1 text-center pb-2 text-[11px] font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-black transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        Estado
                        <SortIcon field="estado" />
                      </span>
                    </th>
                    <th className="w-[72px] px-1 text-right pb-2 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Acc.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cotizacionesFiltradas.map((cotizacion) => {
                    const currentVersion = getCurrentVersion(cotizacion);
                    const isExpanded = expandedId === cotizacion.id_cotizacion;
                    const editable = canEdit(cotizacion.status);
                    const canActivate = canActivateVersion(cotizacion.status);
                    const currentStatus = normalizeStatus(cotizacion.status);
                    const versions = versionesByCotizacion[cotizacion.id_cotizacion] || [];

                    return (
                      <Fragment key={`compact-${cotizacion.id_cotizacion}`}>
                        <tr>
                          <td className="px-1 py-2">
                            <button
                              onClick={() => toggleExpand(cotizacion.id_cotizacion)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </td>
                          <td className="px-1 py-2">
                            <p className="font-mono text-[12px] font-medium text-black truncate">{cotizacion.numero_cotizacion}</p>
                            <p className="text-[11px] text-gray-500 truncate">{cotizacion.nombre_cliente || "Sin nombre"}</p>
                          </td>
                          <td className="px-1 py-2 text-center text-[11px] tabular-nums text-gray-900">{formatMoney(currentVersion.total)}</td>
                          <td className="px-1 py-2 text-[11px] text-gray-600 text-center">{formatDate(currentVersion.created_at || cotizacion.created_at)}</td>
                          <td className="px-1 py-2 text-[11px] text-gray-600 text-center">v{currentVersion.version_number || "-"}</td>
                          <td className="px-1 py-2 text-center">
                            {editable ? (
                              <StatusDropdown
                                value={currentStatus}
                                onChange={(next) => handleStatusChange(cotizacion.id_cotizacion, next)}
                                size="text-[11px]"
                              />
                            ) : (
                              <span
                                className={`${STATUS_PILL_BASE} text-[11px] font-normal ${statusConfig[currentStatus]?.color || "bg-gray-100 text-gray-700"}`}
                              >
                                {statusConfig[currentStatus]?.label || currentStatus}
                              </span>
                            )}
                          </td>
                          <td className="px-1 py-2">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                onClick={() => handleCopyLink(cotizacion)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Copiar link"
                              >
                                {copiedId === cotizacion.numero_cotizacion ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              <Link
                                href={buildCotizacionPath(cotizacion)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Abrir cotizacion"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="bg-gray-50 p-2.5">
                              <div className="space-y-2">
                                {versions.length === 0 ? (
                                  <div className="text-xs text-gray-500 p-2">No hay versiones para mostrar.</div>
                                ) : (
                                  versions
                                    .slice()
                                    .sort((a, b) => {
                                      const aActive = a.id_version === cotizacion.current_version_id ? 1 : 0;
                                      const bActive = b.id_version === cotizacion.current_version_id ? 1 : 0;
                                      if (aActive !== bActive) return bActive - aActive;
                                      const aDate = new Date(a.created_at || 0).getTime();
                                      const bDate = new Date(b.created_at || 0).getTime();
                                      if (aDate !== bDate) return bDate - aDate;
                                      return Number(b.version_number || 0) - Number(a.version_number || 0);
                                    })
                                    .map((version) => {
                                      const isCurrent = version.id_version === cotizacion.current_version_id;
                                      return (
                                        <div key={version.id_version} className="flex items-center justify-between rounded-lg px-2.5 py-2 bg-white border border-gray-200">
                                          <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className={`text-sm font-medium ${isCurrent ? "text-black" : "text-gray-500"}`}>
                                              v{version.version_number}
                                            </span>
                                            {isCurrent && (
                                              <span className="px-2 py-0.5 text-[11px] font-medium bg-green-100 text-green-700 rounded">
                                                Activa
                                              </span>
                                            )}
                                            <span>{formatDate(version.created_at)}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-900">{formatMoney(version.total)}</span>
                                            {!isCurrent && canActivate && (
                                              <button
                                                onClick={() => handleSetActiveVersion(cotizacion, version)}
                                                disabled={applyingVersionId === version.id_version}
                                                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium disabled:opacity-60"
                                              >
                                                {applyingVersionId === version.id_version ? "Activando..." : "Activar"}
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleOpenPreview(cotizacion, version)}
                                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                              title="Ver detalles"
                                            >
                                              <Eye className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-2">
              {cotizacionesFiltradas.map((cotizacion) => {
                const currentVersion = getCurrentVersion(cotizacion);
                const isExpanded = expandedId === cotizacion.id_cotizacion;
                const editable = canEdit(cotizacion.status);
                const canActivate = canActivateVersion(cotizacion.status);
                const currentStatus = normalizeStatus(cotizacion.status);
                const versions = versionesByCotizacion[cotizacion.id_cotizacion] || [];
                const versionsCount = versions.length || (cotizacion.current_version_id ? 1 : 0);
                const sortedVersions = versions
                  .slice()
                  .sort((a, b) => {
                    const aActive = a.id_version === cotizacion.current_version_id ? 1 : 0;
                    const bActive = b.id_version === cotizacion.current_version_id ? 1 : 0;
                    if (aActive !== bActive) return bActive - aActive;
                    const aDate = new Date(a.created_at || 0).getTime();
                    const bDate = new Date(b.created_at || 0).getTime();
                    if (aDate !== bDate) return bDate - aDate;
                    return Number(b.version_number || 0) - Number(a.version_number || 0);
                  });

                return (
                  <div key={cotizacion.id_cotizacion} className="bg-white border border-gray-200 rounded-xl overflow-visible">
                    <div className="px-4 pt-3 pb-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm font-mono font-medium text-black">{cotizacion.numero_cotizacion}</p>
                        {editable ? (
                          <StatusDropdown
                            value={currentStatus}
                            onChange={(next) => handleStatusChange(cotizacion.id_cotizacion, next)}
                            size="text-xs"
                          />
                        ) : (
                          <span
                            className={`${STATUS_PILL_BASE} font-normal ${statusConfig[currentStatus]?.color || "bg-gray-100 text-gray-700"}`}
                          >
                            {statusConfig[currentStatus]?.label || currentStatus}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium text-gray-700 mb-2">{cotizacion.nombre_cliente || "Sin nombre"}</p>

                      <div className="flex items-end justify-between gap-2">
                        <p className="text-xs text-gray-700">
                          {formatDate(currentVersion.created_at || cotizacion.created_at)} •{" "}
                          {Array.isArray(currentVersion.productos) ? currentVersion.productos.length : 0} productos
                        </p>
                        <p className="text-sm leading-none font-medium text-black">{formatMoney(currentVersion.total)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-1">
                      <button
                        onClick={() => toggleExpand(cotizacion.id_cotizacion)}
                        className="flex items-center gap-1 text-xs text-gray-500"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <span>{versionsCount} versiones</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">v{currentVersion.version_number || "-"}</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyLink(cotizacion)}
                          className="p-1.5 text-gray-400 hover:text-black rounded-lg transition-colors"
                          title="Copiar link"
                        >
                          {copiedId === cotizacion.numero_cotizacion ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <Link
                          href={buildCotizacionPath(cotizacion)}
                          className="p-1.5 text-gray-400 hover:text-black rounded-lg transition-colors"
                          title="Abrir cotizacion"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-3">
                        <div className="space-y-2">
                          {sortedVersions.length === 0 ? (
                            <div className="text-sm text-gray-500">No hay versiones para mostrar.</div>
                          ) : (
                            sortedVersions.map((version) => {
                              const isCurrent = version.id_version === cotizacion.current_version_id;
                              return (
                                <div
                                  key={version.id_version}
                                  className={`rounded-xl px-3 py-2 border ${isCurrent ? "bg-white border-gray-200" : "bg-white/90 border-gray-200"}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="min-w-0 flex items-center gap-2 flex-1">
                                      <span className={`text-xs leading-none font-medium ${isCurrent ? "text-black" : "text-gray-500"}`}>
                                        v{version.version_number}
                                      </span>
                                      {isCurrent && (
                                        <span className="px-2 py-0.5 text-[11px] font-medium bg-green-100 text-green-700 rounded-md">
                                          Activa
                                        </span>
                                      )}
                                      <span className="text-[11px] text-gray-400 truncate">
                                        {formatDate(version.created_at)} • {Array.isArray(version.productos) ? version.productos.length : 0} prod.
                                      </span>
                                    </div>
                                    <span className={`text-xs leading-none font-medium shrink-0 ${isCurrent ? "text-black" : "text-gray-700"}`}>
                                      {formatMoney(version.total)}
                                    </span>
                                    <div className="ml-auto flex items-center gap-1 shrink-0">
                                      {!isCurrent && canActivate && (
                                        <button
                                          onClick={() => handleSetActiveVersion(cotizacion, version)}
                                          disabled={applyingVersionId === version.id_version}
                                          className="text-[11px] text-blue-600 font-medium disabled:opacity-60"
                                        >
                                          {applyingVersionId === version.id_version ? "Activando..." : "Activar"}
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleOpenPreview(cotizacion, version)}
                                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                        title="Ver detalles"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="w-10 pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="w-10 pb-3" />
                    <th
                      onClick={() => handleSort("cotizacion")}
                      className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 cursor-pointer hover:text-black transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        Numero
                        <SortIcon field="cotizacion" />
                      </span>
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Cliente</th>
                    <th
                      onClick={() => handleSort("fecha")}
                      className="w-[132px] text-center text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 cursor-pointer hover:text-black transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        Fecha
                        <SortIcon field="fecha" />
                      </span>
                    </th>
                    <th className="w-[84px] text-center text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Version</th>
                    <th
                      onClick={() => handleSort("total")}
                      className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 cursor-pointer hover:text-black transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        Total
                        <SortIcon field="total" />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort("estado")}
                      className="w-[130px] text-center text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 cursor-pointer hover:text-black transition-colors"
                    >
                      <span className="inline-flex items-center gap-1">
                        Estado
                        <SortIcon field="estado" />
                      </span>
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {cotizacionesFiltradas.map((cotizacion, index) => {
                    const currentVersion = getCurrentVersion(cotizacion);
                    const isExpanded = expandedId === cotizacion.id_cotizacion;
                    const editable = canEdit(cotizacion.status);
                    const canActivate = canActivateVersion(cotizacion.status);
                    const currentStatus = normalizeStatus(cotizacion.status);
                    const versions = versionesByCotizacion[cotizacion.id_cotizacion] || [];

                    return (
                      <Fragment key={cotizacion.id_cotizacion}>
                        <tr className="group">
                          <td className="py-3 text-xs text-gray-500">{index + 1}</td>
                          <td className="py-3">
                            <button
                              onClick={() => toggleExpand(cotizacion.id_cotizacion)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          </td>

                          <td className="py-3">
                            <span className="font-mono text-sm font-medium text-black">{cotizacion.numero_cotizacion}</span>
                          </td>

                          <td className="py-3 text-sm text-gray-600">{cotizacion.nombre_cliente || "Sin nombre"}</td>

                          <td className="py-3 text-sm text-gray-600 text-center">
                            {formatDate(currentVersion.created_at || cotizacion.created_at)}
                          </td>

                          <td className="py-3 text-sm text-gray-600 text-center">v{currentVersion.version_number || "-"}</td>

                          <td className="py-3 text-sm text-gray-900 text-center">{formatMoney(currentVersion.total)}</td>

                          <td className="py-3 text-center">
                            {editable ? (
                              <StatusDropdown
                                value={currentStatus}
                                onChange={(next) => handleStatusChange(cotizacion.id_cotizacion, next)}
                                size="text-xs"
                              />
                            ) : (
                              <span
                                className={`${STATUS_PILL_BASE} font-normal ${statusConfig[currentStatus]?.color || "bg-gray-100 text-gray-700"}`}
                              >
                                {statusConfig[currentStatus]?.label || currentStatus}
                              </span>
                            )}
                          </td>

                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleCopyLink(cotizacion)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Copiar link"
                              >
                                {copiedId === cotizacion.numero_cotizacion ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>

                              <Link
                                href={buildCotizacionPath(cotizacion)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Abrir cotizacion"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="bg-gray-50 p-4">
                              <div className="ml-6">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Historial de versiones</p>
                                <div className="space-y-2">
                                  {versions.length === 0 ? (
                                    <div className="text-sm text-gray-500 p-3">No hay versiones para mostrar.</div>
                                  ) : (
                                    versions
                                      .slice()
                                      .sort((a, b) => {
                                        const aActive = a.id_version === cotizacion.current_version_id ? 1 : 0;
                                        const bActive = b.id_version === cotizacion.current_version_id ? 1 : 0;
                                        if (aActive !== bActive) return bActive - aActive; // activa primero

                                        const aDate = new Date(a.created_at || 0).getTime();
                                        const bDate = new Date(b.created_at || 0).getTime();
                                        if (aDate !== bDate) return bDate - aDate; // nueva a vieja

                                        return Number(b.version_number || 0) - Number(a.version_number || 0);
                                      })
                                      .map((version) => {
                                        const isCurrent = version.id_version === cotizacion.current_version_id;
                                        return (
                                          <div
                                            key={version.id_version}
                                            className={`flex items-center justify-between p-3 rounded-lg ${
                                              isCurrent ? "bg-white border border-gray-200 shadow-sm" : "bg-gray-100"
                                            }`}
                                          >
                                            <div className="flex items-center gap-4">
                                              <span className={`text-sm font-medium ${isCurrent ? "text-black" : "text-gray-500"}`}>
                                                v{version.version_number}
                                              </span>
                                              {isCurrent && (
                                                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                                                  Activa
                                                </span>
                                              )}
                                              <span className="text-xs text-gray-400">{formatDate(version.created_at)}</span>
                                              <span className="text-xs text-gray-400">
                                                {Array.isArray(version.productos) ? version.productos.length : 0} productos
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-4">
                                              <span className={`text-sm font-medium ${isCurrent ? "text-black" : "text-gray-500"}`}>
                                                {formatMoney(version.total)}
                                              </span>

                                              <div className="flex items-center gap-2">
                                                {!isCurrent && canActivate && (
                                                  <button
                                                    onClick={() => handleSetActiveVersion(cotizacion, version)}
                                                    disabled={applyingVersionId === version.id_version}
                                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-60"
                                                  >
                                                    {applyingVersionId === version.id_version ? "Activando..." : "Activar"}
                                                  </button>
                                                )}
                                                <button
                                                  onClick={() => handleOpenPreview(cotizacion, version)}
                                                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                                                  title="Ver detalles"
                                                >
                                                  <Eye className="w-4 h-4" />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })
                                  )}
                                </div>

                                {!editable && (
                                  <p className="text-xs text-gray-400 mt-3">
                                    Esta cotizacion ya no se puede editar porque esta en proceso/completada/cancelada.
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {cotizacionesFiltradas.length === 0 && (
              <div className="text-center py-12 text-gray-500">No se encontraron cotizaciones.</div>
            )}
          </div>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="hidden md:block absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setPreview(null)}
          />

          <div
            className="relative bg-white w-full h-full md:w-[500px] md:h-auto md:max-w-[90vw] md:max-h-[80vh] md:rounded-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-xl md:text-base font-semibold text-black">Version {preview.version.version_number}</h3>
                <p className="text-base md:text-xs text-gray-500 mt-0.5">{preview.cotizacion.numero_cotizacion}</p>
              </div>
              <div className="flex items-center gap-3">
                {preview.version.id_version === preview.cotizacion.current_version_id && (
                  <span className="px-2 py-1 text-base md:text-xs font-medium bg-green-100 text-green-700 rounded-full">Activa</span>
                )}
                <button
                  onClick={() => setPreview(null)}
                  className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-base md:text-xs text-gray-400">Nombre</p>
                  <p className="text-base md:text-xs text-gray-400">{formatDate(preview.version.created_at)}</p>
                </div>
                <p className="text-lg md:text-sm font-medium text-black mb-3">
                  {preview.version.nombre_cliente || preview.cotizacion.nombre_cliente || "Sin nombre"}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-base md:text-xs text-gray-400">Telefono</p>
                    <p className="text-lg md:text-sm text-black">
                      {preview.version.telefono_cliente || preview.cotizacion.telefono_cliente || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-base md:text-xs text-gray-400">Email</p>
                    <p className="text-lg md:text-sm text-black truncate">
                      {preview.version.email_cliente || preview.cotizacion.email_cliente || "—"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-base md:text-xs text-gray-400">Direccion</p>
                    <p className="text-lg md:text-sm text-black">{preview.version.direccion || "—"}</p>
                  </div>
                </div>
                {(preview.version.comentarios || preview.cotizacion.comentarios) && (
                  <div className="mt-3">
                    <p className="text-base md:text-xs text-gray-400">Comentarios</p>
                    <p className="text-lg md:text-sm text-black">{preview.version.comentarios || preview.cotizacion.comentarios}</p>
                  </div>
                )}
              </div>

              <div className="px-5 py-4">
                <p className="text-base md:text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                  Productos ({(preview.version.productos || []).length})
                </p>
                <div className="space-y-2">
                  {(preview.version.productos || []).map((p) => {
                    const subtotal =
                      p.subtotal != null
                        ? p.subtotal
                        : Number(p.precio_unitario || 0) * Number(p.cantidad || 0);
                    return (
                      <div key={`${preview.version.id_version}-${p.id_detalle_version || p.id_producto}`} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-lg md:text-sm text-black">{p.nombre_producto || "Producto"}</p>
                          <p className="text-base md:text-xs text-gray-500">
                            {Number(p.cantidad || 0)} x {formatMoney(p.precio_unitario)}
                          </p>
                        </div>
                        <p className="text-lg md:text-sm font-medium text-black shrink-0 ml-4">{formatMoney(subtotal)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg md:text-sm text-gray-500">Subtotal</span>
                <span className="text-lg md:text-sm text-black">
                  {formatMoney(preview.version.subtotal ?? preview.version.total ?? 0)}
                </span>
              </div>
              {Number(preview.version.descuento_aplicado || 0) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-lg md:text-sm text-gray-500">Descuento</span>
                  <span className="text-lg md:text-sm text-green-600">-{formatMoney(preview.version.descuento_aplicado || 0)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-lg md:text-sm text-gray-500">Envio</span>
                <span className="text-lg md:text-sm text-black">
                  {Number(preview.version.costo_envio || 0) > 0
                    ? formatMoney(preview.version.costo_envio || 0)
                    : "Por definir"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-lg md:text-sm font-medium text-black">Total</span>
                <span className="text-lg md:text-base font-medium text-black">{formatMoney(preview.version.total || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
