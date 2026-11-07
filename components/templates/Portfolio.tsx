'use client'
import {
  ArrowBackRounded, CheckRounded, ChevronLeftRounded, ChevronRightRounded, CloseRounded, DesktopWindowsOutlined, EmailOutlined, FavoriteBorderRounded,
  OpenInNewRounded, PhoneOutlined, SmartphoneRounded,
} from '@mui/icons-material'
import {
  Alert, Box, Button, Card, CardActionArea, Chip, CircularProgress, Container, Dialog, Grid, IconButton, MenuItem, Stack, TextField,
  ThemeProvider, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { imgUrl } from '@/lib/client/images'
import { safeHref } from '@/lib/client/templates'
import type { PortfolioTemplate } from '@/lib/shared/types'
import { publicTheme } from '../theme/theme'

/** Vitrine « Présentation client » : en rendez-vous (interne) et sur la page publique partagée. */

export interface AgencyInfo { name: string; tagline?: string; logoFile?: string | null; email?: string; phone?: string }
export interface SelectForm { name: string; message: string; prospectId: string }
const host = (u: string) => { try { return new URL(u).host.replace(/^www\./, '') } catch { return '' } }
const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`

export function AgencyMark({ agency }: { agency: AgencyInfo }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      {agency.logoFile
        ? <Box component="img" src={imgUrl(agency.logoFile)} alt={agency.name} sx={{ height: 38, width: 'auto', objectFit: 'contain' }} />
        : <Box sx={{ width: 38, height: 38, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: 'primary.main' }}>
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none"><path d="M7 24 L16 7 L25 24" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Box>}
      <Box>
        <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>{agency.name}</Typography>
        {agency.tagline && <Typography variant="caption" color="text.secondary">{agency.tagline}</Typography>}
      </Box>
    </Stack>
  )
}

export function Portfolio(props: {
  agency: AgencyInfo; eyebrow?: string; title: string; message?: string; templates: PortfolioTemplate[]; selectedIds?: string[]
  selectMode: 'public' | 'internal' | 'none'; prospects?: { id: string; company: string }[]; defaultProspectId?: string | null
  onSelect?: (templateId: string, form: SelectForm) => Promise<void>; onClose?: () => void
}) {
  return <ThemeProvider theme={publicTheme}><PortfolioInner {...props} /></ThemeProvider>
}

function PortfolioInner({ agency, eyebrow, title, message, templates, selectedIds = [], selectMode, prospects, defaultProspectId, onSelect, onClose }: Parameters<typeof Portfolio>[0]) {
  const [openId, setOpenId] = useState<string | null>(null)
  const idx = templates.findIndex((t) => t.id === openId)
  const open = idx >= 0 ? templates[idx] : null
  return (
    <Box sx={{ minHeight: '100%', bgcolor: 'background.default', color: 'text.primary' }}>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 2, bgcolor: '#fff', borderBottom: '1px solid', borderColor: 'rgba(15,23,42,0.08)' }}>
        <Container maxWidth="lg" sx={{ py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <AgencyMark agency={agency} />
          <Stack direction="row" spacing={1}>
            {agency.phone && <Button variant="outlined" size="small" startIcon={<PhoneOutlined />} href={tel(agency.phone)} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>{agency.phone}</Button>}
            {onClose && <Button variant="contained" size="small" startIcon={<CloseRounded />} onClick={onClose}>Quitter</Button>}
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pt: { xs: 5, sm: 8 }, pb: 4 }}>
        {eyebrow && <Typography variant="overline" sx={{ color: 'secondary.main', letterSpacing: '0.14em', fontWeight: 700 }}>{eyebrow}</Typography>}
        <Typography variant="h2" sx={{ fontSize: { xs: 30, sm: 42 }, maxWidth: 820 }}>{title}</Typography>
        {message && <Typography sx={{ mt: 2, maxWidth: 720, whiteSpace: 'pre-line', color: 'text.secondary', fontSize: 17, lineHeight: 1.65 }}>{message}</Typography>}
      </Container>

      <Container maxWidth="lg" sx={{ pb: 10 }}>
        <Grid container spacing={3}>
          {templates.map((t) => {
            const cover = t.images.find((i) => i.id === t.coverImageId) ?? t.images[0]
            const chosen = selectedIds.includes(t.id)
            return (
              <Grid key={t.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 4, transition: '0.25s', borderColor: chosen ? 'success.main' : 'rgba(15,23,42,0.08)', borderWidth: chosen ? 2 : 1, '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 24px 48px -20px rgba(15,23,42,0.3)' } }}>
                  <CardActionArea onClick={() => setOpenId(t.id)} sx={{ position: 'relative', aspectRatio: '16 / 10', bgcolor: '#eef0f3', overflow: 'hidden' }}>
                    {cover ? <Box component="img" src={imgUrl(cover.thumb || cover.file)} alt={t.name} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                      : <Typography color="text.secondary" align="center">Aperçu bientôt disponible</Typography>}
                    {chosen && <Chip icon={<CheckRounded />} label="Votre choix" color="success" size="small" sx={{ position: 'absolute', top: 12, left: 12, fontWeight: 700 }} />}
                  </CardActionArea>
                  <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{[t.category, t.siteType].filter(Boolean).join(' · ')}</Typography>
                    <Typography variant="h6" sx={{ mt: 0.5 }}>{t.name}</Typography>
                    {(t.shortDescription || t.description) && <Typography variant="body2" color="text.secondary" sx={{ mt: 1, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.shortDescription || t.description}</Typography>}
                    <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}>
                      <Button variant="contained" fullWidth onClick={() => setOpenId(t.id)}>Découvrir</Button>
                      {safeHref(t.demoUrl) && <Button variant="outlined" startIcon={<OpenInNewRounded />} href={safeHref(t.demoUrl)!} target="_blank" rel="noopener noreferrer">Démo</Button>}
                    </Stack>
                  </Box>
                </Card>
              </Grid>
            )
          })}
          {!templates.length && <Grid size={12}><Typography align="center" color="text.secondary" sx={{ py: 8 }}>Aucune maquette à afficher.</Typography></Grid>}
        </Grid>
      </Container>

      {(agency.email || agency.phone) && (
        <Box sx={{ borderTop: '1px solid rgba(15,23,42,0.08)', bgcolor: '#fff' }}>
          <Container maxWidth="lg" sx={{ py: 3, display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'space-between', color: 'text.secondary' }}>
            <Typography variant="body2">{agency.name}{agency.tagline ? ` — ${agency.tagline}` : ''}</Typography>
            <Stack direction="row" spacing={3}>
              {agency.email && <Button size="small" color="inherit" startIcon={<EmailOutlined />} href={`mailto:${agency.email}`}>{agency.email}</Button>}
              {agency.phone && <Button size="small" color="inherit" startIcon={<PhoneOutlined />} href={tel(agency.phone)}>{agency.phone}</Button>}
            </Stack>
          </Container>
        </Box>
      )}

      {open && (
        <Detail key={open.id} t={open} chosen={selectedIds.includes(open.id)} selectMode={selectMode} prospects={prospects} defaultProspectId={defaultProspectId}
          onSelect={onSelect} onClose={() => setOpenId(null)}
          onPrev={idx > 0 ? () => setOpenId(templates[idx - 1].id) : undefined}
          onNext={idx < templates.length - 1 ? () => setOpenId(templates[idx + 1].id) : undefined} />
      )}
    </Box>
  )
}

function Detail({ t, chosen, selectMode, prospects, defaultProspectId, onSelect, onClose, onPrev, onNext }: {
  t: PortfolioTemplate; chosen: boolean; selectMode: 'public' | 'internal' | 'none'; prospects?: { id: string; company: string }[]
  defaultProspectId?: string | null; onSelect?: (templateId: string, form: SelectForm) => Promise<void>; onClose: () => void; onPrev?: () => void; onNext?: () => void
}) {
  const desktop = t.images.filter((i) => i.kind !== 'mobile')
  const mobile = t.images.filter((i) => i.kind === 'mobile')
  const [device, setDevice] = useState<'desktop' | 'mobile'>(desktop.length ? 'desktop' : 'mobile')
  const shots = device === 'desktop' ? desktop : mobile
  const [shotId, setShotId] = useState<string | null>(null)
  const shot = shots.find((s) => s.id === shotId) ?? shots[0]
  const [asking, setAsking] = useState(false)
  const [form, setForm] = useState<SelectForm>({ name: '', message: '', prospectId: defaultProspectId ?? '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(chosen)
  const demo = safeHref(device === 'mobile' && t.demoUrlMobile ? t.demoUrlMobile : t.demoUrl)
  const sorted = useMemo(() => [...(prospects ?? [])].sort((a, b) => a.company.localeCompare(b.company, 'fr')), [prospects])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') onNext?.(); if (e.key === 'ArrowLeft') onPrev?.() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onNext, onPrev])

  const confirm = async () => {
    if (!onSelect) return
    if (selectMode === 'internal' && !form.prospectId) { setErr('Choisissez le prospect concerné.'); return }
    setBusy(true); setErr(null)
    try { await onSelect(t.id, form); setDone(true); setAsking(false) } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Dialog open fullScreen onClose={onClose} slotProps={{ paper: { sx: { bgcolor: '#fff', borderRadius: 0, border: 0 } } }}>
      <Stack direction="row" sx={{ px: 2, py: 1.25, borderBottom: '1px solid rgba(15,23,42,0.08)', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button color="inherit" startIcon={<ArrowBackRounded />} onClick={onClose}>Toutes les maquettes</Button>
        <Stack direction="row">
          <IconButton disabled={!onPrev} onClick={onPrev} aria-label="Précédente"><ChevronLeftRounded /></IconButton>
          <IconButton disabled={!onNext} onClick={onNext} aria-label="Suivante"><ChevronRightRounded /></IconButton>
        </Stack>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 380px' }, overflow: { xs: 'auto', md: 'hidden' } }}>
        <Box sx={{ bgcolor: '#eef0f3', p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {desktop.length > 0 && mobile.length > 0 && (
            <ToggleButtonGroup exclusive size="small" value={device} onChange={(_e, v) => { if (v) { setDevice(v); setShotId(null) } }} sx={{ alignSelf: 'center', mb: 2, bgcolor: '#fff', borderRadius: 999, '& .MuiToggleButton-root': { border: 0, borderRadius: '999px !important', px: 2, gap: 0.75 } }}>
              <ToggleButton value="desktop"><DesktopWindowsOutlined fontSize="small" />Ordinateur</ToggleButton>
              <ToggleButton value="mobile"><SmartphoneRounded fontSize="small" />Mobile</ToggleButton>
            </ToggleButtonGroup>
          )}
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center' }}>
            {!shot ? <Box sx={{ height: 280, width: '100%', bgcolor: '#fff', borderRadius: 3, display: 'grid', placeItems: 'center', color: 'text.secondary' }}>Pas encore de capture d'écran</Box>
              : device === 'desktop' ? (
                <Box sx={{ width: '100%', maxWidth: 1100, height: { xs: '60vh', md: '100%' }, display: 'flex', flexDirection: 'column', bgcolor: '#fff', borderRadius: 3, overflow: 'hidden', boxShadow: '0 30px 60px -25px rgba(15,23,42,0.45)' }}>
                  <Stack direction="row" spacing={0.75} sx={{ px: 1.5, py: 1, bgcolor: '#f8fafc', borderBottom: '1px solid #eef0f3', alignItems: 'center' }}>
                    {['#ff5f57', '#febc2e', '#28c840'].map((c) => <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} />)}
                    <Typography variant="caption" sx={{ ml: 1.5, px: 1.5, py: 0.25, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 1.5, color: 'text.secondary' }} noWrap>{host(t.demoUrl) || t.name}</Typography>
                  </Stack>
                  <Box sx={{ flex: 1, overflowY: 'auto' }}><Box component="img" src={imgUrl(shot.file)} alt={shot.caption || t.name} sx={{ display: 'block', width: '100%' }} /></Box>
                </Box>
              ) : (
                <Box sx={{ width: 300, height: { xs: '70vh', md: '100%' }, maxHeight: 720, flexShrink: 0, display: 'flex', flexDirection: 'column', bgcolor: '#fff', borderRadius: '40px', border: '10px solid #0f172a', overflow: 'hidden', boxShadow: '0 30px 60px -25px rgba(15,23,42,0.5)' }}>
                  <Box sx={{ mx: 'auto', mt: 0.5, width: 64, height: 6, borderRadius: 3, bgcolor: '#0f172a', flexShrink: 0 }} />
                  <Box sx={{ flex: 1, overflowY: 'auto', mt: 0.5 }}><Box component="img" src={imgUrl(shot.file)} alt={shot.caption || t.name} sx={{ display: 'block', width: '100%' }} /></Box>
                </Box>
              )}
          </Box>
          {shots.length > 1 && (
            <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: 'center', overflowX: 'auto' }}>
              {shots.map((s) => (
                <Box key={s.id} component="button" onClick={() => setShotId(s.id)} sx={{ p: 0, border: 2, borderColor: s.id === shot?.id ? '#0f172a' : 'transparent', borderRadius: 1.5, width: 80, height: 54, overflow: 'hidden', cursor: 'pointer', bgcolor: '#fff', opacity: s.id === shot?.id ? 1 : 0.7, flexShrink: 0 }}>
                  <Box component="img" src={imgUrl(s.thumb || s.file)} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                </Box>
              ))}
            </Stack>
          )}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', borderLeft: { md: '1px solid rgba(15,23,42,0.08)' }, overflowY: { md: 'auto' } }}>
          <Box sx={{ p: 3, flex: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{[t.category, t.siteType].filter(Boolean).join(' · ')}</Typography>
            <Typography variant="h4" sx={{ mt: 0.5 }}>{t.name}</Typography>
            {t.description && <Typography sx={{ mt: 2, whiteSpace: 'pre-line', color: 'text.secondary', lineHeight: 1.7 }}>{t.description}</Typography>}
            {t.features.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Fonctionnalités principales</Typography>
                <Stack spacing={0.75}>{t.features.map((f) => <Stack key={f} direction="row" spacing={1}><CheckRounded fontSize="small" color="success" /><Typography variant="body2">{f}</Typography></Stack>)}</Stack>
              </Box>
            )}
            {t.technologies.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Technologies</Typography>
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>{t.technologies.map((x) => <Chip key={x} label={x} size="small" />)}</Stack>
              </Box>
            )}
            <Stack direction="row" sx={{ mt: 3, flexWrap: 'wrap', gap: 1 }}>
              {demo && <Button variant="outlined" startIcon={<OpenInNewRounded />} href={demo} target="_blank" rel="noopener noreferrer">Voir le site de démonstration</Button>}
              {safeHref(t.demoUrlMobile) && device === 'desktop' && <Button variant="outlined" startIcon={<SmartphoneRounded />} href={safeHref(t.demoUrlMobile)!} target="_blank" rel="noopener noreferrer">Version mobile</Button>}
            </Stack>
          </Box>
          {selectMode !== 'none' && (
            <Box sx={{ position: 'sticky', bottom: 0, p: 2.5, bgcolor: '#fff', borderTop: '1px solid rgba(15,23,42,0.08)' }}>
              {done ? (
                <Alert severity="success" icon={<CheckRounded />}><b>Choix enregistré</b><br />{selectMode === 'public' ? 'Merci ! Nous revenons vers vous très vite pour la suite.' : 'Le choix a été ajouté à la fiche du prospect.'}</Alert>
              ) : asking ? (
                <Stack spacing={1.5}>
                  <Typography variant="subtitle2">Vous aimez « {t.name} » ?</Typography>
                  {selectMode === 'internal' ? (
                    <TextField select size="small" label="Prospect concerné" value={form.prospectId} onChange={(e) => setForm({ ...form, prospectId: e.target.value })}>
                      {sorted.map((p) => <MenuItem key={p.id} value={p.id}>{p.company}</MenuItem>)}
                    </TextField>
                  ) : <TextField size="small" label="Votre nom (facultatif)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} slotProps={{ htmlInput: { maxLength: 80 } }} />}
                  <TextField size="small" multiline minRows={2} label="Une remarque ? (couleurs, pages…)" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} slotProps={{ htmlInput: { maxLength: 1000 } }} />
                  {err && <Alert severity="error">{err}</Alert>}
                  <Stack direction="row" spacing={1}>
                    <Button color="inherit" onClick={() => setAsking(false)}>Annuler</Button>
                    <Button fullWidth variant="contained" color="success" onClick={confirm} disabled={busy} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <CheckRounded />}>Confirmer mon choix</Button>
                  </Stack>
                </Stack>
              ) : (
                <Button fullWidth size="large" variant="contained" color="success" startIcon={<FavoriteBorderRounded />} onClick={() => setAsking(true)}>Cette maquette m'intéresse</Button>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Dialog>
  )
}

export function PortfolioFrame({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={publicTheme}>{children}</ThemeProvider>
}
