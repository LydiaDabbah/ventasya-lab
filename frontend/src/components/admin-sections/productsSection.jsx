"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Upload, Funnel, Pencil, Trash2, ChevronDown, Check, Plus, Sparkles, Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatoDescripcion } from "@/utils/formatoDescripcion";
import { authHeaders } from "@/utils/api";
import ProductVariantsEditor from "@/components/admin-sections/ProductVariantsEditor";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const tiposDatoAdicional = [
  { value: "detalles", label: "Detalles", placeholder: "Describe las caracteristicas del producto..." },
  { value: "envio", label: "Envio/Devolucion", placeholder: "Informacion sobre envio y politicas de devolucion..." },
  { value: "info_adicional", label: "Informacion adicional", placeholder: "Informacion extra relevante..." },
  { value: "pago", label: "Pago", placeholder: "Opciones de pago, meses sin intereses..." },
];

const defaultForm = {
  nombre: "",
  descripcion: "",
  precio: "",
  imagen_url: "",
  categorias: [],
  activo: true,
  personalizable: false,
  stock: "",
  opciones: [],
  variantes: [],
  datos_adicionales: {
    detalles: "",
    envio: "",
    info_adicional: "",
    pago: "",
  },
};

function formatCurrency(amount) {
  return `$${Number(amount || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPriceInput(value) {
  const cleaned = String(value || "").replace(/[^\d.]/g, "");
  if (!cleaned) return "";

  const [integerRaw, ...decimalParts] = cleaned.split(".");
  const integerNormalized = integerRaw.replace(/^0+(?=\d)/, "");
  const integerPart = integerNormalized || "0";
  const integerWithCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (decimalParts.length === 0) return integerWithCommas;
  return `${integerWithCommas}.${decimalParts.join("").slice(0, 2)}`;
}

function parsePriceInput(value) {
  const normalized = String(value || "").replace(/,/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

const categoriasCollator = new Intl.Collator("es-MX", {
  sensitivity: "base",
  numeric: true,
});

function ordenarCategorias(categorias = []) {
  const unicas = new Map();
  categorias.forEach((cat) => {
    const limpia = String(cat || "").trim();
    if (!limpia) return;
    const key = limpia.toLocaleLowerCase("es-MX");
    if (!unicas.has(key)) unicas.set(key, limpia);
  });
  return Array.from(unicas.values()).sort((a, b) => categoriasCollator.compare(a, b));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(String(ev.target?.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProductsSection() {
  const { vendedor } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [productos, setProductos] = useState([]);
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
  const [categoriaById, setCategoriaById] = useState({});

  const [busqueda, setBusqueda] = useState("");
  const [categoriasFiltro, setCategoriasFiltro] = useState([]);
  const [estadoFiltro, setEstadoFiltro] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [tabActivo, setTabActivo] = useState("general");
  const [formData, setFormData] = useState(defaultForm);
  const [editandoId, setEditandoId] = useState(null);
  const [imagenesSeleccionadas, setImagenesSeleccionadas] = useState([]);
  const [imagenPrincipalId, setImagenPrincipalId] = useState("");
  const [saving, setSaving] = useState(false);
  const [formErrores, setFormErrores] = useState({});
  const [categoriasDropdownOpen, setCategoriasDropdownOpen] = useState(false);
  const [categoriaFiltroDropdownOpen, setCategoriaFiltroDropdownOpen] = useState(false);
  const [estadoFiltroDropdownOpen, setEstadoFiltroDropdownOpen] = useState(false);
  const [showNuevaCategoriaInput, setShowNuevaCategoriaInput] = useState(false);
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState("");
  const [improvingField, setImprovingField] = useState("");
  const [improvingMode, setImprovingMode] = useState("");

  const fileInputRef = useRef(null);
  const additionalTextareaRefs = useRef({});
  const categoriasDropdownRef = useRef(null);
  const categoriasDropdownMenuRef = useRef(null);
  const categoriaFiltroRef = useRef(null);
  const estadoFiltroRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoriaFiltroRef.current && !categoriaFiltroRef.current.contains(e.target)) {
        setCategoriaFiltroDropdownOpen(false);
      }
      if (estadoFiltroRef.current && !estadoFiltroRef.current.contains(e.target)) {
        setEstadoFiltroDropdownOpen(false);
      }
      if (categoriasDropdownRef.current && !categoriasDropdownRef.current.contains(e.target)) {
        setCategoriasDropdownOpen(false);
        setShowNuevaCategoriaInput(false);
        setNuevaCategoriaNombre("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!actionMessage) return;
    const timer = setTimeout(() => {
      setActionMessage("");
    }, 3500);
    return () => clearTimeout(timer);
  }, [actionMessage]);

  useEffect(() => {
    if (!categoriasDropdownOpen) return;

    const timer = setTimeout(() => {
      categoriasDropdownMenuRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 40);

    return () => clearTimeout(timer);
  }, [categoriasDropdownOpen]);

  useEffect(() => {
    if (!vendedor?.id_vendedor) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [productosRes, categoriasRes, relacionesRes] = await Promise.all([
          fetch(`${API_BASE}/productos/?id_vendedor=${encodeURIComponent(vendedor.id_vendedor)}`, { signal: controller.signal, headers: authHeaders() }),
          fetch(`${API_BASE}/categorias/por-vendedor/${encodeURIComponent(vendedor.id_vendedor)}`, { signal: controller.signal }),
          fetch(`${API_BASE}/producto-categorias/por-vendedor/${encodeURIComponent(vendedor.id_vendedor)}`, { signal: controller.signal }),
        ]);

        if (!productosRes.ok) throw new Error("No se pudieron cargar los productos");

        const productosData = await productosRes.json();
        const categoriasData = categoriasRes.ok ? await categoriasRes.json() : [];
        const relacionesData = relacionesRes.ok ? await relacionesRes.json() : [];

        const categoriasMap = {};
        (Array.isArray(categoriasData) ? categoriasData : []).forEach((cat) => {
          categoriasMap[String(cat.id_categoria)] = cat;
        });

        const relByProduct = {};
        (Array.isArray(relacionesData) ? relacionesData : []).forEach((rel) => {
          const productId = String(rel.id_producto);
          const catId = String(rel.id_categoria);
          const catName = categoriasMap[catId]?.nombre;
          if (!relByProduct[productId]) relByProduct[productId] = [];
          if (catName && !relByProduct[productId].includes(catName)) {
            relByProduct[productId].push(catName);
          }
        });

        const normalizedProducts = (Array.isArray(productosData) ? productosData : []).map((p) => ({
          ...p,
          id_producto: String(p.id_producto),
          categorias: ordenarCategorias(relByProduct[String(p.id_producto)] || []),
          datos_adicionales: {
            detalles: "",
            envio: "",
            info_adicional: "",
            pago: "",
          },
        }));

        setCategoriaById(categoriasMap);
        setCategoriasDisponibles(
          ordenarCategorias((Array.isArray(categoriasData) ? categoriasData : []).map((cat) => cat.nombre)),
        );
        setProductos(normalizedProducts);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Error al cargar productos");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadData();
    return () => controller.abort();
  }, [vendedor?.id_vendedor]);

  const productosFiltrados = useMemo(() => {
    const filtered = productos.filter((prod) => {
      const matchBusqueda =
        busqueda.trim() === "" ||
        (prod.nombre || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (prod.descripcion || "").toLowerCase().includes(busqueda.toLowerCase());

      const matchCategoria =
        categoriasFiltro.length === 0 ||
        (prod.categorias || []).some((cat) => categoriasFiltro.includes(cat));
      const matchEstado =
        estadoFiltro === "all" ||
        (estadoFiltro === "active" && Boolean(prod.activo)) ||
        (estadoFiltro === "inactive" && !Boolean(prod.activo));

      return matchBusqueda && matchCategoria && matchEstado;
    });

    return filtered.sort((a, b) => {
      const activeA = Boolean(a.activo) ? 1 : 0;
      const activeB = Boolean(b.activo) ? 1 : 0;
      if (activeA !== activeB) return activeB - activeA; // Activos siempre arriba
      return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
    });
  }, [productos, busqueda, categoriasFiltro, estadoFiltro]);

  const categoriasOrdenadas = useMemo(
    () => ordenarCategorias(categoriasDisponibles),
    [categoriasDisponibles],
  );
  const imagenPrincipal = useMemo(
    () => imagenesSeleccionadas.find((img) => img.id === imagenPrincipalId) || imagenesSeleccionadas[0] || null,
    [imagenesSeleccionadas, imagenPrincipalId],
  );

  const handleOpenModal = async (producto = null) => {
    setActionMessage("");
    setError("");
    setFormErrores({});

    if (producto) {
      let datosAdicionales = {
        detalles: "",
        envio: "",
        info_adicional: "",
        pago: "",
      };

      try {
        const res = await fetch(`${API_BASE}/producto-datos-adicionales/por-producto/${encodeURIComponent(producto.id_producto)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            data.forEach((d) => {
              const tipo = String(d.tipo || "").toLowerCase();
              if (tipo in datosAdicionales) datosAdicionales[tipo] = d.valor || "";
            });
          }
        }
      } catch {}

      let imagenes = [];
      if (producto.imagen_url) {
        imagenes.push({
          id: `main-${producto.id_producto}`,
          url: producto.imagen_url,
          persisted: true,
        });
      }
      try {
        const imagenesRes = await fetch(`${API_BASE}/imagenes/por-producto/${encodeURIComponent(producto.id_producto)}`);
        if (imagenesRes.ok) {
          const data = await imagenesRes.json();
          if (Array.isArray(data)) {
            data.forEach((img) => {
              if (!img?.url) return;
              if (imagenes.some((x) => x.url === img.url)) return;
              imagenes.push({
                id: `extra-${String(img.id_imagen || Math.random())}`,
                url: img.url,
                persisted: true,
                id_imagen: String(img.id_imagen || ""),
              });
            });
          }
        }
      } catch {}

      const principalId = imagenes[0]?.id || "";

      setFormData({
        nombre: producto.nombre || "",
        descripcion: producto.descripcion || "",
        precio: formatPriceInput(String(producto.precio || "")),
        imagen_url: imagenes[0]?.url || producto.imagen_url || "",
        categorias: producto.categorias || [],
        activo: Boolean(producto.activo),
        personalizable: Boolean(producto.personalizable),
        stock: producto.stock ?? "",
        opciones: (producto.opciones || []).map((option) => ({ nombre: option.nombre, valores: (option.valores || []).map((value) => value.valor) })),
        variantes: producto.variantes || [],
        datos_adicionales: datosAdicionales,
      });
      setImagenesSeleccionadas(imagenes);
      setImagenPrincipalId(principalId);
      setEditandoId(producto.id_producto);
    } else {
      setFormData(defaultForm);
      setImagenesSeleccionadas([]);
      setImagenPrincipalId("");
      setEditandoId(null);
    }

    setTabActivo("general");
    setModalAbierto(true);
  };

  const handleCloseModal = () => {
    setModalAbierto(false);
    setFormData(defaultForm);
    setFormErrores({});
    setImagenesSeleccionadas([]);
    setImagenPrincipalId("");
    setEditandoId(null);
    setSaving(false);
    setCategoriasDropdownOpen(false);
    setShowNuevaCategoriaInput(false);
    setNuevaCategoriaNombre("");
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrores[field]) {
      setFormErrores((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleCategoriaToggle = (cat) => {
    setFormData((prev) => ({
      ...prev,
      categorias: prev.categorias.includes(cat)
        ? prev.categorias.filter((c) => c !== cat)
        : ordenarCategorias([...prev.categorias, cat]),
    }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      const uploaded = await Promise.all(
        files.map(async (file, index) => ({
          id: `new-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          url: await readFileAsDataUrl(file),
          persisted: false,
        })),
      );

      setImagenesSeleccionadas((prev) => {
        const next = [...prev];
        uploaded.forEach((img) => {
          if (!next.some((x) => x.url === img.url)) next.push(img);
        });
        if (!imagenPrincipalId && next[0]) {
          setImagenPrincipalId(next[0].id);
          setFormData((old) => ({ ...old, imagen_url: next[0].url }));
        }
        return next;
      });
    } catch {
      setError("No se pudieron leer una o mas imagenes");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSetImagenPrincipal = (imageId) => {
    const selected = imagenesSeleccionadas.find((img) => img.id === imageId);
    if (!selected) return;
    setImagenPrincipalId(imageId);
    setFormData((prev) => ({ ...prev, imagen_url: selected.url }));
  };

  const handleRemoveImagen = (imageId) => {
    setImagenesSeleccionadas((prev) => {
      const next = prev.filter((img) => img.id !== imageId);
      if (imagenPrincipalId === imageId) {
        const replacement = next[0] || null;
        setImagenPrincipalId(replacement?.id || "");
        setFormData((old) => ({ ...old, imagen_url: replacement?.url || "" }));
      }
      return next;
    });
  };

  const handleDatoAdicionalChange = (tipo, value) => {
    setFormData((prev) => ({
      ...prev,
      datos_adicionales: { ...prev.datos_adicionales, [tipo]: value },
    }));
  };

  const handleMejorarDatoAdicionalIA = async (tipo, mode = "format") => {
    const original = String(formData.datos_adicionales?.[tipo] || "").trim();
    if (!original) return;

    setImprovingField(tipo);
    setImprovingMode(mode);
    setError("");
    try {
      const res = await fetch("/api/ai/mejorar-texto", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          text: original,
          context: tipo,
          mode,
          productName: String(formData.nombre || "").trim(),
          productDescription: String(formData.descripcion || "").trim(),
        }),
      });

      if (!res.ok) {
        let msg = "No se pudo mejorar el texto";
        try {
          const err = await res.json();
          msg = err?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      const data = await res.json();
      const improved = String(data?.result || "").trim();
      if (improved) {
        handleDatoAdicionalChange(tipo, improved);
        const reasonSuffix =
          data?.provider === "local" && data?.reason
            ? ` (${data.reason})`
            : "";
        setActionMessage(
          data?.provider === "gemini"
            ? mode === "rewrite"
              ? "Texto redactado con Gemini."
              : "Texto formateado con Gemini."
            : data?.provider === "openrouter"
              ? mode === "rewrite"
                ? "Texto redactado con IA."
                : "Texto formateado con IA."
              : mode === "rewrite"
                ? `Texto redactado con formato local.${reasonSuffix}`
                : `Texto formateado con formato local.${reasonSuffix}`
        );
      }
    } catch (err) {
      setError(err.message || "Error mejorando texto");
    } finally {
      setImprovingField("");
      setImprovingMode("");
    }
  };

  const handleMejorarDescripcionIA = async () => {
    const productName = String(formData.nombre || "").trim();
    const originalDescription = String(formData.descripcion || "").trim();
    if (!productName && !originalDescription) return;

    setImprovingField("descripcion");
    setImprovingMode("rewrite");
    setError("");
    try {
      const res = await fetch("/api/ai/mejorar-texto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: originalDescription || productName,
          context: "descripcion_corta",
          mode: "rewrite",
          productName,
          productDescription: originalDescription,
        }),
      });

      if (!res.ok) {
        let msg = "No se pudo mejorar la descripcion";
        try {
          const err = await res.json();
          msg = err?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      const data = await res.json();
      const improved = String(data?.result || "").trim();
      if (improved) {
        handleChange("descripcion", improved);
        const reasonSuffix =
          data?.provider === "local" && data?.reason
            ? ` (${data.reason})`
            : "";
        setActionMessage(
          data?.provider === "openrouter"
            ? "Descripcion corta mejorada con IA."
            : `Descripcion corta mejorada con formato local.${reasonSuffix}`
        );
      }
    } catch (err) {
      setError(err.message || "Error mejorando descripcion");
    } finally {
      setImprovingField("");
      setImprovingMode("");
    }
  };

  const handleFormatoDatoAdicional = (tipo, formato) => {
    const textarea = additionalTextareaRefs.current[tipo];
    const currentValue = String(formData.datos_adicionales?.[tipo] || "");
    const start = textarea?.selectionStart ?? currentValue.length;
    const end = textarea?.selectionEnd ?? currentValue.length;
    const selected = currentValue.slice(start, end);

    let replacement = "";
    if (formato === "bold") {
      replacement = selected ? `**${selected}**` : "**texto**";
    } else if (formato === "bullet") {
      replacement = selected
        ? selected
            .split("\n")
            .map((line) => (line.trim() ? `- ${line}` : line))
            .join("\n")
        : "- ";
    } else {
      return;
    }

    const nextValue = `${currentValue.slice(0, start)}${replacement}${currentValue.slice(end)}`;
    handleDatoAdicionalChange(tipo, nextValue);

    if (!textarea) return;
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + replacement.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const handleDatoAdicionalKeyDown = (tipo, e) => {
    if (e.key !== "Enter") return;
    const textarea = additionalTextareaRefs.current[tipo];
    if (!textarea) return;

    const value = String(formData.datos_adicionales?.[tipo] || "");
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? start;

    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const lineEndRaw = value.indexOf("\n", start);
    const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
    const currentLine = value.slice(lineStart, lineEnd);

    const bulletMatch = currentLine.match(/^(\s*[-*•]\s)/);
    if (!bulletMatch) return;

    e.preventDefault();

    const prefix = bulletMatch[1];
    const isEmptyBullet = currentLine.trim() === "-" || currentLine.trim() === "*" || currentLine.trim() === "•";
    const insertion = isEmptyBullet ? "\n" : `\n${prefix}`;

    const nextValue = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
    handleDatoAdicionalChange(tipo, nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + insertion.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const handleCrearCategoriaRapida = async () => {
    if (!vendedor?.id_vendedor) return;
    const limpio = nuevaCategoriaNombre.trim();
    if (!limpio) return;

    const existente = categoriasDisponibles.find(
      (cat) => String(cat || "").trim().toLocaleLowerCase("es-MX") === limpio.toLocaleLowerCase("es-MX"),
    );
    if (existente) {
      setFormData((prev) => ({
        ...prev,
        categorias: prev.categorias.includes(existente)
          ? prev.categorias
          : ordenarCategorias([...prev.categorias, existente]),
      }));
      setActionMessage("La categoria ya existia y se selecciono.");
      setNuevaCategoriaNombre("");
      setShowNuevaCategoriaInput(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/categorias/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          id_vendedor: vendedor.id_vendedor,
          nombre: limpio,
          activo: true,
          orden: null,
          imagen_url: null,
        }),
      });

      if (!res.ok) throw new Error("No se pudo crear la categoria");
      const creada = await res.json();

      setCategoriaById((prev) => ({
        ...prev,
        [String(creada.id_categoria)]: creada,
      }));
      setCategoriasDisponibles((prev) => ordenarCategorias([...prev, creada.nombre]));
      setFormData((prev) => ({
        ...prev,
        categorias: ordenarCategorias([...prev.categorias, creada.nombre]),
      }));
      setActionMessage("Categoria creada y seleccionada.");
      setNuevaCategoriaNombre("");
      setShowNuevaCategoriaInput(false);
    } catch (err) {
      setError(err.message || "Error al crear categoria");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendedor?.id_vendedor) return;

    const errs = {};
    if (!String(formData.nombre || "").trim()) errs.nombre = "Requerido";
    if (!String(formData.precio || "").trim()) errs.precio = "Requerido";

    const parsedPrice = parsePriceInput(formData.precio);
    if (!errs.precio && parsedPrice === null) errs.precio = "Precio invalido";

    const principalSeleccionada =
      imagenesSeleccionadas.find((img) => img.id === imagenPrincipalId) || imagenesSeleccionadas[0] || null;
    const principalUrl = principalSeleccionada?.url || formData.imagen_url || "";

    setFormErrores(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setError("");
    setActionMessage("");

    if (editandoId) {
      try {
        const selectedCategoryIds = Object.values(categoriaById)
          .filter((cat) => formData.categorias.includes(cat.nombre))
          .map((cat) => String(cat.id_categoria));

        const updatePayload = {
          nombre: formData.nombre,
          descripcion: formData.descripcion || "",
          precio: parsedPrice,
          imagen_url: principalUrl,
          activo: Boolean(formData.activo),
          personalizable: Boolean(formData.personalizable),
          stock: formData.stock === "" ? null : Number(formData.stock),
          opciones: formData.opciones,
          variantes: formData.variantes,
          categorias_ids: selectedCategoryIds,
        };

        const updateRes = await fetch(`${API_BASE}/productos/${encodeURIComponent(editandoId)}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(updatePayload),
        });

        if (!updateRes.ok) {
          let message = "No se pudo actualizar el producto";
          try {
            const data = await updateRes.json();
            message = data?.detail || message;
          } catch {}
          throw new Error(message);
        }

        const updated = await updateRes.json();

        const imagenesSecundariasNuevas = imagenesSeleccionadas.filter(
          (img) => img.id !== (principalSeleccionada?.id || "") && !img.persisted,
        );
        if (imagenesSecundariasNuevas.length > 0) {
          await Promise.all(
            imagenesSecundariasNuevas.map((img, index) =>
              fetch(`${API_BASE}/imagenes/`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({
                  id_producto: String(updated.id_producto),
                  url: img.url,
                  nota: null,
                  orden: String(index + 1),
                }),
              }),
            ),
          );
        }

        setProductos((prev) =>
          prev.map((p) =>
            p.id_producto === editandoId
              ? {
                  ...p,
                  ...updated,
                  id_producto: String(updated.id_producto),
                  categorias: formData.categorias,
                  datos_adicionales: formData.datos_adicionales,
                }
              : p,
          ),
        );
        setActionMessage("Producto actualizado correctamente.");
        handleCloseModal();
      } catch (err) {
        setError(err.message || "Error al actualizar producto");
      } finally {
        setSaving(false);
      }
      return;
    }

    try {
      const createPayload = {
        id_vendedor: vendedor.id_vendedor,
        nombre: formData.nombre,
        descripcion: formData.descripcion || "",
        precio: parsedPrice,
        imagen_url: principalUrl,
        personalizable: Boolean(formData.personalizable),
        stock: formData.stock === "" ? null : Number(formData.stock),
        opciones: formData.opciones,
        variantes: formData.variantes,
        categorias_ids: Object.values(categoriaById).filter((cat) => formData.categorias.includes(cat.nombre)).map((cat) => String(cat.id_categoria)),
      };

      const createRes = await fetch(`${API_BASE}/productos/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(createPayload),
      });

      if (!createRes.ok) {
        let message = "No se pudo crear el producto";
        try {
          const data = await createRes.json();
          message = data?.detail || message;
        } catch {}
        throw new Error(message);
      }

      const created = await createRes.json();
      const createdId = String(created.id_producto);

      const extraDataPayload = Object.entries(formData.datos_adicionales)
        .filter(([, value]) => String(value || "").trim().length > 0)
        .map(([tipo, valor], index) => ({
          id_producto: createdId,
          tipo,
          valor,
          orden: index + 1,
        }));

      if (extraDataPayload.length > 0) {
        await fetch(`${API_BASE}/producto-datos-adicionales/bulk`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(extraDataPayload),
        });
      }

      const imagenesSecundarias = imagenesSeleccionadas.filter(
        (img) => img.id !== (principalSeleccionada?.id || ""),
      );
      if (imagenesSecundarias.length > 0) {
        await Promise.all(
          imagenesSecundarias.map((img, index) =>
            fetch(`${API_BASE}/imagenes/`, {
              method: "POST",
              headers: authHeaders(),
              body: JSON.stringify({
                id_producto: createdId,
                url: img.url,
                nota: null,
                orden: String(index + 1),
              }),
            }),
          ),
        );
      }

      setProductos((prev) => [
        ...prev,
        {
          ...created,
          id_producto: createdId,
          categorias: formData.categorias,
          datos_adicionales: formData.datos_adicionales,
        },
      ]);

      setActionMessage("Producto creado correctamente.");
      handleCloseModal();
    } catch (err) {
      setError(err.message || "Error al guardar producto");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = (id) => {
    const producto = productos.find((p) => p.id_producto === id);
    if (!producto) return;

    const nuevoEstado = !Boolean(producto.activo);
    setError("");
    setActionMessage("");

    fetch(`${API_BASE}/productos/${encodeURIComponent(id)}/activo`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ activo: nuevoEstado }),
    })
      .then(async (res) => {
        if (!res.ok) {
          let message = "No se pudo actualizar el estado";
          try {
            const data = await res.json();
            message = data?.detail || message;
          } catch {}
          throw new Error(message);
        }
        return res.json();
      })
      .then((updated) => {
        setProductos((prev) =>
          prev.map((p) =>
            p.id_producto === id ? { ...p, activo: Boolean(updated?.activo) } : p,
          ),
        );
        setActionMessage(
          `Producto ${Boolean(updated?.activo) ? "activado" : "inactivado"} correctamente.`,
        );
      })
      .catch((err) => {
        setError(err.message || "Error al actualizar estado del producto");
      });
  };

  const handleEliminar = (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      // Sin endpoint DELETE de productos: eliminación local.
      setProductos((prev) => prev.filter((p) => p.id_producto !== id));
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black">Products</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your product catalog.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          Add Product
        </button>
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
            className="inline-flex items-center justify-center w-10 h-10 border border-gray-200 rounded-lg text-gray-700 bg-white"
            aria-label={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
            title={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          >
            <Funnel className="w-4 h-4" />
          </button>
          <p className="text-xs text-gray-500 text-right">
            Mostrando {productosFiltrados.length} de {productos.length} productos.
          </p>
        </div>

        <div className={`${showFilters ? "flex" : "hidden"} md:flex flex-col md:flex-row gap-4 mb-6`}>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="relative min-w-[170px]" ref={categoriaFiltroRef}>
            <button
              type="button"
              onClick={() => {
                setCategoriaFiltroDropdownOpen((prev) => !prev);
                setEstadoFiltroDropdownOpen(false);
              }}
              className={`w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg text-sm font-normal text-left relative focus:outline-none focus:ring-2 focus:ring-black ${
                categoriasFiltro.length === 0 ? "bg-white text-black" : "bg-black text-white"
              }`}
            >
              {categoriasFiltro.length === 0
                ? "All Categories"
                : categoriasFiltro.length === 1
                  ? categoriasFiltro[0]
                  : `${categoriasFiltro.length} Categories`}
              <ChevronDown
                className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-transform duration-200 ${
                  categoriasFiltro.length === 0 ? "text-black" : "text-white"
                } ${categoriaFiltroDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            {categoriaFiltroDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setCategoriasFiltro([]);
                    setCategoriaFiltroDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-sm text-left font-normal transition-colors ${
                    categoriasFiltro.length === 0 ? "bg-black text-white" : "text-black hover:bg-gray-100"
                  }`}
                >
                  All Categories
                </button>
                {categoriasOrdenadas.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategoriasFiltro((prev) =>
                        prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
                      );
                    }}
                    className={`w-full px-4 py-2 text-sm text-left font-normal transition-colors flex items-center justify-between ${
                      categoriasFiltro.includes(cat) ? "bg-black text-white" : "text-black hover:bg-gray-100"
                    }`}
                  >
                    <span>{cat}</span>
                    {categoriasFiltro.includes(cat) && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative min-w-[150px]" ref={estadoFiltroRef}>
            <button
              type="button"
              onClick={() => {
                setEstadoFiltroDropdownOpen((prev) => !prev);
                setCategoriaFiltroDropdownOpen(false);
              }}
              className={`w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg text-sm font-normal text-left relative focus:outline-none focus:ring-2 focus:ring-black ${
                estadoFiltro === "all" ? "bg-white text-black" : "bg-black text-white"
              }`}
            >
              {estadoFiltro === "all" ? "All Status" : estadoFiltro === "active" ? "Active" : "Inactive"}
              <ChevronDown
                className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-transform duration-200 ${
                  estadoFiltro === "all" ? "text-black" : "text-white"
                } ${estadoFiltroDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
            {estadoFiltroDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setEstadoFiltro("all");
                    setEstadoFiltroDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-sm text-left font-normal transition-colors ${
                    estadoFiltro === "all" ? "bg-black text-white" : "text-black hover:bg-gray-100"
                  }`}
                >
                  All Status
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEstadoFiltro("active");
                    setEstadoFiltroDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-sm text-left font-normal transition-colors ${
                    estadoFiltro === "active" ? "bg-black text-white" : "text-black hover:bg-gray-100"
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEstadoFiltro("inactive");
                    setEstadoFiltroDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-sm text-left font-normal transition-colors ${
                    estadoFiltro === "inactive" ? "bg-black text-white" : "text-black hover:bg-gray-100"
                  }`}
                >
                  Inactive
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="hidden md:block text-xs text-gray-500 mb-4">
          Mostrando {productosFiltrados.length} de {productos.length} productos.
        </p>

        {loading ? (
          <div className="text-sm text-gray-500 py-6">Loading products...</div>
        ) : (
          <div>
            <div className="md:hidden space-y-2">
              {productosFiltrados.map((producto, index) => (
                <div key={producto.id_producto} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-stretch justify-between gap-3">
                    <div className="min-w-0 flex-1 flex flex-col">
                      <p className="text-sm font-medium text-black truncate">{producto.nombre}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {(producto.categorias || []).join(", ") || "Uncategorized"}
                      </p>
                      <div className="mt-auto pt-2">
                        <p className="text-sm text-gray-900">{formatCurrency(producto.precio)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end self-stretch ml-auto">
                      <button
                        onClick={() => handleToggleActivo(producto.id_producto)}
                        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                          producto.activo
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        }`}
                      >
                        {producto.activo ? "Active" : "Inactive"}
                      </button>
                      <div className="flex items-center justify-end gap-2 mt-auto">
                        <button
                          onClick={() => handleOpenModal(producto)}
                          className="p-1.5 rounded-md text-gray-600 hover:text-black hover:bg-gray-100"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminar(producto.id_producto)}
                          className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 w-10">#</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Product</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Category</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Price</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 w-36">Status</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productosFiltrados.map((producto, index) => (
                    <tr key={producto.id_producto} className="group">
                      <td className="py-3 px-1 text-xs text-gray-500 text-center">{index + 1}</td>
                      <td className="py-3 px-1 text-left">
                        <span className="text-sm font-medium text-black">{producto.nombre}</span>
                      </td>
                      <td className="py-3 px-1 text-sm text-gray-600 text-left">{(producto.categorias || []).join(", ") || "Uncategorized"}</td>
                      <td className="py-3 px-1 text-sm text-gray-900 text-left">{formatCurrency(producto.precio)}</td>
                      <td className="py-3">
                        <div className="w-full flex justify-center">
                          <button
                          onClick={() => handleToggleActivo(producto.id_producto)}
                          className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer ${
                            producto.activo
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                          }`}
                          >
                            {producto.activo ? "Active" : "Inactive"}
                          </button>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="w-full flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal(producto)}
                            className="p-1.5 rounded-md text-gray-600 hover:text-black hover:bg-gray-100"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEliminar(producto.id_producto)}
                            className="p-1.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {productosFiltrados.length === 0 && (
              <div className="text-center py-12 text-gray-500">No products found.</div>
            )}
          </div>
        )}
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{editandoId ? "Edit Product" : "Add Product"}</h2>
              <button onClick={handleCloseModal} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setTabActivo("general")}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tabActivo === "general"
                    ? "border-black text-black"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                General
              </button>
              <button
                onClick={() => setTabActivo("variantes")}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tabActivo === "variantes"
                    ? "border-black text-black"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Variantes
              </button>
              <button
                onClick={() => setTabActivo("adicional")}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tabActivo === "adicional"
                    ? "border-black text-black"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Datos adicionales
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto">
              {tabActivo === "variantes" && (
                <ProductVariantsEditor
                  options={formData.opciones || []}
                  variants={formData.variantes || []}
                  stock={formData.stock}
                  basePrice={parsePriceInput(formData.precio)}
                  onChange={({ options, variants, stock }) => setFormData((prev) => ({
                    ...prev,
                    opciones: options,
                    variantes: variants,
                    ...(stock !== undefined ? { stock } : {}),
                  }))}
                />
              )}
              {tabActivo === "general" && (
                <div className={`p-5 space-y-5 ${categoriasDropdownOpen ? "pb-48" : ""}`}>
                  {Object.values(formErrores || {}).some(Boolean) && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                      Faltan campos obligatorios para continuar.
                    </div>
                  )}
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium mb-2">Imagenes</label>
                      {imagenesSeleccionadas.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full min-h-[120px] border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-gray-300 transition-colors"
                        >
                          <Upload className="w-7 h-7 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-700 font-medium">Carga las imagenes de tu producto</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Seleccionala principal con la estrella.
                          </p>
                        </button>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          {imagenesSeleccionadas.map((img) => {
                            const isPrincipal = img.id === imagenPrincipalId;
                            return (
                              <div
                                key={img.id}
                                className={`relative w-24 h-24 rounded-lg overflow-hidden border-2 ${
                                  isPrincipal ? "border-black" : "border-gray-200"
                                }`}
                              >
                                <img src={img.url} alt="Producto" className="w-full h-full object-cover" />
                                {isPrincipal && (
                                  <div className="absolute top-1 left-1 bg-black text-white text-[10px] px-1.5 py-0.5 rounded">
                                    Principal
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/45 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                  {!isPrincipal && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetImagenPrincipal(img.id)}
                                      className="p-1.5 bg-white rounded-full text-black hover:bg-gray-100"
                                      title="Hacer principal"
                                    >
                                      <Star className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImagen(img.id)}
                                    className="p-1.5 bg-white rounded-full text-red-500 hover:bg-gray-100"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-24 h-24 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-gray-300 transition-colors"
                          >
                            <Plus className="w-6 h-6 text-gray-400" />
                            <span className="text-xs text-gray-500">Agregar</span>
                          </button>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      {imagenesSeleccionadas.length > 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                          Usa la estrella para marcar imagen principal.
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Name *</label>
                          <input
                            type="text"
                            value={formData.nombre}
                            onChange={(e) => handleChange("nombre", e.target.value)}
                            className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                              formErrores.nombre
                                ? "border-red-500 focus:ring-red-400"
                                : "border-gray-200 focus:ring-black"
                            }`}
                            placeholder="Product name"
                          />
                          {formErrores.nombre && (
                            <p className="text-xs text-red-500 mt-1">{formErrores.nombre}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Price *</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={formData.precio}
                            onChange={(e) => handleChange("precio", formatPriceInput(e.target.value))}
                            className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                              formErrores.precio
                                ? "border-red-500 focus:ring-red-400"
                                : "border-gray-200 focus:ring-black"
                            }`}
                            placeholder="0.00"
                          />
                          {formErrores.precio && (
                            <p className="text-xs text-red-500 mt-1">{formErrores.precio}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <label className="block text-sm font-medium">Description</label>
                          <button
                            type="button"
                            onClick={handleMejorarDescripcionIA}
                            disabled={improvingField === "descripcion"}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 border rounded-md text-xs font-medium transition-colors ${
                              improvingField === "descripcion"
                                ? "bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed"
                                : "bg-black text-white border-black hover:bg-gray-800"
                            }`}
                            title="Redactar descripcion corta con IA"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {improvingField === "descripcion" ? "..." : "Redactar"}
                          </button>
                        </div>
                        <textarea
                          value={formData.descripcion}
                          onChange={(e) => handleChange("descripcion", e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          rows="2"
                          placeholder="Product description"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-[2fr_auto_auto] gap-4 items-end">
                        <div className="relative" ref={categoriasDropdownRef}>
                          <label className="block text-sm font-medium mb-1">Categorias</label>
                          <button
                            type="button"
                            onClick={() => setCategoriasDropdownOpen(!categoriasDropdownOpen)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-black bg-white"
                          >
                            <span className={`truncate ${formData.categorias.length > 0 ? "text-black" : "text-gray-400"}`}>
                              {formData.categorias.length > 0
                                ? `${formData.categorias.length} seleccionadas`
                                : "Seleccionar..."}
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${categoriasDropdownOpen ? "rotate-180" : ""}`}
                            />
                          </button>

                          {categoriasDropdownOpen && (
                            <div
                              ref={categoriasDropdownMenuRef}
                              className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg"
                            >
                              <div className="border-b border-gray-200 p-2">
                                {showNuevaCategoriaInput ? (
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={nuevaCategoriaNombre}
                                      onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleCrearCategoriaRapida();
                                        }
                                      }}
                                      placeholder="Nueva categoria"
                                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                                      autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <button
                                      type="button"
                                      onClick={handleCrearCategoriaRapida}
                                      className="px-3 py-1.5 bg-black text-white text-xs font-medium rounded hover:bg-gray-800"
                                    >
                                      Add
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowNuevaCategoriaInput(false);
                                        setNuevaCategoriaNombre("");
                                      }}
                                      className="p-1.5 text-gray-400 hover:text-black"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setShowNuevaCategoriaInput(true)}
                                    className="w-full px-2 py-1.5 text-sm text-left flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
                                  >
                                    <Plus className="w-4 h-4" />
                                    <span>Nueva categoria</span>
                                  </button>
                                )}
                              </div>

                              <div className="max-h-40 overflow-y-auto">
                                {categoriasOrdenadas.map((cat) => {
                                  const isSelected = formData.categorias.includes(cat);
                                  return (
                                    <button
                                      key={cat}
                                      type="button"
                                      onClick={() => handleCategoriaToggle(cat)}
                                      className={`w-full px-3 py-2 text-sm text-left flex items-center justify-between transition-colors ${
                                        isSelected ? "bg-black text-white" : "text-black hover:bg-gray-100"
                                      }`}
                                    >
                                      <span>{cat}</span>
                                      {isSelected && <Check className="w-4 h-4" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pb-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.activo}
                              onChange={(e) => handleChange("activo", e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black" />
                          </label>
                          <span className="text-sm">Active</span>
                        </div>

                        <div className="flex items-center gap-2 pb-2">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.personalizable}
                              onChange={(e) => handleChange("personalizable", e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black" />
                          </label>
                          <span className="text-sm">Personalizable</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tabActivo === "adicional" && (
                <div className="p-5 space-y-6">
                  <p className="text-sm text-gray-600">
                    Informacion adicional que se mostrara en el detalle del producto.
                  </p>

                  {tiposDatoAdicional.map((tipo) => (
                    <div key={tipo.value}>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium">{tipo.label}</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleMejorarDatoAdicionalIA(tipo.value, "format")}
                            disabled={
                              improvingField === tipo.value ||
                              !String(formData.datos_adicionales[tipo.value] || "").trim()
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Formatear"
                          >
                            <Sparkles className="w-3 h-3" />
                            {improvingField === tipo.value && improvingMode === "format" ? "..." : "Formatear"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMejorarDatoAdicionalIA(tipo.value, "rewrite")}
                            disabled={
                              improvingField === tipo.value ||
                              !String(formData.datos_adicionales[tipo.value] || "").trim()
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-black bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Redactar con IA"
                          >
                            <Sparkles className="w-3 h-3" />
                            {improvingField === tipo.value && improvingMode === "rewrite" ? "..." : "Redactar"}
                          </button>
                        </div>
                      </div>
                      <textarea
                        ref={(el) => {
                          additionalTextareaRefs.current[tipo.value] = el;
                        }}
                        value={formData.datos_adicionales[tipo.value] || ""}
                        onChange={(e) => handleDatoAdicionalChange(tipo.value, e.target.value)}
                        onKeyDown={(e) => handleDatoAdicionalKeyDown(tipo.value, e)}
                        placeholder={tipo.placeholder}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
                        rows="4"
                      />
                      <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                        <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Vista previa</p>
                        {formatoDescripcion(formData.datos_adicionales[tipo.value] || "")}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 p-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-60"
                >
                  {saving ? "Saving..." : editandoId ? "Save Changes" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
