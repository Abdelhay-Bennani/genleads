import { db } from '@/lib/server/db'
import { bad, body, requireModule, route } from '@/lib/server/http'
import { addInteraction, toQuote } from '@/lib/server/repo'
import type { QuoteStatus } from '@/lib/shared/types'
import { QUOTE_STATUS } from '@/lib/shared/utils'

type Ctx = { params: Promise<{ id: string }> }
const STATUSES = Object.keys(QUOTE_STATUS) as QuoteStatus[]
const EARLY = ['a_qualifier', 'a_contacter', 'r1']
const NEXT: Record<QuoteStatus, QuoteStatus[]> = { brouillon: ['envoye', 'annule'], envoye: ['accepte', 'refuse', 'annule'], accepte: ['annule'], refuse: ['envoye', 'annule'], annule: [] }

/**
 * Changement de statut. Un devis numéroté ne se supprime pas (numérotation continue) : on l'annule.
 * Le statut du lead suit : envoyé → « Devis envoyé », accepté → « Gagné ».
 */
export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const me = await requireModule('devis')
  const { id } = await params
  const { status } = await body<{ status: QuoteStatus }>(req)
  if (!STATUSES.includes(status)) throw bad('Statut invalide.')
  const sql = await db()
  const row = await sql.begin(async (tx) => {
    const [cur] = await tx`select status from quotes where id = ${id} for update`
    if (!cur) throw bad('Devis introuvable.', 404)
    if (!NEXT[cur.status as QuoteStatus].includes(status)) throw bad('Ce changement de statut n’est pas autorisé.')
    if (status === 'annule') {
      const [billed] = await tx`select number from invoices where quote_id = ${id} and status <> 'annulee' and kind = 'facture' limit 1`
      if (billed) throw bad(`Ce devis est facturé (${billed.number as string}) : annulez d’abord la facture.`)
    }
    const [q] = await tx`update quotes set status = ${status}, updated_at = now() where id = ${id} returning *`
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
