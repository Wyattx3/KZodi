import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'kakoei.com',
          },
        ],
        destination: 'https://www.kakoei.com/:path*',
        permanent: true,
      },
    ];
  },
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
