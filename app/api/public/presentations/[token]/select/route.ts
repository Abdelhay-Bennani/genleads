import { db } from '@/lib/server/db'
import { bad, body, clientIp, rateLimit, route } from '@/lib/server/http'
import { recordSelection } from '@/lib/server/templates'

export const POST = route(async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
  if (rateLimit('ps:' + clientIp(req), 30, 3600e3)) throw bad('Trop de demandes, réessayez plus tard.', 429)
  const { token } = await params
  const b = await body<{ templateId: string; name?: string; message?: string }>(req)
  const sql = await db()
  const [p] = token.length >= 20 ? await sql`select * from template_presentations where token = ${token}` : []
  if (!p) throw bad("Ce lien de présentation n'existe pas.", 404)
  if (p.revoked) throw bad("Ce lien n'est plus actif.", 410)
  const [ok] = await sql`select 1 from template_presentation_items where presentation_id = ${p.id as string} and template_id = ${String(b.templateId ?? '')}`
  if (!ok) throw bad('Maquette invalide.')
  const [{ n }] = await sql`select count(*)::int as n from template_client_selections where presentation_id = ${p.id as string}`
  if (n >= 20) throw bad('Nombre maximal de choix atteint.', 429)
  await sql.begin((tx) => recordSelection(tx as unknown as typeof sql, {
    presentationId: p.id as string, templateId: String(b.templateId), leadId: (p.lead_id as string) ?? null,
    clientName: String(b.name ?? '').trim().slice(0, 80), message: String(b.message ?? '').trim().slice(0, 1000), source: 'via le lien de présentation',
  }))
  return { ok: true }
})
