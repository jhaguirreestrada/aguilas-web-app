/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',            // imagen Docker liviana; Vercel lo ignora
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
}
module.exports = nextConfig
