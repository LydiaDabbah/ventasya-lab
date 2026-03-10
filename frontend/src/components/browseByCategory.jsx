"use client"

import { usePaginaPrincipal } from "@/context/PaginaPrincipalContext"
import Image from "next/image"

export default function BrowseByCategory() {
  const { categorias } = usePaginaPrincipal()

  if (!categorias || categorias.length === 0) return null

  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-black mb-3">Buscar por categoría</h2>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {categorias.map((category) => (
            <div key={category.id_categoria} className="group cursor-pointer">
              {/* Imagen o fallback */}
              <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden mb-6 flex items-center justify-center text-center">
                {category.imagen_url ? (
                  <Image
                    src={category.imagen_url}
                    alt={category.nombre}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center px-4">
                    <span className="text-white text-xl font-bold drop-shadow-lg">
                      {category.nombre}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold text-black group-hover:text-gray-700 transition-colors duration-200">
                  {category.nombre}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto transition-colors duration-200">
                  {category.descripcion || ""}
                </p>

                <button className="flex items-center justify-center space-x-1 text-sm text-black hover:text-gray-600 transition-colors duration-200 group/button mx-auto">
                  <span>Explore collection</span>
                  <svg
                    className="w-3 h-3 group-hover/button:translate-x-0.5 transition-transform duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
