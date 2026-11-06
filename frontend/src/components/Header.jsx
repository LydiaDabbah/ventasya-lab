"use client";

import { useEffect, useState } from "react"
import CartSheet from "@/components/cartSheet.jsx"
import { useCart } from "@/context/CartContext.jsx"

export default function Header() {
  const { totalItems } = useCart()
  const [isCartOpen, setIsCartOpen] = useState(false)

  useEffect(() => {
    const handleOpenCart = () => setIsCartOpen(true)
    window.addEventListener("ventasya:open-cart", handleOpenCart)
    return () => window.removeEventListener("ventasya:open-cart", handleOpenCart)
  }, [])

  return (
    <>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <span className="text-lg font-semibold text-black">Mi Tienda</span>
            </div>

            {/* Navigation */}
        {/*     <nav className="hidden md:flex items-center space-x-8">
              <a href="#home" className="text-black font-medium hover:text-gray-600 transition-colors">
                Home
              </a>
              <a href="#about" className="text-gray-600 hover:text-black transition-colors">
                About
              </a>
              <div className="relative group">
                <button className="text-gray-600 hover:text-black transition-colors flex items-center space-x-1">
                  <span>Products</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              <div className="relative group">
                <button className="text-gray-600 hover:text-black transition-colors flex items-center space-x-1">
                  <span>Pages</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              <a href="#contact" className="text-gray-600 hover:text-black transition-colors">
                Contact
              </a>
            </nav> */}

            {/* Search and Cart */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h8"
                  />
                </svg>
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <CartSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  )
}
