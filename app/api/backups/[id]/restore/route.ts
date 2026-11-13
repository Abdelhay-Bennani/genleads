import { createBackup, frDate, restoreTables, type BackupTables } from '@/lib/server/backup'
import { db } from '@/lib/server/db'
import { bad, requireSuper, route } from '@/lib/server/http'

type Ctx = { params: Promise<{ id: string }> }
export const maxDuration = 60

/** Restaure la base dans l'état de la sauvegarde, après avoir sauvegardé l'état actuel. */
export const POST = route(async (_req: Request, { params }: Ctx) => {
  const me = await requireSuper()
  const { id } = await params
  const sql = await db()
  const [b] = await sql`select label, data from backups where id = ${id}`
  if (!b) throw bad('Sauvegarde introuvable.', 404)
  const safety = await createBackup(sql, 'securite', me.name, `Avant restauration du ${frDate()}`)
  try {
    await restoreTables(sql, b.data as BackupTables, me.id)
  } catch (e) {
    console.error(e)
    throw bad(`Restauration impossible, aucune donnée n’a été modifiée : ${(e as Error).message}`)
  }
  return { ok: true, safety }
})
