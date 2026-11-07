import { db } from '@/lib/server/db'
import { bad, body, requireSuper, requireUser, route } from '@/lib/server/http'
import { cleanLead, insertLead, loadAll, replaceKeywords, replacePacks } from '@/lib/server/repo'
import type { Prospect } from '@/lib/shared/types'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  await requireUser()
  return loadAll(await db())
})

/** Restauration d'une sauvegarde JSON (remplace prospects, packs, requêtes). */
export const PUT = route(async (req: Request) => {
  await requireSuper()
  const d = await body<{ prospects: unknown[]; packs: unknown[]; keywords?: unknown[] }>(req)
  if (!Array.isArray(d.prospects) || !Array.isArray(d.packs)) throw bad('Sauvegarde invalide.')
  const sql = await db()
  await sql.begin(async (tx) => {
    const t = tx as unknown as typeof sql
    await t`delete from leads`
    for (const p of d.prospects) { const c = cleanLead(p as Prospect & Record<string, unknown>); if (c) await insertLead(t, c) }
    await replacePacks(t, d.packs)
    if (Array.isArray(d.keywords)) await replaceKeywords(t, d.keywords)
  })
  return { ok: true }
})
