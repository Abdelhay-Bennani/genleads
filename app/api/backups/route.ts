import { createBackup } from '@/lib/server/backup'
import { db } from '@/lib/server/db'
import { requireSuper, route } from '@/lib/server/http'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Liste des sauvegardes (sans leur contenu). */
export const GET = route(async () => {
  await requireSuper()
  const sql = await db()
  const rows = await sql`select id, created_at, kind, label, created_by, size, counts from backups order by created_at desc limit 200`
  return rows.map((r) => ({
    id: r.id, createdAt: new Date(r.created_at as string).toISOString(), kind: r.kind, label: r.label,
    createdBy: r.created_by, size: r.size, counts: r.counts,
  }))
})

/** Sauvegarde manuelle immédiate. */
export const POST = route(async () => {
  const me = await requireSuper()
  const id = await createBackup(await db(), 'manuel', me.name)
  return { id }
})
