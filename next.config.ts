import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'sql.js', '@tetherto/wdk', '@tetherto/wdk-wallet-evm', '@tetherto/wdk-wallet-btc', '@tetherto/wdk-protocol-lending-aave-evm', 'ws'],
}

export default nextConfig
