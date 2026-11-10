import 'server-only'
import crypto from 'node:crypto'
import type postgres from 'postgres'
import { SITE_TYPES } from '../shared/data'
import { addInteraction, safeUrl, uid } from './repo'

type Sql = ReturnType<typeof postgres>
const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const list = (v: unknown, max = 30) => (Array.isArray(v) ? v.map((x) => str(x, 80)).filter(Boolean).slice(0, max) : [])

export const FILE_ID = /^[a-f0-9]{32}$/
export const MAX_UPLOAD = 4 * 1024 * 1024 // limite des fonctions Vercel : 4,5 Mo par requête

export function sniff(buf: Buffer): string | null {
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.length > 8 && buf.readUInt32BE(0) === 0x89504e47) return 'image/png'
  return null
}

/** Une URL de démo locale n'est acceptée que si elle désigne le site importé de cette maquette. */
const demoUrl = (v: unknown, id: string) => (typeof v === 'string' && v.startsWith(`/site/${id}/`) ? v.slice(0, 500) : safeUrl(v))

export const newFileId = () => crypto.randomBytes(16).toString('hex')
export const newToken = () => crypto.randomBytes(24).toString('base64url')

export async function saveTemplate(sql: Sql, id: string, b: Record<string, unknown>) {
  const name = str(b.name, 120)
  if (!name) throw new Error('NAME')
  const [cat] = b.categoryId ? await sql`select id from template_categories where id = ${String(b.categoryId)}` : []
  const packIds = list(b.suggestedPackIds, 10)
  const validPacks = packIds.length ? (await sql`select id from packs where id = any(${packIds})`).map((r) => r.id as string) : []
  const t = {
    name, category_id: cat?.id ?? null,
    site_type: SITE_TYPES.includes(b.siteType as string) ? (b.siteType as string) : 'Site vitrine',
    short_description: str(b.shortDescription, 220), description: str(b.description, 3000),
    features: list(b.features, 20), technologies: list(b.technologies, 20), tags: list(b.tags, 30),
    demo_url: demoUrl(b.demoUrl, id), demo_url_mobile: safeUrl(b.demoUrlMobile), suggested_pack_ids: validPacks,
    status: b.status === 'archived' ? 'archived' : 'active',
  }
  const imgs = (Array.isArray(b.images) ? b.images : []).slice(0, 40).filter((i: Record<string, unknown>) => i && FILE_ID.test(String(i.file)) && FILE_ID.test(String(i.thumb ?? i.file)))
  const fileIds = imgs.flatMap((i: Record<string, unknown>) => [String(i.file), String(i.thumb ?? i.file)])
  const existing = new Set((fileIds.length ? await sql`select id from files where id = any(${fileIds})` : []).map((r) => r.id as string))
  const clean = imgs.filter((i: Record<string, unknown>) => existing.has(String(i.file)) && existing.has(String(i.thumb ?? i.file))).map((i: Record<string, unknown>, position: number) => ({
    id: typeof i.id === 'string' && /^[\w-]{1,40}$/.test(i.id) ? i.id : uid(),
    file_id: String(i.file), thumb_file_id: String(i.thumb ?? i.file),
    kind: ['desktop', 'mobile', 'other'].includes(i.kind as string) ? (i.kind as string) : 'desktop',
    caption: str(i.caption, 120), width: Number(i.width) || null, height: Number(i.height) || null, position,
  }))
  const cover = clean.some((i) => i.id === b.coverImageId) ? String(b.coverImageId) : clean[0]?.id ?? null
  await sql`
    insert into website_templates (id, name, category_id, site_type, short_description, description, features, technologies, tags,
      demo_url, demo_url_mobile, suggested_pack_ids, status, cover_image_id)
    values (${id}, ${t.name}, ${t.category_id}, ${t.site_type}, ${t.short_description}, ${t.description}, ${t.features}, ${t.technologies},
      ${t.tags}, ${t.demo_url}, ${t.demo_url_mobile}, ${t.suggested_pack_ids}, ${t.status}, ${cover})
    on conflict (id) do update set name = excluded.name, category_id = excluded.category_id, site_type = excluded.site_type,
      short_description = excluded.short_description, description = excluded.description, features = excluded.features,
      technologies = excluded.technologies, tags = excluded.tags, demo_url = excluded.demo_url, demo_url_mobile = excluded.demo_url_mobile,
      suggested_pack_ids = excluded.suggested_pack_ids, status = excluded.status, cover_image_id = excluded.cover_image_id, updated_at = now()`
  await sql`delete from template_images where template_id = ${id}`
  for (const i of clean)
    await sql`insert into template_images (id, template_id, file_id, thumb_file_id, kind, caption, width, height, position)
      values (${i.id}, ${id}, ${i.file_id}, ${i.thumb_file_id}, ${i.kind}, ${i.caption}, ${i.width}, ${i.height}, ${i.position})
      on conflict (id) do update set template_id = excluded.template_id, file_id = excluded.file_id, thumb_file_id = excluded.thumb_file_id,
      kind = excluded.kind, caption = excluded.caption, width = excluded.width, height = excluded.height, position = excluded.position`
}

/** Supprime les fichiers qui ne sont plus utilisés (après 1 h, pour laisser le temps aux formulaires en cours). */
export async function collectGarbage(sql: Sql) {
  const [s] = await sql`select value->>'logoFile' as logo from settings where key = 'agency'`
  await sql`delete from files f where f.created_at < now() - interval '1 hour'
    and not exists (select 1 from template_images i where i.file_id = f.id or i.thumb_file_id = f.id)
    and f.id is distinct from ${s?.logo ?? null}`
}

export async function recordSelection(sql: Sql, o: { presentationId: string | null; templateId: string; leadId: string | null; clientName: string; message: string; source: string }) {
  const [t] = await sql`select name from website_templates where id = ${o.templateId}`
  await sql`insert into template_client_selections (id, presentation_id, template_id, lead_id, client_name, message)
    values (${uid()}, ${o.presentationId}, ${o.templateId}, ${o.leadId}, ${o.clientName}, ${o.message})`
  if (o.leadId) {
    const today = new Date().toISOString().slice(0, 10)
    await sql`update leads set template_id = ${o.templateId}, template_id_updated_at = now(),
      next_follow_up = case when next_follow_up is not null and next_follow_up < ${today} then next_follow_up else ${today} end
      where id = ${o.leadId}`
    await addInteraction(sql, o.leadId, {
      type: 'Note', author: o.clientName ? `${o.clientName} (client)` : 'Client',
      text: `⭐ Maquette choisie : « ${t?.name ?? ''} » (${o.source}).${o.message ? `\nMessage du client : ${o.message}` : ''}`,
    })
  }
}
