import 'server-only'
import crypto from 'node:crypto'
import type postgres from 'postgres'
import { SITE_TYPES } from '../shared/data'
import { hasModule, type ModuleId } from '../shared/modules'
import type {
  AgencySettings, ClientSelection, Interaction, Invoice, KeywordQuery, Pack, Payment, Presentation, PresentationItem, Prospect, PublicUser, Quote,
  TemplateCategory, TemplateImage, WebsiteTemplate,
} from '../shared/types'
import { DEFAULT_SETTINGS } from './seed'

type Sql = ReturnType<typeof postgres>
type Row = Record<string, unknown>

export const uid = () => crypto.randomBytes(8).toString('hex')
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v == null ? null : String(v))
const num = (v: unknown) => (v == null ? null : Number(v))
const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const strList = (v: unknown, max = 30, len = 80) => (Array.isArray(v) ? v.map((x) => str(x, len)).filter(Boolean).slice(0, max) : [])

/** N'accepte que des URL http(s) (évite les liens javascript: sur les pages publiques). */
export const safeUrl = (v: unknown) => {
  const s = str(v, 1000)
  if (!s) return ''
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
    return ['http:', 'https:'].includes(u.protocol) ? u.toString() : ''
  } catch { return '' }
}

/* ------------------------------------------------------------ mapping */

export const toUser = (r: Row): PublicUser => ({
  id: r.id as string, name: r.name as string, username: r.username as string, role: r.role as PublicUser['role'],
  active: r.active as boolean, createdAt: iso(r.created_at)!, lastLoginAt: iso(r.last_login_at),
  disabledModules: (r.disabled_modules as ModuleId[] | null) ?? [],
})

const toInteraction = (r: Row): Interaction => ({
  id: r.id as string, date: iso(r.date)!, author: r.author as string, type: r.type as Interaction['type'], text: r.text as string,
})

const toLead = (r: Row, interactions: Interaction[]): Prospect => ({
  id: r.id as string, company: r.company as string, contact: r.contact as string, phone: r.phone as string, email: r.email as string,
  city: r.city as string, postalCode: r.postal_code as string, sectors: r.sectors as string[], activity: r.activity as string,
  hasWebsite: r.has_website as boolean, url: r.url as string, need: r.need as Prospect['need'], budget: num(r.budget),
  assignee: (r.assignee as string) ?? null, status: r.status as Prospect['status'], nextFollowUp: (r.next_follow_up as string) ?? null,
  interactions, packIds: r.pack_ids as string[], discount: Number(r.discount ?? 0), source: r.source as string,
  templateId: (r.template_id as string) ?? null, templateIdUpdatedAt: iso(r.template_id_updated_at) ?? undefined,
  address: r.address as string, department: r.department as string, trade: r.trade as string, callSession: r.call_session as string, socials: r.socials as string,
  createdAt: iso(r.created_at)!, updatedAt: iso(r.updated_at)!,
})

const toTemplate = (r: Row, site: WebsiteTemplate['site'] = null): WebsiteTemplate => ({
  id: r.id as string, name: r.name as string, categoryId: (r.category_id as string) ?? null, siteType: r.site_type as string,
  shortDescription: r.short_description as string, description: r.description as string, features: r.features as string[],
  technologies: r.technologies as string[], tags: r.tags as string[], demoUrl: r.demo_url as string, demoUrlMobile: r.demo_url_mobile as string,
  suggestedPackIds: r.suggested_pack_ids as string[], status: r.status as WebsiteTemplate['status'], coverImageId: (r.cover_image_id as string) ?? null,
  site, createdAt: iso(r.created_at)!, updatedAt: iso(r.updated_at)!,
})

const toImage = (r: Row): TemplateImage => ({
  id: r.id as string, templateId: r.template_id as string, file: r.file_id as string, thumb: r.thumb_file_id as string,
  kind: r.kind as TemplateImage['kind'], caption: r.caption as string, width: num(r.width), height: num(r.height), order: r.position as number,
})

const toPresentation = (r: Row): Presentation => ({
  id: r.id as string, token: r.token as string, prospectId: (r.lead_id as string) ?? null, title: r.title as string, message: r.message as string,
  createdBy: r.created_by as string, createdAt: iso(r.created_at)!, revoked: r.revoked as boolean, revokedAt: iso(r.revoked_at),
  viewCount: r.view_count as number, lastViewedAt: iso(r.last_viewed_at),
})

const toSelection = (r: Row): ClientSelection => ({
  id: r.id as string, presentationId: (r.presentation_id as string) ?? null, templateId: r.template_id as string,
  prospectId: (r.lead_id as string) ?? null, clientName: r.client_name as string, message: r.message as string, createdAt: iso(r.created_at)!,
})

