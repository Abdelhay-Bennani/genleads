'use client'
import { AddRounded, DeleteOutlineRounded, EditOutlined } from '@mui/icons-material'
import {
  Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, IconButton, MenuItem,
  Stack, Switch, Tab, Tabs, TextField, Typography,
} from '@mui/material'
import { useState } from 'react'
import { QuoteWizard } from '@/components/quote/QuoteWizard'
import { PageHeader, SectionLabel } from '@/components/ui'
import { useStore } from '@/lib/client/store'
import { PACK_CATEGORIES } from '@/lib/shared/data'
import type { Pack } from '@/lib/shared/types'
import { eur, uid } from '@/lib/shared/utils'

export default function CataloguePage() {
  const store = useStore()
  const [tab, setTab] = useState<'simulateur' | 'catalogue'>('simulateur')
  const [edit, setEdit] = useState<Pack | null>(null)
  const save = (p: Pack) => { store.setPacks(store.packs.some((x) => x.id === p.id) ? store.packs.map((x) => (x.id === p.id ? p : x)) : [...store.packs, p]); setEdit(null) }

  return (
    <>
      <PageHeader title="Catalogue des services"
        subtitle={tab === 'simulateur' ? 'Composez un devis étape par étape, puis appliquez-le à un lead.' : store.isSuper ? 'Vos offres et tarifs HT. Toute modification se répercute sur les devis.' : 'Vos offres et tarifs HT. Seul le Super Admin peut les modifier.'}
        actions={tab === 'catalogue' && store.isSuper && <Button variant="contained" startIcon={<AddRounded />} onClick={() => setEdit({ id: uid(), name: '', category: 'site', price: 0, billing: 'oneshot', description: '', active: true })}>Nouveau pack</Button>} />
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="simulateur" label="Simulateur de devis" />
        <Tab value="catalogue" label="Catalogue des services" />
      </Tabs>
      {tab === 'simulateur' ? <QuoteWizard /> : (
        <Stack spacing={3}>
          {PACK_CATEGORIES.map((c) => (
            <Box key={c.id}>
              <SectionLabel>{c.label}</SectionLabel>
              <Grid container spacing={2}>
                {store.packs.filter((k) => k.category === c.id).map((k) => (
                  <Grid key={k.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                    <Card sx={{ height: '100%', opacity: k.active ? 1 : 0.55 }}>
                      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                          <Typography sx={{ fontWeight: 600 }}>{k.name}</Typography>
                          {store.isSuper && <IconButton size="small" onClick={() => setEdit(k)} aria-label="Modifier"><EditOutlined fontSize="small" /></IconButton>}
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, flex: 1 }}>{k.description}</Typography>
                        <Stack direction="row" sx={{ mt: 2, alignItems: 'flex-end', justifyContent: 'space-between' }}>
                          <Typography variant="h5">{eur(k.price)}<Typography component="span" variant="caption" color="text.secondary">{k.billing === 'monthly' ? ' HT / mois' : ' HT'}</Typography></Typography>
                          {!k.active && <Typography variant="caption" color="text.disabled">Désactivé</Typography>}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Stack>
      )}
      {edit && <PackEditor pack={edit} isNew={!store.packs.some((x) => x.id === edit.id)} onSave={save} onDelete={(id) => { store.setPacks(store.packs.filter((x) => x.id !== id)); setEdit(null) }} onClose={() => setEdit(null)} />}
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
