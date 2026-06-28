import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["src/db/bootstrap.sql"],
  },
};

export default nextConfig;
