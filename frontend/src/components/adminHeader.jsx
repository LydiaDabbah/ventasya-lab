"use client"
import { useState, useRef, useEffect } from "react"
import { Menu, MessageSquare, User, Settings, LogOut, ChevronDown } from "lucide-react"
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function AdminHeader({ sidebarCollapsed, showMobileSidebar, setShowMobileSidebar }) {
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const dropdownRef = useRef(null)
  const { vendedor, logout } = useAuth();
  const router = useRouter();
  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])



  const handleProfileSettings = () => {
    router.push("/adminPanel/personal-info")
    setShowUserDropdown(false)
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo - Solo visible cuando sidebar está colapsado en desktop */}
          {sidebarCollapsed && (
            <div className="hidden lg:flex items-center space-x-3">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-black">VentasYa Admin</h1>
                <p className="text-xs text-gray-500">Dashboard</p>
              </div>
            </div>
          )}

          {/* Mobile Logo - Solo en móvil */}
          <div className="flex items-center space-x-2 lg:hidden">
            <div className="w-6 h-6 bg-black rounded-md flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-black">VentasYa</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Notifications */}
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
            <MessageSquare className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>

          {vendedor && (
  <div className="relative" ref={dropdownRef}>
    <button
      onClick={() => setShowUserDropdown(!showUserDropdown)}
      className="flex items-center space-x-2 sm:space-x-3 p-1 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
        <User className="w-4 h-4 text-gray-600" />
      </div>
      <div className="hidden sm:block text-left">
        <p className="text-sm font-medium text-black">{vendedor.nombre_negocio}</p>
        <p className="text-xs text-gray-500">Administrator</p>
      </div>
      <ChevronDown
        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
          showUserDropdown ? "rotate-180" : ""
        }`}
      />
    </button>

    {/* Dropdown Menu */}
    {showUserDropdown && (
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
        <button
          onClick={handleProfileSettings}
          className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-4 h-4 mr-3 text-gray-400" />
          Profile Settings
        </button>

        <div className="border-t border-gray-100 my-1"></div>

        <button
          onClick={logout}
          className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-3 text-red-500" />
          Logout
        </button>
      </div>
    )}
  </div>
)}

        </div>
      </div>
    </header>
  )
}