export const toQuote = (r: Row): Quote => ({
  id: r.id as string, number: r.number as string, leadId: (r.lead_id as string) ?? null, status: r.status as Quote["status"],
  client: r.client as Quote["client"], lines: r.lines as Quote["lines"], discount: Number(r.discount ?? 0), vatRate: Number(r.vat_rate ?? 0),
  validUntil: r.valid_until as string, paymentTerms: r.payment_terms as string, notes: r.notes as string, createdBy: r.created_by as string,
  createdAt: iso(r.created_at)!, updatedAt: iso(r.updated_at)!,
})

export const toInvoice = (r: Row): Invoice => ({
  id: r.id as string, number: r.number as string, kind: r.kind as Invoice['kind'], type: r.type as Invoice['type'], quoteId: (r.quote_id as string) ?? null,
  leadId: (r.lead_id as string) ?? null, creditedInvoiceId: (r.credited_invoice_id as string) ?? null, period: (r.period as string) ?? null,
  status: r.status as Invoice['status'], client: r.client as Invoice['client'], lines: r.lines as Invoice['lines'], vatRate: Number(r.vat_rate ?? 0),
  issueDate: r.issue_date as string, dueDate: r.due_date as string, paymentTerms: r.payment_terms as string, notes: r.notes as string,
  createdBy: r.created_by as string, createdAt: iso(r.created_at)!, updatedAt: iso(r.updated_at)!,
})

export const toPayment = (r: Row): Payment => ({
  id: r.id as string, invoiceId: r.invoice_id as string, amount: Number(r.amount), date: r.date as string, method: r.method as Payment['method'],
  reference: r.reference as string, notes: r.notes as string, createdBy: r.created_by as string, createdAt: iso(r.created_at)!,
})

/* ------------------------------------------------------------ lecture */

export async function getSettings(sql: Sql): Promise<AgencySettings> {
  const [row] = await sql`select value from settings where key = 'agency'`
  return { ...DEFAULT_SETTINGS, ...((row?.value as object) ?? {}) }
}

export async function loadLeads(sql: Sql, ids?: string[]): Promise<Prospect[]> {
  const rows = ids ? await sql`select * from leads where id = any(${ids}) order by created_at desc` : await sql`select * from leads order by created_at desc`
  const inter = ids ? await sql`select * from lead_interactions where lead_id = any(${ids}) order by date desc` : await sql`select * from lead_interactions order by date desc`
  const by = new Map<string, Interaction[]>()
  for (const i of inter) { const l = by.get(i.lead_id as string) ?? []; l.push(toInteraction(i)); by.set(i.lead_id as string, l) }
  return rows.map((r) => toLead(r, by.get(r.id as string) ?? []))
}

export async function loadAll(sql: Sql) {
  const [prospects, packs, keywords, users, cats, templates, images, pres, items, sels, settings, quotes, invoices, payments, sites] = await Promise.all([
    loadLeads(sql),
    sql`select * from packs order by position, name`,
    sql`select * from prospecting_queries order by position`,
    sql`select * from users order by created_at`,
    sql`select * from template_categories order by position, name`,
    sql`select * from website_templates order by created_at desc`,
    sql`select * from template_images order by template_id, position`,
    sql`select * from template_presentations order by created_at desc`,
    sql`select * from template_presentation_items order by presentation_id, position`,
    sql`select * from template_client_selections order by created_at desc`,
    getSettings(sql),
    sql`select * from quotes order by year desc, seq desc`,
    sql`select * from invoices order by year desc, created_at desc`,
    sql`select * from payments order by date desc, created_at desc`,
    sql`select f.template_id, count(*)::int as files, sum(f.size)::bigint as size from template_site_files f
      join website_templates t on t.id = f.template_id and t.site_version = f.version group by f.template_id`,
  ])
  const siteOf = new Map(sites.map((s) => [s.template_id as string, { files: s.files as number, size: Number(s.size) }]))
  return {
    prospects,
    packs: packs.map((r): Pack => ({ id: r.id, name: r.name, category: r.category, price: Number(r.price), billing: r.billing, description: r.description, active: r.active })),
    keywords: keywords.map((r): KeywordQuery => ({ id: r.id, category: r.category, label: r.label, query: r.query })),
    users: users.map(toUser),
    templateCategories: cats.map((r): TemplateCategory => ({ id: r.id, name: r.name, builtin: r.builtin })),
    templates: templates.map((r) => toTemplate(r, siteOf.get(r.id as string) ?? null)),
    templateImages: images.map(toImage),
    templatePresentations: pres.map(toPresentation),
    templatePresentationItems: items.map((r): PresentationItem => ({ id: r.id, presentationId: r.presentation_id, templateId: r.template_id, order: r.position })),
    templateClientSelections: sels.map(toSelection),
    settings,
    siteTypes: SITE_TYPES,
    quotes: quotes.map(toQuote),
    invoices: invoices.map(toInvoice),
    payments: payments.map(toPayment),
  }
}

