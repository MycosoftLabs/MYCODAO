/** @type {import('next').NextConfig} */
const rawBase = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
const basePath =
  rawBase && rawBase !== "/"
    ? rawBase.startsWith("/")
      ? rawBase
      : `/${rawBase}`
    : "";

const nextConfig = {
  reactStrictMode: true,
  /** Empty for `https://pulse.mycodao.com/` at root. Set NEXT_PUBLIC_BASE_PATH only if serving under a subpath. */
  basePath,
  output: "standalone",
  async redirects() {
    return [
      /** Phantom OAuth returns to origin root; SPA lives under /pulse/. */
      { source: "/", destination: "/pulse/", permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: "/pulse", destination: "/pulse/index.html" },
      { source: "/pulse/", destination: "/pulse/index.html" },
    ];
  },
};

export default nextConfig;
