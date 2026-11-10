import { db } from '@/lib/server/db'
import { bad, body, requireModule, route } from '@/lib/server/http'
import { uid } from '@/lib/server/repo'

export const POST = route(async (req: Request) => {
  await requireModule('maquettes')
  const name = String((await body<{ name: string }>(req)).name ?? '').trim().slice(0, 60)
  if (!name) throw bad('Nom de catégorie requis.')
  const sql = await db()
  const [dup] = await sql`select 1 from template_categories where lower(name) = lower(${name})`
  if (dup) throw bad('Cette catégorie existe déjà.')
  const [{ p }] = await sql`select coalesce(max(position), 0) + 1 as p from template_categories`
  const id = uid()
  await sql`insert into template_categories (id, name, builtin, position) values (${id}, ${name}, false, ${p})`
  return { id, name, builtin: false }
})
