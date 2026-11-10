import { db } from '@/lib/server/db'
import { bad, body, checkPassword, checkUsername, hashPassword, requireSuper, route } from '@/lib/server/http'
import { toUser } from '@/lib/server/repo'
import { cleanModules } from '@/lib/shared/modules'

type Ctx = { params: Promise<{ id: string }> }

async function activeSupers(sql: Awaited<ReturnType<typeof db>>) {
  const [{ n }] = await sql`select count(*)::int as n from users where role = 'super_admin' and active`
  return n as number
}

export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const me = await requireSuper()
  const { id } = await params
  const sql = await db()
  const [u] = await sql`select * from users where id = ${id}`
  if (!u) throw bad('Utilisateur introuvable.', 404)
  const b = await body<{ name?: string; username?: string; role?: string; active?: boolean; password?: string; disabledModules?: unknown }>(req)
  const losingSuper = (b.role !== undefined && b.role !== 'super_admin') || b.active === false
  if (u.role === 'super_admin' && u.active && losingSuper && (await activeSupers(sql)) <= 1) throw bad('Il doit rester au moins un Super Admin actif.')
  if (b.active === false && id === me.id) throw bad('Vous ne pouvez pas désactiver votre propre compte.')
  if (b.role !== undefined && !['admin', 'super_admin'].includes(b.role)) throw bad('Rôle invalide.')
  if (b.username !== undefined) await checkUsername(b.username, id)
  if (b.password) checkPassword(b.password)
  if (b.disabledModules !== undefined && (b.role ?? u.role) !== 'admin') throw bad('Les modules se règlent uniquement pour un compte Admin.')
  await sql.begin(async (tx) => {
    if (b.name !== undefined) {
      const n = String(b.name).trim().slice(0, 80)
      if (!n) throw bad('Le nom est obligatoire.')
      const [dup] = await tx`select 1 from users where lower(name) = lower(${n}) and id <> ${id}`
      if (dup) throw bad('Un utilisateur porte déjà ce nom.')
      if (n !== u.name) {
        // les prospects référencent le nom : on répercute le renommage
        await tx`update leads set assignee = ${n} where assignee = ${u.name as string}`
        await tx`update lead_interactions set author = ${n} where author = ${u.name as string}`
        await tx`update template_presentations set created_by = ${n} where created_by = ${u.name as string}`
        await tx`update users set name = ${n} where id = ${id}`
      }
    }
    if (b.disabledModules !== undefined) await tx`update users set disabled_modules = ${cleanModules(b.disabledModules)} where id = ${id}`
    if (b.username !== undefined) await tx`update users set username = ${b.username.trim()} where id = ${id}`
    if (b.role !== undefined && id !== me.id) await tx`update users set role = ${b.role} where id = ${id}`
    if (b.active !== undefined) {
      await tx`update users set active = ${!!b.active} where id = ${id}`
      if (!b.active) await tx`delete from sessions where user_id = ${id}`
    }
    if (b.password) {
      await tx`update users set password_hash = ${await hashPassword(b.password)} where id = ${id}`
      if (id !== me.id) await tx`delete from sessions where user_id = ${id}`
    }
  })
  const [r] = await sql`select * from users where id = ${id}`
  return toUser(r)
})

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  const me = await requireSuper()
  const { id } = await params
  const sql = await db()
  const [u] = await sql`select * from users where id = ${id}`
  if (!u) throw bad('Utilisateur introuvable.', 404)
  if (id === me.id) throw bad('Vous ne pouvez pas supprimer votre propre compte.')
  if (u.role === 'super_admin' && u.active && (await activeSupers(sql)) <= 1) throw bad('Il doit rester au moins un Super Admin actif.')
  await sql`delete from users where id = ${id}`
  return { ok: true }
})
