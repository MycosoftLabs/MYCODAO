/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use basePath only in production so local dev works at http://localhost:3004/
  basePath: process.env.NODE_ENV === "production" ? "/mycodao.financial" : "",
};

export default nextConfig;
