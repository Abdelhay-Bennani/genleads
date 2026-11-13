import 'server-only'
import { AsyncLocalStorage } from 'node:async_hooks'
import { STATUSES } from '../shared/data'
import { db } from './db'

/* ------------------------------------------------------------------
   Journal d'activité : chaque requête qui modifie des données (POST, PUT,
   PATCH, DELETE) réussie et faite par un utilisateur connecté est notée.
   Le contexte de la requête est porté par AsyncLocalStorage : currentUser()
   y dépose l'auteur, route() écrit la ligne une fois l'action réussie.
------------------------------------------------------------------ */

export type Actor = { id: string; name: string; role: string }
type LogCtx = { actor?: Actor; skip?: boolean }
type Row = Record<string, unknown>

const als = new AsyncLocalStorage<LogCtx>()
export const withLogContext = <T>(fn: () => Promise<T>) => als.run({}, fn)
export function setActor(u: Actor) { const c = als.getStore(); if (c) c.actor = { id: u.id, name: u.name, role: u.role } }
/** Ne pas journaliser la requête en cours. */
export function skipLog() { const c = als.getStore(); if (c) c.skip = true }

/** Ressources adressées par /api/<ressource>/<id> : table, colonne servant de libellé, nom affiché. */
const RES: Record<string, { table: string; col: string; noun: string; fem?: boolean }> = {
  prospects: { table: 'leads', col: 'company', noun: 'Lead' },
  quotes: { table: 'quotes', col: 'number', noun: 'Devis' },
  invoices: { table: 'invoices', col: 'number', noun: 'Facture', fem: true },
  payments: { table: 'payments', col: 'id', noun: 'Paiement' },
  presentations: { table: 'template_presentations', col: 'title', noun: 'Présentation', fem: true },
  templates: { table: 'website_templates', col: 'name', noun: 'Maquette', fem: true },
  'template-categories': { table: 'template_categories', col: 'name', noun: 'Catégorie', fem: true },
  users: { table: 'users', col: 'name', noun: 'Utilisateur' },
  backups: { table: 'backups', col: 'label', noun: 'Sauvegarde', fem: true },
}

