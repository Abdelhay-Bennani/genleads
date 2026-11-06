import { db, run } from '@/lib/server/db'
import { bad, body, checkPassword, checkPasswordHash, hashPassword, requireUser, route } from '@/lib/server/http'

export const POST = route(async (req: Request) => {
  const me = await requireUser()
  const { current, next } = await body<{ current: string; next: string }>(req)
  if (!(await checkPasswordHash(String(current ?? ''), me.passwordHash))) throw bad('Mot de passe actuel incorrect.')
  checkPassword(next)
  await run`update users set password_hash = ${await hashPassword(next)} where id = ${me.id}`
  return { ok: true }
})
