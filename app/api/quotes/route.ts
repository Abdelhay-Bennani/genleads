import { db } from '@/lib/server/db'
import { bad, body, requireUser, route } from '@/lib/server/http'
import { addInteraction, getSettings, toQuote, uid } from '@/lib/server/repo'
import type { QuoteClient, QuoteLine } from '@/lib/shared/types'
import { eur, quoteTotals } from '@/lib/shared/utils'

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

/**
 * Émission d'un devis numéroté. Les prix viennent du catalogue côté serveur (pas du navigateur)
 * et sont figés dans le devis : modifier un pack ensuite ne change pas les devis déjà émis.
 */
export const POST = route(async (req: Request) => {
  const me = await requireUser()
  const b = await body<{ leadId?: string | null; packIds?: string[]; discount?: number; client?: Partial<QuoteClient>; validityDays?: number; notes?: string; paymentTerms?: string }>(req)
  const packIds = Array.isArray(b.packIds) ? b.packIds.map(String).slice(0, 30) : []
  if (!packIds.length) throw bad('Choisissez au moins une prestation.')
  const sql = await db()
  const packs = await sql`select * from packs where id = any(${packIds})`
  const lines: QuoteLine[] = packIds.map((id) => packs.find((p) => p.id === id)).filter(Boolean)
    .map((p) => ({ name: p!.name as string, description: p!.description as string, price: Number(p!.price), billing: p!.billing === 'monthly' ? 'monthly' : 'oneshot' }))
  if (!lines.length) throw bad('Prestations introuvables dans le catalogue.')
  const [lead] = b.leadId ? await sql`select id from leads where id = ${String(b.leadId)}` : []
  const s = await getSettings(sql)
  const c = b.client ?? {}
  const client: QuoteClient = {
    company: str(c.company, 160), contact: str(c.contact, 120), email: str(c.email, 160), phone: str(c.phone, 80),
    address: str(c.address, 200), postalCode: str(c.postalCode, 12), city: str(c.city, 120),
  }
  if (!client.company) throw bad('Indiquez le nom du client.')
  const discount = Math.max(0, Math.min(100, Number(b.discount) || 0))
  const vatRate = Math.max(0, Math.min(100, Number(s.vatRate) || 0))
  const validity = Math.max(1, Math.min(365, Number(b.validityDays) || Number(s.quoteValidityDays) || 30))
  const year = new Date().getFullYear()
  const id = uid()

  const row = await sql.begin(async (tx) => {
    // Numérotation continue sans trou ni doublon, même si deux devis sont émis en même temps
    await tx`select pg_advisory_xact_lock(4244, ${year})`
    const [{ seq }] = await tx`select coalesce(max(seq), 0) + 1 as seq from quotes where year = ${year}`
    const number = `DEV-${year}-${String(seq).padStart(3, '0')}`
    const [r] = await tx`insert into quotes (id, number, year, seq, lead_id, client, lines, discount, vat_rate, valid_until, payment_terms, notes, created_by)
      values (${id}, ${number}, ${year}, ${seq}, ${lead?.id ?? null}, ${tx.json(client as unknown as Parameters<typeof tx.json>[0])}, ${tx.json(lines as unknown as Parameters<typeof tx.json>[0])}, ${discount}, ${vatRate}, ${addDays(validity)},
        ${str(b.paymentTerms, 1000) || s.paymentTerms}, ${str(b.notes, 2000)}, ${me.name}) returning *`
    if (lead) {
      const t = quoteTotals({ lines, discount, vatRate })
      await addInteraction(tx as unknown as typeof sql, lead.id as string, {
        type: 'Note', author: me.name,
        text: `Devis ${number} émis : ${lines.map((l) => l.name).join(' + ')} — ${eur(t.oneShotHT)} HT${t.monthlyHT ? ` + ${eur(t.monthlyHT)} HT/mois` : ''}`,
      })
    }
    return r
  })
  return toQuote(row)
})
