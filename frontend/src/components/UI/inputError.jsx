"use client";
import React from "react";

export default function InputError({ message }) {
  if (!message) return null;

  return (
    <div className="flex items-center space-x-2 mt-1 ">
      <svg className="w-4  text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <span className="text-red-600 text-xs">{message}</span>
    </div>
  );
}
