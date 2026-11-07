import { db } from '@/lib/server/db'
import { bad, body, requireUser, route } from '@/lib/server/http'
import { addInteraction, toQuote } from '@/lib/server/repo'
import type { QuoteStatus } from '@/lib/shared/types'
import { QUOTE_STATUS } from '@/lib/shared/utils'

type Ctx = { params: Promise<{ id: string }> }
const STATUSES = Object.keys(QUOTE_STATUS) as QuoteStatus[]
const EARLY = ['a_qualifier', 'a_contacter', 'r1']

/**
 * Changement de statut. Un devis numéroté ne se supprime pas (numérotation continue) : on l'annule.
 * Le statut du lead suit : envoyé → « Devis envoyé », accepté → « Gagné ».
 */
export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const me = await requireUser()
  const { id } = await params
  const { status } = await body<{ status: QuoteStatus }>(req)
  if (!STATUSES.includes(status)) throw bad('Statut invalide.')
  const sql = await db()
  const row = await sql.begin(async (tx) => {
    const [q] = await tx`update quotes set status = ${status}, updated_at = now() where id = ${id} returning *`
    if (!q) throw bad('Devis introuvable.', 404)
    if (q.lead_id) {
      const leadId = q.lead_id as string
      if (status === 'envoye') await tx`update leads set status = 'devis', updated_at = now() where id = ${leadId} and status = any(${EARLY})`
      if (status === 'accepte') await tx`update leads set status = 'gagne', updated_at = now() where id = ${leadId}`
      await addInteraction(tx as unknown as typeof sql, leadId, { type: 'Note', author: me.name, text: `Devis ${q.number as string} : ${QUOTE_STATUS[status].label.toLowerCase()}` })
    }
    return q
  })
  return toQuote(row)
})
