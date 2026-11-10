'use client'
import { Box, Button, Card, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material'
import { useState } from 'react'
import { useStore } from '@/lib/client/store'
import { MODULE_IDS, MODULES, type ModuleId } from '@/lib/shared/modules'
import type { PublicUser } from '@/lib/shared/types'
import { UserAvatar } from '../ui'

/** Matrice Admin × module. Chaque changement est enregistré immédiatement et vérifié par le serveur. */
export function PermissionsPanel() {
  const store = useStore()
  const admins = store.users.filter((u) => u.role === 'admin')
  const [busy, setBusy] = useState<string | null>(null)
  const save = async (u: PublicUser, disabledModules: ModuleId[]) => {
    setBusy(u.id)
    try { await store.updateUser(u.id, { disabledModules }); store.notify(`Modules de ${u.name} mis à jour`) } catch (e) { store.notify((e as Error).message, false) } finally { setBusy(null) }
  }
  if (!admins.length) return <Card sx={{ p: 3 }}><Typography color="text.secondary">Aucun compte Admin. Créez-en un dans l'onglet « Utilisateurs » pour régler ses modules.</Typography></Card>
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">Activez ou désactivez chaque module par Admin. Un module désactivé disparaît du menu, sa page et ses données ne sont plus accessibles. Le Super Admin garde tous les modules.</Typography>
      <Card>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 170, position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper' }}>Admin</TableCell>
                {MODULES.map((m) => <TableCell key={m.id} align="center" sx={{ bgcolor: 'background.paper', px: 0.5, fontSize: 12, lineHeight: 1.2 }}><Tooltip title={m.description}><span>{m.label}</span></Tooltip></TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {admins.map((u) => (
                <TableRow key={u.id} hover sx={{ opacity: u.active ? 1 : 0.55 }}>
                  <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><UserAvatar name={u.name} /><Box><Typography variant="body2" sx={{ fontWeight: 600 }}>{u.name}</Typography><Typography variant="caption" color="text.secondary">@{u.username}</Typography></Box></Stack>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                      <Button size="small" sx={{ fontSize: 11, px: 0.5, minWidth: 0 }} disabled={busy === u.id || !u.disabledModules.length} onClick={() => save(u, [])}>Tout activer</Button>
                      <Button size="small" sx={{ fontSize: 11, px: 0.5, minWidth: 0 }} color="inherit" disabled={busy === u.id || u.disabledModules.length === MODULE_IDS.length} onClick={() => save(u, MODULE_IDS)}>Tout retirer</Button>
                    </Stack>
                  </TableCell>
                  {MODULES.map((m) => {
                    const on = !u.disabledModules.includes(m.id)
                    return <TableCell key={m.id} align="center" sx={{ px: 0.5 }}><Switch size="small" checked={on} disabled={busy === u.id} slotProps={{ input: { 'aria-label': `${m.label} pour ${u.name}` } }} onChange={() => save(u, on ? [...u.disabledModules, m.id] : u.disabledModules.filter((x) => x !== m.id))} /></TableCell>
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  )
}
