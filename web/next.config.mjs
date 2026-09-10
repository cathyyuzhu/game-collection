/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  eslint: {
    // CI-friendly: noisy ESLint plugins (missing rule defs) shouldn't fail builds.
    // Run `pnpm lint` separately in dev when tuning.
    ignoreDuringBuilds: true,
    dirs: ["app", "components", "lib", "pages"]
  },
  typescript: {
    ignoreBuildErrors: false
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ]
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-tabs",
      "@radix-ui/react-dropdown-menu"
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-SEO-Warmup", value: "gamerank.pro" }
        ]
      }
    ];
  }
};

export default nextConfig;
