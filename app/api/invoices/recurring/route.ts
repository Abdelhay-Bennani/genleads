import { db } from '@/lib/server/db'
import { bad, body, requireModule, route } from '@/lib/server/http'
import { invoiceFromQuote, isPeriod } from '@/lib/server/invoices'
import { toInvoice } from '@/lib/server/repo'

/** Génère les mensualités d'un mois pour les devis cochés. Tout ou rien : une erreur n'émet aucune facture. */
export const POST = route(async (req: Request) => {
  const me = await requireModule('factures')
  const { period, quoteIds } = await body<{ period: string; quoteIds: string[] }>(req)
  if (!isPeriod(period)) throw bad('Mois invalide.')
  if (!Array.isArray(quoteIds) || !quoteIds.length) throw bad('Sélectionnez au moins un abonnement.')
  const sql = await db()
  const rows = await sql.begin(async (tx) => {
    const out = []
    for (const id of quoteIds.map(String).slice(0, 200)) out.push(await invoiceFromQuote(tx as unknown as typeof sql, me.name, id, 'mensualite', { period }))
    return out
  })
  return rows.map(toInvoice)
})
