import { db } from '@/lib/server/db'
import { bad, body, requireModule, route } from '@/lib/server/http'
import { invoiceFromQuote, manualInvoice, type QuoteMode } from '@/lib/server/invoices'
import { toInvoice } from '@/lib/server/repo'

export const POST = route(async (req: Request) => {
  const me = await requireModule('factures')
  const b = await body<Record<string, unknown>>(req)
  const sql = await db()
  const row = await sql.begin((tx) => {
    const t = tx as unknown as typeof sql
    if (b.quoteId) return invoiceFromQuote(t, me.name, String(b.quoteId), b.mode as QuoteMode, { percent: Number(b.percent), period: b.period as string })
    if (b.client) return manualInvoice(t, me.name, b)
    throw bad('Requête invalide.')
  })
  return toInvoice(row)
})
