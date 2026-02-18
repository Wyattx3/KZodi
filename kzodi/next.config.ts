import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        port: "",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],

  },
  serverExternalPackages: ["@xenova/transformers", "pdf-parse", "epub2", "onnxruntime-node"],
};

export default nextConfig;
