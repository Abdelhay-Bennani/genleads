'use client'
import {
  AddRounded, AutorenewRounded, BoltRounded, BuildCircleRounded, CheckCircleRounded, DeleteOutlineRounded, EditOutlined, LanguageRounded, TrendingUpRounded,
} from '@mui/icons-material'
import {
  Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, IconButton, MenuItem,
  Stack, Switch, Tab, Tabs, TextField, Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { type ReactNode, useState } from 'react'
import { QuoteWizard } from '@/components/quote/QuoteWizard'
import { useStore } from '@/lib/client/store'
import { PACK_CATEGORIES } from '@/lib/shared/data'
import type { Pack, PackCategory } from '@/lib/shared/types'
import { eur, uid } from '@/lib/shared/utils'

/** Identité visuelle de chaque catégorie de packs. */
const CAT: Record<PackCategory, { from: string; to: string; icon: ReactNode; tagline: string }> = {
  site: { from: '#8b5cf6', to: '#6366f1', icon: <LanguageRounded />, tagline: 'Création et refonte de sites qui convertissent' },
  seo: { from: '#06b6d4', to: '#10b981', icon: <TrendingUpRounded />, tagline: 'Être trouvé sur Google par les clients du coin' },
  maintenance: { from: '#f59e0b', to: '#f43f5e', icon: <BuildCircleRounded />, tagline: 'Un site à jour, sauvegardé et sécurisé' },
}
const grad = (c: { from: string; to: string }, deg = 135) => `linear-gradient(${deg}deg, ${c.from}, ${c.to})`
const gradText = (c: { from: string; to: string }) => ({ background: grad(c, 90), WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' })
const features = (d: string) => d.split(/[,;\n·]+/).map((x) => x.trim().replace(/\.$/, '')).filter(Boolean)
const HERO = { from: '#7c3aed', to: '#0891b2' }

export default function CataloguePage() {
  const store = useStore()
  const [tab, setTab] = useState<'simulateur' | 'catalogue'>('simulateur')
  const [edit, setEdit] = useState<Pack | null>(null)
  const [filter, setFilter] = useState<PackCategory | 'all'>('all')
  const active = store.packs.filter((k) => k.active)
  const save = (p: Pack) => { store.setPacks(store.packs.some((x) => x.id === p.id) ? store.packs.map((x) => (x.id === p.id ? p : x)) : [...store.packs, p]); setEdit(null) }
  const cats = PACK_CATEGORIES.filter((c) => filter === 'all' || c.id === filter)

  return (
    <>
      {/* ---------- Bandeau ---------- */}
      <Box sx={{
        position: 'relative', overflow: 'hidden', borderRadius: '24px', mb: 3, p: { xs: 3, md: 4 }, color: '#fff',
        background: `radial-gradient(circle at 85% 20%, ${alpha('#22d3ee', 0.55)}, transparent 45%), radial-gradient(circle at 10% 110%, ${alpha('#f472b6', 0.45)}, transparent 50%), ${grad(HERO)}`,
        boxShadow: `0 24px 60px -28px ${alpha('#7c3aed', 0.9)}`,
        '&::after': { content: '""', position: 'absolute', inset: 0, opacity: 0.18, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)', backgroundSize: '32px 32px',
          maskImage: 'linear-gradient(110deg, transparent 35%, #000 100%)' },
      }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ position: 'relative', zIndex: 1, justifyContent: 'space-between', alignItems: { md: 'center' } }}>
          <Box sx={{ maxWidth: 560 }}>
            <Chip size="small" icon={<BoltRounded sx={{ color: '#fff !important' }} />} label="Offres de l'agence" sx={{ bgcolor: 'rgba(255,255,255,.18)', color: '#fff', backdropFilter: 'blur(6px)', mb: 1.5 }} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: '#fff' }}>Catalogue des services</Typography>
            <Typography sx={{ mt: 1, color: 'rgba(255,255,255,.85)' }}>
              {tab === 'simulateur' ? 'Composez un devis étape par étape, puis appliquez-le à un lead.' : store.isSuper ? 'Vos offres et tarifs HT. Toute modification se répercute sur les devis.' : 'Vos offres et tarifs HT. Seul le Super Admin peut les modifier.'}
            </Typography>
            {tab === 'catalogue' && store.isSuper && (
              <Button variant="contained" startIcon={<AddRounded />} onClick={() => setEdit({ id: uid(), name: '', category: filter === 'all' ? 'site' : filter, price: 0, billing: 'oneshot', description: '', active: true })}
                sx={{ mt: 2.5, bgcolor: '#fff', color: '#5b21b6', backgroundImage: 'none', boxShadow: '0 10px 24px -10px rgba(0,0,0,.5)', '&:hover': { bgcolor: '#f3efff' } }}>
                Nouveau pack
              </Button>
            )}
          </Box>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5 }}>
            <HeroStat label="Packs actifs" value={String(active.length)} />
            <HeroStat label="À partir de" value={active.length ? eur(Math.min(...active.map((k) => k.price))) : '—'} />
            <HeroStat label="Offres mensuelles" value={String(active.filter((k) => k.billing === 'monthly').length)} />
          </Stack>
        </Stack>
      </Box>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="simulateur" label="Simulateur de devis" />
        <Tab value="catalogue" label="Catalogue des services" />
      </Tabs>
      {tab === 'simulateur' ? <QuoteWizard /> : (
        <>
      {/* ---------- Filtres ---------- */}
      <Stack direction="row" sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Chip label={`Tous (${store.packs.length})`} onClick={() => setFilter('all')}
          sx={filter === 'all' ? { background: grad(HERO), color: '#fff', fontWeight: 600 } : { fontWeight: 500 }} variant={filter === 'all' ? 'filled' : 'outlined'} />
        {PACK_CATEGORIES.map((c) => {
          const on = filter === c.id
          return (
            <Chip key={c.id} icon={<Box component="span" sx={{ display: 'flex', '& svg': { fontSize: 18, color: on ? '#fff' : CAT[c.id].from } }}>{CAT[c.id].icon}</Box>}
              label={`${c.label} (${store.packs.filter((k) => k.category === c.id).length})`} onClick={() => setFilter(on ? 'all' : c.id)} variant={on ? 'filled' : 'outlined'}
              sx={on ? { background: grad(CAT[c.id]), color: '#fff', fontWeight: 600 } : { fontWeight: 500, borderColor: alpha(CAT[c.id].from, 0.5) }} />
          )
        })}
      </Stack>

          <Stack spacing={4}>
            {cats.map((c) => {
              const packs = store.packs.filter((k) => k.category === c.id)
              const col = CAT[c.id]
              return (
                <Box key={c.id}>
                  {/* En-tête de catégorie */}
                  <Stack direction="row" spacing={1.5} sx={{ mb: 2, alignItems: 'center' }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: '14px', display: 'grid', placeItems: 'center', color: '#fff', background: grad(col), boxShadow: `0 10px 24px -10px ${col.from}`, '& svg': { fontSize: 24 } }}>{col.icon}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{c.label}</Typography>
                      <Typography variant="body2" color="text.secondary">{col.tagline}</Typography>
                    </Box>
                    <Box sx={{ display: { xs: 'none', sm: 'block' }, flex: '0 0 25%', height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${col.from}, transparent)` }} />
                  </Stack>
                  {packs.length === 0 ? (
                    <Box sx={{ p: 3, borderRadius: '14px', border: '1px dashed', borderColor: alpha(col.from, 0.4), bgcolor: alpha(col.from, 0.05), textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Aucun pack dans cette catégorie pour l'instant.</Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={2}>
                      {packs.map((k) => (
                        <Grid key={k.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                          <PackCard pack={k} canEdit={store.isSuper} onEdit={() => setEdit(k)} />
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              )
            })}
          </Stack>
        </>
      )}
      {edit && <PackEditor pack={edit} isNew={!store.packs.some((x) => x.id === edit.id)} onSave={save} onDelete={(id) => { store.setPacks(store.packs.filter((x) => x.id !== id)); setEdit(null) }} onClose={() => setEdit(null)} />}
    </>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 112, px: 2, py: 1.5, borderRadius: '14px', bgcolor: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.25)', backdropFilter: 'blur(8px)' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.8)' }}>{label}</Typography>
    </Box>
  )
}

function PackCard({ pack: k, canEdit, onEdit }: { pack: Pack; canEdit: boolean; onEdit: () => void }) {
  const col = CAT[k.category] ?? CAT.site
  const list = features(k.description)
  return (
    <Card sx={(t) => ({
      position: 'relative', height: '100%', p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      opacity: k.active ? 1 : 0.55, transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease',
      background: `linear-gradient(160deg, ${alpha(col.from, t.palette.mode === 'dark' ? 0.18 : 0.08)} 0%, transparent 55%), ${(t.vars ?? t).palette.background.paper}`,
      borderColor: alpha(col.from, 0.25),
      '&:hover': k.active ? { transform: 'translateY(-3px)', borderColor: col.from, boxShadow: `0 18px 40px -20px ${col.from}` } : undefined,
    })}>
      <Box sx={{ height: 4, background: grad(col, 90) }} />
      <Box sx={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(col.to, 0.25)}, transparent 70%)`, pointerEvents: 'none' }} />
      <Box sx={{ p: 2.25, display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ flexShrink: 0, width: 36, height: 36, borderRadius: '10px', display: 'grid', placeItems: 'center', color: col.from, bgcolor: alpha(col.from, 0.14), '& svg': { fontSize: 20 } }}>{col.icon}</Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>{k.name}</Typography>
            <Chip size="small" icon={k.billing === 'monthly' ? <AutorenewRounded /> : undefined} label={k.billing === 'monthly' ? 'Abonnement mensuel' : 'Paiement unique'}
              sx={{ mt: 0.5, height: 22, fontSize: 11, fontWeight: 600, color: col.from, bgcolor: alpha(col.from, 0.12), '& .MuiChip-icon': { color: col.from, fontSize: 14 } }} />
          </Box>
          {canEdit && <IconButton size="small" onClick={onEdit} aria-label="Modifier"><EditOutlined fontSize="small" /></IconButton>}
        </Stack>

        <Stack spacing={0.75} sx={{ mt: 2, flex: 1 }}>
          {list.map((f, i) => (
            <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
              <CheckCircleRounded sx={{ fontSize: 16, mt: '2px', color: col.from }} />
              <Typography variant="body2" color="text.secondary" sx={{ '&::first-letter': { textTransform: 'uppercase' } }}>{f}</Typography>
            </Stack>
          ))}
        </Stack>

        <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: alpha(col.from, 0.3), display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1 }}>
          <Box>
            <Typography sx={{ fontSize: 28, fontWeight: 800, lineHeight: 1, ...gradText(col) }}>{eur(k.price)}</Typography>
            <Typography variant="caption" color="text.secondary">{k.billing === 'monthly' ? 'HT / mois' : 'HT'}</Typography>
          </Box>
          {!k.active && <Chip size="small" label="Désactivé" variant="outlined" />}
        </Box>
      </Box>
    </Card>
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
