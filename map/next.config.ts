import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure snowflake-sdk is only bundled server-side
  serverExternalPackages: ['snowflake-sdk'],
};

export default nextConfig;
