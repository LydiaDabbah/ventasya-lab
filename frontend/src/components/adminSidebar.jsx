"use client"
import {
  LayoutDashboard,
  User,
  Package,
  ShoppingBag,
  BarChart3,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

export default function AdminSidebar({
  activeSection,
  setActiveSection,
  sidebarCollapsed,
  setSidebarCollapsed,
  showMobileSidebar,
  setShowMobileSidebar,
}) {
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: "personal-info",
      label: "Personal Info",
      icon: <User className="w-5 h-5" />,
    },
    {
      id: "products",
      label: "Products",
      icon: <Package className="w-5 h-5" />,
    },
    {
      id: "orders",
      label: "Order History",
      icon: <ShoppingBag className="w-5 h-5" />,
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="w-5 h-5" />,
    },
  ]

  const handleMenuClick = (sectionId) => {
    setActiveSection(sectionId)
    // Cerrar sidebar móvil al seleccionar una opción
    setShowMobileSidebar(false)
  }

  return (
    <>
      {/* Mobile Overlay */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
          bg-white border-r border-gray-200 
          transition-all duration-300 ease-in-out
          ${showMobileSidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${sidebarCollapsed ? "lg:w-16" : "lg:w-64"}
          w-64
        `}
      >
        {/* Header del Sidebar */}
        <div className="p-4 lg:p-6 border-b border-gray-100 flex items-center justify-between">
          {/* Logo - Solo en móvil o cuando no está colapsado */}
          {(!sidebarCollapsed || showMobileSidebar) && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <span className="text-lg font-semibold text-black">VentasYa</span>
            </div>
          )}

          {/* Collapse Button - Solo en desktop */}
          <button
            onClick={setSidebarCollapsed}
            className="hidden lg:flex p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setShowMobileSidebar(false)}
            className="lg:hidden p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 lg:pb-6 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.id)}
              className={`
                w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg 
                transition-colors duration-200
                ${activeSection === item.id ? "bg-black text-white" : "text-gray-600 hover:text-black hover:bg-gray-50"}
                ${sidebarCollapsed && !showMobileSidebar ? "lg:justify-center" : "justify-start space-x-3"}
              `}
              title={sidebarCollapsed && !showMobileSidebar ? item.label : ""}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {(!sidebarCollapsed || showMobileSidebar) && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>
    </>
  )
}
