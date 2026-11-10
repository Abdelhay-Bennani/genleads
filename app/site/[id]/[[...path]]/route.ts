import { run } from '@/lib/server/db'
import { clientIp, rateLimit } from '@/lib/server/http'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string; path?: string[] }> }

/**
 * Sert le site HTML importé dans une maquette (lien de démo public).
 * Le code importé n'est pas celui de l'agence : la directive « sandbox » l'exécute dans une origine isolée,
 * il ne peut donc ni lire la session du CRM ni appeler son API.
 */
const HEADERS = {
  'Content-Security-Policy': 'sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
  'Access-Control-Allow-Origin': '*', // polices et modules JS, chargés depuis l'origine isolée
  'Cache-Control': 'public, max-age=60',
}

/** Les liens absolus (/css/style.css) pointeraient vers le CRM : ils sont ramenés à la racine du site. */
function rebase(text: string, root: string, html: boolean) {
  const css = text.replace(/url\((["']?)\/(?!\/)/g, `url($1${root}/`)
  return html ? css.replace(/(\s(?:href|src|action|poster)=["'])\/(?!\/)/gi, `$1${root}/`) : css
}

const notFound = () => new Response('<!doctype html><meta charset="utf-8"><title>Page introuvable</title><p style="font:16px system-ui;padding:2rem">Cette page n’existe pas dans la maquette.</p>', {
  status: 404, headers: { ...HEADERS, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
})

async function find(id: string, path: string) {
  const [f] = await run`select f.path, f.mime, f.data from template_site_files f join website_templates t on t.id = f.template_id and t.site_version = f.version
    where t.id = ${id} and lower(f.path) = lower(${path}) order by (f.path = ${path}) desc limit 1`
  return f
}

export async function GET(req: Request, { params }: Ctx) {
  if (rateLimit('site-view:' + clientIp(req), 6000, 3600e3)) return new Response('Trop de requêtes.', { status: 429 })
  const { id, path = [] } = await params
  if (!/^[\w-]{1,40}$/.test(id)) return notFound()
  const root = `/site/${id}`
  const go = (p: string) => new Response(null, { status: 302, headers: { Location: `${root}/${p.split('/').map(encodeURIComponent).join('/')}` } })
  if (!path.length) return go('index.html')
  const wanted = path.join('/').replace(/\/+$/, '')
  try {
    const f = await find(id, wanted)
    if (!f) {
      // /a-propos → a-propos/index.html ou a-propos.html
      for (const alt of [`${wanted}/index.html`, `${wanted}.html`]) if (await find(id, alt)) return go(alt)
      return notFound()
    }
    const mime = f.mime as string
    const isHtml = mime.startsWith('text/html')
    const data = isHtml || mime.startsWith('text/css') ? rebase((f.data as Buffer).toString('utf8'), root, isHtml) : new Uint8Array(f.data as Buffer)
    return new Response(data, { headers: { ...HEADERS, 'Content-Type': mime } })
  } catch { return new Response(null, { status: 503 }) }
}
