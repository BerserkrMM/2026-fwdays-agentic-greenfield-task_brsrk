import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Receipt-photo files are capped at 10 MiB in-domain; the multipart
      // envelope needs a little headroom so a valid 10 MiB file reaches the action.
      bodySizeLimit: "11mb",
    },
  },
  outputFileTracingIncludes: {
    "/*": ["src/db/bootstrap.sql"],
  },
};

export default nextConfig;
