import { db, run } from '@/lib/server/db'
import { bad, body, requireSuper, requireUser, route } from '@/lib/server/http'
import { saveTemplate } from '@/lib/server/templates'

type Ctx = { params: Promise<{ id: string }> }

export const PUT = route(async (req: Request, { params }: Ctx) => {
  await requireUser()
  const { id } = await params
  if (!/^[\w-]{1,40}$/.test(id)) throw bad('Identifiant invalide.')
  const b = await body(req)
  if (!String(b.name ?? '').trim()) throw bad('Le nom de la maquette est obligatoire.')
  const sql = await db()
  await sql.begin((tx) => saveTemplate(tx as unknown as typeof sql, id, b))
  return { ok: true }
})

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  await requireSuper()
  const { id } = await params
  await run`delete from website_templates where id = ${id}`
  return { ok: true }
})
