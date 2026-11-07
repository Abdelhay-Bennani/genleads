'use client'
import {
  AddPhotoAlternateOutlined, AddRounded, ArchiveOutlined, ArrowBackRounded, ArrowForwardRounded, CategoryOutlined, CheckRounded, CloseRounded,
  DeleteOutlineRounded, DescriptionOutlined, EditOutlined, GridViewRounded, OpenInNewRounded, SearchRounded, ShareOutlined, SlideshowRounded,
  StarBorderRounded, StarRounded, ViewListRounded,
} from '@mui/icons-material'
import {
  Alert, Box, Button, Card, CardActionArea, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid,
  IconButton, InputAdornment, List, ListItem, ListItemText, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material'
import { useMemo, useRef, useState } from 'react'
import { useLeadDrawer } from '@/components/shell/LeadDrawerContext'
import { usePresenter } from '@/components/templates/PresenterContext'
import { EmptyState, PageHeader, SectionLabel } from '@/components/ui'
import { imgUrl, uploadScreenshot } from '@/lib/client/images'
import { useStore } from '@/lib/client/store'
import { safeHref, suggestPacks, useApplyTemplateToQuote } from '@/lib/client/templates'
import type { ImageKind, TemplateImage, WebsiteTemplate } from '@/lib/shared/types'
import { fmtDate, fmtDateTime, normalize, uid } from '@/lib/shared/utils'

type Sort = 'recent' | 'old' | 'name'
const VIEW_KEY = 'agenceflow:maquettes-view'

export default function MaquettesPage() {
  const store = useStore()
  const presenter = usePresenter()
  const drawer = useLeadDrawer()
  const [layout, setLayout] = useState<'grid' | 'list'>(() => { try { return (localStorage.getItem(VIEW_KEY) as 'grid' | 'list') || 'grid' } catch { return 'grid' } })
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState<'active' | 'archived' | 'all'>('active')
  const [sort, setSort] = useState<Sort>('recent')
  const [editing, setEditing] = useState<WebsiteTemplate | null>(null)
  const [cats, setCats] = useState(false)
  const [quoteFor, setQuoteFor] = useState<WebsiteTemplate | null>(null)

  const list = useMemo(() => {
    const nq = normalize(q)
    const l = store.templates.filter((t) => (status === 'all' || t.status === status) && (!cat || t.categoryId === cat) && (!type || t.siteType === type)
      && (!nq || normalize([t.name, t.tags.join(' '), t.shortDescription, t.technologies.join(' ')].join(' ')).includes(nq)))
    return [...l].sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'fr') : sort === 'old' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt))
  }, [store.templates, q, cat, type, status, sort])

  const blank = (): WebsiteTemplate => {
    const now = new Date().toISOString()
    return { id: uid(), name: '', categoryId: cat || store.templateCategories[0]?.id || null, siteType: 'Site vitrine', shortDescription: '', description: '', features: [], technologies: [], tags: [], demoUrl: '', demoUrlMobile: '', suggestedPackIds: [], status: 'active', coverImageId: null, createdAt: now, updatedAt: now }
  }

  const Actions = ({ t }: { t: WebsiteTemplate }) => (
    <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
      <Button size="small" variant="outlined" startIcon={<OpenInNewRounded />} href={safeHref(t.demoUrl) ?? '#'} target="_blank" disabled={!t.demoUrl}>Voir la démo</Button>
      <Button size="small" variant="outlined" startIcon={<EditOutlined />} onClick={() => setEditing(t)}>Modifier</Button>
      <Button size="small" variant="contained" startIcon={<ShareOutlined />} disabled={t.status === 'archived'} onClick={() => presenter.share({ templateIds: [t.id] })}>Partager</Button>
      <Tooltip title="Créer un devis à partir de cette maquette"><IconButton size="small" onClick={() => setQuoteFor(t)} sx={{ border: 1, borderColor: 'divider' }}><DescriptionOutlined fontSize="small" /></IconButton></Tooltip>
    </Stack>
  )

  return (
    <>
      <PageHeader title={<Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}><span>Mes Maquettes</span></Stack>}
        subtitle="Votre catalogue de modèles de sites à montrer aux prospects."
        actions={<>
          <Button variant="outlined" startIcon={<SlideshowRounded />} disabled={!list.some((t) => t.status === 'active')} onClick={() => presenter.present({ templateIds: list.filter((t) => t.status === 'active').map((t) => t.id) })}>Présentation client</Button>
          <Button variant="outlined" startIcon={<CategoryOutlined />} onClick={() => setCats(true)}>Catégories</Button>
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setEditing(blank())}>Nouvelle maquette</Button>
        </>} />

      <Card sx={{ p: 1.5, mb: 2.5 }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.25} sx={{ alignItems: { lg: 'center' } }}>
          <TextField placeholder="Rechercher par nom, tag…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ maxWidth: { lg: 280 } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> } }} />
          <Box sx={{ display: 'grid', gap: 1.25, flex: 1, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0,1fr))' } }}>
            <TextField select value={cat} onChange={(e) => setCat(e.target.value)} slotProps={{ select: { displayEmpty: true } }}><MenuItem value="">Tous secteurs</MenuItem>{store.templateCategories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField>
            <TextField select value={type} onChange={(e) => setType(e.target.value)} slotProps={{ select: { displayEmpty: true } }}><MenuItem value="">Tous types</MenuItem>{store.siteTypes.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField>
            <TextField select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><MenuItem value="active">Actives</MenuItem><MenuItem value="archived">Archivées</MenuItem><MenuItem value="all">Toutes</MenuItem></TextField>
            <TextField select value={sort} onChange={(e) => setSort(e.target.value as Sort)}><MenuItem value="recent">Plus récentes</MenuItem><MenuItem value="old">Plus anciennes</MenuItem><MenuItem value="name">Nom (A→Z)</MenuItem></TextField>
          </Box>
          <ToggleButtonGroup size="small" exclusive value={layout} onChange={(_e, v) => { if (v) { setLayout(v); try { localStorage.setItem(VIEW_KEY, v) } catch { /* noop */ } } }}>
            <ToggleButton value="grid" aria-label="Grille"><GridViewRounded fontSize="small" /></ToggleButton>
            <ToggleButton value="list" aria-label="Liste"><ViewListRounded fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Card>

      {list.length === 0 ? (
        <Card><EmptyState icon={<GridViewRounded />} title={store.templates.length ? 'Aucune maquette ne correspond' : 'Votre bibliothèque est vide'}>
          {store.templates.length ? 'Modifiez les filtres.' : <Stack spacing={2} sx={{ alignItems: 'center' }}><span>Ajoutez votre première maquette avec ses captures d’écran.</span><Button variant="contained" startIcon={<AddRounded />} onClick={() => setEditing(blank())}>Nouvelle maquette</Button></Stack>}
        </EmptyState></Card>
      ) : layout === 'grid' ? (
        <Grid container spacing={2.5}>
          {list.map((t) => {
            const cover = store.coverOf(t)
            const chosen = store.templateClientSelections.filter((s) => s.templateId === t.id).length
            return (
              <Grid key={t.id} size={{ xs: 12, sm: 6, xl: 4 }}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', opacity: t.status === 'archived' ? 0.6 : 1, transition: '0.2s', '&:hover': { borderColor: 'primary.main' } }}>
                  <CardActionArea onClick={() => setEditing(t)} sx={{ position: 'relative', aspectRatio: '16 / 10', bgcolor: 'action.hover', overflow: 'hidden' }}>
                    {cover ? <Box component="img" src={imgUrl(cover.thumb)} alt={t.name} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                      : <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', color: 'text.disabled' }}><AddPhotoAlternateOutlined /></Box>}
                    <Chip size="small" label={store.categoryName(t.categoryId)} sx={{ position: 'absolute', top: 10, left: 10, bgcolor: 'rgba(0,0,0,0.6)', color: '#fff' }} />
                    {t.status === 'archived' && <Chip size="small" label="Archivée" sx={{ position: 'absolute', top: 10, right: 10 }} />}
                    {chosen > 0 && <Chip size="small" color="success" icon={<StarRounded />} label={`${chosen} choix client`} sx={{ position: 'absolute', bottom: 10, right: 10 }} />}
                  </CardActionArea>
                  <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography sx={{ fontWeight: 600 }}>{t.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{t.siteType} · ajoutée le {fmtDate(t.createdAt)}</Typography>
                    {t.shortDescription && <Typography variant="body2" color="text.secondary" sx={{ mt: 1, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.shortDescription}</Typography>}
                    <Box sx={{ mt: 2 }}><Actions t={t} /></Box>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      ) : (
        <Card>
          {list.map((t, i) => {
            const cover = store.coverOf(t)
            return (
              <Box key={t.id}>
                {i > 0 && <Divider />}
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 1.5, alignItems: { md: 'center' }, opacity: t.status === 'archived' ? 0.6 : 1 }}>
                  <Box onClick={() => setEditing(t)} sx={{ width: 112, height: 70, borderRadius: 2, overflow: 'hidden', bgcolor: 'action.hover', flexShrink: 0, cursor: 'pointer' }}>{cover && <Box component="img" src={imgUrl(cover.thumb)} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Typography sx={{ fontWeight: 600 }}>{t.name}</Typography>{t.status === 'archived' && <Chip size="small" label="Archivée" />}</Stack>
                    <Typography variant="caption" color="text.secondary">{store.categoryName(t.categoryId)} · {t.siteType} · ajoutée le {fmtDate(t.createdAt)} · {store.imagesOf(t.id).length} capture(s)</Typography>
                  </Box>
                  <Actions t={t} />
                </Stack>
              </Box>
            )
          })}
        </Card>
      )}

      {editing && <TemplateEditor key={editing.id} template={editing} onClose={() => setEditing(null)} />}
      {cats && <CategoriesDialog onClose={() => setCats(false)} />}
      {quoteFor && <QuoteDialog t={quoteFor} onClose={() => setQuoteFor(null)} onDone={(pid) => { setQuoteFor(null); drawer.open(pid, 'devis') }} />}
    </>
  )
}

type DraftImage = Omit<TemplateImage, 'templateId' | 'order'>

function TemplateEditor({ template, onClose }: { template: WebsiteTemplate; onClose: () => void }) {
  const store = useStore()
  const isNew = !store.templates.some((t) => t.id === template.id)
  const [t, setT] = useState(template)
  const [images, setImages] = useState<DraftImage[]>(() => store.imagesOf(template.id).map(({ templateId: _a, order: _b, ...i }) => i))
  const [features, setFeatures] = useState(template.features.join('\n'))
  const [techs, setTechs] = useState(template.technologies.join(', '))
  const [tags, setTags] = useState(template.tags.join(', '))
  const [uploading, setUploading] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [newCat, setNewCat] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const sitePacks = store.packs.filter((k) => k.category === 'site' && k.active)
  const cover = t.coverImageId ?? images[0]?.id

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setErr(null)
    const arr = [...files].slice(0, 20)
    setUploading((n) => n + arr.length)
    for (const f of arr) {
      try {
        const up = await uploadScreenshot(f)
        const kind: ImageKind = up.width < 900 && up.height > up.width ? 'mobile' : 'desktop'
        setImages((l) => [...l, { id: uid(), ...up, kind, caption: '' }])
      } catch (e) { setErr(`${f.name} : ${(e as Error).message}`) }
      setUploading((n) => n - 1)
    }
  }
  const move = (i: number, d: -1 | 1) => setImages((l) => { const c = [...l]; const j = i + d; if (j < 0 || j >= c.length) return l; [c[i], c[j]] = [c[j], c[i]]; return c })
  const split = (s: string, sep: RegExp) => s.split(sep).map((x) => x.trim()).filter(Boolean)
  const save = async () => {
    if (!t.name.trim()) { setErr('Le nom de la maquette est obligatoire.'); return }
    setBusy(true); setErr(null)
    try {
      await store.saveTemplate({ ...t, features: split(features, /\n/), technologies: split(techs, /,/), tags: split(tags, /,/) }, images)
      store.notify(isNew ? 'Maquette ajoutée' : 'Maquette enregistrée'); onClose()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  const addCategory = async () => {
    if (!newCat?.trim()) return
    try { const id = await store.createCategory(newCat.trim()); setT({ ...t, categoryId: id }); setNewCat(null) } catch (e) { setErr((e as Error).message) }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{isNew ? 'Nouvelle maquette' : `Modifier « ${template.name} »`}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <SectionLabel>Captures d'écran ({images.length}) — l'étoile désigne la couverture</SectionLabel>
              <Button size="small" startIcon={<AddPhotoAlternateOutlined />} onClick={() => fileRef.current?.click()}>Ajouter</Button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
            </Stack>
            <Box onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
              sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.25, p: 1.25, borderRadius: 3, border: '2px dashed', borderColor: drag ? 'primary.main' : 'divider', bgcolor: drag ? 'action.hover' : 'transparent' }}>
              {images.map((im, i) => (
                <Card key={im.id} sx={{ borderColor: cover === im.id ? '#fbbf24' : undefined }}>
                  <Box sx={{ position: 'relative', aspectRatio: '4 / 3', bgcolor: 'action.hover' }}>
                    <Box component="img" src={imgUrl(im.thumb)} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                    <IconButton size="small" onClick={() => setT({ ...t, coverImageId: im.id })} sx={{ position: 'absolute', top: 4, left: 4, bgcolor: 'rgba(7,6,14,0.6)', color: cover === im.id ? '#fbbf24' : '#fff' }}>{cover === im.id ? <StarRounded fontSize="small" /> : <StarBorderRounded fontSize="small" />}</IconButton>
                    <IconButton size="small" onClick={() => setImages(images.filter((x) => x.id !== im.id))} sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(7,6,14,0.6)', color: '#fff' }}><CloseRounded fontSize="small" /></IconButton>
                  </Box>
                  <Stack direction="row" sx={{ alignItems: 'center', p: 0.5 }}>
                    <IconButton size="small" disabled={i === 0} onClick={() => move(i, -1)}><ArrowBackRounded sx={{ fontSize: 14 }} /></IconButton>
                    <TextField select variant="standard" value={im.kind} onChange={(e) => setImages(images.map((x) => x.id === im.id ? { ...x, kind: e.target.value as ImageKind } : x))} slotProps={{ input: { disableUnderline: true, sx: { fontSize: 12 } } }}>
                      <MenuItem value="desktop">Ordinateur</MenuItem><MenuItem value="mobile">Mobile</MenuItem><MenuItem value="other">Autre</MenuItem>
                    </TextField>
                    <IconButton size="small" disabled={i === images.length - 1} onClick={() => move(i, 1)}><ArrowForwardRounded sx={{ fontSize: 14 }} /></IconButton>
                  </Stack>
                </Card>
              ))}
              {Array.from({ length: uploading }).map((_, i) => <Box key={'u' + i} sx={{ aspectRatio: '4 / 3', display: 'grid', placeItems: 'center', borderRadius: 2, bgcolor: 'action.hover' }}><CircularProgress size={22} /></Box>)}
              <Box component="button" type="button" onClick={() => fileRef.current?.click()} sx={{ aspectRatio: '4 / 3', border: 0, borderRadius: 2, bgcolor: 'transparent', color: 'text.secondary', cursor: 'pointer', display: 'grid', placeItems: 'center', font: 'inherit', fontSize: 12, '&:hover': { bgcolor: 'action.hover' } }}>
                <Stack sx={{ alignItems: 'center' }}><AddPhotoAlternateOutlined />Glissez vos captures<br />ou cliquez</Stack>
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary">PNG, JPEG ou WebP, compressées automatiquement. Les captures étroites et hautes sont classées « Mobile ».</Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Nom de la maquette *" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} placeholder="ex. Plombier Pro – Bleu" autoFocus={isNew} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField select label="Type de site" value={t.siteType} onChange={(e) => setT({ ...t, siteType: e.target.value })}>{store.siteTypes.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              {newCat === null ? (
                <Stack direction="row" spacing={1}>
                  <TextField select label="Secteur / catégorie" value={t.categoryId ?? ''} onChange={(e) => setT({ ...t, categoryId: e.target.value })}>{store.templateCategories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField>
                  <Tooltip title="Nouvelle catégorie"><IconButton onClick={() => setNewCat('')} sx={{ border: 1, borderColor: 'divider' }}><AddRounded /></IconButton></Tooltip>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1}>
                  <TextField label="Nouvelle catégorie" autoFocus value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} />
                  <IconButton color="primary" onClick={addCategory}><CheckRounded /></IconButton>
                  <IconButton onClick={() => setNewCat(null)}><CloseRounded /></IconButton>
                </Stack>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ToggleButtonGroup size="small" exclusive fullWidth value={t.status} onChange={(_e, v) => v && setT({ ...t, status: v })} sx={{ height: 40 }}>
                <ToggleButton value="active">Active</ToggleButton>
                <ToggleButton value="archived" sx={{ gap: 0.75 }}><ArchiveOutlined fontSize="small" />Archivée</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField label="URL de démonstration" value={t.demoUrl} onChange={(e) => setT({ ...t, demoUrl: e.target.value })} placeholder="https://demo.votre-agence.fr/plombier" /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField label="URL démo mobile (si différente)" value={t.demoUrlMobile} onChange={(e) => setT({ ...t, demoUrlMobile: e.target.value })} /></Grid>
            <Grid size={12}><TextField label="Description courte (cartes)" value={t.shortDescription} onChange={(e) => setT({ ...t, shortDescription: e.target.value })} slotProps={{ htmlInput: { maxLength: 220 } }} /></Grid>
            <Grid size={12}><TextField label="Description complète" multiline minRows={3} value={t.description} onChange={(e) => setT({ ...t, description: e.target.value })} placeholder="Ambiance, cible, pages incluses…" /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Fonctionnalités principales (une par ligne)" multiline minRows={4} value={features} onChange={(e) => setFeatures(e.target.value)} placeholder={'Formulaire de devis\nBouton d’appel mobile\nGalerie de réalisations'} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Stack spacing={2}>
                <TextField label="Technologies (séparées par des virgules)" value={techs} onChange={(e) => setTechs(e.target.value)} placeholder="WordPress, Elementor" />
                <TextField label="Tags / mots-clés" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="bleu, moderne, urgence" />
              </Stack>
            </Grid>
          </Grid>
          <Box>
            <SectionLabel>Pack proposé dans les devis</SectionLabel>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
              {sitePacks.map((k) => { const on = t.suggestedPackIds.includes(k.id); return <Chip key={k.id} label={k.name} color={on ? 'primary' : 'default'} variant={on ? 'filled' : 'outlined'} onClick={() => setT({ ...t, suggestedPackIds: on ? t.suggestedPackIds.filter((x) => x !== k.id) : [...t.suggestedPackIds, k.id] })} /> })}
            </Stack>
            <Typography variant="caption" color="text.secondary">Sans choix, le pack est déduit du type de site et du besoin du prospect.</Typography>
          </Box>
          {!isNew && <Typography variant="caption" color="text.secondary">Ajoutée le {fmtDateTime(template.createdAt)} · modifiée le {fmtDateTime(template.updatedAt)}</Typography>}
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        {!isNew && store.isSuper && (confirmDel
          ? <Button color="error" variant="outlined" sx={{ mr: 'auto' }} onClick={async () => { try { await store.deleteTemplate(t.id); store.notify('Maquette supprimée'); onClose() } catch (e) { setErr((e as Error).message) } }}>Confirmer la suppression</Button>
          : <Button color="error" startIcon={<DeleteOutlineRounded />} sx={{ mr: 'auto' }} onClick={() => setConfirmDel(true)}>Supprimer</Button>)}
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={save} disabled={busy || uploading > 0} startIcon={busy || uploading > 0 ? <CircularProgress size={14} color="inherit" /> : undefined}>{uploading > 0 ? `Envoi des images (${uploading})…` : 'Enregistrer'}</Button>
      </DialogActions>
    </Dialog>
  )
}

function CategoriesDialog({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const [name, setName] = useState('')
  const [edit, setEdit] = useState<{ id: string; name: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const go = async (fn: () => Promise<unknown>) => { setErr(null); try { await fn() } catch (e) { setErr((e as Error).message) } }
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Catégories de maquettes</DialogTitle>
      <DialogContent>
        <Stack component="form" direction="row" spacing={1} sx={{ my: 1 }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) go(async () => { await store.createCategory(name.trim()); setName('') }) }}>
          <TextField placeholder="Nouvelle catégorie (ex. Toiture)" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="contained" disabled={!name.trim()} startIcon={<AddRounded />}>Ajouter</Button>
        </Stack>
        {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}
        <List dense>
          {store.templateCategories.map((c) => {
            const n = store.templates.filter((t) => t.categoryId === c.id).length
            return (
              <ListItem key={c.id} divider secondaryAction={edit?.id === c.id ? null : (
                <Stack direction="row">
                  <IconButton size="small" onClick={() => setEdit({ id: c.id, name: c.name })}><EditOutlined fontSize="small" /></IconButton>
                  {store.isSuper && <Tooltip title={n ? 'Catégorie utilisée' : 'Supprimer'}><span><IconButton size="small" disabled={n > 0} onClick={() => go(() => store.deleteCategory(c.id))}><DeleteOutlineRounded fontSize="small" /></IconButton></span></Tooltip>}
                </Stack>
              )}>
                {edit?.id === c.id ? (
                  <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                    <TextField autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                    <IconButton color="primary" onClick={() => go(async () => { await store.renameCategory(c.id, edit.name); setEdit(null) })}><CheckRounded /></IconButton>
                    <IconButton onClick={() => setEdit(null)}><CloseRounded /></IconButton>
                  </Stack>
                ) : <ListItemText primary={c.name} secondary={`${n} maquette${n > 1 ? 's' : ''}`} />}
              </ListItem>
            )
          })}
        </List>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Fermer</Button></DialogActions>
    </Dialog>
  )
}

function QuoteDialog({ t, onClose, onDone }: { t: WebsiteTemplate; onClose: () => void; onDone: (id: string) => void }) {
  const store = useStore()
  const apply = useApplyTemplateToQuote()
  const choosers = new Set(store.templateClientSelections.filter((s) => s.templateId === t.id).map((s) => s.prospectId))
  const sorted = [...store.prospects].sort((a, b) => Number(choosers.has(b.id)) - Number(choosers.has(a.id)) || a.company.localeCompare(b.company, 'fr'))
  const [pid, setPid] = useState(sorted.find((p) => choosers.has(p.id))?.id ?? '')
  const p = store.prospects.find((x) => x.id === pid) ?? null
  const packs = store.packs.filter((k) => suggestPacks(t, p, store.packs).includes(k.id))
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Créer un devis avec « {t.name} »</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select label="Lead" value={pid} onChange={(e) => setPid(e.target.value)}>
            {sorted.map((x) => <MenuItem key={x.id} value={x.id}>{choosers.has(x.id) ? '⭐ ' : ''}{x.company}</MenuItem>)}
          </TextField>
          <Alert severity="info" variant="outlined">
            La maquette sera associée au lead, le pack <b>{packs.map((k) => k.name).join(', ') || '—'}</b> ajouté au devis, et la proposition reprendra sa description et son lien de démo.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Annuler</Button><Button variant="contained" disabled={!p} startIcon={<DescriptionOutlined />} onClick={() => { if (p) { apply(p, t); onDone(p.id) } }}>Préparer le devis</Button></DialogActions>
    </Dialog>
  )
}
