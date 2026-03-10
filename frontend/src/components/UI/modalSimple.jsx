"use client";
import React from "react";

export default function ModalSimple({ title, children, onClose, actions }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative max-w-xl w-full bg-white rounded p-6 shadow-xl z-[10000]">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">✕</button>
        </div>
        <div className="mt-3">{children}</div>
        {actions && <div className="mt-4 flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}
