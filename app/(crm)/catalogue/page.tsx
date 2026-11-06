'use client'
import { AddRounded, CheckRounded, DeleteOutlineRounded, EditOutlined } from '@mui/icons-material'
import {
  Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, Grid, IconButton, MenuItem,
  Stack, Switch, TextField, Typography,
} from '@mui/material'
import { useState } from 'react'
import { useLeadDrawer } from '@/components/shell/LeadDrawerContext'
import { PageHeader, SectionLabel } from '@/components/ui'
import { useStore } from '@/lib/client/store'
import { PACK_CATEGORIES } from '@/lib/shared/data'
import type { Pack } from '@/lib/shared/types'
import { eur, isClosed, uid } from '@/lib/shared/utils'

export default function CataloguePage() {
  const store = useStore()
  const drawer = useLeadDrawer()
  const [edit, setEdit] = useState<Pack | null>(null)
  const [sel, setSel] = useState<string[]>([])
  const [target, setTarget] = useState('')
  const chosen = store.packs.filter((k) => sel.includes(k.id))
  const oneShot = chosen.filter((k) => k.billing === 'oneshot').reduce((t, k) => t + k.price, 0)
  const mrr = chosen.filter((k) => k.billing === 'monthly').reduce((t, k) => t + k.price, 0)
  const save = (p: Pack) => { store.setPacks(store.packs.some((x) => x.id === p.id) ? store.packs.map((x) => (x.id === p.id ? p : x)) : [...store.packs, p]); setEdit(null) }

  return (
    <>
      <PageHeader title="Catalogue des services" subtitle={store.isSuper ? 'Vos offres et tarifs HT. Toute modification se répercute sur les devis.' : 'Vos offres et tarifs HT. Seul le Super Admin peut les modifier.'}
        actions={store.isSuper && <Button variant="contained" startIcon={<AddRounded />} onClick={() => setEdit({ id: uid(), name: '', category: 'site', price: 0, billing: 'oneshot', description: '', active: true })}>Nouveau pack</Button>} />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            {PACK_CATEGORIES.map((c) => (
              <Box key={c.id}>
                <SectionLabel>{c.label}</SectionLabel>
                <Grid container spacing={2}>
                  {store.packs.filter((k) => k.category === c.id).map((k) => {
                    const on = sel.includes(k.id)
                    return (
                      <Grid key={k.id} size={{ xs: 12, sm: 6 }}>
                        <Card sx={{ height: '100%', opacity: k.active ? 1 : 0.55, borderColor: on ? 'primary.main' : undefined, boxShadow: on ? '0 0 0 1px #8b5cf6, 0 0 28px -8px rgba(139,92,246,0.8)' : undefined }}>
                          <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                              <Typography sx={{ fontWeight: 600 }}>{k.name}</Typography>
                              {store.isSuper && <IconButton size="small" onClick={() => setEdit(k)} aria-label="Modifier"><EditOutlined fontSize="small" /></IconButton>}
                            </Stack>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, flex: 1 }}>{k.description}</Typography>
                            <Stack direction="row" sx={{ mt: 2, alignItems: 'flex-end', justifyContent: 'space-between' }}>
                              <Typography variant="h5">{eur(k.price)}<Typography component="span" variant="caption" color="text.secondary">{k.billing === 'monthly' ? ' HT / mois' : ' HT'}</Typography></Typography>
                              {k.active ? <Button size="small" variant={on ? 'contained' : 'outlined'} startIcon={on ? <CheckRounded /> : <AddRounded />} onClick={() => setSel(on ? sel.filter((x) => x !== k.id) : [...sel, k.id])}>{on ? 'Ajouté' : 'Simuler'}</Button>
                                : <Typography variant="caption" color="text.disabled">Désactivé</Typography>}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    )
                  })}
                </Grid>
              </Box>
            ))}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ position: { lg: 'sticky' }, top: 24 }}>
            <CardContent>
              <Typography variant="h6">Simulateur de devis</Typography>
              <Typography variant="caption" color="text.secondary">Ajoutez des packs pour chiffrer instantanément.</Typography>
              <Box sx={{ my: 2 }}>
                {chosen.length === 0 ? <Alert severity="info" variant="outlined">Aucun pack sélectionné</Alert> : (
                  <Stack spacing={0.75}>{chosen.map((k) => <Stack key={k.id} direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}><Typography variant="body2" noWrap>{k.name}</Typography><Typography variant="body2">{eur(k.price)}{k.billing === 'monthly' && '/m'}</Typography></Stack>)}</Stack>
                )}
              </Box>
              <Divider />
              <Stack spacing={0.75} sx={{ my: 2 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}><Typography variant="body2" color="text.secondary">Total one-shot</Typography><Typography sx={{ fontWeight: 700 }}>{eur(oneShot)} HT</Typography></Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}><Typography variant="body2" color="text.secondary">MRR récurrent</Typography><Typography sx={{ fontWeight: 700 }} color="success.main">{eur(mrr)} / mois</Typography></Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}><Typography variant="caption" color="text.secondary">Valeur 1ʳᵉ année</Typography><Typography variant="caption">{eur(oneShot + mrr * 12)} HT</Typography></Stack>
              </Stack>
              <TextField select label="Appliquer à un lead" value={target} onChange={(e) => setTarget(e.target.value)}>
                {store.prospects.filter((p) => !isClosed(p)).map((p) => <MenuItem key={p.id} value={p.id}>{p.company}</MenuItem>)}
              </TextField>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Button fullWidth variant="contained" disabled={!target || !sel.length} onClick={() => { const p = store.prospects.find((x) => x.id === target); if (p) { store.updateProspect(p.id, { packIds: [...new Set([...p.packIds, ...sel])] }); drawer.open(p.id, 'devis') } }}>Appliquer & ouvrir</Button>
                {sel.length > 0 && <Button onClick={() => setSel([])}>Vider</Button>}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {edit && <PackEditor pack={edit} isNew={!store.packs.some((x) => x.id === edit.id)} onSave={save} onDelete={(id) => { store.setPacks(store.packs.filter((x) => x.id !== id)); setSel(sel.filter((x) => x !== id)); setEdit(null) }} onClose={() => setEdit(null)} />}
    </>
  )
}

