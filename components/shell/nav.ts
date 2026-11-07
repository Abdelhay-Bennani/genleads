import {
  AccountBalanceWalletOutlined, BadgeOutlined, DashboardOutlined, DesktopWindowsOutlined, DescriptionOutlined,
  FolderOpenOutlined, InsightsOutlined, Inventory2Outlined, PeopleAltOutlined, ReceiptLongOutlined, SettingsOutlined,
} from '@mui/icons-material'
import type { SvgIconComponent } from '@mui/icons-material'

export interface NavItem { href: string; label: string; icon: SvgIconComponent; badge?: 'new' | 'soon'; accent?: string }
export interface NavSection { title?: string; items: NavItem[] }

/** Barre latérale — reprend l’organisation de la maquette fournie. */
export const NAV: NavSection[] = [
  {
    title: 'Gestion commerciale',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: DashboardOutlined },
      { href: '/leads', label: 'Leads CRM', icon: PeopleAltOutlined },
      { href: '/clients', label: 'Clients', icon: BadgeOutlined },
    ],
  },
  {
    title: 'Documents & finances',
    items: [
      { href: '/devis', label: 'Devis', icon: DescriptionOutlined },
      { href: '/factures', label: 'Factures', icon: ReceiptLongOutlined, badge: 'soon' },
      { href: '/paiements', label: 'Paiements', icon: AccountBalanceWalletOutlined, badge: 'soon' },
      { href: '/catalogue', label: 'Catalogue des services', icon: Inventory2Outlined },
    ],
  },
  {
    title: "Ressources de l'agence",
    items: [
      { href: '/maquettes', label: 'Mes Maquettes', icon: DesktopWindowsOutlined },
      { href: '/presentations', label: 'Présentations clients', icon: FolderOpenOutlined },
    ],
  },
  {
    items: [
      { href: '/rapports', label: 'Rapports', icon: InsightsOutlined, badge: 'soon' },
      { href: '/parametres', label: 'Paramètres', icon: SettingsOutlined },
    ],
  },
]

export const ALL_NAV = NAV.flatMap((s) => s.items)
export const titleFor = (path: string) => ALL_NAV.find((i) => path === i.href || path.startsWith(i.href + '/'))?.label ?? 'AgenceFlow'
