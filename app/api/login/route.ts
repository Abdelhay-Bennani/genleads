import { openPassword, sealPassword } from '@/lib/server/secret'
import { db } from '@/lib/server/db'
import { bad, body, checkPasswordHash, clientIp, rateLimit, route, startSession } from '@/lib/server/http'
import { toUser } from '@/lib/server/repo'

declare global {
  // eslint-disable-next-line no-var
  var __afFails: Map<string, { n: number; until: number }> | undefined
}

export const POST = route(async (req: Request) => {
  const { username, password } = await body<{ username: string; password: string }>(req)
  const key = `${String(username ?? '').toLowerCase()}|${clientIp(req)}`
  const fails = (globalThis.__afFails ??= new Map())
  const f = fails.get(key)
  if (f && f.n >= 5 && f.until > Date.now()) throw bad('Trop de tentatives. Réessayez dans 5 minutes.', 429)
  if (rateLimit('login-ip:' + clientIp(req), 60, 60e3)) throw bad('Trop de tentatives.', 429)
  const sql = await db()
  const [u] = await sql`select * from users where lower(username) = lower(${String(username ?? '')})`
  const ok = u && u.active && (await checkPasswordHash(String(password ?? ''), u.password_hash as string))
  if (!ok) {
    const cur = f && f.until > Date.now() ? f : { n: 0, until: Date.now() + 5 * 60e3 }
    cur.n += 1
    fails.set(key, cur)
    throw bad('Identifiant ou mot de passe incorrect, ou compte désactivé.', 401)
  }
  fails.delete(key)
  // Comptes antérieurs : la copie chiffrée est créée à la prochaine connexion
  if (openPassword(u.password_enc) !== String(password)) await sql`update users set password_enc = ${sealPassword(String(password))} where id = ${u.id as string}`
  await startSession(u.id as string)
  return { user: toUser(u) }
})