/** Ne renvoie à un Admin que les données des modules qui lui sont ouverts. */
export function scopeData(d: Awaited<ReturnType<typeof loadAll>>, u: PublicUser) {
  if (u.role === 'super_admin') return d
  const can = (...m: ModuleId[]) => hasModule(u, ...m)
  const finance = can('factures', 'paiements', 'clients', 'rapports')
  const quotes = can('devis', 'factures', 'rapports') ? d.quotes : []
  const invoices = finance ? d.invoices : []
  const tpl = can('maquettes', 'presentations')
  const presentations = tpl ? d.templatePresentations : []
  let prospects = d.prospects
  if (!can('leads', 'prospects', 'dashboard', 'rapports')) {
    // Sans accès au pipeline : seulement les fiches rattachées aux documents visibles
    const linked = new Set<string | null>([...quotes.map((q) => q.leadId), ...invoices.map((i) => i.leadId), ...presentations.map((p) => p.prospectId)])
    prospects = d.prospects.filter((p) => linked.has(p.id) || (can('clients') && p.status === 'gagne'))
  }
  return {
    ...d, prospects, quotes, invoices, payments: finance ? d.payments : [],
    keywords: can('leads', 'prospects') ? d.keywords : [],
    templateCategories: tpl ? d.templateCategories : [], templates: tpl ? d.templates : [], templateImages: tpl ? d.templateImages : [],
    templatePresentations: presentations, templatePresentationItems: tpl ? d.templatePresentationItems : [], templateClientSelections: tpl ? d.templateClientSelections : [],
    users: d.users.map((x) => (x.id === u.id ? x : { ...x, disabledModules: [] })),
  }
}

/* ------------------------------------------------------------ prospects */

const NEEDS = ['Création', 'Refonte', 'SEO', 'Maintenance', 'Bug', 'Autre', '']
const STATUSES = ['a_qualifier', 'a_contacter', 'r1', 'devis', 'gagne', 'perdu']

export function cleanLead(b: Partial<Prospect> & Row): Prospect | null {
  if (!b || typeof b.id !== 'string' || !str(b.company)) return null
  const now = new Date().toISOString()
  return {
    id: str(b.id, 40), company: str(b.company, 160), contact: str(b.contact, 120), phone: str(b.phone, 80), email: str(b.email, 160),
    city: str(b.city, 120), postalCode: str(b.postalCode, 12), sectors: strList(b.sectors, 20, 40), activity: str(b.activity, 2000),
    hasWebsite: !!b.hasWebsite, url: str(b.url, 500), need: (NEEDS.includes(b.need as string) ? b.need : '') as Prospect['need'],
    budget: b.budget == null || b.budget === ('' as unknown) || Number.isNaN(Number(b.budget)) ? null : Number(b.budget),
    assignee: str(b.assignee, 80) || null, status: (STATUSES.includes(b.status as string) ? b.status : 'a_qualifier') as Prospect['status'],
    nextFollowUp: /^\d{4}-\d{2}-\d{2}$/.test(String(b.nextFollowUp ?? '')) ? (b.nextFollowUp as string) : null,
    interactions: Array.isArray(b.interactions) ? b.interactions.filter((i) => i && typeof i.id === 'string').slice(0, 2000).map((i) => ({
      id: str(i.id, 40), date: iso(i.date) ?? now, author: str(i.author, 120) || '—', type: (['Appel', 'Email', 'SMS', 'RDV', 'Note'].includes(i.type) ? i.type : 'Note') as Interaction['type'], text: str(i.text, 5000),
    })) : [],
    packIds: strList(b.packIds, 20, 40), discount: Math.max(0, Math.min(100, Number(b.discount) || 0)), source: str(b.source, 300),
    templateId: str(b.templateId, 40) || null, templateIdUpdatedAt: b.templateIdUpdatedAt ? String(b.templateIdUpdatedAt) : undefined,
    address: str(b.address, 200), department: str(b.department, 4), trade: str(b.trade, 80), callSession: str(b.callSession, 60), socials: str(b.socials, 500),
    createdAt: iso(b.createdAt) ?? now, updatedAt: now,
  }
}

