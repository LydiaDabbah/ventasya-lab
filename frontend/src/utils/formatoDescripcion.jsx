// utils/formatoDescripcion.jsx
import { Dot } from "lucide-react";

export const formatoDescripcion = (descripcion) => {
  if (!descripcion) {
    return <p className="text-gray-600">No se ha proporcionado descripción.</p>;
  }

  return (
    <div className="space-y-4">
      {descripcion.split("\n").map((line, index) => {
        const isSection = line.trim().startsWith("**") && line.trim().endsWith("**");
        const isBullet =
          line.trim().startsWith("-") ||
          line.trim().startsWith("*") ||
          line.trim().startsWith("•");

        if (isSection) {
          return (
            <h3 key={index} className="text-base font-semibold text-black mt-4">
              {line.replace(/\*\*/g, "").trim()}
            </h3>
          );
        } else if (isBullet) {
          return (
            <div key={index} className="flex items-start gap-2">
              <Dot className="w-5 h-5 text-black mt-1" />
              <span className="text-gray-700">{line.replace(/^[-*•]\s*/, "").trim()}</span>
            </div>
          );
        } else {
          return (
            <p key={index} className="text-gray-600">
              {line}
            </p>
          );
        }
      })}
    </div>
  );
};
