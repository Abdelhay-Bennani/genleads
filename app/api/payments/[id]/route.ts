import { db } from '@/lib/server/db'
import { bad, requireModule, route } from '@/lib/server/http'
import { syncPaid } from '@/lib/server/invoices'
import { toInvoice } from '@/lib/server/repo'

export const DELETE = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireModule('paiements')
  const { id } = await params
  const sql = await db()
  return sql.begin(async (tx) => {
    const [p] = await tx`delete from payments where id = ${id} returning invoice_id`
    if (!p) throw bad('Paiement introuvable.', 404)
    return { invoice: toInvoice(await syncPaid(tx as unknown as typeof sql, p.invoice_id as string)) }
  })
})
