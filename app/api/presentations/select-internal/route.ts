import { db } from '@/lib/server/db'
import { bad, body, requireUser, route } from '@/lib/server/http'
import { recordSelection } from '@/lib/server/templates'

/** Choix fait en rendez-vous, depuis le mode « Présentation client ». */
export const POST = route(async (req: Request) => {
  const me = await requireUser()
  const b = await body<{ templateId: string; prospectId: string; message?: string }>(req)
  const sql = await db()
  const [t] = await sql`select id from website_templates where id = ${String(b.templateId ?? '')}`
  const [l] = await sql`select id from leads where id = ${String(b.prospectId ?? '')}`
  if (!t || !l) throw bad('Maquette ou prospect introuvable.')
  await sql.begin((tx) => recordSelection(tx as unknown as typeof sql, {
    presentationId: null, templateId: t.id as string, leadId: l.id as string, clientName: '',
    message: String(b.message ?? '').slice(0, 1000), source: `en rendez-vous avec ${me.name}`,
  }))
  return { ok: true }
})
