import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import type { RuntimeCaching } from "workbox-build";

const runtimeCaching: RuntimeCaching[] = [
  {
    urlPattern: ({ request }) => request.mode === "navigate",
    handler: "NetworkFirst",
    options: {
      cacheName: "app-pages",
      networkTimeoutSeconds: 4,
      expiration: {
        maxEntries: 48,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
  {
    urlPattern: ({ url }) => url.pathname.startsWith("/_next/static/"),
    handler: "CacheFirst",
    options: {
      cacheName: "app-shell-assets",
      expiration: {
        maxEntries: 128,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
  {
    urlPattern: ({ request }) =>
      request.destination === "style" ||
      request.destination === "script" ||
      request.destination === "worker" ||
      request.destination === "font" ||
      request.destination === "image",
    handler: "CacheFirst",
    options: {
      cacheName: "ui-assets",
      expiration: {
        maxEntries: 160,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
  {
    urlPattern: ({ request, url }) =>
      request.method === "GET" &&
      url.pathname.startsWith("/api/") &&
      (
        url.pathname.startsWith("/api/conversations") ||
        url.pathname.startsWith("/api/messages") ||
        url.pathname.startsWith("/api/characters") ||
        url.pathname.startsWith("/api/stories") ||
        url.pathname.startsWith("/api/user/language") ||
        url.pathname.startsWith("/api/user/profile") ||
        url.pathname.startsWith("/api/user/me")
      ),
    handler: "NetworkFirst",
    options: {
      cacheName: "api-data",
      networkTimeoutSeconds: 5,
      expiration: {
        maxEntries: 80,
        maxAgeSeconds: 60 * 60 * 24,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
];

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: false,
  reloadOnOnline: false,
  cacheStartUrl: false,
  customWorkerSrc: "worker",
  fallbacks: {
    document: "/~offline",
  },
  workboxOptions: {
    clientsClaim: true,
    skipWaiting: false,
    runtimeCaching,
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "kakoei.com",
          },
        ],
        destination: "https://www.kakoei.com/:path*",
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
