import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  devIndicators: false,
  serverExternalPackages: ['postgres', 'bcryptjs'],
  // Les anciens fichiers (version Vite) éventuellement présents dans le dossier sont ignorés.
  typescript: { ignoreBuildErrors: false },
  images: { unoptimized: true },
}

export default nextConfig
