import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // additional PWA config options can be placed here
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
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
      {
        protocol: "https",
        hostname: "*.anilist.co",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
  serverExternalPackages: ["@xenova/transformers", "pdf-parse", "epub2", "onnxruntime-node"],
};

export default withPWA(Object.assign({}, nextConfig));
