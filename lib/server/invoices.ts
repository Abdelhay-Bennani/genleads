import 'server-only'
import type postgres from 'postgres'
import type { Invoice, InvoiceLine, Quote, QuoteClient } from '../shared/types'
import { eur2, invoiceTotals, periodLabel, quoteTotals, round2 } from '../shared/utils'
import { bad } from './http'
import { addInteraction, getSettings, toQuote, uid } from './repo'

type Sql = ReturnType<typeof postgres>

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const today = () => new Date().toISOString().slice(0, 10)
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
export const isDay = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
export const isPeriod = (v: unknown) => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)

interface NewInvoice {
  kind?: Invoice['kind']; type: Invoice['type']; quoteId?: string | null; leadId: string | null; creditedInvoiceId?: string | null; period?: string | null
  client: QuoteClient; lines: InvoiceLine[]; vatRate: number; dueDays: number; paymentTerms: string; notes: string; author: string; journal?: string
}

/** Attribue le numéro légal (continu, sans trou ni doublon) et enregistre la facture. À appeler dans une transaction. */
export async function issueInvoice(tx: Sql, o: NewInvoice) {
  const issue = today()
  const year = Number(issue.slice(0, 4))
  const kind = o.kind ?? 'facture'
  await tx`select pg_advisory_xact_lock(4245, ${year})`
  const [{ seq }] = await tx`select coalesce(max(seq), 0) + 1 as seq from invoices where year = ${year} and kind = ${kind}`
  const number = `${kind === 'avoir' ? 'AV' : 'FAC'}-${year}-${String(seq).padStart(3, '0')}`
  const [row] = await tx`insert into invoices (id, number, kind, type, year, seq, quote_id, lead_id, credited_invoice_id, period, client, lines, vat_rate, issue_date, due_date, payment_terms, notes, created_by)
    values (${uid()}, ${number}, ${kind}, ${o.type}, ${year}, ${seq}, ${o.quoteId ?? null}, ${o.leadId}, ${o.creditedInvoiceId ?? null}, ${o.period ?? null},
      ${tx.json(o.client as unknown as Parameters<typeof tx.json>[0])}, ${tx.json(o.lines as unknown as Parameters<typeof tx.json>[0])}, ${o.vatRate},
      ${issue}, ${addDays(issue, o.dueDays)}, ${o.paymentTerms}, ${o.notes}, ${o.author}) returning *`
  if (o.leadId) {
    const t = invoiceTotals({ lines: o.lines, vatRate: o.vatRate })
    await addInteraction(tx, o.leadId, { type: 'Note', author: o.author, text: o.journal ?? `${kind === 'avoir' ? 'Avoir' : 'Facture'} ${number} émis(e) : ${eur2(t.ttc)}${o.vatRate ? ' TTC' : ''}` })
  }
  return row
}

const quoteLines = (q: Quote): InvoiceLine[] => {
  const t = quoteTotals(q)
  const lines = q.lines.filter((l) => l.billing === 'oneshot').map((l) => ({ name: l.name, description: l.description, quantity: 1, unitPrice: l.price }))
  if (t.discountAmount > 0) lines.push({ name: `Remise ${q.discount} %`, description: '', quantity: 1, unitPrice: -t.discountAmount })
  return lines
}

export type QuoteMode = 'totale' | 'acompte' | 'solde' | 'mensualite'

/** Crée une facture à partir d'un devis accepté, sans pouvoir facturer plus que le devis. */
export async function invoiceFromQuote(tx: Sql, author: string, quoteId: string, mode: QuoteMode, opts: { percent?: number; period?: string }) {
  const [row] = await tx`select * from quotes where id = ${quoteId} for update`
  if (!row) throw bad('Devis introuvable.', 404)
  const q = toQuote(row)
  if (q.status !== 'accepte') throw bad('Seul un devis accepté peut être facturé.')
  const s = await getSettings(tx)
  const prior = await tx`select * from invoices where quote_id = ${quoteId} and kind = 'facture' and status <> 'annulee'`
  const oneShot = prior.filter((r) => r.type !== 'mensualite')
  const t = quoteTotals(q)
  const htOf = (r: Record<string, unknown>) => invoiceTotals({ lines: r.lines as InvoiceLine[], vatRate: 0 }).ht
  const billed = round2(oneShot.reduce((sum, r) => sum + htOf(r), 0))
  const closed = oneShot.some((r) => r.type === 'totale' || r.type === 'solde')

  let lines: InvoiceLine[]
  let period: string | null = null
  if (mode === 'mensualite') {
    if (!isPeriod(opts.period)) throw bad('Mois de facturation invalide.')
    period = opts.period!
    if (prior.some((r) => r.period === period)) throw bad(`Le mois de ${periodLabel(period)} est déjà facturé pour ce devis.`)
    const monthly = q.lines.filter((l) => l.billing === 'monthly')
    if (!monthly.length) throw bad('Ce devis ne comporte pas d’abonnement mensuel.')
    lines = monthly.map((l) => ({ name: `${l.name} — ${periodLabel(period!)}`, description: l.description, quantity: 1, unitPrice: l.price }))
  } else {
    if (t.oneShotHT <= 0) throw bad('Ce devis ne comporte que des abonnements : utilisez une mensualité.')
    if (closed) throw bad('Ce devis est déjà entièrement facturé.')
    if (mode === 'totale') {
      if (oneShot.length) throw bad('Un acompte existe déjà : émettez une facture de solde.')
      lines = quoteLines(q)
    } else if (mode === 'acompte') {
      const pct = Number(opts.percent)
      if (!(pct > 0 && pct <= 100)) throw bad('Pourcentage d’acompte invalide.')
      const amount = round2((t.oneShotHT * pct) / 100)
      if (billed + amount > t.oneShotHT + 0.005) throw bad(`Il ne reste que ${eur2(round2(t.oneShotHT - billed))} HT à facturer sur ce devis.`)
      lines = [{ name: `Acompte de ${pct} % sur le devis ${q.number}`, description: q.lines.filter((l) => l.billing === 'oneshot').map((l) => l.name).join(' + '), quantity: 1, unitPrice: amount }]
    } else if (mode === 'solde') {
      if (!oneShot.length) throw bad('Aucun acompte sur ce devis : émettez une facture totale.')
      if (t.oneShotHT - billed <= 0.005) throw bad('Rien à solder : les acomptes couvrent déjà le devis.')
      lines = [...quoteLines(q), ...oneShot.map((r) => ({ name: `Acompte ${r.number as string} déjà facturé`, description: '', quantity: 1, unitPrice: -htOf(r) }))]
    } else throw bad('Type de facture invalide.')
  }
  return issueInvoice(tx, {
    type: mode, quoteId: q.id, leadId: q.leadId, period, client: q.client, lines, vatRate: q.vatRate,
    dueDays: Number(s.invoiceDueDays) || 0, paymentTerms: q.paymentTerms || s.paymentTerms, notes: s.invoiceNotes, author,
  })
}

