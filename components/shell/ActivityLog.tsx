'use client'
import { RefreshRounded, SearchRounded } from '@mui/icons-material'
import {
  Box, Button, Card, Chip, CircularProgress, InputAdornment, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { UserAvatar } from '@/components/ui'
import { api } from '@/lib/client/api'
import { useStore } from '@/lib/client/store'
import { ROLE_LABEL, type Role } from '@/lib/shared/types'
import { fmtDateTime } from '@/lib/shared/utils'

interface Entry {
  id: number; at: string; userId: string | null; userName: string; role: Role | ''
  action: string; target: string; details: string; ip: string; count: number
}

const tone = (a: string): 'default' | 'success' | 'error' | 'info' | 'warning' =>
  /supprim|réinitialis|déconnexion/i.test(a) ? 'error' : /restaur|import/i.test(a) ? 'warning' : /créé|enregistré|ajout|génération/i.test(a) ? 'success' : /connexion/i.test(a) ? 'info' : 'default'

/** Journal d'activité de l'équipe (Super Admin). */
export function ActivityLog() {
  const store = useStore()
  const notify = store.notify
  const [items, setItems] = useState<Entry[]>([])
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [user, setUser] = useState('')
  const [role, setRole] = useState<'' | Role>('admin')
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => { const t = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(t) }, [q])

  const load = useCallback(async (before?: number) => {
    setBusy(true)
    try {
      const p = new URLSearchParams({ limit: '100' })
      if (user) p.set('user', user)
      if (role && !user) p.set('role', role)
      if (debounced) p.set('q', debounced)
      if (before) p.set('before', String(before))
      const r = await api<{ items: Entry[]; more: boolean }>('GET', `/api/activity?${p}`)
      setItems((cur) => (before ? [...cur, ...r.items] : r.items))
      setMore(r.more)
    } catch (e) { notify((e as Error).message, false) } finally { setBusy(false) }
  }, [user, role, debounced, notify])

  useEffect(() => { load() }, [load])

  return (
    <Card>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ p: 2, alignItems: { md: 'center' } }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">Journal d'activité</Typography>
          <Typography variant="body2" color="text.secondary">Toutes les actions faites dans le CRM : connexions, leads, devis, factures, paiements, maquettes, paramètres… Conservé 12 mois.</Typography>
        </Box>
        <TextField select size="small" label="Rôle" value={user ? '' : role} disabled={!!user} onChange={(e) => setRole(e.target.value as '' | Role)} sx={{ minWidth: 150 }}>
          <MenuItem value="">Tous</MenuItem>
          <MenuItem value="admin">Admins</MenuItem>
          <MenuItem value="super_admin">Super Admins</MenuItem>
        </TextField>
        <TextField select size="small" label="Utilisateur" value={user} onChange={(e) => setUser(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">Tous les utilisateurs</MenuItem>
          {store.users.map((u) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
        </TextField>
        <TextField size="small" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> } }} />
        <Tooltip title="Actualiser"><span><Button variant="outlined" onClick={() => load()} disabled={busy} sx={{ minWidth: 0, px: 1.25 }}><RefreshRounded /></Button></span></Tooltip>
      </Stack>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>Date</TableCell>
              <TableCell>Utilisateur</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Élément</TableCell>
              <TableCell>Détails</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((e) => (
              <TableRow key={e.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>{fmtDateTime(e.at)}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <UserAvatar name={e.userName} size={24} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>{e.userName}</Typography>
                      {e.role && <Typography variant="caption" color="text.secondary">{ROLE_LABEL[e.role]}</Typography>}
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Chip size="small" variant="outlined" color={tone(e.action)} label={e.action} />
                    {e.count > 1 && <Tooltip title={`${e.count} enregistrements regroupés`}><Typography variant="caption" color="text.secondary">×{e.count}</Typography></Tooltip>}
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{e.target || '—'}</TableCell>
                <TableCell sx={{ color: 'text.secondary', maxWidth: 420 }}><Tooltip title={e.ip ? `IP : ${e.ip}` : ''}><span>{e.details || '—'}</span></Tooltip></TableCell>
              </TableRow>
            ))}
            {!busy && !items.length && (
              <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>Aucune activité pour ces filtres.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Stack sx={{ p: 2, alignItems: 'center' }}>
        {busy ? <CircularProgress size={22} /> : more && <Button onClick={() => load(items[items.length - 1]?.id)}>Afficher plus</Button>}
      </Stack>
    </Card>
  )
}
