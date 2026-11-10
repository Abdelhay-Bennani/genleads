import {
  AccountBalanceWalletOutlined, BadgeOutlined, DashboardOutlined, DesktopWindowsOutlined, DescriptionOutlined,
  FolderOpenOutlined, InsightsOutlined, Inventory2Outlined, PeopleAltOutlined, ReceiptLongOutlined, SettingsOutlined, TravelExploreOutlined,
} from '@mui/icons-material'
import type { SvgIconComponent } from '@mui/icons-material'
import type { ModuleId } from '@/lib/shared/modules'

export interface NavItem { href: string; label: string; icon: SvgIconComponent; module?: ModuleId; badge?: 'new' | 'soon'; accent?: string }
export interface NavSection { title?: string; items: NavItem[] }

/** Barre latérale — reprend l’organisation de la maquette fournie. */
export const NAV: NavSection[] = [
  {
    title: 'Gestion commerciale',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: DashboardOutlined, module: 'dashboard' },
      { href: '/leads', label: 'Leads CRM', icon: PeopleAltOutlined, module: 'leads' },
      { href: '/prospects', label: 'Prospection', icon: TravelExploreOutlined, module: 'prospects' },
      { href: '/clients', label: 'Clients', icon: BadgeOutlined, module: 'clients' },
    ],
  },
  {
    title: 'Documents & finances',
    items: [
      { href: '/devis', label: 'Devis', icon: DescriptionOutlined, module: 'devis' },
      { href: '/factures', label: 'Factures', icon: ReceiptLongOutlined, module: 'factures' },
      { href: '/paiements', label: 'Paiements', icon: AccountBalanceWalletOutlined, module: 'paiements' },
      { href: '/catalogue', label: 'Catalogue des services', icon: Inventory2Outlined, module: 'catalogue' },
    ],
  },
  {
    title: "Ressources de l'agence",
    items: [
      { href: '/maquettes', label: 'Mes Maquettes', icon: DesktopWindowsOutlined, module: 'maquettes' },
      { href: '/presentations', label: 'Présentations clients', icon: FolderOpenOutlined, module: 'presentations' },
    ],
  },
  {
    items: [
      { href: '/rapports', label: 'Rapports', icon: InsightsOutlined, module: 'rapports' },
      { href: '/parametres', label: 'Paramètres', icon: SettingsOutlined },
    ],
  },
]

export const ALL_NAV = NAV.flatMap((s) => s.items)
export const titleFor = (path: string) => ALL_NAV.find((i) => path === i.href || path.startsWith(i.href + '/'))?.label ?? 'AgenceFlow'