const FIXED: Record<string, string> = {
  'POST /api/login': 'Connexion',
  'POST /api/logout': 'Déconnexion',
  'POST /api/setup': 'Création du compte Super Admin',
  'POST /api/me/password': 'Mot de passe personnel changé',
  'PUT /api/data': 'Import d’un fichier de sauvegarde (leads, packs)',
  'POST /api/reset': 'Réinitialisation des données',
  'POST /api/prospects/bulk': 'Import de leads',
  'POST /api/invoices/recurring': 'Génération des factures récurrentes',
  'POST /api/presentations/select-internal': 'Maquette choisie pour un lead',
  'PUT /api/packs': 'Catalogue des packs modifié',
  'PUT /api/keywords': 'Requêtes de prospection modifiées',
  'PUT /api/settings': 'Paramètres de l’agence modifiés',
  'POST /api/backups': 'Sauvegarde manuelle créée',
  'POST /api/backups/import': 'Fichier de sauvegarde importé',
}
/** Requêtes trop techniques ou trop fréquentes pour le journal. */
const IGNORED = [/^POST \/api\/uploads$/, /^PUT \/api\/templates\/[^/]+\/site$/, /^POST \/api\/templates\/[^/]+\/site$/, /^\w+ \/api\/public\//, /^\w+ \/api\/backups\/cron$/]

const SUB: Record<string, Record<string, string>> = {
  site: { PATCH: 'Site de la maquette importé', DELETE: 'Site de la maquette supprimé' },
  restore: { POST: 'Sauvegarde restaurée' },
}

const FIELD: Record<string, string> = {
  company: 'société', contact: 'contact', phone: 'téléphone', email: 'email', city: 'ville', postal_code: 'code postal', sectors: 'secteurs',
  activity: 'activité', has_website: 'site web', url: 'URL', need: 'besoin', budget: 'budget', assignee: 'assigné à', status: 'statut',
  next_follow_up: 'relance', pack_ids: 'packs', discount: 'remise', source: 'source', template_id: 'maquette', address: 'adresse',
  department: 'département', trade: 'métier', call_session: 'session d’appel', socials: 'réseaux sociaux', name: 'nom', username: 'identifiant',
  role: 'rôle', active: 'compte actif', disabled_modules: 'modules', revoked: 'lien révoqué', title: 'titre', category_id: 'catégorie',
  password_hash: 'mot de passe', notes: 'notes', due_date: 'échéance', paid_at: 'payée le', amount: 'montant',
}
const HIDDEN = new Set(['updated_at', 'created_at', 'password_enc', 'last_login_at', 'last_seen_at', 'template_id_updated_at', 'data', 'position'])

function parse(method: string, path: string) {
  const key = `${method} ${path}`
  if (IGNORED.some((r) => r.test(key))) return null
  if (FIXED[key]) return { label: FIXED[key] }
  const [, api, res, id, sub] = path.split('/')
  const r = RES[res]
  if (api !== 'api' || !r) return null
  const e = r.fem ? 'e' : ''
  if (!id) return method === 'POST' ? { label: res === 'payments' ? 'Paiement enregistré' : `${r.noun} créé${e}`, res: r } : null
  if (sub) { const l = SUB[sub]?.[method]; return l ? { label: l, res: r, id } : null }
  if (method === 'DELETE') return { label: `${r.noun} supprimé${e}`, res: r, id }
  if (method === 'PUT' || method === 'PATCH') return { label: `${r.noun} modifié${e}`, created: `${r.noun} créé${e}`, res: r, id }
  return null
}

async function rowOf(table: string, id: string) {
  const sql = await db()
  const [row] = await sql.unsafe(`select ${table === 'backups' ? 'id, label' : '*'} from ${table} where id = $1`, [id])
  if (row && table === 'leads') {
    const [{ n }] = await sql`select count(*)::int as n from lead_interactions where lead_id = ${id}`
    row.__interactions = n
  }
  return (row as Row | undefined) ?? null
}

export type Before = { row: Row | null } | null

/** Avant l'action : état de l'élément visé (pour le libellé d'une suppression et le détail des modifications). */
export async function activityBefore(req: Request): Promise<Before> {
  try {
    const p = parse(req.method, new URL(req.url).pathname)
    if (!p?.res || !p.id) return null
    return { row: await rowOf(p.res.table, p.id) }
  } catch { return null }
}

const show = (col: string, v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—'
  if (col === 'status') return STATUSES.find((s) => s.id === v)?.label ?? String(v)
  if (col === 'role') return v === 'super_admin' ? 'Super Admin' : 'Admin'
  if (typeof v === 'boolean') return v ? 'oui' : 'non'
  if (v instanceof Date) return v.toLocaleDateString('fr-FR')
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—'
  return String(v)
}
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

function diff(before: Row, after: Row) {
  const out: string[] = []
  for (const col of Object.keys(after)) {
    if (HIDDEN.has(col) || col.startsWith('__') || same(before[col], after[col])) continue
    const f = FIELD[col] ?? col.replace(/_/g, ' ')
    if (col === 'password_hash') { out.push('mot de passe réinitialisé'); continue }
    const a = show(col, before[col]), b = show(col, after[col])
    out.push(a.length + b.length <= 70 ? `${f} : ${a} → ${b}` : f)
  }
  const n = Number(after.__interactions ?? 0) - Number(before.__interactions ?? 0)
  if (n > 0) out.push(`${n} note${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''} au journal`)
  return out
}

const labelOf = (r: unknown) => {
  if (!r || typeof r !== 'object') return ''
  const o = r as Row
  return String(o.number ?? o.company ?? o.name ?? o.title ?? o.label ?? '')
}

/** Après l'action réussie : écrit (ou regroupe) la ligne du journal. Ne lève jamais d'erreur. */
export async function activityAfter(req: Request, before: Before, result: unknown, ip: string) {
  const ctx = als.getStore()
  if (!ctx?.actor || ctx.skip) return
  try {
    const path = new URL(req.url).pathname
    const p = parse(req.method, path)
    if (!p) return
    let label = p.label
    let target = ''
    const details: string[] = []
    if (p.res && p.id) {
      const after = req.method === 'DELETE' ? null : await rowOf(p.res.table, p.id).catch(() => null)
      const prev = before?.row ?? null
      target = String((after ?? prev)?.[p.res.col] ?? '')
      if (!prev && after && 'created' in p && p.created) label = p.created
      else if (prev && after && !SUB[path.split('/')[4] ?? '']) details.push(...diff(prev, after))
      if (req.method === 'PATCH' || req.method === 'PUT') { if (prev && after && !details.length && p.res.table !== 'website_templates') return } // rien de changé
    } else {
      target = labelOf(result)
      const r = (result ?? {}) as Row
      if (typeof r.added === 'number') details.push(`${r.added} lead(s) ajouté(s)`)
      if (typeof r.amount === 'number') details.push(`${r.amount.toLocaleString('fr-FR')} €`)
    }
    if (p.res?.table === 'payments') target = ''
    await write(ctx.actor, label, target.slice(0, 200), details.join(' · ').slice(0, 1000), ip)
  } catch (e) { console.error('journal :', e) }
}

async function write(a: Actor, action: string, target: string, details: string, ip: string) {
  const sql = await db()
  // Regroupe les enregistrements automatiques successifs sur le même élément (sauvegarde auto des fiches)
  const [last] = await sql`select id, details from activity_log where user_id = ${a.id} and action = ${action} and target = ${target}
    and at > now() - interval '3 minutes' order by at desc limit 1`
  if (last) {
    const parts = new Set([...String(last.details || '').split(' · '), ...details.split(' · ')].filter(Boolean))
    await sql`update activity_log set at = now(), count = count + 1, details = ${[...parts].join(' · ').slice(0, 1000)} where id = ${last.id as string}`
  } else {
    await sql`insert into activity_log (user_id, user_name, role, action, target, details, ip) values (${a.id}, ${a.name}, ${a.role}, ${action}, ${target}, ${details}, ${ip})`
  }
}
