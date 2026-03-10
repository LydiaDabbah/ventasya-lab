"use client"
import DashboardSection from "./admin-sections/dashboardSection"
import PersonalInfoSection from "./admin-sections/personalInfoSection"
import ProductsSection from "./admin-sections/productsSection"
import AnalyticsSection from "./admin-sections/analyticsSection"


export default function AdminContent({ activeSection }) {
  return (
    <main className="flex-1 p-4 sm:p-6 overflow-auto">
      {activeSection === "dashboard" && <DashboardSection />}
      {activeSection === "personal-info" && <PersonalInfoSection />}
      {activeSection === "products" && <ProductsSection />}
      
      {activeSection === "analytics" && <AnalyticsSection />}
  
    </main>
  )
}
