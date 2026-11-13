import { after } from 'next/server'
import { maybeAutoBackup } from '@/lib/server/backup'
import { db } from '@/lib/server/db'
import { bad, body, requireSuper, requireUser, route } from '@/lib/server/http'
import { cleanLead, insertLead, loadAll, replaceKeywords, replacePacks, scopeData } from '@/lib/server/repo'
import type { Prospect } from '@/lib/shared/types'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  const me = await requireUser()
  after(() => maybeAutoBackup().catch((e) => console.error('sauvegarde auto :', e)))
  return scopeData(await loadAll(await db()), me)
})

/** Restauration d'une sauvegarde JSON (remplace prospects, packs, requêtes). */
export const PUT = route(async (req: Request) => {
  await requireSuper()
  const d = await body<{ prospects: unknown[]; packs: unknown[]; keywords?: unknown[] }>(req)
  if (!Array.isArray(d.prospects) || !Array.isArray(d.packs)) throw bad('Sauvegarde invalide.')
  const sql = await db()
  await sql.begin(async (tx) => {
    const t = tx as unknown as typeof sql
    // Mise à jour plutôt qu'effacement : les devis, factures et présentations restent rattachés aux leads restaurés
    const leads = d.prospects.map((p) => cleanLead(p as Prospect & Record<string, unknown>)).filter((p): p is Prospect => !!p)
    const ids = leads.map((p) => p.id)
    await t`delete from leads where not (id = any(${ids}))`
    await t`delete from lead_interactions where lead_id = any(${ids})`
    for (const c of leads) await insertLead(t, c)
    await replacePacks(t, d.packs)
    if (Array.isArray(d.keywords)) await replaceKeywords(t, d.keywords)
  })
  return { ok: true }
})
