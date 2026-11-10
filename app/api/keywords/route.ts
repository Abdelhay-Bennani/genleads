import { db } from '@/lib/server/db'
import { bad, body, requireModule, route } from '@/lib/server/http'
import { replaceKeywords } from '@/lib/server/repo'

export const PUT = route(async (req: Request) => {
  await requireModule('leads', 'prospects')
  const list = await body<unknown[]>(req)
  if (!Array.isArray(list)) throw bad('Liste de requêtes invalide.')
  const sql = await db()
  await sql.begin((tx) => replaceKeywords(tx as unknown as typeof sql, list))
  return { ok: true }
})
