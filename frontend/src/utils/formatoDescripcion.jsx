// utils/formatoDescripcion.jsx
import React from "react";

const renderInlineBold = (text = "") =>
  String(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return <strong key={`b-${index}`}>{part.slice(2, -2)}</strong>;
      }
      return <React.Fragment key={`t-${index}`}>{part}</React.Fragment>;
    });

export const formatoDescripcion = (descripcion) => {
  if (!descripcion) {
    return <p className="text-gray-600">No se ha proporcionado descripción.</p>;
  }

  return (
    <div className="space-y-1">
      {descripcion.split("\n").map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          // Respetar salto de parrafo intencional
          return <div key={index} className="h-4" />;
        }

        const isSection = trimmed.startsWith("**") && trimmed.endsWith("**");
        const isBullet =
          trimmed.startsWith("-") ||
          trimmed.startsWith("*") ||
          trimmed.startsWith("•");

        if (isSection) {
          return (
            <h3 key={index} className="text-base font-semibold text-black mt-2 mb-1">
              {trimmed.replace(/\*\*/g, "").trim()}
            </h3>
          );
        } else if (isBullet) {
          const bulletText = trimmed.replace(/^[-*•]\s*/, "").trim();
          return (
            <div key={index} className="flex items-start gap-2">
              <span className="text-gray-700 leading-6 mt-[1px]">•</span>
              <span className="text-gray-700 leading-6">{renderInlineBold(bulletText)}</span>
            </div>
          );
        } else {
          return (
            <p key={index} className="text-gray-600 leading-6">
              {renderInlineBold(line)}
            </p>
          );
        }
      })}
    </div>
  );
};
