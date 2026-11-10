import 'server-only'
import postgres from 'postgres'
import { DEFAULT_CATEGORIES, DEFAULT_KEYWORDS, DEFAULT_PACKS, DEFAULT_SETTINGS, seedProspects } from './seed'

type Sql = ReturnType<typeof postgres>

declare global {
  // eslint-disable-next-line no-var
  var __afSql: Sql | undefined
  // eslint-disable-next-line no-var
  var __afReady: Promise<void> | undefined
}

export class ConfigError extends Error {}

export function getSql(): Sql {
  if (!globalThis.__afSql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new ConfigError('DATABASE_URL manquante : renseignez l’URL PostgreSQL (Neon / Supabase) dans le fichier .env.local')
    globalThis.__afSql = postgres(url, {
      max: process.env.VERCEL ? 1 : 5, // fonctions serverless : une connexion par instance (via le pooler)
      prepare: false, // compatible avec les poolers (Supabase / Neon en mode « pooled »)
      idle_timeout: 20,
      connect_timeout: 15,
      onnotice: () => {},
    })
  }
  return globalThis.__afSql
}

/* ------------------------------------------------------------------ schéma */

const SCHEMA = /* sql */ `
create table if not exists app_meta (key text primary key, value text not null);

create table if not exists users (
  id text primary key,
  name text not null,
  username text not null,
  role text not null check (role in ('super_admin', 'admin')),
  active boolean not null default true,
  password_hash text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
create unique index if not exists users_username_key on users (lower(username));
create unique index if not exists users_name_key on users (lower(name));

create table if not exists sessions (
  hash text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at timestamptz not null
);

create table if not exists template_categories (
  id text primary key, name text not null, builtin boolean not null default false, position int not null default 0
);

create table if not exists files (
  id text primary key, mime text not null, size int not null, data bytea not null, created_at timestamptz not null default now()
);

create table if not exists website_templates (
  id text primary key,
  name text not null,
  category_id text references template_categories(id) on delete set null,
  site_type text not null default 'Site vitrine',
  short_description text not null default '',
  description text not null default '',
  features text[] not null default '{}',
  technologies text[] not null default '{}',
  tags text[] not null default '{}',
  demo_url text not null default '',
  demo_url_mobile text not null default '',
  suggested_pack_ids text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'archived')),
  cover_image_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists template_images (
  id text primary key,
  template_id text not null references website_templates(id) on delete cascade,
  file_id text not null references files(id),
  thumb_file_id text not null references files(id),
  kind text not null default 'desktop' check (kind in ('desktop', 'mobile', 'other')),
  caption text not null default '',
  width int, height int,
  position int not null default 0
);
create index if not exists template_images_template on template_images(template_id);

create table if not exists leads (
  id text primary key,
  company text not null,
  contact text not null default '',
  phone text not null default '',
  email text not null default '',
  city text not null default '',
  postal_code text not null default '',
  sectors text[] not null default '{}',
  activity text not null default '',
  has_website boolean not null default false,
  url text not null default '',
  need text not null default '',
  budget numeric,
  assignee text,
  status text not null default 'a_qualifier',
  next_follow_up text,
  pack_ids text[] not null default '{}',
  discount numeric not null default 0,
  source text not null default '',
  template_id text references website_templates(id) on delete set null,
  template_id_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table leads add column if not exists address text not null default '';
alter table leads add column if not exists department text not null default '';
alter table leads add column if not exists trade text not null default '';
alter table leads add column if not exists call_session text not null default '';
alter table leads add column if not exists socials text not null default '';

create table if not exists lead_interactions (
  id text primary key,
  lead_id text not null references leads(id) on delete cascade,
  date timestamptz not null default now(),
  author text not null,
  type text not null,
  text text not null
);
create index if not exists lead_interactions_lead on lead_interactions(lead_id);

create table if not exists packs (
  id text primary key, name text not null, category text not null, price numeric not null default 0,
  billing text not null default 'oneshot', description text not null default '', active boolean not null default true, position int not null default 0
);

create table if not exists prospecting_queries (
  id text primary key, category text not null, label text not null, query text not null, position int not null default 0
);

create table if not exists template_presentations (
  id text primary key,
  token text not null unique,
  lead_id text references leads(id) on delete set null,
  title text not null,
  message text not null default '',
  created_by text not null,
  created_at timestamptz not null default now(),
  revoked boolean not null default false,
  revoked_at timestamptz,
  view_count int not null default 0,
  last_viewed_at timestamptz
);

create table if not exists template_presentation_items (
  id text primary key,
  presentation_id text not null references template_presentations(id) on delete cascade,
  template_id text not null references website_templates(id) on delete cascade,
  position int not null default 0
);

create table if not exists template_client_selections (
  id text primary key,
  presentation_id text references template_presentations(id) on delete set null,
  template_id text not null references website_templates(id) on delete cascade,
  lead_id text references leads(id) on delete set null,
  client_name text not null default '',
  message text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists settings (key text primary key, value jsonb not null);

create table if not exists quotes (
  id text primary key,
  number text not null unique,
  year int not null,
  seq int not null,
  lead_id text references leads(id) on delete set null,
  status text not null default 'brouillon' check (status in ('brouillon', 'envoye', 'accepte', 'refuse', 'annule')),
  client jsonb not null,
  lines jsonb not null,
  discount numeric not null default 0,
  vat_rate numeric not null default 20,
  valid_until text not null,
  payment_terms text not null default '',
  notes text not null default '',
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, seq)
);
create index if not exists quotes_lead on quotes(lead_id);
`

