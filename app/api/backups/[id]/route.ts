import { db } from '@/lib/server/db'
import { bad, requireSuper, route } from '@/lib/server/http'

type Ctx = { params: Promise<{ id: string }> }
export const dynamic = 'force-dynamic'

/** Téléchargement du fichier de sauvegarde (JSON). */
export const GET = route(async (_req: Request, { params }: Ctx) => {
  await requireSuper()
  const { id } = await params
  const sql = await db()
  const [b] = await sql`select created_at, kind, label, data from backups where id = ${id}`
  if (!b) throw bad('Sauvegarde introuvable.', 404)
  const created = new Date(b.created_at as string)
  const file = { app: 'agenceflow', format: 1, createdAt: created.toISOString(), kind: b.kind, label: b.label, tables: b.data }
  return new Response(JSON.stringify(file), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="agenceflow-base-${created.toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json"`,
      'Cache-Control': 'no-store',
    },
  })
})

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  await requireSuper()
  const { id } = await params
  await (await db())`delete from backups where id = ${id}`
  return { ok: true }
})
