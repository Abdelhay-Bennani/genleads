import 'server-only'
import fs from 'node:fs'
import path from 'node:path'
import type postgres from 'postgres'
import type { Prospect } from '../shared/types'
import { cleanLead, insertLead, replaceKeywords, replacePacks, uid } from './repo'
import { DEFAULT_CATEGORIES, DEFAULT_KEYWORDS, DEFAULT_PACKS, DEFAULT_SETTINGS } from './seed'

type Sql = ReturnType<typeof postgres>
type Any = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const MIME: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' }
const fileId = (name: unknown) => (typeof name === 'string' ? name.split('.')[0] : null)

/** Ancienne version (data/db.json + data/uploads) présente dans le dossier du projet ? */
export function legacyPath() {
  const p = path.join(process.cwd(), 'data', 'db.json')
  return fs.existsSync(p) ? p : null
}

/**
 * Reprend les données de la version précédente d'AgenceFlow (fichier JSON) dans PostgreSQL :
 * comptes (mots de passe conservés), prospects + journal, packs, requêtes, maquettes, images, présentations.
 */
export async function importLegacy(sql: Sql, file: string) {
  const d: Any = JSON.parse(fs.readFileSync(file, 'utf8'))
  const uploads = path.join(path.dirname(file), 'uploads')
  const log: string[] = []

  for (const u of d.users ?? []) {
    await sql`insert into users (id, name, username, role, active, password_hash, created_at, last_login_at)
      values (${u.id}, ${u.name}, ${u.username}, ${u.role === 'super_admin' ? 'super_admin' : 'admin'}, ${u.active !== false}, ${u.passwordHash},
      ${u.createdAt ?? new Date().toISOString()}, ${u.lastLoginAt ?? null}) on conflict do nothing`
  }
  log.push(`${(d.users ?? []).length} compte(s)`)

  await replacePacks(sql, d.packs?.length ? d.packs : DEFAULT_PACKS)
  await replaceKeywords(sql, d.keywords?.length ? d.keywords : DEFAULT_KEYWORDS)

  const cats: Any[] = d.templateCategories?.length ? d.templateCategories : DEFAULT_CATEGORIES
  for (const [i, c] of cats.entries())
    await sql`insert into template_categories (id, name, builtin, position) values (${c.id}, ${c.name}, ${!!c.builtin}, ${i}) on conflict do nothing`

  // Images : les noms de fichiers deviennent les identifiants en base
  const needed = new Set<string>()
  for (const im of d.templateImages ?? []) { needed.add(im.file); needed.add(im.thumb ?? im.file) }
  if (d.settings?.logoFile) needed.add(d.settings.logoFile)
  let nFiles = 0
  for (const name of needed) {
    const p = path.join(uploads, name)
    const ext = name.split('.').pop() ?? ''
    if (!/^[a-f0-9]{32}\.(webp|jpg|png)$/.test(name) || !fs.existsSync(p)) continue
    const buf = fs.readFileSync(p)
    await sql`insert into files (id, mime, size, data) values (${fileId(name)}, ${MIME[ext]}, ${buf.length}, ${buf}) on conflict do nothing`
    nFiles++
  }

  const tplIds = new Set<string>()
  for (const t of d.templates ?? []) {
    await sql`insert into website_templates (id, name, category_id, site_type, short_description, description, features, technologies, tags,
      demo_url, demo_url_mobile, suggested_pack_ids, status, cover_image_id, created_at, updated_at)
      values (${t.id}, ${t.name}, ${cats.some((c) => c.id === t.categoryId) ? t.categoryId : null}, ${t.siteType ?? 'Site vitrine'}, ${t.shortDescription ?? ''},
      ${t.description ?? ''}, ${t.features ?? []}, ${t.technologies ?? []}, ${t.tags ?? []}, ${t.demoUrl ?? ''}, ${t.demoUrlMobile ?? ''},
      ${t.suggestedPackIds ?? []}, ${t.status === 'archived' ? 'archived' : 'active'}, ${t.coverImageId ?? null}, ${t.createdAt}, ${t.updatedAt ?? t.createdAt})
      on conflict do nothing`
    tplIds.add(t.id)
  }
  for (const im of d.templateImages ?? []) {
    const f = fileId(im.file), th = fileId(im.thumb ?? im.file)
    const [ok] = await sql`select count(*)::int as n from files where id = any(${[f, th]})`
    if (!tplIds.has(im.templateId) || ok.n < (f === th ? 1 : 2)) continue
    await sql`insert into template_images (id, template_id, file_id, thumb_file_id, kind, caption, width, height, position)
      values (${im.id}, ${im.templateId}, ${f}, ${th}, ${im.kind ?? 'desktop'}, ${im.caption ?? ''}, ${im.width ?? null}, ${im.height ?? null}, ${im.order ?? 0})
      on conflict do nothing`
  }

  let nLeads = 0
  for (const raw of d.prospects ?? []) {
    const p = cleanLead(raw as Prospect & Any)
    if (!p) continue
    if (p.templateId && !tplIds.has(p.templateId)) p.templateId = null
    await insertLead(sql, p)
    nLeads++
  }
  log.push(`${nLeads} prospect(s)`)

  for (const p of d.templatePresentations ?? []) {
    await sql`insert into template_presentations (id, token, lead_id, title, message, created_by, created_at, revoked, revoked_at, view_count, last_viewed_at)
      values (${p.id}, ${p.token}, ${(d.prospects ?? []).some((x: Any) => x.id === p.prospectId) ? p.prospectId : null}, ${p.title}, ${p.message ?? ''}, ${p.createdBy ?? '—'},
      ${p.createdAt}, ${!!p.revoked}, ${p.revokedAt ?? null}, ${p.viewCount ?? 0}, ${p.lastViewedAt ?? null}) on conflict do nothing`
  }
  for (const i of d.templatePresentationItems ?? []) {
    if (!tplIds.has(i.templateId)) continue
    await sql`insert into template_presentation_items (id, presentation_id, template_id, position) values (${i.id ?? uid()}, ${i.presentationId}, ${i.templateId}, ${i.order ?? 0}) on conflict do nothing`
  }
  for (const s of d.templateClientSelections ?? []) {
    if (!tplIds.has(s.templateId)) continue
    await sql`insert into template_client_selections (id, presentation_id, template_id, lead_id, client_name, message, created_at)
      values (${s.id}, ${s.presentationId ?? null}, ${s.templateId}, ${(d.prospects ?? []).some((x: Any) => x.id === s.prospectId) ? s.prospectId : null},
      ${s.clientName ?? ''}, ${s.message ?? ''}, ${s.createdAt}) on conflict do nothing`
  }
  const settings = { ...DEFAULT_SETTINGS, ...(d.settings ?? {}), logoFile: fileId(d.settings?.logoFile) }
  await sql`insert into settings (key, value) values ('agency', ${sql.json(settings)}) on conflict (key) do update set value = excluded.value`
  log.push(`${tplIds.size} maquette(s)`, `${nFiles} image(s)`)
  return log.join(', ')
}
