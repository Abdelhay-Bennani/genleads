import type { KeywordCat, Need, PackCategory, Status } from './types'

export type ChipColor = 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'

export const STATUSES: { id: Status; label: string; color: ChipColor; hex: string }[] = [
  { id: 'a_qualifier', label: 'À qualifier', color: 'default', hex: '#94a3b8' },
  { id: 'a_contacter', label: 'À contacter', color: 'warning', hex: '#f59e0b' },
  { id: 'r1', label: 'Appel en cours / R1', color: 'info', hex: '#38bdf8' },
  { id: 'devis', label: 'Devis envoyé', color: 'primary', hex: '#a78bfa' },
  { id: 'gagne', label: 'Gagné / Terminé', color: 'success', hex: '#34d399' },
  { id: 'perdu', label: 'Perdu', color: 'error', hex: '#f87171' },
]
export const statusMeta = (s: Status) => STATUSES.find((x) => x.id === s) ?? STATUSES[0]
export const CLOSED: Status[] = ['gagne', 'perdu']

export const NEEDS: Exclude<Need, ''>[] = ['Création', 'Refonte', 'SEO', 'Maintenance', 'Bug', 'Autre']
export const NEED_HEX: Record<string, string> = {
  'Création': '#60a5fa', Refonte: '#f472b6', SEO: '#2dd4bf', Maintenance: '#818cf8', Bug: '#fb923c', Autre: '#94a3b8',
}

export const SECTORS = [
  'Chauffage', 'Plomberie', 'Climatisation', 'Paysagiste', 'Électricité', 'Maçonnerie', 'Menuiserie',
  'Peinture', 'Toiture', 'Salle de bain', 'BTP', 'E-commerce', 'Restauration', 'Autre',
]

export const PACK_CATEGORIES: { id: PackCategory; label: string }[] = [
  { id: 'site', label: 'Sites Web' },
  { id: 'seo', label: 'SEO & Visibilité' },
  { id: 'maintenance', label: 'Maintenance' },
]

export const KEYWORD_CATS: { id: KeywordCat; label: string; hint: string }[] = [
  { id: 'artisans', label: 'Artisans par secteur & ville', hint: 'Trouver des artisans locaux à démarcher.' },
  { id: 'dorks', label: 'Opérateurs Google (dorks)', hint: 'Repérer les sites absents, obsolètes ou faits sur des outils gratuits.' },
  { id: 'agences', label: 'Agences partenaires', hint: 'Trouver des agences pour de la sous-traitance / marque blanche.' },
  { id: 'ecommerce', label: 'E-commerce & vente en ligne', hint: 'Commerces qui vendent ou pourraient vendre en ligne.' },
]

export const SITE_TYPES = ['Site vitrine', 'One-page', 'Landing page', 'E-commerce', 'Blog / Magazine', 'Réservation', 'Portfolio', 'Autre']
