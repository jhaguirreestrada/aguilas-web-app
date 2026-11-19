/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',            // imagen Docker liviana; Vercel lo ignora
  eslint: { ignoreDuringBuilds: true },
  experimental: { outputFileTracingIncludes: { '/api/assistant': ['./README.md'] } }, // el asistente lee el README
  typescript: { ignoreBuildErrors: false },
  // «Pagos» y «Ventas» se fusionaron en «Caja y Ventas» (v1.0.1): se conservan los enlaces antiguos.
  async redirects() {
    return [
      { source: '/pagos', destination: '/caja', permanent: true },
      { source: '/ventas', destination: '/caja', permanent: true },
    ]
  },
}
module.exports = nextConfig
