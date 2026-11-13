import { maybeAutoBackup } from '@/lib/server/backup'
import { route } from '@/lib/server/http'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Appelé chaque nuit par le cron Vercel (vercel.json). Sans risque s'il est appelé par un tiers :
 * aucune sauvegarde n'est faite si la dernière date de moins de 20 h.
 */
export const GET = route(async () => ({ created: await maybeAutoBackup() }))
