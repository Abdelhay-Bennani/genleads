import { endSession, route } from '@/lib/server/http'

export const POST = route(async () => { await endSession(); return { ok: true } })
