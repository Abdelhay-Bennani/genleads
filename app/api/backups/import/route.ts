import { readBackupFile, saveBackup } from '@/lib/server/backup'
import { db } from '@/lib/server/db'
import { bad, body, requireSuper, route } from '@/lib/server/http'

export const maxDuration = 60

/** Ajoute un fichier de sauvegarde téléchargé à la liste (il pourra ensuite être restauré). */
export const POST = route(async (req: Request) => {
  const me = await requireSuper()
  const raw = await body<{ label?: string; createdAt?: string }>(req)
  let data
  try { data = readBackupFile(raw) } catch (e) { throw bad((e as Error).message) }
  const when = raw.createdAt ? new Date(raw.createdAt) : null
  const label = `Fichier importé${when && !isNaN(+when) ? ` (sauvegarde du ${when.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' })})` : ''}`
  const id = await saveBackup(await db(), 'import', me.name, data, label)
  return { id, label }
})
