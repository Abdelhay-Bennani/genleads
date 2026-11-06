import { db } from '@/lib/server/db'
import { body, requireSuper, route } from '@/lib/server/http'
import { safeUrl } from '@/lib/server/repo'
import { FILE_ID } from '@/lib/server/templates'

export const PUT = route(async (req: Request) => {
  await requireSuper()
  const b = await body<Record<string, string>>(req)
  const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const value = {
    agencyName: s(b.agencyName, 80) || 'AgenceFlow',
    agencyTagline: s(b.agencyTagline, 160),
    logoFile: FILE_ID.test(String(b.logoFile ?? '')) ? b.logoFile : null,
    publicBaseUrl: safeUrl(b.publicBaseUrl).replace(/\/+$/, ''),
    contactEmail: s(b.contactEmail, 120),
    contactPhone: s(b.contactPhone, 40),
  }
  const sql = await db()
  await sql`insert into settings (key, value) values ('agency', ${sql.json(value)}) on conflict (key) do update set value = excluded.value`
  return value
})
