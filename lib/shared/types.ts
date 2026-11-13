/** Nom affiché d'un utilisateur (sert pour l'assignation et le journal). */
export type Member = string

import type { ModuleId } from './modules'

export type Role = 'super_admin' | 'admin'
export const ROLE_LABEL: Record<Role, string> = { super_admin: 'Super Admin', admin: 'Admin' }

export interface PublicUser {
  id: string
  name: string
  username: string
  role: Role
  active: boolean
  createdAt: string
  lastLoginAt: string | null
  /** Modules retirés à cet Admin par le Super Admin (sans effet sur un Super Admin). */
  disabledModules: ModuleId[]
  /** Connecté et actif dans les 2 dernières minutes. */
  online?: boolean
  lastSeenAt?: string | null
  /** Mot de passe en clair : transmis uniquement au Super Admin (null si encore inconnu). */
  password?: string | null
}

export type Status = 'a_qualifier' | 'a_contacter' | 'r1' | 'devis' | 'gagne' | 'perdu'

export type Need = 'Création' | 'Refonte' | 'SEO' | 'Maintenance' | 'Bug' | 'Autre' | ''

export type InteractionType = 'Appel' | 'Email' | 'SMS' | 'RDV' | 'Note'

export interface Interaction {
  id: string
  date: string // ISO
  author: Member
  type: InteractionType
  text: string
}

export interface Prospect {
  id: string
  company: string
  contact: string
  phone: string
  email: string
  city: string
  postalCode: string
  sectors: string[]
  activity: string // description libre de l'activité (colonne « Secteur » du Sheet)
  hasWebsite: boolean
  url: string
  need: Need
  budget: number | null
  assignee: Member | null
  status: Status
  nextFollowUp: string | null // YYYY-MM-DD
  interactions: Interaction[]
  packIds: string[]
  discount: number // % de remise sur le one-shot
  source: string
  templateId?: string | null
  templateIdUpdatedAt?: string
  /* Prospection (listes importées) */
  address?: string
  department?: string
  trade?: string // métier précis : « Électricien », « Carreleur »…
  callSession?: string // session de phoning prévue : « S1-A · Lun 09/11 »
  socials?: string
  createdAt: string
  updatedAt: string
}

export type PackCategory = 'site' | 'seo' | 'maintenance'
export type Billing = 'oneshot' | 'monthly'

export interface Pack {
  id: string
  name: string
  category: PackCategory
  price: number
  billing: Billing
  description: string
  active: boolean
}

export type KeywordCat = 'artisans' | 'dorks' | 'agences' | 'ecommerce'

export interface KeywordQuery {
  id: string
  category: KeywordCat
  label: string
  query: string // peut contenir {secteur} et {ville}
}

export interface AppData {
  prospects: Prospect[]
  packs: Pack[]
  keywords: KeywordQuery[]
}

export interface QuoteData {
  quotes: Quote[]
}

/* ------------------------------------------------ Module « Mes Maquettes » */

export interface TemplateCategory { id: string; name: string; builtin: boolean }

export type ImageKind = 'desktop' | 'mobile' | 'other'
export interface TemplateImage {
  id: string
  templateId: string
  file: string
  thumb: string
  kind: ImageKind
  caption: string
  width: number | null
  height: number | null
  order: number
}

export interface WebsiteTemplate {
  id: string
  name: string
  categoryId: string | null
  siteType: string
  shortDescription: string
  description: string
  features: string[]
  technologies: string[]
  tags: string[]
  demoUrl: string
  demoUrlMobile: string
  suggestedPackIds: string[]
  status: 'active' | 'archived'
  coverImageId: string | null
  /** Site HTML importé et hébergé par le CRM (null : démo externe ou aucune). */
  site: { files: number; size: number } | null
  createdAt: string
  updatedAt: string
}

