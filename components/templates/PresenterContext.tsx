'use client'
import { CheckRounded, ContentCopyRounded, EmailOutlined, LinkRounded, OpenInNewRounded, SearchRounded, SlideshowRounded, WhatsApp } from '@mui/icons-material'
import {
  Alert, Box, Button, Card, CardActionArea, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Grid, InputAdornment, MenuItem, Stack,
  TextField, Typography,
} from '@mui/material'
import { createContext, ReactNode, useContext, useMemo, useState } from 'react'
import { imgUrl } from '@/lib/client/images'
import { useStore } from '@/lib/client/store'
import { isPrivateUrl, useToPortfolio } from '@/lib/client/templates'
import type { Presentation, WebsiteTemplate } from '@/lib/shared/types'
import { normalize } from '@/lib/shared/utils'
import { Portfolio } from './Portfolio'

interface PresentArgs { templateIds: string[]; prospectId?: string | null; title?: string; message?: string }
interface ShareArgs { prospectId?: string | null; templateIds?: string[] }
const Ctx = createContext<{ present: (a: PresentArgs) => void; share: (a: ShareArgs) => void } | null>(null)
export const usePresenter = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('PresenterProvider manquant')
  return c
}

export function PresenterProvider({ children }: { children: ReactNode }) {
  const store = useStore()
  const toPortfolio = useToPortfolio()
  const [args, setArgs] = useState<PresentArgs | null>(null)
  const [shareArgs, setShareArgs] = useState<ShareArgs | null>(null)
  const prospect = args?.prospectId ? store.prospects.find((p) => p.id === args.prospectId) : null
  const s = store.settings
  const selected = args?.prospectId ? store.templateClientSelections.filter((x) => x.prospectId === args.prospectId).map((x) => x.templateId) : []

  return (
    <Ctx.Provider value={{ present: setArgs, share: setShareArgs }}>
      {children}
      {shareArgs && <ShareDialog {...shareArgs} onClose={() => setShareArgs(null)} onPresent={(a) => { setShareArgs(null); setArgs(a) }} />}
      <Dialog open={!!args} fullScreen onClose={() => setArgs(null)} slotProps={{ paper: { sx: { bgcolor: '#f6f7f9', border: 0, borderRadius: 0 } } }}>
        {args && (
          <Portfolio
            agency={{ name: s.agencyName, tagline: s.agencyTagline, logoFile: s.logoFile, email: s.contactEmail, phone: s.contactPhone }}
            eyebrow={prospect ? `Sélection pour ${prospect.company}` : 'Nos réalisations'}
            title={args.title || (prospect ? 'Des modèles pensés pour votre activité' : 'Nos maquettes de sites web')}
            message={args.message}
            templates={args.templateIds.map((id) => store.templates.find((t) => t.id === id)).filter((t): t is WebsiteTemplate => !!t).map(toPortfolio)}
            selectedIds={selected}
            selectMode="internal"
            prospects={store.prospects.map((p) => ({ id: p.id, company: p.company }))}
            defaultProspectId={args.prospectId}
            onSelect={async (templateId, f) => { await store.selectInternal(templateId, f.prospectId, f.message); store.notify('Choix enregistré dans la fiche du prospect') }}
            onClose={() => setArgs(null)} />
        )}
      </Dialog>
    </Ctx.Provider>
  )
}

