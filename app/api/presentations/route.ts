import { db } from '@/lib/server/db'
import { bad, body, requireModule, route } from '@/lib/server/http'
import { addInteraction, uid } from '@/lib/server/repo'
import { newToken } from '@/lib/server/templates'

export const POST = route(async (req: Request) => {
  const me = await requireModule('maquettes', 'presentations')
  const b = await body<{ templateIds: string[]; prospectId?: string | null; title?: string; message?: string }>(req)
  const sql = await db()
  const wanted = Array.isArray(b.templateIds) ? b.templateIds.map(String).slice(0, 24) : []
  const found = wanted.length ? await sql`select id, name from website_templates where id = any(${wanted})` : []
  const ids = wanted.filter((id) => found.some((f) => f.id === id))
  if (!ids.length) throw bad('Sélectionnez au moins une maquette.')
  const [lead] = b.prospectId ? await sql`select id from leads where id = ${b.prospectId}` : []
  const id = uid()
  const title = String(b.title ?? '').trim().slice(0, 120) || 'Notre sélection de maquettes'
  const message = String(b.message ?? '').trim().slice(0, 1500)
  const token = newToken()
  await sql.begin(async (tx) => {
    await tx`insert into template_presentations (id, token, lead_id, title, message, created_by) values (${id}, ${token}, ${lead?.id ?? null}, ${title}, ${message}, ${me.name})`
    for (const [position, templateId] of ids.entries())
      await tx`insert into template_presentation_items (id, presentation_id, template_id, position) values (${uid()}, ${id}, ${templateId}, ${position})`
    if (lead) await addInteraction(tx as unknown as typeof sql, lead.id as string, {
      type: 'Email', author: me.name,
      text: `Lien de présentation créé (${ids.length} maquette${ids.length > 1 ? 's' : ''}) : ${ids.map((x) => found.find((f) => f.id === x)?.name).join(', ')}`,
    })
  })
  const [p] = await sql`select * from template_presentations where id = ${id}`
  return { id, token, prospectId: lead?.id ?? null, title, message, createdBy: me.name, createdAt: (p.created_at as Date).toISOString(), revoked: false, revokedAt: null, viewCount: 0, lastViewedAt: null }
})