/** À incrémenter à chaque ajout dans SCHEMA : force la migration au démarrage suivant. */
const SCHEMA_VERSION = '3'

export async function seedCore(sql: Sql) {
  await sql`delete from packs`
  await sql`delete from prospecting_queries`
  for (const [i, p] of DEFAULT_PACKS.entries())
    await sql`insert into packs (id, name, category, price, billing, description, active, position)
      values (${p.id}, ${p.name}, ${p.category}, ${p.price}, ${p.billing}, ${p.description}, ${p.active}, ${i})`
  for (const [i, k] of DEFAULT_KEYWORDS.entries())
    await sql`insert into prospecting_queries (id, category, label, query, position) values (${k.id}, ${k.category}, ${k.label}, ${k.query}, ${i})`
}

async function migrate(sql: Sql) {
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(424242)`
    await tx.unsafe(SCHEMA)
    const [{ n }] = await tx`select count(*)::int as n from app_meta where key = 'seeded'`
    if (n === 0) {
      const { importLegacy, legacyPath } = await import('./legacy')
      const legacy = legacyPath()
      if (legacy) {
        // Première ouverture après la mise à jour : reprise de l'ancienne base (data/db.json)
        const summary = await importLegacy(tx as unknown as Sql, legacy)
        console.log(`✅ Données de l'ancienne version importées : ${summary}`)
        await tx`insert into app_meta (key, value) values ('legacy_import', ${summary})`
      } else {
        await seedCore(tx as unknown as Sql)
        for (const [i, c] of DEFAULT_CATEGORIES.entries())
          await tx`insert into template_categories (id, name, builtin, position) values (${c.id}, ${c.name}, true, ${i}) on conflict do nothing`
        await tx`insert into settings (key, value) values ('agency', ${tx.json(DEFAULT_SETTINGS)}) on conflict do nothing`
        const [{ leads }] = await tx`select count(*)::int as leads from leads`
        if (leads === 0) {
          const { insertLead } = await import('./repo')
          for (const p of seedProspects()) await insertLead(tx as unknown as Sql, p)
        }
      }
      await tx`insert into app_meta (key, value) values ('seeded', ${new Date().toISOString()})`
    }
    await tx`insert into app_meta (key, value) values ('schema_version', ${SCHEMA_VERSION}) on conflict (key) do update set value = excluded.value`
  })
}

/** Connexion + création des tables au premier appel. */
async function ensureSchema(sql: Sql) {
  // Démarrage rapide : si le schéma est déjà en place, on évite la migration complète.
  try {
    const [r] = await sql`select value from app_meta where key = 'schema_version'`
    if (r?.value === SCHEMA_VERSION) return
  } catch { /* tables absentes : première installation */ }
  await migrate(sql)
}

export async function db(): Promise<Sql> {
  const sql = getSql()
  if (!globalThis.__afReady) globalThis.__afReady = ensureSchema(sql).catch((e) => { globalThis.__afReady = undefined; throw e })
  await globalThis.__afReady
  return sql
}

/** Raccourci : requête unique sur la base (`await run\`select …\``). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function run(strings: TemplateStringsArray, ...values: any[]) {
  const sql = await db()
  return sql(strings, ...values)
}
