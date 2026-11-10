import { CLOSED, STATUSES } from './data'
import type { Need, Pack, Prospect, Quote, QuoteStatus, Status } from './types'

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5)

const eurFmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
export const eur = (n: number) => eurFmt.format(Math.round(n))

export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
export const fmtDate = (iso: string | null) => {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export const isClosed = (p: Prospect) => CLOSED.includes(p.status)

export function quote(p: Prospect, packs: Pack[]) {
  const sel = packs.filter((k) => p.packIds.includes(k.id))
  const oneShotRaw = sel.filter((k) => k.billing === 'oneshot').reduce((s, k) => s + k.price, 0)
  const oneShot = oneShotRaw * (1 - (p.discount || 0) / 100)
  const mrr = sel.filter((k) => k.billing === 'monthly').reduce((s, k) => s + k.price, 0)
  return { sel, oneShotRaw, oneShot, mrr }
}

/** Session réservée aux entreprises dont l'absence de site n'a pas encore été contrôlée. */
export const SITE_UNVERIFIED = 'Site à vérifier'
export const isSiteUnverified = (p: Prospect) => !p.hasWebsite && p.callSession === SITE_UNVERIFIED

/** Totaux d'un devis émis (lignes figées au moment de l'émission). */
export function quoteTotals(q: Pick<Quote, 'lines' | 'discount' | 'vatRate'>) {
  const round = (n: number) => Math.round(n * 100) / 100
  const oneShotRaw = q.lines.filter((l) => l.billing === 'oneshot').reduce((s, l) => s + l.price, 0)
  const discountAmount = round(oneShotRaw * (q.discount || 0) / 100)
  const oneShotHT = round(oneShotRaw - discountAmount)
  const oneShotVAT = round(oneShotHT * q.vatRate / 100)
  const monthlyHT = round(q.lines.filter((l) => l.billing === 'monthly').reduce((s, l) => s + l.price, 0))
  const monthlyVAT = round(monthlyHT * q.vatRate / 100)
  return { oneShotRaw, discountAmount, oneShotHT, oneShotVAT, oneShotTTC: round(oneShotHT + oneShotVAT), monthlyHT, monthlyVAT, monthlyTTC: round(monthlyHT + monthlyVAT) }
}

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; hex: string }> = {
  brouillon: { label: 'Brouillon', hex: '#6f6b85' },
  envoye: { label: 'Envoyé', hex: '#5539d9' },
  accepte: { label: 'Accepté', hex: '#3f28b5' },
  refuse: { label: 'Refusé', hex: '#6f6b85' },
  annule: { label: 'Annulé', hex: '#a8a5b8' },
}

/** Valeur one-shot d'une affaire : devis s'il existe, sinon budget estimé. */
export const dealValue = (p: Prospect, packs: Pack[]) => {
  const q = quote(p, packs)
  return q.sel.some((k) => k.billing === 'oneshot') ? q.oneShot : p.budget ?? 0
}

export type FollowState = 'none' | 'overdue' | 'today' | 'upcoming'
export const followState = (p: Prospect): FollowState => {
  if (!p.nextFollowUp || isClosed(p)) return 'none'
  const t = todayISO()
  if (p.nextFollowUp < t) return 'overdue'
  if (p.nextFollowUp === t) return 'today'
  return 'upcoming'
}

