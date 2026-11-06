import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <section className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl p-8 sm:p-12 text-center shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-gray-500 uppercase">VentasYa</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-gray-950">Vende de forma simple</h1>
        <p className="mt-4 text-gray-600 leading-relaxed">
          Administra tu catálogo, inventario y cotizaciones desde un solo lugar.
        </p>
        <Link href="/login" className="mt-8 inline-flex justify-center rounded-lg bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800">
          Entrar al panel
        </Link>
      </section>
    </main>
  );
}
