// /app/manifest.ts
// Web App Manifest — what makes OSThai installable on an Android home
// screen, and the prerequisite for the Play Store listing (a Trusted Web
// Activity is a thin Android shell around exactly this).
//
// Generated rather than a static file so the name and tagline stay driven
// by config/brand.ts: launching a second market shouldn't mean editing a
// JSON file that nothing else points at.

import type { MetadataRoute } from "next";
import { BRAND_CONFIG } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND_CONFIG.appTitle} — ${BRAND_CONFIG.tagline}`,
    // What actually fits under a launcher icon. Android truncates at
    // roughly 12 characters.
    short_name: BRAND_CONFIG.appTitle,
    description: BRAND_CONFIG.heroSubheadline,
    // Browse, not the marketing homepage: someone who installed the app
    // has already converted, and landing them back on "Create your
    // profile" every launch would be a step backwards.
    start_url: "/browse",
    // The whole point of installing — no URL bar, no browser chrome, so
    // it reads as an app rather than a bookmark.
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    // Tints the Android status bar to match the app's own ink colour.
    theme_color: "#171717",
    categories: ["social", "lifestyle"],
    lang: "en",
    dir: "ltr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Separate maskable entry with a wider safe zone — Android crops
      // launcher icons to whatever shape the device theme uses, and an
      // "any" icon reused as maskable gets its edges shaved off.
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the launcher icon. Cheap retention: the two screens
    // worth returning for, one tap from the home screen.
    shortcuts: [
      { name: "Browse", url: "/browse" },
      { name: "Matches", url: "/matches" },
    ],
  };
}
