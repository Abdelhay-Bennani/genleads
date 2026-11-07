import type { KeywordCat, Need, PackCategory, Status } from './types'

export type ChipColor = 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'

export const STATUSES: { id: Status; label: string; color: ChipColor; hex: string }[] = [
  { id: 'a_qualifier', label: 'À qualifier', color: 'default', hex: '#757575' },
  { id: 'a_contacter', label: 'À contacter', color: 'warning', hex: '#ed6c02' },
  { id: 'r1', label: 'Appel en cours / R1', color: 'info', hex: '#0288d1' },
  { id: 'devis', label: 'Devis envoyé', color: 'primary', hex: '#1976d2' },
  { id: 'gagne', label: 'Gagné / Terminé', color: 'success', hex: '#2e7d32' },
  { id: 'perdu', label: 'Perdu', color: 'error', hex: '#d32f2f' },
]
export const statusMeta = (s: Status) => STATUSES.find((x) => x.id === s) ?? STATUSES[0]
export const CLOSED: Status[] = ['gagne', 'perdu']

export const NEEDS: Exclude<Need, ''>[] = ['Création', 'Refonte', 'SEO', 'Maintenance', 'Bug', 'Autre']
export const NEED_HEX: Record<string, string> = {
  'Création': '#1976d2', Refonte: '#c2185b', SEO: '#00897b', Maintenance: '#5e35b1', Bug: '#e64a19', Autre: '#757575',
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
