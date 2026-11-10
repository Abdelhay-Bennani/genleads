import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  devIndicators: false,
  serverExternalPackages: ['postgres', 'bcryptjs'],
  // Les anciens fichiers (version Vite) éventuellement présents dans le dossier sont ignorés.
  typescript: { ignoreBuildErrors: false },
  images: { unoptimized: true },
  // Protections de l'application. Les sites de démo (/site, /demos) doivent rester affichables en aperçu.
  async headers() {
    return [{
      source: '/((?!site/|demos/).*)',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }]
  },
  // Sites de démonstration des maquettes (public/demos/<nom>/index.html) : URL courte /demos/<nom>
  async rewrites() {
    return [{ source: '/demos/:slug', destination: '/demos/:slug/index.html' }]
  },
}

export default nextConfig
