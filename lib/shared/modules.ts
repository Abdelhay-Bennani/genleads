/** Modules du CRM que le Super Admin peut activer ou désactiver pour chaque Admin. */
export type ModuleId = 'dashboard' | 'leads' | 'prospects' | 'clients' | 'devis' | 'factures' | 'paiements' | 'catalogue' | 'maquettes' | 'presentations' | 'rapports'

export const MODULES: { id: ModuleId; label: string; href: string; description: string }[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', description: 'Vue d’ensemble du pipeline et des relances' },
  { id: 'leads', label: 'Leads CRM', href: '/leads', description: 'Pipeline, journal et prospection Google' },
  { id: 'prospects', label: 'Prospection', href: '/prospects', description: 'Base d’entreprises et sessions d’appels' },
  { id: 'clients', label: 'Clients', href: '/clients', description: 'Leads gagnés et encours' },
  { id: 'devis', label: 'Devis', href: '/devis', description: 'Émission et suivi des devis PDF' },
  { id: 'factures', label: 'Factures', href: '/factures', description: 'Facturation, acomptes, avoirs' },
  { id: 'paiements', label: 'Paiements', href: '/paiements', description: 'Encaissements et relevé' },
  { id: 'catalogue', label: 'Catalogue', href: '/catalogue', description: 'Offres et simulateur de devis' },
  { id: 'maquettes', label: 'Mes Maquettes', href: '/maquettes', description: 'Bibliothèque et sites de démonstration' },
  { id: 'presentations', label: 'Présentations', href: '/presentations', description: 'Liens envoyés aux prospects' },
  { id: 'rapports', label: 'Rapports', href: '/rapports', description: 'Chiffre d’affaires et performance' },
]
export const MODULE_IDS = MODULES.map((m) => m.id)

export const cleanModules = (v: unknown): ModuleId[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is ModuleId => MODULE_IDS.includes(x as ModuleId)))] : []

/** Vrai si au moins un des modules cités est ouvert à l'utilisateur. */
export const hasModule = (u: { role: string; disabledModules: ModuleId[] }, ...modules: ModuleId[]) =>
  u.role === 'super_admin' || modules.some((m) => !u.disabledModules.includes(m))
