import { run } from '@/lib/server/db'
import { bad, body, checkPassword, checkPasswordHash, currentSessionHash, hashPassword, requireUser, route } from '@/lib/server/http'

export const POST = route(async (req: Request) => {
  const me = await requireUser()
  const { current, next } = await body<{ current: string; next: string }>(req)
  if (!(await checkPasswordHash(String(current ?? ''), me.passwordHash))) throw bad('Mot de passe actuel incorrect.')
  checkPassword(next)
  await run`update users set password_hash = ${await hashPassword(next)} where id = ${me.id}`
  await run`delete from sessions where user_id = ${me.id} and hash <> ${await currentSessionHash()}` // déconnecte les autres appareils
  return { ok: true }
})
