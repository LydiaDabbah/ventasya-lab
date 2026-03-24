"use client";

import { useEffect, useMemo, useState } from "react";
import { useProductDetail } from "@/context/ProductDetailContext";
import { useCart } from "@/context/CartContext";
import { formatoDescripcion } from "@/utils/formatoDescripcion";
import { ArrowLeft } from "lucide-react";
import { useVolverAlCatalogo } from "@/hooks/useVolverAlCatalogo";

export default function ProductDetailPage() {
  const { producto, imagenesAdicionales, datosAdicionales, loading } =
    useProductDetail();

  const {
    addItem,
    updateQuantity,
    updateNotaPersonalizable,
    getItemById,
  } = useCart();

  const { volverAlCatalogo } = useVolverAlCatalogo();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [notaPersonalizada, setNotaPersonalizada] = useState("");
  const [activeTab, setActiveTab] = useState(null);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [gallerySelectedImage, setGallerySelectedImage] = useState(0);
  const [isCartActionAnimating, setIsCartActionAnimating] = useState(false);

  const idProd = useMemo(
    () => (producto?.id_producto ? String(producto.id_producto) : ""),
    [producto?.id_producto]
  );

  const personalizable = useMemo(
    () => producto?.personalizable === true,
    [producto?.personalizable]
  );

  const productImages = useMemo(() => {
    const main =
      producto?.imagen_url || "/placeholder.svg?height=600&width=600";
    const extra = (imagenesAdicionales || [])
      .map((img) => img?.url)
      .filter(Boolean);

    const uniq = [main, ...extra].filter((v, i, arr) => arr.indexOf(v) === i);
    return uniq.length ? uniq : [main];
  }, [producto?.imagen_url, imagenesAdicionales]);

  const tabs = useMemo(() => {
    return (datosAdicionales || [])
      .filter((d) => d?.tipo && d?.valor)
      .map((d) => ({
        id: `extra_${String(d.tipo).toLowerCase().replace(/\s+/g, "_")}`,
        label: d.tipo.charAt(0).toUpperCase() + d.tipo.slice(1),
        tipo: d.tipo,
      }));
  }, [datosAdicionales]);

  const itemEnCarrito = useMemo(() => {
    if (!idProd) return null;
    return getItemById(idProd);
  }, [idProd, getItemById]);

  useEffect(() => {
    setSelectedImage(0);

    if (!idProd) {
      setQuantity(1);
      setNotaPersonalizada("");
      return;
    }

    if (itemEnCarrito) {
      setQuantity(Number(itemEnCarrito.cantidad || 1));
      setNotaPersonalizada(itemEnCarrito.nota_personalizable || "");
    } else {
      setQuantity(1);
      setNotaPersonalizada("");
    }
  }, [idProd, itemEnCarrito]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [idProd]);

  useEffect(() => {
    setActiveTab((prev) => {
      if (tabs.length === 0) return null;
      const prevStillExists = tabs.some((tab) => tab.id === prev);
      if (prevStillExists) return prev;
      return tabs[0].id;
    });
  }, [tabs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (loading) return;

    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, 0);

    return () => clearTimeout(timer);
  }, [idProd, loading]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!showGalleryModal) return;

      if (event.key === "ArrowLeft") {
        setGallerySelectedImage((prev) =>
          prev > 0 ? prev - 1 : productImages.length - 1
        );
      } else if (event.key === "ArrowRight") {
        setGallerySelectedImage((prev) =>
          prev < productImages.length - 1 ? prev + 1 : 0
        );
      } else if (event.key === "Escape") {
        setShowGalleryModal(false);
      }
    };

    if (showGalleryModal) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [showGalleryModal, productImages.length]);

  const formatearPrecio = (precio) =>
    Number(precio || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const goPrevImage = (e) => {
    if (e) e.stopPropagation();
    setSelectedImage((prev) =>
      prev > 0 ? prev - 1 : productImages.length - 1
    );
  };

  const goNextImage = (e) => {
    if (e) e.stopPropagation();
    setSelectedImage((prev) =>
      prev < productImages.length - 1 ? prev + 1 : 0
    );
  };

  const decreaseQuantity = () => {
    setQuantity((prev) => {
      const current = Number(prev || 1);
      return Math.max(1, current - 1);
    });
  };

  const increaseQuantity = () => {
    setQuantity((prev) => {
      const current = Number(prev || 0);
      return Math.min(99, current + 1);
    });
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value;

    if (value === "") {
      setQuantity("");
      return;
    }

    if (!/^\d+$/.test(value)) return;

    const numericValue = Number(value);

    if (numericValue > 99) {
      setQuantity(99);
      return;
    }

    setQuantity(numericValue);
  };

  const handleQuantityBlur = () => {
    const normalized = quantity === "" || Number(quantity) < 1 ? 1 : Math.min(99, Number(quantity));
    setQuantity(normalized);
  };

  const triggerCartFeedback = () => {
    setIsCartActionAnimating(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("ventasya:open-cart"));
    }

    setTimeout(() => setIsCartActionAnimating(false), 220);
  };

  const renderTabContent = (tabId) => {
    const match = tabs.find((t) => t.id === tabId);
    if (match?.tipo) {
      const contenido = (datosAdicionales || []).find(
        (d) => d.tipo === match.tipo
      );

      return contenido?.valor ? (
        <div className="space-y-4">
          <div className="text-gray-600 text-sm leading-relaxed">
            {formatoDescripcion(contenido.valor)}
          </div>
        </div>
      ) : (
        <p className="text-gray-600 text-sm">No disponible.</p>
      );
    }

    return null;
  };

  const handleAddToCart = () => {
    if (!idProd) return;

    const target = Math.max(1, Number(quantity || 1));
    const clean = (notaPersonalizada ?? "").trim();
    const wasInCart = Boolean(itemEnCarrito);

    if (itemEnCarrito) {
      updateQuantity(idProd, target);

      if (personalizable) {
        updateNotaPersonalizable(idProd, clean.length ? clean : null);
      } else {
        updateNotaPersonalizable(idProd, null);
      }

      triggerCartFeedback();
      return;
    }

    addItem({
      id_producto: idProd,
      nombre: producto?.nombre ?? "",
      precio: Number(producto?.precio ?? 0),
      imagen_url: producto?.imagen_url ?? null,
      personalizable: producto?.personalizable === true,
    });

    updateQuantity(idProd, target);

    if (personalizable) {
      updateNotaPersonalizable(idProd, clean.length ? clean : null);
    } else {
      updateNotaPersonalizable(idProd, null);
    }

    triggerCartFeedback();
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando producto…</p>
        </div>
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center text-gray-500">
        Producto no encontrado.
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-16 py-12">
        <button
          onClick={volverAlCatalogo}
          className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al catálogo
        </button>

        <div className="grid grid-cols-1 md:grid-cols-[5fr,4fr] gap-10 lg:gap-18 lg:px-6">
          {/* Left - Images sticky */}
          <div className="md:sticky md:top-8 md:self-start">
            <div className="space-y-4">
              <div
                className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden group cursor-pointer"
                onClick={() => {
                  setGallerySelectedImage(selectedImage);
                  setShowGalleryModal(true);
                }}
              >
                <img
                  src={productImages[selectedImage] || "/placeholder.svg"}
                  alt={producto?.nombre || "Producto"}
                  className="w-full h-full object-cover"
                />

                {productImages.length > 1 && (
                  <>
                    <button
                      onClick={goPrevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-black/80 text-white rounded-full flex items-center justify-center hover:bg-black transition-all duration-200 opacity-0 group-hover:opacity-100"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={goNextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-black/80 text-white rounded-full flex items-center justify-center hover:bg-black transition-all duration-200 opacity-0 group-hover:opacity-100"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/70 text-white text-xs">
                      {selectedImage + 1} / {productImages.length}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right - Product Info */}
          <div className="flex flex-col justify-center space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-black mb-3">
                {producto?.nombre || "Producto"}
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                {producto?.descripcion || ""}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-2xl font-bold text-black">
                {formatearPrecio(producto?.precio)}
              </span>
            </div>

          

            {personalizable && (
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Personalización{" "}
                  <span className="text-gray-400 font-normal ml-1">
                    (opcional)
                  </span>
                </label>
                <textarea
                  value={notaPersonalizada}
                  onChange={(e) => setNotaPersonalizada(e.target.value)}
                  placeholder="Ej: Color rosa, agregar nombre, sin cebolla, etc."
                  rows={2}
                  maxLength={150}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-gray-600 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {(notaPersonalizada || "").length}/150 caracteres
                </p>
              </div>
            )}

            {/* Cantidad */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-black">
                Cantidad
              </label>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={decreaseQuantity}
                  disabled={Number(quantity || 0) <= 1}
                  className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                    Number(quantity || 0) > 1
                      ? "bg-black hover:bg-gray-800 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                  aria-label="Disminuir cantidad"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 12H4"
                    />
                  </svg>
                </button>

                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={quantity}
                  onChange={handleQuantityChange}
                  onBlur={handleQuantityBlur}
                  className="w-12 text-sm font-semibold text-black text-center border-0 bg-transparent focus:outline-none"
                  aria-label="Cantidad"
                />

                <button
                  type="button"
                  onClick={increaseQuantity}
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-black hover:bg-gray-800 text-white transition-colors"
                  aria-label="Aumentar cantidad"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                className={`w-full bg-black text-white px-6 py-3 rounded-md font-medium text-sm hover:bg-gray-800 transition-all ${
                  isCartActionAnimating ? "scale-[0.99]" : "scale-100"
                }`}
              >
                {itemEnCarrito ? "Actualizar carrito" : "Agregar al carrito"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200"></div>

      <div className="bg-gray-50 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {tabs.length > 0 && (
            <>
              {/* Mobile accordion */}
              <div className="md:hidden space-y-3">
                {tabs.map((tab) => {
                  const isOpen = activeTab === tab.id;

                  return (
                    <div
                      key={tab.id}
                      className="bg-white rounded-lg shadow-sm overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setActiveTab(isOpen ? null : tab.id)}
                        className={`w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-left transition-colors ${
                          isOpen
                            ? "bg-black text-white"
                            : "bg-white text-black hover:bg-gray-50"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {isOpen && (
                        <div className="px-5 py-5 border-t border-gray-100">
                          {renderTabContent(tab.id)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop tabs */}
              <div className="hidden md:block">
                <div className="flex justify-center mb-8">
                  <div className="flex">
                    {tabs.map((tab, index) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-5 py-2.5 font-medium text-sm whitespace-nowrap transition-all duration-200 focus:outline-none ${
                          activeTab === tab.id
                            ? "bg-black text-white"
                            : "bg-white text-gray-600 hover:text-black hover:bg-gray-50"
                        } ${index === 0 ? "rounded-l-md" : ""} ${
                          index === tabs.length - 1 ? "rounded-r-md" : ""
                        } ${
                          activeTab !== tab.id && index < tabs.length - 1
                            ? "border-r border-gray-200"
                            : ""
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-w-3xl mx-auto bg-white rounded-lg p-8 shadow-sm">
                  {activeTab && renderTabContent(activeTab)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showGalleryModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowGalleryModal(false)}
        >
          <div
            className="relative w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowGalleryModal(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden mb-4 group">
              <img
                src={productImages[gallerySelectedImage] || "/placeholder.svg"}
                alt={`Gallery ${gallerySelectedImage + 1}`}
                className="w-full h-full object-contain"
              />

              {productImages.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setGallerySelectedImage((prev) =>
                        prev > 0 ? prev - 1 : productImages.length - 1
                      )
                    }
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white text-black rounded-full flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-gray-100"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>

                  <button
                    onClick={() =>
                      setGallerySelectedImage((prev) =>
                        prev < productImages.length - 1 ? prev + 1 : 0
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white text-black rounded-full flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-gray-100"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>

            <div className="text-center mb-2">
              <span className="text-white text-sm">
                {gallerySelectedImage + 1} / {productImages.length}
              </span>
            </div>

            <div className="text-center">
              <span className="text-gray-400 text-xs">
                Usa ← → para navegar • ESC para cerrar
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
