'use client'
import {
  BackupOutlined, DeleteOutlineRounded, DownloadRounded, RestoreRounded, ScheduleRounded, UploadFileRounded,
} from '@mui/icons-material'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/client/api'
import { useStore } from '@/lib/client/store'
import { fmtDateTime } from '@/lib/shared/utils'

type Kind = 'auto' | 'manuel' | 'import' | 'securite'
interface Backup { id: string; createdAt: string; kind: Kind; label: string; createdBy: string | null; size: number; counts: Record<string, number> }

const KIND: Record<Kind, { label: string; color: 'primary' | 'default' | 'warning' | 'info' }> = {
  auto: { label: 'Automatique', color: 'primary' },
  manuel: { label: 'Manuelle', color: 'info' },
  import: { label: 'Importée', color: 'warning' },
  securite: { label: 'Avant restauration', color: 'default' },
}
const size = (n: number) => (n < 1024 ? `${n} o` : n < 1048576 ? `${(n / 1024).toFixed(0)} Ko` : `${(n / 1048576).toFixed(1)} Mo`)
const summary = (c: Record<string, number>) =>
  [['leads', 'leads'], ['quotes', 'devis'], ['invoices', 'factures'], ['payments', 'paiements'], ['users', 'utilisateurs']]
    .filter(([k]) => c[k] !== undefined).map(([k, l]) => `${c[k]} ${l}`).join(' · ')

