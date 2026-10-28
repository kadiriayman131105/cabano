import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { ConfirmHost } from "@/components/ConfirmDialog";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { StickyCartBar } from "@/components/StickyCartBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a1428",
};

export const metadata: Metadata = {
  title: {
    default: "Cabano — Commander",
    template: "%s · Cabano",
  },
  description:
    "Commandez pélou, pizzas fruits de mer, poulpe et m9ila chez Cabano. Casablanca El Hank et Bouskoura. Paiement à la livraison.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full overflow-x-clip antialiased`}>
      <body className="flex min-h-dvh flex-col overflow-x-clip">
        <Suspense fallback={<div className="h-16 border-b border-ink/5 bg-white" />}>
          <Header />
        </Suspense>
        <div className="flex-1">{children}</div>
        <Footer />
        <Suspense fallback={null}>
          <StickyCartBar />
        </Suspense>
        <ConfirmHost />
        <Toaster position="bottom-center" offset={{ bottom: "5.5rem" }} mobileOffset={{ bottom: "6.5rem" }} />
      </body>
    </html>
  );
}
