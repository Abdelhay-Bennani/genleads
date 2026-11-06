import { db } from '@/lib/server/db'
import { bad, body, requireUser, route } from '@/lib/server/http'
import { replaceKeywords } from '@/lib/server/repo'

export const PUT = route(async (req: Request) => {
  await requireUser()
  const list = await body<unknown[]>(req)
  if (!Array.isArray(list)) throw bad('Liste de requêtes invalide.')
  const sql = await db()
  await sql.begin((tx) => replaceKeywords(tx as unknown as typeof sql, list))
  return { ok: true }
})
