"use client";
import { usePaginaPrincipal } from "@/context/PaginaPrincipalContext";

export default function HeroSection() {
  const { datosVisuales } = usePaginaPrincipal();

  const slogan = datosVisuales?.slogan || "Productos de calidad para hacer tu hogar especial";
  const textoHero =
    datosVisuales?.texto_hero ||
    "Descubre nuestra selección cuidadosamente elegida de productos excepcionales que transformarán tu espacio en el hogar de tus sueños.";
  const imagenHero = datosVisuales?.imagen_hero || "/placeholder.svg?height=800&width=800";

  return (
    <section className="bg-gray-50 py-20 lg:py-0 ">
      <div className="px-6 md:px-12 lg:p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[6fr_5fr] gap-14 items-center">
          {/* Left Content */}
          <div className="flex flex-col justify-center lg:pl-16 space-y-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-black">{datosVisuales?.nombre}</h1>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-4xl lg:text-4xl xl:text-5xl font-bold text-black leading-tight">
              {datosVisuales?.slogan}
              </h2>
              <p className="text-base text-gray-600 leading-relaxed max-w-lg">
                {datosVisuales?.texto_hero }
              </p>
            </div>

            <div className="flex sm:flex-row gap-4">
              <button className="btn">
                Explore products
              </button>
            </div>
          </div>

          {/* Right Image */}
          <div className="hidden lg:flex relative flex-col">
            <div className="aspect-square bg-gray-100 overflow-hidden">
              <img
                src={imagenHero}
                alt="Hero visual"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