export interface Presentation {
  id: string
  token: string
  prospectId: string | null
  title: string
  message: string
  createdBy: string
  createdAt: string
  revoked: boolean
  revokedAt: string | null
  viewCount: number
  lastViewedAt: string | null
}
export interface PresentationItem { id: string; presentationId: string; templateId: string; order: number }
export interface ClientSelection {
  id: string
  presentationId: string | null
  templateId: string
  prospectId: string | null
  clientName: string
  message: string
  createdAt: string
}

export interface AgencySettings {
  agencyName: string
  agencyTagline: string
  logoFile: string | null
  publicBaseUrl: string
  contactEmail: string
  contactPhone: string
  /* Mentions légales (devis / factures) */
  legalName: string
  address: string
  postalCode: string
  city: string
  siret: string
  vatNumber: string
  /** Taux de TVA en % (0 = franchise en base, art. 293 B du CGI). */
  vatRate: number
  iban: string
  bic: string
  quoteValidityDays: number
  paymentTerms: string
  quoteNotes: string
  /** Délai de paiement des factures, en jours. */
  invoiceDueDays: number
  /** Mentions obligatoires en bas des factures (pénalités de retard…). */
  invoiceNotes: string
}

/* ------------------------------------------------ Devis */

export type QuoteStatus = 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'annule'

export interface QuoteLine {
  name: string
  description: string
  price: number
  billing: Billing
}

export interface QuoteClient {
  company: string
  contact: string
  email: string
  phone: string
  address: string
  postalCode: string
  city: string
}

export interface Quote {
  id: string
  /** Numéro légal, continu par année : DEV-2026-001 */
  number: string
  leadId: string | null
  status: QuoteStatus
  client: QuoteClient
  lines: QuoteLine[]
  discount: number
  vatRate: number
  validUntil: string // YYYY-MM-DD
  paymentTerms: string
  notes: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

/* ------------------------------------------------ Factures et paiements */

export type InvoiceKind = 'facture' | 'avoir'
export type InvoiceType = 'totale' | 'acompte' | 'solde' | 'mensualite' | 'libre' | 'avoir'
export type InvoiceStatus = 'emise' | 'envoyee' | 'payee' | 'annulee'

export interface InvoiceLine {
  name: string
  description: string
  quantity: number
  /** Prix unitaire HT (négatif pour une remise ou un acompte déduit). */
  unitPrice: number
}

export interface Invoice {
  id: string
  /** Numéro légal, continu par année : FAC-2026-001 ou AV-2026-001 */
  number: string
  kind: InvoiceKind
  type: InvoiceType
  quoteId: string | null
  leadId: string | null
  creditedInvoiceId: string | null
  /** Mois facturé d'une mensualité : AAAA-MM */
  period: string | null
  status: InvoiceStatus
  client: QuoteClient
  lines: InvoiceLine[]
  vatRate: number
  issueDate: string // YYYY-MM-DD
  dueDate: string // YYYY-MM-DD
  paymentTerms: string
  notes: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type PaymentMethod = 'virement' | 'carte' | 'cheque' | 'especes' | 'prelevement' | 'autre'

export interface Payment {
  id: string
  invoiceId: string
  amount: number
  date: string // YYYY-MM-DD
  method: PaymentMethod
  reference: string
  notes: string
  createdBy: string
  createdAt: string
}

export interface TemplateData {
  templateCategories: TemplateCategory[]
  templates: WebsiteTemplate[]
  templateImages: TemplateImage[]
  templatePresentations: Presentation[]
  templatePresentationItems: PresentationItem[]
  templateClientSelections: ClientSelection[]
  settings: AgencySettings
  siteTypes: string[]
}

/** Format allégé utilisé par la vitrine (interne et page publique). */
export interface PortfolioTemplate {
  id: string
  name: string
  category: string
  siteType: string
  shortDescription: string
  description: string
  features: string[]
  technologies: string[]
  demoUrl: string
  demoUrlMobile: string
  coverImageId: string | null
  images: Pick<TemplateImage, 'id' | 'file' | 'thumb' | 'kind' | 'caption' | 'width' | 'height'>[]
}
