"use client"
import DashboardSection from "./admin-sections/dashboardSection"
import PersonalInfoSection from "./admin-sections/personalInfoSection"
import ProductsSection from "./admin-sections/productsSection"
import AnalyticsSection from "./admin-sections/analyticsSection"
import CotizacionesSection from "./admin-sections/cotizacionesSection"


export default function AdminContent({ activeSection }) {
  return (
    <main className="flex-1 p-4 sm:p-6 overflow-auto">
      {activeSection === "dashboard" && <DashboardSection />}
      {activeSection === "personal-info" && <PersonalInfoSection />}
      {activeSection === "productos" && <ProductsSection />}
      {activeSection === "cotizaciones" && <CotizacionesSection />}
      
      {activeSection === "analytics" && <AnalyticsSection />}
      {activeSection === "settings" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-600">
          Settings section coming soon.
        </div>
      )}
  
    </main>
  )
}