/** Facture saisie à la main (prestation hors devis). */
export async function manualInvoice(tx: Sql, author: string, b: Record<string, unknown>) {
  const s = await getSettings(tx)
  const c = (b.client ?? {}) as Partial<QuoteClient>
  const client: QuoteClient = {
    company: str(c.company, 160), contact: str(c.contact, 120), email: str(c.email, 160), phone: str(c.phone, 80),
    address: str(c.address, 200), postalCode: str(c.postalCode, 12), city: str(c.city, 120),
  }
  if (!client.company) throw bad('Indiquez le nom du client.')
  const lines = (Array.isArray(b.lines) ? b.lines : []).slice(0, 50).map((l: Record<string, unknown>) => ({
    name: str(l.name, 200), description: str(l.description, 500), quantity: Math.max(0, Number(l.quantity) || 0), unitPrice: round2(Number(l.unitPrice) || 0),
  })).filter((l) => l.name && l.quantity > 0)
  if (!lines.length) throw bad('Ajoutez au moins une ligne (désignation et quantité).')
  if (invoiceTotals({ lines, vatRate: 0 }).ht <= 0) throw bad('Le total de la facture doit être positif.')
  const [lead] = b.leadId ? await tx`select id from leads where id = ${String(b.leadId)}` : []
  const due = b.dueDays === '' || b.dueDays == null ? NaN : Number(b.dueDays)
  return issueInvoice(tx, {
    type: 'libre', leadId: (lead?.id as string) ?? null, client, lines, vatRate: Math.max(0, Math.min(100, Number(s.vatRate) || 0)),
    dueDays: Number.isFinite(due) ? Math.max(0, Math.min(60, due)) : Number(s.invoiceDueDays) || 0,
    paymentTerms: str(b.paymentTerms, 1000) || s.paymentTerms, notes: str(b.notes, 2000) || s.invoiceNotes, author,
  })
}

/** Annule une facture : une facture émise ne s'efface pas, un avoir la compense (numérotation propre). */
export async function cancelInvoice(tx: Sql, author: string, id: string) {
  const [inv] = await tx`select * from invoices where id = ${id} for update`
  if (!inv) throw bad('Facture introuvable.', 404)
  if (inv.kind !== 'facture') throw bad('Un avoir ne peut pas être annulé.')
  if (inv.status === 'annulee') throw bad('Cette facture est déjà annulée.')
  const [paid] = await tx`select 1 from payments where invoice_id = ${id} limit 1`
  if (paid) throw bad('Des paiements sont enregistrés : supprimez-les avant d’annuler la facture.')
  await tx`update invoices set status = 'annulee', updated_at = now() where id = ${id}`
  const avoir = await issueInvoice(tx, {
    kind: 'avoir', type: 'avoir', quoteId: (inv.quote_id as string) ?? null, leadId: (inv.lead_id as string) ?? null, creditedInvoiceId: id,
    client: inv.client as QuoteClient, lines: (inv.lines as InvoiceLine[]).map((l) => ({ ...l, unitPrice: -l.unitPrice })), vatRate: Number(inv.vat_rate), dueDays: 0,
    paymentTerms: '', notes: `Avoir annulant la facture ${inv.number as string}.`, author, journal: `Facture ${inv.number as string} annulée`,
  })
  return { invoice: (await tx`select * from invoices where id = ${id}`)[0], avoir }
}

/** Recalcule le statut d'après les paiements. */
export async function syncPaid(tx: Sql, id: string) {
  const [inv] = await tx`select * from invoices where id = ${id} for update`
  if (inv.status === 'annulee') return inv
  const [{ paid }] = await tx`select coalesce(sum(amount), 0) as paid from payments where invoice_id = ${id}`
  const { ttc } = invoiceTotals({ lines: inv.lines as InvoiceLine[], vatRate: Number(inv.vat_rate) })
  const status = Number(paid) >= ttc - 0.005 ? 'payee' : inv.status === 'payee' ? 'envoyee' : inv.status
  const [row] = await tx`update invoices set status = ${status as string}, updated_at = now() where id = ${id} returning *`
  return row
}
