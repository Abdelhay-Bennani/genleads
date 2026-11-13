'use client'
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useAuth } from '@/lib/client/auth'
import { ROLE_LABEL } from '@/lib/shared/types'
import { UserAvatar } from '../ui'
import { PasswordField } from './AuthScreens'

export function AccountDialog({ onClose }: { onClose: () => void }) {
  const auth = useAuth()
  const u = auth.user!
  const [f, setF] = useState({ current: '', next: '', confirm: '' })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const submit = async () => {
    if (f.next !== f.confirm) { setMsg({ ok: false, text: 'Les deux nouveaux mots de passe ne correspondent pas.' }); return }
    try { await auth.changePassword(f.current, f.next); setMsg({ ok: true, text: 'Mot de passe modifié.' }); setF({ current: '', next: '', confirm: '' }) }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }) }
  }
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { maxWidth: 560 } } }}>
      <DialogTitle>Mon compte</DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 3 }}>
          <UserAvatar name={u.name} size={52} />
          <Box>
            <Typography variant="h6">{u.name}</Typography>
            <Typography variant="body2" color="text.secondary">@{u.username} · {ROLE_LABEL[u.role]}</Typography>
          </Box>
        </Stack>
        <Stack spacing={2}>
          <PasswordField label="Mot de passe actuel" value={f.current} onChange={(v) => setF({ ...f, current: v })} autoComplete="current-password" />
          <PasswordField label="Nouveau mot de passe (8 caractères min.)" value={f.next} onChange={(v) => setF({ ...f, next: v })} autoComplete="new-password" />
          <PasswordField label="Confirmer le nouveau mot de passe" value={f.confirm} onChange={(v) => setF({ ...f, confirm: v })} autoComplete="new-password" />
          {msg && <Alert severity={msg.ok ? 'success' : 'error'}>{msg.text}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, flexWrap: 'wrap', gap: 1, '& .MuiButton-root': { whiteSpace: 'nowrap' }, '& > :not(style) ~ :not(style)': { ml: 0 } }}>
        <Button color="inherit" onClick={auth.logout} sx={{ mr: 'auto' }}>Se déconnecter</Button>
        <Button onClick={onClose}>Fermer</Button>
        <Button variant="contained" disabled={!f.current || !f.next || !f.confirm} onClick={submit}>Changer le mot de passe</Button>
      </DialogActions>
    </Dialog>
  )
}
