import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'sql.js'],
  outputFileTracingIncludes: {
    '/api/**': ['./db/**', './node_modules/sql.js/**'],
  },
}

export default nextConfig
