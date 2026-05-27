import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Providers from "@/components/Providers";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
});

const outfit = Outfit({ 
  subsets: ["latin"],
  variable: '--font-outfit',
});

export const metadata = {
  title: "Nexus ERP | Multi-Tenant Educational Suite",
  description: "Complete modular ERP system for schools and colleges.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} antialiased`}>
        <Providers>
          {children}
          <Toaster position="top-right" richColors closeButton toastOptions={{
            style: {
              background: '#0F172A',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#F8FAFC'
            }
          }} />
        </Providers>
      </body>
    </html>
  );
}