function ShareDialog({ prospectId: initialProspect, templateIds: initialIds, onClose, onPresent }: ShareArgs & { onClose: () => void; onPresent: (a: PresentArgs) => void }) {
  const store = useStore()
  const [prospectId, setProspectId] = useState(initialProspect ?? '')
  const prospect = store.prospects.find((p) => p.id === prospectId) ?? null
  const guessCat = useMemo(() => {
    if (!prospect || initialIds?.length) return ''
    for (const sector of prospect.sectors.map(normalize)) {
      const c = store.templateCategories.find((x) => {
        const n = normalize(x.name)
        return (n.includes(sector) || sector.includes(n.split(' ')[0])) && store.templates.some((t) => t.status === 'active' && t.categoryId === x.id)
      })
      if (c) return c.id
    }
    return ''
  }, [prospect, initialIds, store.templateCategories, store.templates])
  const [cat, setCat] = useState(guessCat)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string[]>(initialIds ?? [])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [created, setCreated] = useState<Presentation | null>(null)
  const [copied, setCopied] = useState(false)

  const list = store.templates.filter((t) => t.status === 'active' && (!cat || t.categoryId === cat)
    && (!q || normalize([t.name, t.tags.join(' '), t.shortDescription].join(' ')).includes(normalize(q))))
  const defTitle = prospect ? `Maquettes sélectionnées pour ${prospect.company}` : 'Notre sélection de maquettes'
  const defMessage = `Bonjour${prospect?.contact ? ' ' + prospect.contact : ''},\n\nVoici quelques modèles de sites que nous avons sélectionnés pour ${prospect?.company || 'vous'}. Cliquez sur « Découvrir » pour les voir en détail, puis sur « Cette maquette m'intéresse » pour nous indiquer votre préférence.\n\n${store.me.name}`
  const toggle = (id: string) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id])
  const generate = async () => {
    setBusy(true); setErr(null)
    try { setCreated(await store.createPresentation({ templateIds: sel, prospectId: prospectId || null, title: title || defTitle, message: message || defMessage })) }
    catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  if (created) {
    const url = store.presentationUrl(created)
    const text = `Bonjour${prospect?.contact ? ' ' + prospect.contact : ''}, voici notre sélection de maquettes pour ${prospect?.company || 'votre projet'} : ${url}`
    return (
      <Dialog open onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Lien de présentation prêt</DialogTitle>
        <DialogContent>
          <TextField value={url} slotProps={{ input: { readOnly: true, startAdornment: <InputAdornment position="start"><LinkRounded fontSize="small" /></InputAdornment>,
            endAdornment: <Button size="small" startIcon={copied ? <CheckRounded /> : <ContentCopyRounded />} onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* noop */ } }}>{copied ? 'Copié' : 'Copier'}</Button> } }} />
          {isPrivateUrl(url) && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Ce lien pointe vers votre ordinateur : il ne s'ouvrira que sur votre réseau. Pour l'envoyer à un prospect, l'application doit être en ligne et son adresse renseignée dans <b>Paramètres → Agence → Adresse publique</b>.
            </Alert>
          )}
          <Grid container spacing={1} sx={{ mt: 2 }}>
            <Grid size={{ xs: 6, sm: 3 }}><Button fullWidth variant="outlined" startIcon={<OpenInNewRounded />} href={url} target="_blank">Ouvrir</Button></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><Button fullWidth variant="outlined" startIcon={<EmailOutlined />} href={`mailto:${prospect?.email ?? ''}?subject=${encodeURIComponent(created.title)}&body=${encodeURIComponent(text)}`}>Email</Button></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><Button fullWidth variant="outlined" startIcon={<WhatsApp />} href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank">WhatsApp</Button></Grid>
            <Grid size={{ xs: 6, sm: 3 }}><Button fullWidth variant="outlined" startIcon={<SlideshowRounded />} onClick={() => onPresent({ templateIds: sel, prospectId: prospectId || null, title: created.title, message: created.message })}>Présenter</Button></Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Le choix du client sera ajouté automatiquement au journal{prospect ? ` de ${prospect.company}` : ''}. Vous pouvez désactiver ce lien à tout moment (fiche lead → Maquettes, ou Présentations clients).
          </Typography>
        </DialogContent>
        <DialogActions><Button variant="contained" onClick={onClose}>Terminé</Button></DialogActions>
      </Dialog>
    )
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Présenter des maquettes</DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2, mt: 0.5 }}>
              <TextField placeholder="Rechercher une maquette…" value={q} onChange={(e) => setQ(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> } }} />
              <TextField select value={cat} onChange={(e) => setCat(e.target.value)} sx={{ minWidth: 220 }} slotProps={{ select: { displayEmpty: true } }}>
                <MenuItem value="">Toutes les catégories</MenuItem>
                {store.templateCategories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
            </Stack>
            {list.length === 0 ? (
              <Alert severity="info" variant="outlined">{store.templates.length ? 'Aucune maquette active dans cette catégorie.' : 'Ajoutez d’abord des maquettes dans « Mes Maquettes ».'}</Alert>
            ) : (
              <Grid container spacing={1.5}>
                {list.map((t) => {
                  const on = sel.includes(t.id)
                  const cover = store.coverOf(t)
                  return (
                    <Grid key={t.id} size={{ xs: 6, sm: 4 }}>
                      <Card sx={{ borderColor: on ? 'primary.main' : undefined, boxShadow: on ? '0 0 0 1px #8b5cf6, 0 0 24px -6px rgba(139,92,246,0.7)' : undefined }}>
                        <CardActionArea onClick={() => toggle(t.id)}>
                          <Box sx={{ position: 'relative', aspectRatio: '16 / 10', bgcolor: 'action.hover' }}>
                            {cover && <Box component="img" src={imgUrl(cover.thumb)} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />}
                            <Checkbox checked={on} size="small" sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper', borderRadius: 1, p: 0.25 }} tabIndex={-1} />
                          </Box>
                          <Box sx={{ p: 1.25 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{t.name}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap component="p">{store.categoryName(t.categoryId)} · {t.siteType}</Typography>
                          </Box>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField select label="Prospect" value={prospectId} onChange={(e) => setProspectId(e.target.value)} slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}>
                <MenuItem value="">— Sans prospect</MenuItem>
                {[...store.prospects].sort((a, b) => a.company.localeCompare(b.company, 'fr')).map((p) => <MenuItem key={p.id} value={p.id}>{p.company}</MenuItem>)}
              </TextField>
              <TextField label="Titre de la page" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={defTitle} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="Message au client" multiline minRows={7} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={defMessage} slotProps={{ inputLabel: { shrink: true }, htmlInput: { style: { fontSize: 13 } } }} />
              {err && <Alert severity="error">{err}</Alert>}
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto', pl: 2 }}>{sel.length} sélectionnée{sel.length > 1 ? 's' : ''}</Typography>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="outlined" startIcon={<SlideshowRounded />} disabled={!sel.length} onClick={() => onPresent({ templateIds: sel, prospectId: prospectId || null, title: title || defTitle, message: message || undefined })}>Présenter maintenant</Button>
        <Button variant="contained" startIcon={<LinkRounded />} disabled={!sel.length || busy} onClick={generate}>Générer le lien</Button>
      </DialogActions>
    </Dialog>
  )
}
