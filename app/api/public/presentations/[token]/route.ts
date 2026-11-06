import { NextResponse } from 'next/server'
import { db } from '@/lib/server/db'
import { bad, clientIp, rateLimit, route } from '@/lib/server/http'
import { getSettings } from '@/lib/server/repo'

export const dynamic = 'force-dynamic'

/** Page publique de présentation : accessible sans connexion, via un jeton aléatoire révocable. */
export const GET = route(async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
  if (rateLimit('pv:' + clientIp(req), 300, 3600e3)) throw bad('Trop de requêtes.', 429)
  const { token } = await params
  const sql = await db()
  const [p] = token.length >= 20 ? await sql`select * from template_presentations where token = ${token}` : []
  if (!p) throw bad("Ce lien de présentation n'existe pas.", 404)
  if (p.revoked) throw bad("Ce lien de présentation n'est plus actif. Contactez l'agence pour en obtenir un nouveau.", 410)
  await sql`update template_presentations set view_count = view_count + 1, last_viewed_at = now() where id = ${p.id as string}`
  const [lead] = p.lead_id ? await sql`select company, contact from leads where id = ${p.lead_id as string}` : []
  const tpls = await sql`select t.*, c.name as category, i.position as pos from template_presentation_items i
    join website_templates t on t.id = i.template_id left join template_categories c on c.id = t.category_id
    where i.presentation_id = ${p.id as string} order by i.position`
  const ids = tpls.map((t) => t.id as string)
  const imgs = ids.length ? await sql`select * from template_images where template_id = any(${ids}) order by position` : []
  const sels = await sql`select template_id from template_client_selections where presentation_id = ${p.id as string}`
  const s = await getSettings(sql)
  const res = NextResponse.json({
    agency: { name: s.agencyName, tagline: s.agencyTagline, logoFile: s.logoFile, email: s.contactEmail, phone: s.contactPhone },
    title: p.title, message: p.message, company: lead?.company ?? '', contact: lead?.contact ?? '',
    templates: tpls.map((t) => ({
      id: t.id, name: t.name, siteType: t.site_type, description: t.description, shortDescription: t.short_description,
      features: t.features, technologies: t.technologies, demoUrl: t.demo_url, demoUrlMobile: t.demo_url_mobile, coverImageId: t.cover_image_id,
      category: t.category ?? '',
      images: imgs.filter((i) => i.template_id === t.id).map((i) => ({ id: i.id, file: i.file_id, thumb: i.thumb_file_id, kind: i.kind, caption: i.caption, width: i.width, height: i.height })),
    })),
    selectedTemplateIds: sels.map((x) => x.template_id),
  })
  res.headers.set('Cache-Control', 'no-store')
  res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return res
})