/** Insère ou met à jour un prospect. Le journal n'est jamais réduit (fusion par identifiant). */
export async function insertLead(sql: Sql, p: Prospect) {
  const tid = p.templateId ? (await sql`select id from website_templates where id = ${p.templateId}`)[0]?.id ?? null : null
  await sql`
    insert into leads (id, company, contact, phone, email, city, postal_code, sectors, activity, has_website, url, need, budget, assignee,
      status, next_follow_up, pack_ids, discount, source, template_id, template_id_updated_at, address, department, trade, call_session, socials, created_at, updated_at)
    values (${p.id}, ${p.company}, ${p.contact}, ${p.phone}, ${p.email}, ${p.city}, ${p.postalCode}, ${p.sectors}, ${p.activity}, ${p.hasWebsite},
      ${p.url}, ${p.need}, ${p.budget}, ${p.assignee}, ${p.status}, ${p.nextFollowUp}, ${p.packIds}, ${p.discount}, ${p.source}, ${tid},
      ${p.templateIdUpdatedAt ?? null}, ${p.address ?? ''}, ${p.department ?? ''}, ${p.trade ?? ''}, ${p.callSession ?? ''}, ${p.socials ?? ''}, ${p.createdAt}, ${p.updatedAt})
    on conflict (id) do update set
      company = excluded.company, contact = excluded.contact, phone = excluded.phone, email = excluded.email, city = excluded.city,
      postal_code = excluded.postal_code, sectors = excluded.sectors, activity = excluded.activity, has_website = excluded.has_website,
      url = excluded.url, need = excluded.need, budget = excluded.budget, assignee = excluded.assignee, status = excluded.status,
      next_follow_up = excluded.next_follow_up, pack_ids = excluded.pack_ids, discount = excluded.discount, source = excluded.source,
      address = excluded.address, department = excluded.department, trade = excluded.trade, call_session = excluded.call_session, socials = excluded.socials,
      template_id = case when coalesce(excluded.template_id_updated_at, '-infinity') >= coalesce(leads.template_id_updated_at, '-infinity')
        then excluded.template_id else leads.template_id end,
      template_id_updated_at = greatest(excluded.template_id_updated_at, leads.template_id_updated_at),
      updated_at = excluded.updated_at`
  for (const i of p.interactions)
    await sql`insert into lead_interactions (id, lead_id, date, author, type, text) values (${i.id}, ${p.id}, ${i.date}, ${i.author}, ${i.type}, ${i.text})
      on conflict (id) do nothing`
}

export async function addInteraction(sql: Sql, leadId: string, i: Omit<Interaction, 'id' | 'date'>) {
  await sql`insert into lead_interactions (id, lead_id, author, type, text) values (${uid()}, ${leadId}, ${i.author}, ${i.type}, ${i.text})`
  await sql`update leads set updated_at = now() where id = ${leadId}`
}

/* ------------------------------------------------------------ packs / requêtes */

export async function replacePacks(sql: Sql, list: unknown[]) {
  const packs = list.filter((p): p is Pack => !!p && typeof (p as Pack).id === 'string').map((p) => ({
    id: str(p.id, 40), name: str(p.name, 120) || 'Pack', category: ['site', 'seo', 'maintenance'].includes(p.category) ? p.category : 'site',
    price: Math.max(0, Number(p.price) || 0), billing: p.billing === 'monthly' ? 'monthly' : 'oneshot', description: str(p.description, 1000), active: !!p.active,
  }))
  await sql`delete from packs where not (id = any(${packs.map((p) => p.id)}))`
  for (const [i, p] of packs.entries())
    await sql`insert into packs (id, name, category, price, billing, description, active, position) values (${p.id}, ${p.name}, ${p.category}, ${p.price}, ${p.billing}, ${p.description}, ${p.active}, ${i})
      on conflict (id) do update set name = excluded.name, category = excluded.category, price = excluded.price, billing = excluded.billing,
      description = excluded.description, active = excluded.active, position = excluded.position`
}

export async function replaceKeywords(sql: Sql, list: unknown[]) {
  const kws = list.filter((k): k is KeywordQuery => !!k && typeof (k as KeywordQuery).id === 'string').map((k) => ({
    id: str(k.id, 40), category: ['artisans', 'dorks', 'agences', 'ecommerce'].includes(k.category) ? k.category : 'artisans',
    label: str(k.label, 120) || str(k.query, 120), query: str(k.query, 500),
  })).filter((k) => k.query)
  await sql`delete from prospecting_queries`
  for (const [i, k] of kws.entries())
    await sql`insert into prospecting_queries (id, category, label, query, position) values (${k.id}, ${k.category}, ${k.label}, ${k.query}, ${i}) on conflict (id) do nothing`
}
