import { db } from '@/lib/server/db'
import { bad, body, requireModule, route } from '@/lib/server/http'
import { cancelInvoice } from '@/lib/server/invoices'
import { toInvoice } from '@/lib/server/repo'

type Ctx = { params: Promise<{ id: string }> }

/** Une facture émise est figée : seuls « envoyée » et l'annulation (avec avoir) sont possibles. */
export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const me = await requireModule('factures')
  const { id } = await params
  const { action } = await body<{ action: 'send' | 'cancel' }>(req)
  const sql = await db()
  if (action === 'send') {
    const [row] = await sql`update invoices set status = 'envoyee', updated_at = now() where id = ${id} and status = 'emise' and kind = 'facture' returning *`
    if (!row) throw bad('Cette facture ne peut pas être marquée envoyée.')
    return { invoice: toInvoice(row) }
  }
  if (action === 'cancel') {
    const r = await sql.begin((tx) => cancelInvoice(tx as unknown as typeof sql, me.name, id))
    return { invoice: toInvoice(r.invoice), avoir: toInvoice(r.avoir) }
  }
  throw bad('Action invalide.')
})
