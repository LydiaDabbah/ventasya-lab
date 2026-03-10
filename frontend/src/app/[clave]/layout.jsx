"use client"
import Header from "@/components/Header"
import { PaginaPrincipalProvider } from "@/context/PaginaPrincipalContext"
import { ProductosProvider } from "@/context/ProductosContext"
import { VendedorProvider } from "@/context/VendedorContext"
import { CartProvider } from "@/context/CartContext"   // ⬅️ importa el carrito

export default function Layout({ children }) {
  return (
    <html lang="es">
      <body>
        <VendedorProvider>
          <PaginaPrincipalProvider>
            <ProductosProvider>
              <CartProvider>
                <Header />
                {children}
              </CartProvider>
            </ProductosProvider>
          </PaginaPrincipalProvider>
        </VendedorProvider>
      </body>
    </html>
  )
}
