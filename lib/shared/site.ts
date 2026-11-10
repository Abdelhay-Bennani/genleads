/** Règles communes (navigateur et serveur) pour les sites HTML importés dans une maquette. */
export const SITE_MAX_FILE = 4 * 1024 * 1024 // limite d'une requête sur Vercel
export const SITE_MAX_FILES = 400
export const SITE_MAX_TOTAL = 60 * 1024 * 1024

export const SITE_MIME: Record<string, string> = {
  html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8', map: 'application/json; charset=utf-8', txt: 'text/plain; charset=utf-8', xml: 'application/xml; charset=utf-8', webmanifest: 'application/manifest+json',
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', eot: 'application/vnd.ms-fontobject', mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', pdf: 'application/pdf',
}
export const siteExt = (path: string) => path.split('.').pop()!.toLowerCase()
/** Chemin relatif propre : pas de remontée de dossier, pas de fichier caché. */
export const isSitePath = (p: string) => p.length > 0 && p.length <= 300 && !p.startsWith('/') && p.split('/').every((s) => s && s !== '.' && s !== '..' && !s.startsWith('.') && !/[\\\0]/.test(s))
export const siteUrl = (templateId: string) => `/site/${templateId}/index.html`
