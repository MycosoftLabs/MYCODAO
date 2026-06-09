/** @type {import('next').NextConfig} */
const rawBase = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
const basePath =
  rawBase && rawBase !== "/"
    ? rawBase.startsWith("/")
      ? rawBase
      : `/${rawBase}`
    : "";

const nextConfig = {
  /** Avoid 308 /blocks/ → /blocks on mobile browsers (Chrome Android). */
  skipTrailingSlashRedirect: true,
  reactStrictMode: true,
  /** Empty for `https://blocks.mycodao.com/` at root. Set NEXT_PUBLIC_BASE_PATH only if serving under a subpath. */
  basePath,
  output: "standalone",
  async redirects() {
    return [
      /** Phantom OAuth returns to origin root; SPA lives under /blocks/. */
      { source: "/", destination: "/blocks/", permanent: false },
      { source: "/pulse", destination: "/blocks/", permanent: true },
      { source: "/pulse/", destination: "/blocks/", permanent: true },
      { source: "/pulse/:path*", destination: "/blocks/:path*", permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: "/blocks", destination: "/blocks/index.html" },
      { source: "/blocks/", destination: "/blocks/index.html" },
    ];
  },
};

export default nextConfig;
