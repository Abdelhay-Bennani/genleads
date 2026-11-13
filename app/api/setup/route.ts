import { sealPassword } from '@/lib/server/secret'
import { db } from '@/lib/server/db'
import { bad, body, checkPassword, checkUsername, hashPassword, route, startSession } from '@/lib/server/http'
import { toUser, uid } from '@/lib/server/repo'

export const POST = route(async (req: Request) => {
  const sql = await db()
  const { name, username, password } = await body<{ name: string; username: string; password: string }>(req)
  if (!String(name ?? '').trim()) throw bad('Indiquez votre nom.')
  await checkUsername(username)
  checkPassword(password)
  const hash = await hashPassword(password)
  const user = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(4243)`
    const [{ n }] = await tx`select count(*)::int as n from users`
    if (n > 0) throw bad('Le compte Super Admin existe déjà.', 409)
    const [r] = await tx`insert into users (id, name, username, role, password_hash, password_enc) values (${uid()}, ${String(name).trim().slice(0, 80)}, ${username.trim()}, 'super_admin', ${hash}, ${sealPassword(password)}) returning *`
    return r
  })
  await startSession(user.id as string)
  return { user: toUser(user) }
})
