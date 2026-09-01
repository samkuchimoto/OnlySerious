import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin's Auth module pulls in jwks-rsa -> jose (an ESM
  // package) through a require() chain that Turbopack's bundler can't
  // resolve (ERR_REQUIRE_ESM at runtime). Excluding it from bundling
  // lets Node's own module resolution handle the ESM/CJS interop
  // natively instead, which is the standard fix for this with
  // firebase-admin in Next.js.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
