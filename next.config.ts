import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin's Auth module pulls in jwks-rsa -> jose (an ESM
  // package) through a require() chain that Turbopack's bundler can't
  // resolve (ERR_REQUIRE_ESM at runtime). Excluding it from bundling
  // lets Node's own module resolution handle the ESM/CJS interop
  // natively instead, which is the standard fix for this with
  // firebase-admin in Next.js.
  serverExternalPackages: ["firebase-admin"],

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