/** Sauvegardes de la base (Super Admin) : automatiques chaque jour, manuelles, import, restauration. */
export function BackupsPanel() {
  const store = useStore()
  const [list, setList] = useState<Backup[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [restore, setRestore] = useState<Backup | null>(null)
  const [del, setDel] = useState<Backup | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try { setList(await api<Backup[]>('GET', '/api/backups')) } catch (e) { setErr((e as Error).message) }
  }, [])
  useEffect(() => { load() }, [load])

  const act = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setErr(null)
    try { await fn(); await load() } catch (e) { setErr((e as Error).message) } finally { setBusy(null) }
  }
  const lastAuto = list?.find((b) => b.kind === 'auto')
  const next = lastAuto ? new Date(new Date(lastAuto.createdAt).getTime() + 24 * 3600e3) : null

  const importFile = (f?: File) => f && act('import', async () => {
    let raw: unknown
    try { raw = JSON.parse(await f.text()) } catch { throw new Error('Fichier illisible : choisissez un fichier .json téléchargé depuis cette page.') }
    await api('POST', '/api/backups/import', raw)
    store.notify('Fichier importé : vous pouvez maintenant le restaurer.')
  })

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><ScheduleRounded color="primary" fontSize="small" /><Typography variant="h6">Sauvegarde automatique quotidienne</Typography></Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Une copie complète de la base (utilisateurs, leads et journal, catalogue, maquettes et présentations, devis, factures, paiements, paramètres) est faite chaque jour. Les 14 dernières sont conservées. Les images et sites importés ne sont pas inclus.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                <Chip size="small" color={lastAuto ? 'success' : 'default'} variant="outlined" label={lastAuto ? `Dernière : ${fmtDateTime(lastAuto.createdAt)}` : 'Aucune sauvegarde automatique pour l’instant'} />
                {next && <Chip size="small" variant="outlined" label={`Prochaine : vers le ${fmtDateTime(next.toISOString())}`} />}
              </Stack>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={busy === 'import' ? <CircularProgress size={16} /> : <UploadFileRounded />} disabled={!!busy} onClick={() => fileRef.current?.click()}>Importer un fichier</Button>
              <Button variant="contained" startIcon={busy === 'new' ? <CircularProgress size={16} color="inherit" /> : <BackupOutlined />} disabled={!!busy}
                onClick={() => act('new', async () => { await api('POST', '/api/backups'); store.notify('Sauvegarde créée') })}>Sauvegarder maintenant</Button>
            </Stack>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = '' }} />
          </Stack>
        </CardContent>
      </Card>

      {err && <Alert severity="error" onClose={() => setErr(null)}>{err}</Alert>}

      <Card>
        <Box sx={{ p: 2 }}><Typography variant="h6">Sauvegardes disponibles</Typography></Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Contenu</TableCell>
                <TableCell>Taille</TableCell>
                <TableCell>Par</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list === null && <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={22} /></TableCell></TableRow>}
              {list?.length === 0 && <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>Aucune sauvegarde. La première sauvegarde automatique sera faite sous peu.</TableCell></TableRow>}
              {list?.map((b) => (
                <TableRow key={b.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmtDateTime(b.createdAt)}</Typography>
                    {b.kind === 'import' && <Typography variant="caption" color="text.secondary">{b.label}</Typography>}
                  </TableCell>
                  <TableCell><Chip size="small" variant="outlined" color={KIND[b.kind]?.color ?? 'default'} label={KIND[b.kind]?.label ?? b.kind} /></TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{summary(b.counts)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>{size(b.size)}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{b.createdBy ?? 'Système'}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Télécharger (.json)"><IconButton size="small" component="a" href={`/api/backups/${b.id}`} download><DownloadRounded fontSize="small" /></IconButton></Tooltip>
                    <Button size="small" variant="outlined" color="warning" startIcon={<RestoreRounded />} disabled={!!busy} onClick={() => setRestore(b)} sx={{ mx: 1 }}>Restaurer</Button>
                    <Tooltip title="Supprimer"><span><IconButton size="small" color="error" disabled={!!busy} onClick={() => setDel(b)}><DeleteOutlineRounded fontSize="small" /></IconButton></span></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {restore && <RestoreDialog backup={restore} busy={busy === 'restore'} onClose={() => setRestore(null)}
        onConfirm={() => act('restore', async () => {
          await api('POST', `/api/backups/${restore.id}/restore`)
          setRestore(null)
          await store.refresh(true)
          store.notify('Base restaurée. L’état précédent a été sauvegardé (« Avant restauration »).')
        })} />}

      {del && (
        <Dialog open onClose={() => setDel(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Supprimer cette sauvegarde ?</DialogTitle>
          <DialogContent><Typography variant="body2">Sauvegarde du {fmtDateTime(del.createdAt)} ({KIND[del.kind]?.label}). Cette action est définitive.</Typography></DialogContent>
          <DialogActions>
            <Button onClick={() => setDel(null)}>Annuler</Button>
            <Button color="error" variant="contained" onClick={() => { const b = del; setDel(null); act('del', async () => { await api('DELETE', `/api/backups/${b.id}`); store.notify('Sauvegarde supprimée') }) }}>Supprimer</Button>
          </DialogActions>
        </Dialog>
      )}
    </Stack>
  )
}

function RestoreDialog({ backup, busy, onClose, onConfirm }: { backup: Backup; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  const [typed, setTyped] = useState('')
  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Restaurer la sauvegarde du {fmtDateTime(backup.createdAt)} ?</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Alert severity="warning">
            Toutes les données (leads, devis, factures, paiements, maquettes, utilisateurs, paramètres…) reviennent à leur état à cette date.
            Ce qui a été créé ou modifié depuis sera perdu. Votre propre compte n’est pas modifié.
          </Alert>
          <Typography variant="body2" color="text.secondary">Contenu : {summary(backup.counts)}. L’état actuel est d’abord sauvegardé automatiquement, vous pourrez donc annuler en le restaurant.</Typography>
          <TextField size="small" label="Tapez RESTAURER pour confirmer" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Annuler</Button>
        <Button color="warning" variant="contained" disabled={busy || typed.trim().toUpperCase() !== 'RESTAURER'} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <RestoreRounded />} onClick={onConfirm}>Restaurer</Button>
      </DialogActions>
    </Dialog>
  )
}
