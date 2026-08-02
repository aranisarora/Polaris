import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next blocks cross-origin requests to dev-only endpoints by default, so
  // opening the dev server from a phone on the same wifi needs the machine's
  // LAN address listed here. Development only — this has no effect on a build.
  // If DHCP hands this machine a different address, update it here.
  allowedDevOrigins: ["10.87.139.157"],

  experimental: {
    serverActions: {
      // Server Action bodies are capped at 1 MB by default, which a CV PDF
      // clears easily. The real ceiling is the 5 MB enforced by the storage
      // bucket and the upload action; this is that plus room for the rest of
      // the multipart body.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
