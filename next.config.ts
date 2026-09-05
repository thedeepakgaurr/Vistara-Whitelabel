import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.156.202.199", "localhost", "127.0.0.1"],
  serverExternalPackages: ["mysql2", "iconv-lite"],
};

export default nextConfig;