function PackEditor({ pack, isNew, onSave, onDelete, onClose }: { pack: Pack; isNew: boolean; onSave: (p: Pack) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [p, setP] = useState(pack)
  const [confirm, setConfirm] = useState(false)
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isNew ? 'Nouveau pack' : 'Modifier le pack'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Nom du pack" autoFocus value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}><TextField select label="Catégorie" value={p.category} onChange={(e) => setP({ ...p, category: e.target.value as Pack['category'] })}>{PACK_CATEGORIES.map((c) => <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 6, sm: 4 }}><TextField label="Prix HT (€)" type="number" value={p.price} onChange={(e) => setP({ ...p, price: Number(e.target.value) || 0 })} /></Grid>
            <Grid size={{ xs: 6, sm: 4 }}><TextField select label="Facturation" value={p.billing} onChange={(e) => setP({ ...p, billing: e.target.value as Pack['billing'] })}><MenuItem value="oneshot">Unique</MenuItem><MenuItem value="monthly">Mensuelle</MenuItem></TextField></Grid>
          </Grid>
          <TextField label="Contenu du pack" multiline minRows={3} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} />
          <FormControlLabel control={<Switch checked={p.active} onChange={(e) => setP({ ...p, active: e.target.checked })} />} label="Pack actif (proposé dans les devis)" />
        </Stack>
      </DialogContent>
      <DialogActions>
        {!isNew && (confirm ? <Button color="error" variant="outlined" sx={{ mr: 'auto' }} onClick={() => onDelete(p.id)}>Confirmer la suppression</Button>
          : <Button color="error" startIcon={<DeleteOutlineRounded />} sx={{ mr: 'auto' }} onClick={() => setConfirm(true)}>Supprimer</Button>)}
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" disabled={!p.name.trim()} onClick={() => onSave(p)}>Enregistrer</Button>
      </DialogActions>
    </Dialog>
  )
}
