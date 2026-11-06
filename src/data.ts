import type { KeywordCat, Need, PackCategory, Status } from './types'

export const STATUSES: { id: Status; label: string; badge: string; dot: string }[] = [
  { id: 'a_qualifier', label: 'À qualifier', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' },
  { id: 'a_contacter', label: 'À contacter', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-400' },
  { id: 'r1', label: 'Appel en cours / R1', badge: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300', dot: 'bg-sky-500' },
  { id: 'devis', label: 'Devis envoyé', badge: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300', dot: 'bg-violet-500' },
  { id: 'gagne', label: 'Gagné / Terminé', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  { id: 'perdu', label: 'Perdu', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500' },
]
export const statusMeta = (s: Status) => STATUSES.find((x) => x.id === s) ?? STATUSES[0]
export const CLOSED: Status[] = ['gagne', 'perdu']

export const NEEDS: Exclude<Need, ''>[] = ['Création', 'Refonte', 'SEO', 'Maintenance', 'Bug', 'Autre']
export const NEED_COLORS: Record<string, string> = {
  'Création': 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/30',
  Refonte: 'bg-pink-50 text-pink-700 ring-pink-200 dark:bg-pink-500/10 dark:text-pink-300 dark:ring-pink-500/30',
  SEO: 'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/30',
  Maintenance: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30',
  Bug: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30',
  Autre: 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30',
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
