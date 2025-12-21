import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfjs-dist'],
  webpack: (config) => {
    config.ignoreWarnings = [
      { module: /node_modules/ },
      { message: /source map/i },
    ];
    return config;
  },
  typescript: {
    // ⚠️ Temporary bypass for local Windows build crash
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
