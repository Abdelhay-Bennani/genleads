/** Nom affiché d'un utilisateur (sert pour l'assignation et le journal). */
export type Member = string

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
