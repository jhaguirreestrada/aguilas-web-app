/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',            // imagen Docker liviana; Vercel lo ignora
  eslint: { ignoreDuringBuilds: true },
  experimental: { outputFileTracingIncludes: { '/api/assistant': ['./README.md'] } }, // el asistente lee el README
  typescript: { ignoreBuildErrors: false },
}
module.exports = nextConfig
