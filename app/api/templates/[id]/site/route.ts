import crypto from 'node:crypto'
import { db } from '@/lib/server/db'
import { bad, body, rateLimit, requireModule, route } from '@/lib/server/http'
import { isSitePath, SITE_MAX_FILE, SITE_MAX_FILES, SITE_MAX_TOTAL, SITE_MIME, siteExt, siteUrl } from '@/lib/shared/site'

type Ctx = { params: Promise<{ id: string }> }

async function assertTemplate(sql: Awaited<ReturnType<typeof db>>, id: string) {
  const [t] = await sql`select id from website_templates where id = ${id}`
  if (!t) throw bad('Maquette introuvable : enregistrez-la d’abord.', 404)
}
const VERSION = /^[a-f0-9]{12}$/

/** Démarre un import. Le site en ligne reste intact tant que le nouvel envoi n'est pas validé (PATCH). */
export const POST = route(async (_req: Request, { params }: Ctx) => {
  await requireModule('maquettes')
  const { id } = await params
  await assertTemplate(await db(), id)
  return { version: crypto.randomBytes(6).toString('hex') }
})

/** Envoi d'un fichier du site (corps brut) : ?version=…&path=css/style.css */
export const PUT = route(async (req: Request, { params }: Ctx) => {
  const me = await requireModule('maquettes')
  if (rateLimit('site:' + me.id, 4000, 3600e3)) throw bad('Trop d’envois, réessayez plus tard.', 429)
  const { id } = await params
  const q = new URL(req.url).searchParams
  const version = q.get('version') ?? ''
  const path = q.get('path') ?? ''
  if (!VERSION.test(version) || !isSitePath(path)) throw bad('Chemin de fichier invalide.')
  const mime = SITE_MIME[siteExt(path)]
  if (!mime) throw bad(`Type de fichier non accepté : ${path}`, 415)
  if (Number(req.headers.get('content-length') ?? 0) > SITE_MAX_FILE) throw bad(`Fichier trop lourd (4 Mo maximum) : ${path}`, 413)
  const buf = Buffer.from(await req.arrayBuffer())
  if (buf.length > SITE_MAX_FILE) throw bad(`Fichier trop lourd (4 Mo maximum) : ${path}`, 413)
  const sql = await db()
  await assertTemplate(sql, id)
  const [{ n, total }] = await sql`select count(*)::int as n, coalesce(sum(size), 0)::bigint as total from template_site_files where template_id = ${id} and version = ${version} and path <> ${path}`
  if (n >= SITE_MAX_FILES) throw bad(`Trop de fichiers (${SITE_MAX_FILES} maximum).`, 413)
  if (Number(total) + buf.length > SITE_MAX_TOTAL) throw bad('Site trop lourd (60 Mo maximum).', 413)
  await sql`insert into template_site_files (template_id, version, path, mime, size, data) values (${id}, ${version}, ${path}, ${mime}, ${buf.length}, ${buf})
    on conflict (template_id, version, path) do update set mime = excluded.mime, size = excluded.size, data = excluded.data`
  return { ok: true }
})

/** Publie l'import : le lien de démo passe sur le nouveau site, l'ancien est supprimé. */
export const PATCH = route(async (req: Request, { params }: Ctx) => {
  await requireModule('maquettes')
  const { id } = await params
  const { version } = await body<{ version: string }>(req)
  if (!VERSION.test(String(version))) throw bad('Import invalide.')
  const sql = await db()
  const [index] = await sql`select 1 from template_site_files where template_id = ${id} and version = ${version} and path = 'index.html'`
  if (!index) throw bad('Le site doit contenir un fichier index.html à sa racine.')
  const url = siteUrl(id)
  await sql.begin(async (tx) => {
    await tx`update website_templates set site_version = ${version}, demo_url = ${url}, updated_at = now() where id = ${id}`
    await tx`delete from template_site_files where template_id = ${id} and version <> ${version}`
  })
  return { url }
})

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  await requireModule('maquettes')
  const { id } = await params
  const sql = await db()
  await sql.begin(async (tx) => {
    await tx`delete from template_site_files where template_id = ${id}`
    await tx`update website_templates set site_version = null, demo_url = case when demo_url like '/site/%' then '' else demo_url end, updated_at = now() where id = ${id}`
  })
  return { ok: true }
})
