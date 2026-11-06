import { db } from '@/lib/server/db'
import { bad, body, requireSuper, route } from '@/lib/server/http'
import { replacePacks } from '@/lib/server/repo'

export const PUT = route(async (req: Request) => {
  await requireSuper()
  const list = await body<unknown[]>(req)
  if (!Array.isArray(list)) throw bad('Liste de packs invalide.')
  const sql = await db()
  await sql.begin((tx) => replacePacks(tx as unknown as typeof sql, list))
  return { ok: true }
})
