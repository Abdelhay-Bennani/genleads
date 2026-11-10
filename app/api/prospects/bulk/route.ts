import { db } from '@/lib/server/db'
import { body, requireModule, route } from '@/lib/server/http'
import { cleanLead, insertLead } from '@/lib/server/repo'
import type { Prospect } from '@/lib/shared/types'

export const POST = route(async (req: Request) => {
  await requireModule('leads', 'prospects')
  const list = await body<unknown[]>(req)
  const sql = await db()
  let added = 0
  await sql.begin(async (tx) => {
    const t = tx as unknown as typeof sql
    for (const raw of Array.isArray(list) ? list.slice(0, 5000) : []) {
      const p = cleanLead(raw as Prospect & Record<string, unknown>)
      if (!p) continue
      const [exists] = await t`select 1 from leads where id = ${p.id}`
      if (exists) continue
      await insertLead(t, p); added++
    }
  })
  return { added }
})
