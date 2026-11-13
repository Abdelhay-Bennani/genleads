import 'server-only'
import crypto from 'node:crypto'
import type postgres from 'postgres'
import { db } from './db'

type Sql = ReturnType<typeof postgres>
type Rows = Record<string, unknown>[]
export type BackupTables = Partial<Record<Table, Rows>>

/* ------------------------------------------------------------------
   Sauvegardes de la base : instantané JSON des tables métier, stocké
   dans la table « backups ». Les fichiers binaires (images, sites
   importés) et les sessions ne sont pas inclus.
   Ordre : parents avant enfants (clés étrangères).
------------------------------------------------------------------ */
export const TABLES = [
  'users', 'template_categories', 'website_templates', 'leads', 'lead_interactions', 'packs', 'prospecting_queries',
  'template_presentations', 'template_presentation_items', 'template_client_selections', 'settings', 'quotes', 'invoices', 'payments',
] as const
type Table = (typeof TABLES)[number]
const pkOf = (t: Table) => (t === 'settings' ? 'key' : 'id')

const AUTO_KEEP = 14 // sauvegardes automatiques conservées (deux semaines)
const AUTO_EVERY_H = 20 // marge sous 24 h pour que le cron quotidien passe toujours

export const KIND_LABEL = { auto: 'Automatique', manuel: 'Manuelle', import: 'Importée', securite: 'Avant restauration' } as const
export type BackupKind = keyof typeof KIND_LABEL

export const frDate = (d = new Date()) => d.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' })

export async function dumpTables(sql: Sql): Promise<BackupTables> {
  const out: BackupTables = {}
  for (const t of TABLES) {
    const [{ rows }] = await sql.unsafe(`select coalesce(json_agg(x), '[]'::json) as rows from ${t} x`)
    out[t] = rows as Rows
  }
  return out
}

export const countsOf = (d: BackupTables) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]))

export async function saveBackup(sql: Sql, kind: BackupKind, by: string | null, data: BackupTables, label?: string) {
  const id = crypto.randomUUID()
  const size = Buffer.byteLength(JSON.stringify(data))
  await sql`insert into backups (id, kind, label, created_by, size, counts, data)
    values (${id}, ${kind}, ${label ?? `${KIND_LABEL[kind]} du ${frDate()}`}, ${by}, ${size}, ${sql.json(countsOf(data))}, ${sql.json(data as never)})`
  return id
}

export const createBackup = async (sql: Sql, kind: BackupKind, by: string | null, label?: string) => saveBackup(sql, kind, by, await dumpTables(sql), label)

/** Vérifie et normalise un fichier de sauvegarde téléchargé. */
export function readBackupFile(raw: unknown): BackupTables {
  const o = (raw ?? {}) as Record<string, unknown>
  const tables = (o.tables ?? o) as Record<string, unknown>
  const out: BackupTables = {}
  for (const t of TABLES) if (Array.isArray(tables[t])) out[t] = tables[t] as Rows
  if (!out.leads && !out.quotes && !out.invoices) throw new Error('Ce fichier n’est pas une sauvegarde AgenceFlow.')
  return out
}

/**
 * Remet la base dans l'état de la sauvegarde (tables présentes dans le fichier uniquement) :
 * supprime les lignes absentes puis insère / met à jour les autres. Le compte qui restaure est conservé tel quel.
 */
export async function restoreTables(sql: Sql, data: BackupTables, keepUserId: string) {
  await sql.begin(async (tx) => {
    const t_ = tx as unknown as Sql
    for (const t of [...TABLES].reverse()) {
      const rows = data[t]
      if (!rows) continue
      const pk = pkOf(t)
      const ids = rows.map((r) => String(r[pk]))
      if (t === 'users') await t_`delete from users where not (id = any(${ids})) and id <> ${keepUserId}`
      else await t_.unsafe(`delete from ${t} where ${pk} not in (select json_array_elements_text($1::text::json))`, [JSON.stringify(ids)])
    }
    for (const t of TABLES) {
      let rows = data[t]
      if (!rows?.length) continue
      if (t === 'users') rows = rows.filter((r) => r.id !== keepUserId)
      const pk = pkOf(t)
      const cols = (await t_`select column_name from information_schema.columns where table_schema = current_schema() and table_name = ${t}`)
        .map((c) => c.column_name as string)
      const list = cols.map((c) => `"${c}"`).join(', ')
      const set = cols.filter((c) => c !== pk).map((c) => `"${c}" = excluded."${c}"`).join(', ')
      // Avoirs : la facture d'origine peut apparaître plus loin dans la liste → lien rétabli après coup
      const input = t === 'invoices' ? rows.map((r) => ({ ...r, credited_invoice_id: null })) : rows
      await t_.unsafe(`insert into ${t} (${list}) select ${list} from json_populate_recordset(null::${t}, $1::text::json)
        on conflict (${pk}) do update set ${set}`, [JSON.stringify(input)])
      if (t === 'invoices') {
        const links = rows.filter((r) => r.credited_invoice_id).map((r) => ({ id: r.id, c: r.credited_invoice_id }))
        if (links.length) await t_.unsafe(`update invoices i set credited_invoice_id = j.c from json_to_recordset($1::text::json) as j(id text, c text) where i.id = j.id`, [JSON.stringify(links)])
      }
    }
  })
}

/** Sauvegarde automatique : au plus une toutes les 20 h, déclenchée par le cron quotidien ou par l'activité de l'appli. */
export async function maybeAutoBackup() {
  const sql = await db()
  const recent = async (s: Sql) => {
    const [r] = await s`select 1 from backups where kind = 'auto' and created_at > now() - ${AUTO_EVERY_H + ' hours'}::interval limit 1`
    return !!r
  }
  if (await recent(sql)) return false
  return sql.begin(async (tx) => {
    const t_ = tx as unknown as Sql
    const [{ ok }] = await t_`select pg_try_advisory_xact_lock(4244) as ok`
    if (!ok || (await recent(t_))) return false
    await createBackup(t_, 'auto', null)
    await t_`delete from backups where kind = 'auto' and id not in (select id from backups where kind = 'auto' order by created_at desc limit ${AUTO_KEEP})`
    await t_`delete from activity_log where at < now() - interval '365 days'`
    return true
  })
}
