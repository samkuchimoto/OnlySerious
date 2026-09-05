import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BRAND_CONFIG } from "@/config/brand";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: BRAND_CONFIG.appTitle,
  description: BRAND_CONFIG.tagline,
  // Tells Android/Chrome this is an installable app and where to find its
  // icons — app/manifest.ts generates the manifest itself.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: BRAND_CONFIG.appTitle,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // Matches the manifest's theme_color so the Android status bar is the
  // app's own ink colour rather than browser grey.
  themeColor: "#171717",
  width: "device-width",
  initialScale: 1,
  // Not locked: pinch-zoom is an accessibility affordance, and a dating
  // app whose photos can't be zoomed is worse for exactly the people who
  // need it. viewport-fit=cover lets the layout reach under the notch.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
