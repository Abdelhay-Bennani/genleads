import { db } from '@/lib/server/db'
import { body, requireSuper, route } from '@/lib/server/http'
import { safeUrl } from '@/lib/server/repo'
import { FILE_ID } from '@/lib/server/templates'

export const PUT = route(async (req: Request) => {
  await requireSuper()
  const b = await body<Record<string, string>>(req)
  const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const n = (v: unknown, min: number, max: number, def: number) => { const x = Number(v); return Number.isFinite(x) ? Math.max(min, Math.min(max, x)) : def }
  const value = {
    agencyName: s(b.agencyName, 80) || 'AgenceFlow',
    agencyTagline: s(b.agencyTagline, 160),
    logoFile: FILE_ID.test(String(b.logoFile ?? '')) ? b.logoFile : null,
    publicBaseUrl: safeUrl(b.publicBaseUrl).replace(/\/+$/, ''),
    contactEmail: s(b.contactEmail, 120),
    contactPhone: s(b.contactPhone, 40),
    legalName: s(b.legalName, 160),
    address: s(b.address, 200),
    postalCode: s(b.postalCode, 12),
    city: s(b.city, 120),
    siret: s(b.siret, 20),
    vatNumber: s(b.vatNumber, 20),
    vatRate: n(b.vatRate, 0, 100, 20),
    iban: s(b.iban, 40),
    bic: s(b.bic, 15),
    quoteValidityDays: Math.round(n(b.quoteValidityDays, 1, 365, 30)),
    paymentTerms: s(b.paymentTerms, 1000),
    quoteNotes: s(b.quoteNotes, 2000),
  }
  const sql = await db()
  await sql`insert into settings (key, value) values ('agency', ${sql.json(value)}) on conflict (key) do update set value = excluded.value`
  return value
})
