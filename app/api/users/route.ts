import { db } from '@/lib/server/db'
import { bad, body, checkPassword, checkUsername, hashPassword, requireSuper, route } from '@/lib/server/http'
import { toUser, uid } from '@/lib/server/repo'

export const POST = route(async (req: Request) => {
  await requireSuper()
  const { name, username, password, role } = await body<{ name: string; username: string; password: string; role: string }>(req)
  const n = String(name ?? '').trim().slice(0, 80)
  if (!n) throw bad('Indiquez un nom.')
  if (!['admin', 'super_admin'].includes(role)) throw bad('Rôle invalide.')
  const sql = await db()
  const [dup] = await sql`select 1 from users where lower(name) = lower(${n})`
  if (dup) throw bad('Un utilisateur porte déjà ce nom.')
  await checkUsername(username)
  checkPassword(password)
  const [u] = await sql`insert into users (id, name, username, role, password_hash) values (${uid()}, ${n}, ${username.trim()}, ${role}, ${await hashPassword(password)}) returning *`
  return toUser(u)
})
