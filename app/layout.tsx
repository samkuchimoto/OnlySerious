import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, Noto_Sans_Thai } from "next/font/google";
import { BRAND_CONFIG } from "@/config/brand";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { InlineScript } from "@/components/InlineScript";
import "./globals.css";

// Editorial serif for headings — the register the whole category avoids,
// which is precisely why it reads as a house rather than a utility.
const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

// Body face. The vietnamese subset is not optional: Vietnam is a phase-2
// market and Vietnamese diacritics rendered from a fallback stack look
// like a broken font rather than a language.
const body = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});

// Thai has no coverage in either face above, and Thailand is the launch
// market. Without this, every Thai name and message renders in whatever
// the device falls back to — a different weight, a different x-height,
// sitting next to Latin text in the same line. Loading a matched Thai
// face is the difference between a localised product and one that merely
// accepts Thai input.
const thai = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai"],
  display: "swap",
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

// Stamps the day/night ambience on <html> before first paint.
//
// It has to be an inline blocking script rather than an effect: an
// effect runs after hydration, so the page would paint in daylight and
// then visibly shift to candlelight a frame later. It writes an
// attribute React never renders, so there is nothing for hydration to
// mismatch on, and if the script is blocked the :root defaults already
// carry a complete palette.
const AMBIENT_SCRIPT = `(function(){try{var h=new Date().getHours();
document.documentElement.setAttribute('data-ambient',h>=18||h<6?'evening':h<11?'morning':'day');}catch(e){}})();`;

export const viewport: Viewport = {
  // Matches the manifest's theme_color so the Android status bar is the
  // app's own teak rather than browser grey.
  themeColor: "#20140e",
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
      // The server has no idea what time it is where the reader is, so
      // it emits neutral daylight and the inline script below corrects
      // it during parsing. suppressHydrationWarning is what lets the
      // DOM win that correction instead of React reverting it.
      data-ambient="day"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${thai.variable} h-full antialiased`}
    >
      <head>
        <InlineScript html={AMBIENT_SCRIPT} />
      </head>
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
