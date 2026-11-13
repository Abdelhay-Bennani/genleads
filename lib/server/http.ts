import 'server-only'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { hasModule, type ModuleId } from '../shared/modules'
import type { PublicUser } from '../shared/types'
import { activityAfter, activityBefore, setActor, withLogContext } from './activity'
import { ConfigError, db, run } from './db'
import { toUser } from './repo'

export const COOKIE = 'af_session'
const SESSION_DAYS = 7

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export const bad = (msg: string, status = 400) => new HttpError(status, msg)

/** Enveloppe commune des routes API : erreurs → JSON en français, journal d'activité des modifications. */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response | unknown>) {
  return (...args: A): Promise<Response> => withLogContext(async () => {
    const req = args[0] instanceof Request ? args[0] : null
    const track = !!req && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
    try {
      const before = track ? await activityBefore(req!) : null
      const r = await fn(...args)
      if (track) await activityAfter(req!, before, r instanceof Response ? null : r, clientIp(req!))
      return r instanceof Response ? r : NextResponse.json(r ?? { ok: true })
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status })
      if (e instanceof ConfigError) return NextResponse.json({ error: e.message, config: true }, { status: 503 })
      console.error(e)
      const msg = (e as Error)?.message ?? ''
      if (/ECONNREFUSED|ENOTFOUND|getaddrinfo|password authentication|ETIMEDOUT/i.test(msg))
        return NextResponse.json({ error: 'Base de données injoignable : vérifiez DATABASE_URL et votre connexion Internet.' }, { status: 503 })
      return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 })
    }
  })
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  try { return (await req.json()) as T } catch { throw bad('Requête invalide.') }
}

const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex')

export async function startSession(userId: string) {
  const sql = await db()
  const [who] = await sql`select id, name, role from users where id = ${userId}`
  if (who) setActor(who as { id: string; name: string; role: string })
  const token = crypto.randomBytes(32).toString('hex')
  await sql`delete from sessions where expires_at < now()`
  await sql`insert into sessions (hash, user_id, expires_at) values (${hashToken(token)}, ${userId}, now() + ${SESSION_DAYS + ' days'}::interval)`
  await sql`update users set last_login_at = now(), last_seen_at = now() where id = ${userId}`
  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400,
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
  })
}

/** Hachage de la session courante (pour déconnecter uniquement les autres appareils). */
export async function currentSessionHash() {
  const token = (await cookies()).get(COOKIE)?.value
  return token ? hashToken(token) : ''
}

export async function endSession() {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (token) {
    const [u] = await run`select u.id, u.name, u.role from sessions s join users u on u.id = s.user_id where s.hash = ${hashToken(token)}`
    if (u) setActor(u as { id: string; name: string; role: string })
    await run`delete from sessions where hash = ${hashToken(token)}`
  }
  jar.delete(COOKIE)
}

export type SessionUser = PublicUser & { passwordHash: string }

export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return null
  const sql = await db()
  const [r] = await sql`select u.* from sessions s join users u on u.id = s.user_id
    where s.hash = ${hashToken(token)} and s.expires_at > now() and u.active`
  if (!r) return null
  // Présence : activité notée au plus une fois par minute (l'appli se synchronise toutes les 20 s)
  const seen = r.last_seen_at ? new Date(r.last_seen_at as string).getTime() : 0
  if (Date.now() - seen > 60e3) await sql`update users set last_seen_at = now() where id = ${r.id as string}`
  const user = toUser(r)
  setActor(user)
  return { ...user, passwordHash: r.password_hash as string }
}

export async function requireUser() {
  const u = await currentUser()
  if (!u) throw bad('Session expirée, reconnectez-vous.', 401)
  return u
}
export async function requireSuper() {
  const u = await requireUser()
  if (u.role !== 'super_admin') throw bad('Action réservée au Super Admin.', 403)
  return u
}

/** Autorise l'action si l'un des modules cités est actif pour l'utilisateur (toujours vrai pour un Super Admin). */
export async function requireModule(...modules: ModuleId[]) {
  const u = await requireUser()
  if (!hasModule(u, ...modules)) throw bad('Ce module est désactivé pour votre compte.', 403)
  return u
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10)
export const checkPasswordHash = (pw: string, hash: string) => bcrypt.compare(pw, hash)

export function checkPassword(pw: unknown) {
  if (typeof pw !== 'string' || pw.length < 8) throw bad('Le mot de passe doit contenir au moins 8 caractères.')
}
export async function checkUsername(username: unknown, exceptId?: string) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9._-]{3,30}$/.test(username)) throw bad('Identifiant : 3 à 30 caractères (lettres, chiffres, . _ -).')
  const [o] = await run`select id from users where lower(username) = lower(${username})`
  if (o && o.id !== exceptId) throw bad('Cet identifiant est déjà utilisé.')
}

/* Limitation simple des tentatives (mémoire du processus). */
declare global {
  // eslint-disable-next-line no-var
  var __afHits: Map<string, { n: number; until: number }> | undefined
}
const hits = () => (globalThis.__afHits ??= new Map())
export function rateLimit(key: string, max: number, windowMs: number) {
  const m = hits()
  const h = m.get(key)
  if (!h || h.until < Date.now()) { m.set(key, { n: 1, until: Date.now() + windowMs }); return false }
  h.n += 1
  return h.n > max
}
export const clientIp = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'local'
