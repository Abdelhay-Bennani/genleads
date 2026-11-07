'use client'
import { KeyboardArrowRightRounded, LogoutRounded, ManageAccountsOutlined, MenuRounded, MoreVertRounded, SearchRounded } from '@mui/icons-material'
import {
  AppBar, Autocomplete, Box, Breadcrumbs, Divider, Drawer, IconButton, InputAdornment, List, ListItemButton, ListItemIcon, ListItemText,
  Menu, MenuItem, Stack, TextField, Toolbar, Typography,
} from '@mui/material'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode, useState } from 'react'
import { useAuth } from '@/lib/client/auth'
import { useStore } from '@/lib/client/store'
import { ROLE_LABEL } from '@/lib/shared/types'
import { GlowBadge, UserAvatar } from '../ui'
import { AccountDialog } from './AccountDialog'
import { ModeToggle } from './AuthScreens'
import { useLeadDrawer } from './LeadDrawerContext'
import { Logo } from './Logo'
import { NAV, titleFor } from './nav'

const WIDTH = 268

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname()
  const store = useStore()
  const auth = useAuth()
  const [menu, setMenu] = useState<HTMLElement | null>(null)
  const [account, setAccount] = useState(false)

  return (
    <Stack sx={{ height: '100%' }}>
      <Box sx={{ px: 2.5, py: 2.25 }}><Logo /></Box>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1 }}>
        {NAV.map((section, si) => (
          <Box key={si} sx={{ pt: 1.5 }}>
            {si > 0 && !section.title && <Divider sx={{ mb: 1.5, mx: 1 }} />}
            {section.title && <Typography variant="overline" color="text.secondary" sx={{ px: 1.25, display: 'block', mb: 0.5, fontSize: '0.66rem' }}>{section.title}</Typography>}
            <List dense disablePadding>
              {section.items.map((item) => {
                const active = path === item.href || path.startsWith(item.href + '/')
                return (
                  <ListItemButton key={item.href} component={Link} href={item.href} onClick={onNavigate} selected={active}
                    sx={{ mb: 0.25, py: 0.85, borderRadius: 1 }}>
                    <ListItemIcon sx={{ minWidth: 34, color: active ? 'primary.main' : 'text.secondary' }}><item.icon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: '0.88rem', fontWeight: active || item.badge === 'new' ? 600 : 500 } } }} />
                    {item.badge === 'new' && <GlowBadge label="Nouveau" tone="green" />}
                    {item.badge === 'soon' && <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>Bientôt</Typography>}
                  </ListItemButton>
                )
              })}
            </List>
          </Box>
        ))}
      </Box>
      <Divider />
      <Stack direction="row" spacing={1.25} sx={{ p: 1.75, alignItems: 'center' }}>
        <UserAvatar name={store.me.name} size={36} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{store.me.name}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{ROLE_LABEL[store.me.role]} · @{store.me.username}</Typography>
        </Box>
        <IconButton size="small" onClick={(e) => setMenu(e.currentTarget)} aria-label="Menu du compte"><MoreVertRounded fontSize="small" /></IconButton>
        <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <MenuItem onClick={() => { setMenu(null); setAccount(true) }}><ListItemIcon><ManageAccountsOutlined fontSize="small" /></ListItemIcon>Mon compte</MenuItem>
          <Divider />
          <MenuItem onClick={() => { setMenu(null); auth.logout() }}><ListItemIcon><LogoutRounded fontSize="small" /></ListItemIcon>Se déconnecter</MenuItem>
        </Menu>
      </Stack>
      {account && <AccountDialog onClose={() => setAccount(false)} />}
    </Stack>
  )
}

function QuickSearch() {
  const store = useStore()
  const drawer = useLeadDrawer()
  const [value, setValue] = useState<string | null>(null)
  return (
    <Autocomplete size="small" sx={{ width: 260 }} value={value} blurOnSelect clearOnBlur
      options={store.prospects.map((p) => p.id)}
      getOptionLabel={(id) => store.prospects.find((p) => p.id === id)?.company ?? ''}
      renderOption={(props, id) => {
        const p = store.prospects.find((x) => x.id === id)!
        const { key, ...rest } = props as typeof props & { key: string }
        return <li key={key} {...rest}><Box><Typography variant="body2">{p.company}</Typography><Typography variant="caption" color="text.secondary">{[p.city, p.sectors[0]].filter(Boolean).join(' · ')}</Typography></Box></li>
      }}
      onChange={(_e, id) => { if (id) drawer.open(id); setValue(null) }}
      noOptionsText="Aucun prospect"
      renderInput={(params) => (
        <TextField {...params} placeholder="Rechercher un lead…"
          slotProps={{ ...params.slotProps, input: { ...params.slotProps.input, startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> } }} />
      )} />
  )
}

function Header() {
  const path = usePathname()
  return (
    <Stack direction="row" sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 2 }}>
      <Breadcrumbs separator={<KeyboardArrowRightRounded fontSize="small" />} sx={{ '& .MuiBreadcrumbs-separator': { color: 'text.disabled' } }}>
        <Typography variant="body2" color="text.secondary">AgenceFlow</Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{titleFor(path)}</Typography>
      </Breadcrumbs>
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <QuickSearch />
        <ModeToggle />
      </Stack>
    </Stack>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const path = usePathname()
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, width: WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: WIDTH, boxSizing: 'border-box' } }}>
        <NavContent />
      </Drawer>
      <Drawer variant="temporary" open={open} onClose={() => setOpen(false)} sx={{ display: { md: 'none' }, '& .MuiDrawer-paper': { width: WIDTH } }}>
        <NavContent onNavigate={() => setOpen(false)} />
      </Drawer>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar position="sticky" color="transparent" sx={{ display: { md: 'none' }, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Toolbar sx={{ gap: 1 }}>
            <IconButton edge="start" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><MenuRounded /></IconButton>
            <Typography variant="h6" sx={{ flex: 1 }} noWrap>{titleFor(path)}</Typography>
            <ModeToggle />
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 2.5, md: 3.5 }, maxWidth: 1480, mx: 'auto' }}>
          <Header />
          {children}
        </Box>
      </Box>
    </Box>
  )
}