export const googleUrl = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`
export const mapsUrl = (q: string) => `https://www.google.com/maps/search/${encodeURIComponent(q)}`
export const ensureHttp = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`)
export const telHref = (phone: string) => `tel:${phone.split(',')[0].replace(/[^\d+]/g, '')}`

/* ---------------- CSV ---------------- */

export function parseCSV(text: string): string[][] {
  text = text.replace(/^﻿/, '')
  const firstLine = text.split(/\r?\n/)[0] ?? ''
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++ } else q = false
      } else cur += c
    } else if (c === '"') q = true
    else if (c === sep) { row.push(cur); cur = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cur); rows.push(row); row = []; cur = ''
    } else cur += c
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

const csvCell = (v: string | number | null | undefined) => {
  const s = v == null ? '' : String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function prospectsToCSV(list: Prospect[], packs: Pack[]) {
  const head = ['Statut', 'Client / Entreprise', 'Contact', 'Site Web', 'URL site web', 'Téléphone', 'Email', 'Ville', 'Code postal',
    'Besoin Client', 'Secteur', 'Tags secteur', 'Budget', 'Assigné à', 'Prochaine relance', 'Packs', 'CA one-shot', 'MRR']
  const lines = list.map((p) => {
    const q = quote(p, packs)
    return [STATUSES.find((s) => s.id === p.status)?.label, p.company, p.contact, p.hasWebsite ? 'Oui' : 'Non', p.url, p.phone, p.email,
      p.city, p.postalCode, p.need, p.activity, p.sectors.join(', '), p.budget ?? '', p.assignee ?? '', p.nextFollowUp ?? '',
      q.sel.map((k) => k.name).join(' + '), q.sel.length ? Math.round(q.oneShot) : '', q.mrr || ''].map(csvCell).join(';')
  })
  return '﻿' + [head.join(';'), ...lines].join('\r\n')
}

const STATUS_ALIASES: Record<string, Status> = {
  'a faire': 'a_contacter', 'termine': 'gagne', 'gagne': 'gagne', 'perdu': 'perdu', 'devis envoye': 'devis', 'devis': 'devis',
  'r1': 'r1', 'appel en cours': 'r1', 'a qualifier': 'a_qualifier', 'a contacter': 'a_contacter',
}
const mapStatus = (s: string): Status => {
  const n = normalize(s)
  if (STATUS_ALIASES[n]) return STATUS_ALIASES[n]
  const hit = STATUSES.find((x) => normalize(x.label) === n || n.startsWith(normalize(x.label).split(' /')[0]))
  return hit?.id ?? 'a_contacter'
}
const mapNeed = (s: string): Need => {
  const n = normalize(s)
  const opts: Need[] = ['Création', 'Refonte', 'SEO', 'Maintenance', 'Bug', 'Autre']
  return opts.find((o) => normalize(o) === n) ?? (n ? 'Autre' : '')
}

/** Convertit un CSV (export Google Sheets ou export AgenceFlow) en prospects. */
export function csvToProspects(text: string, members: string[] = []): Prospect[] {
  const rows = parseCSV(text)
  if (rows.length < 2) return []
  const head = rows[0].map(normalize)
  const col = (...names: string[]) => head.findIndex((h) => names.some((n) => h === n))
  const idx = {
    status: col('statut', 'status'),
    company: col('client / entreprise', 'entreprise', 'client', 'societe', 'nom'),
    contact: col('contact', 'contact principal'),
    hasSite: col('site web', 'site'),
    url: col('url site web', 'url', 'site internet'),
    phone: col('telephone', 'tel'),
    email: col('email', 'e-mail', 'mail'),
    city: col('ville', 'city'),
    cp: col('code postal', 'cp'),
    need: col('besoin client', 'besoin'),
    activity: col('secteur', 'activite'),
    tags: col('tags secteur'),
    budget: col('budget'),
    assignee: col('assigne a', 'assigne', 'commercial'),
    follow: col('prochaine relance', 'relance'),
  }
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '')
  const now = new Date().toISOString()
  return rows.slice(1).map((r) => {
    const activity = get(r, idx.activity)
    const tagsRaw = get(r, idx.tags)
    const budgetRaw = get(r, idx.budget).replace(/[^\d,.-]/g, '').replace(',', '.')
    const ass = normalize(get(r, idx.assignee))
    const follow = get(r, idx.follow)
    const url = get(r, idx.url)
    const hs = normalize(get(r, idx.hasSite))
    return {
      id: uid(), company: get(r, idx.company), contact: get(r, idx.contact), phone: get(r, idx.phone), email: get(r, idx.email),
      city: get(r, idx.city), postalCode: get(r, idx.cp), activity,
      sectors: tagsRaw ? tagsRaw.split(/\s*,\s*/).filter(Boolean) : guessSectors(activity),
      hasWebsite: hs ? hs === 'oui' || hs === 'yes' : !!url, url, need: mapNeed(get(r, idx.need)),
      budget: budgetRaw ? Number(budgetRaw) || null : null,
      assignee: members.find((m) => normalize(m) === ass) ?? null,
      status: idx.status >= 0 ? mapStatus(get(r, idx.status)) : 'a_contacter',
      nextFollowUp: /^\d{4}-\d{2}-\d{2}$/.test(follow) ? follow : null,
      interactions: [], packIds: [], discount: 0, source: 'Import CSV', createdAt: now, updatedAt: now,
    } satisfies Prospect
  }).filter((p) => p.company)
}

const SECTOR_HINTS: [RegExp, string][] = [
  [/chaudi|chauffag|pompe a chaleur|pac\b/, 'Chauffage'], [/plomb/, 'Plomberie'], [/clim/, 'Climatisation'],
  [/paysag|jardin|espaces verts/, 'Paysagiste'], [/electri/, 'Électricité'], [/macon/, 'Maçonnerie'], [/menuis/, 'Menuiserie'],
  [/peint/, 'Peinture'], [/toit|couv/, 'Toiture'], [/salle de bain/, 'Salle de bain'], [/btp|renov|batiment/, 'BTP'],
  [/e-?commerce|boutique/, 'E-commerce'], [/restau/, 'Restauration'],
]
export const guessSectors = (txt: string) => {
  const n = normalize(txt)
  return SECTOR_HINTS.filter(([re]) => re.test(n)).map(([, s]) => s)
}

export function download(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
