"use client";

import React from "react";

/**
 * ImageWithFallback
 * - props: src, alt, className, style, fallback (ruta por defecto)
 * - marca dataset.fallback para no volver a intentar infinitamente.
 */
export default function ImageWithFallback({
  src,
  alt = "",
  className = "",
  style = {},
  fallback = "/placeholder.svg",
  ...rest
}) {
  // normalize src: evita cadenas vacías
  const safeSrc = src && String(src).trim() !== "" ? src : fallback;

  return (
    <img
      src={safeSrc}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={(e) => {
        // si ya hicimos fallback, no volver a cambiar src (evita loop)
        const img = e.currentTarget;
        if (img.dataset.fallback === "true") return;
        img.dataset.fallback = "true";
        // solo cambiar si aún no es el placeholder
        if (!img.src.endsWith(fallback)) {
          img.src = fallback;
        }
      }}
    />
  );
}
