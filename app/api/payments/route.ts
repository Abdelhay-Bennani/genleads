import { db } from '@/lib/server/db'
import { bad, body, requireModule, route } from '@/lib/server/http'
import { isDay, syncPaid } from '@/lib/server/invoices'
import { addInteraction, toInvoice, toPayment, uid } from '@/lib/server/repo'
import type { InvoiceLine } from '@/lib/shared/types'
import { eur2, invoiceTotals, PAYMENT_METHODS, round2 } from '@/lib/shared/utils'

export const POST = route(async (req: Request) => {
  const me = await requireModule('paiements')
  const b = await body<{ invoiceId: string; amount: number; date: string; method: string; reference?: string; notes?: string }>(req)
  const amount = round2(Number(b.amount))
  if (!(amount > 0)) throw bad('Le montant doit être positif.')
  if (!isDay(b.date)) throw bad('Date de paiement invalide.')
  const method = PAYMENT_METHODS.find((m) => m.id === b.method)
  if (!method) throw bad('Mode de paiement invalide.')
  const sql = await db()
  return sql.begin(async (tx) => {
    const t = tx as unknown as typeof sql
    const [inv] = await tx`select * from invoices where id = ${String(b.invoiceId)} for update`
    if (!inv) throw bad('Facture introuvable.', 404)
    if (inv.kind !== 'facture' || inv.status === 'annulee') throw bad('Cette facture ne peut pas recevoir de paiement.')
    const [{ paid }] = await tx`select coalesce(sum(amount), 0) as paid from payments where invoice_id = ${inv.id as string}`
    const { ttc } = invoiceTotals({ lines: inv.lines as InvoiceLine[], vatRate: Number(inv.vat_rate) })
    const left = round2(ttc - Number(paid))
    if (amount > left + 0.005) throw bad(`Le montant dépasse le reste dû (${eur2(left)}).`)
    const [row] = await tx`insert into payments (id, invoice_id, amount, date, method, reference, notes, created_by)
      values (${uid()}, ${inv.id as string}, ${amount}, ${b.date}, ${method.id}, ${String(b.reference ?? '').trim().slice(0, 120)}, ${String(b.notes ?? '').trim().slice(0, 1000)}, ${me.name}) returning *`
    const updated = await syncPaid(t, inv.id as string)
    if (inv.lead_id) await addInteraction(t, inv.lead_id as string, { type: 'Note', author: me.name, text: `Paiement de ${eur2(amount)} (${method.label.toLowerCase()}) sur la facture ${inv.number as string}` })
    return { payment: toPayment(row), invoice: toInvoice(updated) }
  })
})
