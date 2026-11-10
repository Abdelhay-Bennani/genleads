'use client'
import { LogoutRounded, ManageAccountsOutlined, MenuRounded, SearchRounded } from '@mui/icons-material'
import {
  AppBar, Autocomplete, Box, Button, ButtonBase, Divider, Drawer, IconButton, InputAdornment, List, ListItemButton, ListItemIcon, ListItemText,
  Menu, MenuItem, Stack, TextField, Toolbar, Typography,
} from '@mui/material'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode, useState } from 'react'
import { useAuth } from '@/lib/client/auth'
import { useStore } from '@/lib/client/store'
import { ROLE_LABEL } from '@/lib/shared/types'
import { followState } from '@/lib/shared/utils'
import { GlowBadge, UserAvatar } from '../ui'
import { AccountDialog } from './AccountDialog'
import { ModeToggle } from './AuthScreens'
import { useLeadDrawer } from './LeadDrawerContext'
import { Logo } from './Logo'
import { NAV, titleFor } from './nav'

const WIDTH = 268

function AccountMenu({ compact = false }: { compact?: boolean }) {
  const store = useStore()
  const auth = useAuth()
  const [menu, setMenu] = useState<HTMLElement | null>(null)
  const [account, setAccount] = useState(false)
  return (
    <>
      <ButtonBase onClick={(e) => setMenu(e.currentTarget)} aria-label="Menu du compte" sx={{ borderRadius: 3, gap: 1.25, textAlign: 'left' }}>
        <UserAvatar name={store.me.name} size={compact ? 34 : 44} />
        {!compact && (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{store.me.name}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap component="p">{ROLE_LABEL[store.me.role]} · @{store.me.username}</Typography>
          </Box>
        )}
      </ButtonBase>
      <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => { setMenu(null); setAccount(true) }}><ListItemIcon><ManageAccountsOutlined fontSize="small" /></ListItemIcon>Mon compte</MenuItem>
        <Divider />
        <MenuItem onClick={() => { setMenu(null); auth.logout() }}><ListItemIcon><LogoutRounded fontSize="small" /></ListItemIcon>Se déconnecter</MenuItem>
      </Menu>
      {account && <AccountDialog onClose={() => setAccount(false)} />}
    </>
  )
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname()
  const store = useStore()
  const due = store.prospects.filter((p) => ['overdue', 'today'].includes(followState(p))).length

  return (
    <Stack sx={{ height: '100%' }}>
      <Box sx={{ px: 3, py: 3 }}><Logo /></Box>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5 }}>
        {NAV.map((section, si) => (
          <Box key={si} sx={{ pb: 2 }}>
            {section.title && <Typography variant="overline" color="text.secondary" sx={{ px: 1.5, display: 'block', mb: 0.25, fontSize: '0.68rem' }}>{section.title}</Typography>}
            <List dense disablePadding>
              {section.items.map((item) => {
                const active = path === item.href || path.startsWith(item.href + '/')
                return (
                  <ListItemButton key={item.href} component={Link} href={item.href} onClick={onNavigate} selected={active}
                    sx={{
                      mb: 0.25, py: 0.85, borderRadius: 2, position: 'relative',
                      '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'transparent' },
                      '&.Mui-selected::before': { content: '""', position: 'absolute', left: -12, top: 4, bottom: 4, width: 6, borderRadius: '0 6px 6px 0', bgcolor: 'primary.main' },
                    }}>
                    <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'text.secondary' }}><item.icon fontSize="small" /></ListItemIcon>
                    <ListItemText primary={item.label} slotProps={{ primary: { noWrap: true, sx: { fontSize: '0.92rem', fontWeight: active ? 600 : 500, color: active ? 'text.primary' : 'text.secondary' } } }} />
                    {item.badge === 'new' && <GlowBadge label="Nouveau" tone="green" />}
                    {item.badge === 'soon' && <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>Bientôt</Typography>}
                    {item.href === '/prospects' && due > 0 && <Box sx={{ px: 0.85, borderRadius: 1.5, fontSize: '0.68rem', fontWeight: 700, lineHeight: '20px', bgcolor: 'primary.main', color: '#fff' }}>{due}</Box>}
                  </ListItemButton>
                )
              })}
            </List>
          </Box>
        ))}
      </Box>
      <Box sx={{ m: 1.5, p: 2, borderRadius: 4, bgcolor: 'primary.main', color: '#fff' }}>
        <Typography sx={{ fontWeight: 600, lineHeight: 1.25 }}>{due ? `${due} appel${due > 1 ? 's' : ''} à faire` : 'Trouvez vos prochains clients'}</Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, mb: 1.5, color: 'rgba(255,255,255,.85)' }}>Vos entreprises sans site web</Typography>
        <Button fullWidth component={Link} href="/prospects" onClick={onNavigate} sx={{ bgcolor: '#fff', color: 'primary.main', '&:hover': { bgcolor: '#fff' } }}>Voir les prospects</Button>
      </Box>
    </Stack>
  )
}

function QuickSearch() {
  const store = useStore()
  const drawer = useLeadDrawer()
  const [value, setValue] = useState<string | null>(null)
  return (
    <Autocomplete size="small" sx={{ width: 380, maxWidth: '45%', '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'background.default' }, '& fieldset': { border: 'none' } }} value={value} blurOnSelect clearOnBlur
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
  return (
    <Stack direction="row" sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, px: 2.5, py: 1.5, borderRadius: '24px', bgcolor: 'background.paper' }}>
      <QuickSearch />
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
        <ModeToggle />
        <AccountMenu />
      </Stack>
    </Stack>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const path = usePathname()
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', gap: { md: 2 }, p: { md: 2 } }}>
      <Box component="aside" sx={{ display: { xs: 'none', md: 'block' }, width: WIDTH, flexShrink: 0, position: 'sticky', top: 16, alignSelf: 'flex-start', height: 'calc(100vh - 32px)', borderRadius: '24px', bgcolor: 'background.paper', overflow: 'hidden' }}>
        <NavContent />
      </Box>
      <Drawer variant="temporary" open={open} onClose={() => setOpen(false)} sx={{ display: { md: 'none' }, '& .MuiDrawer-paper': { width: WIDTH } }}>
        <NavContent onNavigate={() => setOpen(false)} />
      </Drawer>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <AppBar position="sticky" color="transparent" sx={{ display: { md: 'none' }, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Toolbar sx={{ gap: 1 }}>
            <IconButton edge="start" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><MenuRounded /></IconButton>
            <Typography variant="h6" sx={{ flex: 1 }} noWrap>{titleFor(path)}</Typography>
            <ModeToggle />
            <AccountMenu compact />
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ px: { xs: 2, md: 0 }, py: { xs: 2.5, md: 0 }, maxWidth: 1480, mx: 'auto' }}>
          <Header />
          <Box sx={{ pt: { md: 1.5 }, px: { md: 1.5 }, pb: { md: 2 } }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  )
}
