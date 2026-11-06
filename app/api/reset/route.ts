import { db, seedCore } from '@/lib/server/db'
import { requireSuper, route } from '@/lib/server/http'
import { insertLead } from '@/lib/server/repo'
import { seedProspects } from '@/lib/server/seed'

export const POST = route(async () => {
  await requireSuper()
  const sql = await db()
  await sql.begin(async (tx) => {
    const t = tx as unknown as typeof sql
    await t`delete from leads`
    await seedCore(t)
    for (const p of seedProspects()) await insertLead(t, p)
  })
  return { ok: true }
})
