"use client"
import { useState, useEffect } from "react"
import AdminHeader from "./adminHeader"
import AdminSidebar from "./adminSidebar"
import AdminContent from "./adminContent"

export default function AdminPanel() {
  const [activeSection, setActiveSection] = useState("dashboard")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebarCollapsed")
      return saved === "true" // convierte string a boolean
    }
    return false
  })
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  // Cerrar sidebar móvil cuando se redimensiona a desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setShowMobileSidebar(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const newValue = !prev
      localStorage.setItem("sidebarCollapsed", newValue.toString())
      return newValue
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={handleToggleSidebar}
        showMobileSidebar={showMobileSidebar}
        setShowMobileSidebar={setShowMobileSidebar}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          sidebarCollapsed={sidebarCollapsed}
          showMobileSidebar={showMobileSidebar}
          setShowMobileSidebar={setShowMobileSidebar}
        />

        <AdminContent activeSection={activeSection} />
      </div>
    </div>
  )
}
