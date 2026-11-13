import { db } from '@/lib/server/db'
import { requireSuper, route } from '@/lib/server/http'

export const dynamic = 'force-dynamic'

/** Journal d'activité (Super Admin) : filtres utilisateur, rôle, texte ; pagination par curseur. */
export const GET = route(async (req: Request) => {
  await requireSuper()
  const q = new URL(req.url).searchParams
  const user = q.get('user') || null
  const role = q.get('role') || null
  const text = (q.get('q') || '').trim()
  const before = Number(q.get('before')) || null
  const limit = Math.min(Number(q.get('limit')) || 100, 500)
  const sql = await db()
  const like = `%${text.replace(/[%_\\]/g, (c) => '\\' + c)}%`
  const rows = await sql`select * from activity_log where true
    ${user ? sql`and user_id = ${user}` : sql``}
    ${role ? sql`and role = ${role}` : sql``}
    ${text ? sql`and (action ilike ${like} or target ilike ${like} or details ilike ${like} or user_name ilike ${like})` : sql``}
    ${before ? sql`and id < ${before}` : sql``}
    order by id desc limit ${limit + 1}`
  return {
    items: rows.slice(0, limit).map((r) => ({
      id: Number(r.id), at: new Date(r.at as string).toISOString(), userId: r.user_id, userName: r.user_name, role: r.role,
      action: r.action, target: r.target, details: r.details, ip: r.ip, count: r.count,
    })),
    more: rows.length > limit,
  }
})
