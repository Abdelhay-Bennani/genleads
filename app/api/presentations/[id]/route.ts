import { db, run } from '@/lib/server/db'
import { bad, body, requireModule, requireSuper, route } from '@/lib/server/http'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = route(async (req: Request, { params }: Ctx) => {
  await requireModule('maquettes', 'presentations')
  const { id } = await params
  const b = await body<{ revoked?: boolean }>(req)
  if (typeof b.revoked !== 'boolean') throw bad('Requête invalide.')
  const r = await run`update template_presentations set revoked = ${b.revoked}, revoked_at = ${b.revoked ? new Date() : null} where id = ${id} returning id`
  if (!r.length) throw bad('Présentation introuvable.', 404)
  return { ok: true }
})

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  await requireSuper()
  const { id } = await params
  await run`delete from template_presentations where id = ${id}`
  return { ok: true }
})
