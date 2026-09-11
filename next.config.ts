import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin's Auth module pulls in jwks-rsa -> jose (an ESM
  // package) through a require() chain that Turbopack's bundler can't
  // resolve (ERR_REQUIRE_ESM at runtime). Excluding it from bundling
  // lets Node's own module resolution handle the ESM/CJS interop
  // natively instead, which is the standard fix for this with
  // firebase-admin in Next.js.
  serverExternalPackages: ["firebase-admin"],

  // Member photographs live in Vercel Blob, and next/image refuses any
  // remote host that is not listed here — it answers 400 and the card
  // renders a broken-image icon, which is exactly what the homepage did
  // the first time a real profile appeared on it. Every other surface in
  // the app uses a plain <img>, so this only ever bit the one place that
  // uses next/image with a member photo.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },

  async rewrites() {
    return [
      // Android looks for Digital Asset Links at this exact path and
      // nowhere else. It can't be an app/ route directly because Next's
      // file router ignores dot-prefixed directories, so the real handler
      // lives at /api/assetlinks and is surfaced here.
      { source: "/.well-known/assetlinks.json", destination: "/api/assetlinks" },
    ];
  },
};

export default nextConfig;
