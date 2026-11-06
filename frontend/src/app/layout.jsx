import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata = {
  title: "VentasYa",
  description: "Panel de administración",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
