import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  devIndicators: false,
  serverExternalPackages: ['postgres', 'bcryptjs'],
  // Les anciens fichiers (version Vite) éventuellement présents dans le dossier sont ignorés.
  typescript: { ignoreBuildErrors: false },
  images: { unoptimized: true },
  // Sites de démonstration des maquettes (public/demos/<nom>/index.html) : URL courte /demos/<nom>
  async rewrites() {
    return [{ source: '/demos/:slug', destination: '/demos/:slug/index.html' }]
  },
}

export default nextConfig
