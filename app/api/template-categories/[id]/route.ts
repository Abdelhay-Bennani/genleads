import { db, run } from '@/lib/server/db'
import { bad, body, requireModule, requireSuper, route } from '@/lib/server/http'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = route(async (req: Request, { params }: Ctx) => {
  await requireModule('maquettes')
  const { id } = await params
  const name = String((await body<{ name: string }>(req)).name ?? '').trim().slice(0, 60)
  if (!name) throw bad('Nom de catégorie requis.')
  const r = await run`update template_categories set name = ${name} where id = ${id} returning id`
  if (!r.length) throw bad('Catégorie introuvable.', 404)
  return { ok: true }
})

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  await requireSuper()
  const { id } = await params
  const sql = await db()
  const [{ n }] = await sql`select count(*)::int as n from website_templates where category_id = ${id}`
  if (n) throw bad(`Catégorie utilisée par ${n} maquette(s) : changez-les de catégorie d'abord.`)
  await sql`delete from template_categories where id = ${id}`
  return { ok: true }
})
