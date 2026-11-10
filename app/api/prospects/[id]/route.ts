import { db, run } from '@/lib/server/db'
import { bad, body, requireModule, requireSuper, route } from '@/lib/server/http'
import { cleanLead, insertLead, loadLeads } from '@/lib/server/repo'
import type { Prospect } from '@/lib/shared/types'

type Ctx = { params: Promise<{ id: string }> }

export const PUT = route(async (req: Request, { params }: Ctx) => {
  await requireModule('leads', 'prospects', 'clients')
  const { id } = await params
  const p = cleanLead(await body<Prospect>(req) as Prospect & Record<string, unknown>)
  if (!p || p.id !== id) throw bad('Prospect invalide.')
  const sql = await db()
  await sql.begin((tx) => insertLead(tx as unknown as typeof sql, p))
  const [saved] = await loadLeads(sql, [id])
  return saved
})

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  await requireSuper()
  const { id } = await params
  await run`delete from leads where id = ${id}`
  return { ok: true }
})
