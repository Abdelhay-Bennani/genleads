'use client'
import { AddRounded, CallRounded, PauseRounded, PlayArrowRounded, StopRounded, TravelExploreRounded } from '@mui/icons-material'
import { Avatar, Box, Button, Card, CardContent, Grid, IconButton, List, ListItemButton, ListItemText, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useLeadDrawer } from '@/components/shell/LeadDrawerContext'
import { PageHeader, StatTile, StatusChip, UserAvatar } from '@/components/ui'
import { useStore } from '@/lib/client/store'
import { STATUSES } from '@/lib/shared/data'
import type { Status } from '@/lib/shared/types'
import { dealValue, eur, fmtDate, fmtDateTime, followState, isClosed, quote, todayISO } from '@/lib/shared/utils'

const SHORT: Record<Status, string> = { a_qualifier: 'Qualifier', a_contacter: 'Appeler', r1: 'R1', devis: 'Devis', gagne: 'Gagné', perdu: 'Perdu' }
const HATCH = 'repeating-linear-gradient(135deg, rgba(85,57,217,.42) 0 3px, transparent 3px 9px)'
const WEEK_MS = 7 * 864e5

/** Répartition du pipeline en colonnes arrondies ; hachuré = étape vide. */
function PipelineBars({ stages }: { stages: { id: Status; label: string; hex: string; count: number; value: number }[] }) {
  const max = Math.max(1, ...stages.map((s) => s.count))
  return (
    <Stack direction="row" spacing={{ xs: 1, sm: 2 }} sx={{ mt: 2, height: 220, alignItems: 'flex-end' }}>
      {stages.map((s) => (
        <Tooltip key={s.id} title={`${s.label} : ${s.count} lead${s.count > 1 ? 's' : ''} · ${eur(s.value)}`}>
          <Stack sx={{ flex: 1, minWidth: 0, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.5 }}>{s.count}</Typography>
            <Box sx={{ width: '100%', maxWidth: 72, height: s.count ? `${Math.max(22, (s.count / max) * 78)}%` : '42%', borderRadius: 999, bgcolor: s.count ? s.hex : undefined, backgroundImage: s.count ? undefined : HATCH }} />
            <Typography variant="caption" color="text.secondary" noWrap sx={{ mt: 1, maxWidth: '100%' }}>{SHORT[s.id]}</Typography>
          </Stack>
        </Tooltip>
      ))}
    </Stack>
  )
}

/** Demi-jauge : part des leads déjà traités (gagnés, en cours, perdus). */
function Gauge({ won, running, lost, total }: { won: number; running: number; lost: number; total: number }) {
  const pct = (n: number) => (total ? (n / total) * 100 : 0)
  const done = Math.round(pct(won + running + lost))
  const arc = 'M 24 112 A 88 88 0 0 1 200 112'
  const seg = (start: number, size: number, color: string) => size > 0 && <path d={arc} pathLength={100} fill="none" stroke={color} strokeWidth={30} strokeDasharray={`${size} ${100 - size}`} strokeDashoffset={-start} />
  return (
    <Box sx={{ position: 'relative', maxWidth: 300, mx: 'auto', mt: 2 }}>
      <svg viewBox="0 0 224 128" width="100%" role="img" aria-label={`${done} % des leads traités`}>
        <defs><pattern id="gaugeHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="8" fill="#5539d9" opacity=".42" /></pattern></defs>
        <path d={arc} fill="none" stroke="url(#gaugeHatch)" strokeWidth={30} />
        {seg(0, pct(won), '#3f28b5')}
        {seg(pct(won), pct(running), '#5539d9')}
        {seg(pct(won + running), pct(lost), '#a8a5b8')}
      </svg>
      <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, textAlign: 'center' }}>
        <Typography variant="h3" component="p">{done} %</Typography>
        <Typography variant="caption" color="primary">Leads traités</Typography>
      </Box>
    </Box>
  )
}

function Legend({ color, hatch, label, value }: { color?: string; hatch?: boolean; label: string; value: number }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color, backgroundImage: hatch ? HATCH : undefined, border: hatch ? 1 : 0, borderColor: 'divider' }} />
      <Typography variant="caption" color="text.secondary">{label} ({value})</Typography>
    </Stack>
  )
}

/** Chronomètre de session d'appels. */
function CallTimer() {
  const [sec, setSec] = useState(0)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => setSec((s) => s + 1), 1000)
    return () => window.clearInterval(t)
  }, [running])
  const two = (n: number) => String(n).padStart(2, '0')
  return (
    <Card sx={{ bgcolor: 'primary.main', borderColor: 'primary.main', color: '#fff', p: 2.5 }}>
      <Typography variant="h6">Session d’appels</Typography>
      <Typography component="p" sx={{ my: 1, textAlign: 'center', fontSize: '2.6rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{two(Math.floor(sec / 3600))}:{two(Math.floor(sec / 60) % 60)}:{two(sec % 60)}</Typography>
      <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center' }}>
        <IconButton aria-label={running ? 'Mettre en pause' : 'Démarrer'} onClick={() => setRunning(!running)} sx={{ bgcolor: '#fff', color: 'primary.main', '&:hover': { bgcolor: '#fff' } }}>{running ? <PauseRounded /> : <PlayArrowRounded />}</IconButton>
        <IconButton aria-label="Arrêter" onClick={() => { setRunning(false); setSec(0) }} sx={{ border: '2px solid #fff', color: '#fff' }}><StopRounded /></IconButton>
      </Stack>
    </Card>
  )
}

export default function DashboardPage() {
  const store = useStore()
  const drawer = useLeadDrawer()
  const [who, setWho] = useState<string>('all')

  const m = useMemo(() => {
    const list = who === 'all' ? store.prospects : store.prospects.filter((p) => p.assignee === who)
    const active = list.filter((p) => !isClosed(p))
    const won = list.filter((p) => p.status === 'gagne')
    const lost = list.filter((p) => p.status === 'perdu')
    const today = todayISO()
    const pending = active.filter((p) => p.callSession && p.status === 'a_contacter' && p.nextFollowUp)
    const nextDate = pending.map((p) => p.nextFollowUp!).filter((d) => d >= today).sort()[0]
    const nextSession = pending.find((p) => p.nextFollowUp === nextDate)?.callSession ?? null
    return {
      list, active, won, lost,
      newThisWeek: list.filter((p) => Date.now() - new Date(p.createdAt).getTime() < WEEK_MS).length,
      running: active.filter((p) => p.status === 'r1' || p.status === 'devis').length,
      potential: active.reduce((t, p) => t + dealValue(p, store.packs), 0),
      validated: won.reduce((t, p) => t + dealValue(p, store.packs), 0),
      mrr: won.reduce((t, p) => t + quote(p, store.packs).mrr, 0),
      mrrPipe: active.reduce((t, p) => t + quote(p, store.packs).mrr, 0),
      follow: active.filter((p) => followState(p) !== 'none').sort((a, b) => (a.nextFollowUp ?? '').localeCompare(b.nextFollowUp ?? '')),
      stages: STATUSES.map((s) => { const it = list.filter((p) => p.status === s.id); return { ...s, count: it.length, value: it.reduce((t, p) => t + dealValue(p, store.packs), 0) } }),
      recent: list.flatMap((p) => p.interactions.map((i) => ({ ...i, p }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
      latest: [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
      overdue: pending.filter((p) => p.nextFollowUp! < today).length,
      nextSession,
      nextCount: pending.filter((p) => p.callSession === nextSession).length,
    }
  }, [store.prospects, store.packs, who])

  const rate = m.list.length ? Math.round((m.won.length / m.list.length) * 100) : 0
  const presentations = store.templatePresentations

  return (
    <>
      <PageHeader title="Dashboard" subtitle={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        actions={
          <>
            <Button variant="contained" size="large" startIcon={<AddRounded />} onClick={() => drawer.create()}>Nouveau lead</Button>
            <Button variant="outlined" size="large" startIcon={<TravelExploreRounded />} component={Link} href="/prospects">Trouver des prospects</Button>
            {store.members.length > 1 && (
              <ToggleButtonGroup size="small" exclusive value={who} onChange={(_e, v) => v && setWho(v)}>
                <ToggleButton value="all" sx={{ px: 2 }}>Tous</ToggleButton>
                {store.members.map((n) => <ToggleButton key={n} value={n} sx={{ gap: 1, px: 1.5 }}><UserAvatar name={n} size={20} />{n}</ToggleButton>)}
              </ToggleButtonGroup>
            )}
          </>
        } />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatTile filled label="Prospects dans le pipe" value={m.active.length} href="/leads" sub={`${m.list.length} au total · +${m.newThisWeek} cette semaine`} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatTile label="Taux de conversion" value={`${rate} %`} href="/clients" sub={`${m.won.length} gagné${m.won.length > 1 ? 's' : ''} · ${m.lost.length} perdu${m.lost.length > 1 ? 's' : ''}`} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatTile label="CA one-shot validé" value={eur(m.validated)} href="/devis" sub={`${eur(m.potential)} en potentiel`} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatTile label="MRR" value={eur(m.mrr)} href="/devis" sub={`Par mois · +${eur(m.mrrPipe)} en négociation`} /></Grid>

        <Grid size={{ xs: 12, lg: 9 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card sx={{ height: '100%' }}><CardContent><Typography variant="h6">Répartition du pipeline</Typography><PipelineBars stages={m.stages} /></CardContent></Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6">Prochains appels</Typography>
                  <Box sx={{ flex: 1, my: 2 }}>
                    {m.nextSession ? (
                      <>
                        <Typography variant="h5" color="primary" sx={{ fontSize: '1.5rem', lineHeight: 1.2 }}>{m.nextSession}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{m.nextCount} prospect{m.nextCount > 1 ? 's' : ''} à appeler{m.overdue ? ` · ${m.overdue} en retard` : ''}</Typography>
                      </>
                    ) : <Typography variant="body2" color="text.secondary">Aucune session d’appels planifiée.</Typography>}
                  </Box>
                  <Button variant="contained" size="large" fullWidth startIcon={<CallRounded />} component={Link} href={m.nextSession ? `/prospects?session=${encodeURIComponent(m.nextSession)}` : '/prospects'}>{m.nextSession ? 'Lancer les appels' : 'Voir les prospects'}</Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ pb: 0 }}><Typography variant="h6">{m.recent.length ? 'Activité récente' : 'Derniers leads ajoutés'}</Typography></CardContent>
                <List sx={{ px: 1 }}>
                  {m.recent.length ? m.recent.map((r) => (
                    <ListItemButton key={r.id} onClick={() => drawer.open(r.p.id, 'journal')} sx={{ gap: 1.5, borderRadius: 3 }}>
                      <UserAvatar name={r.author} size={40} />
                      <ListItemText primary={r.p.company} secondary={`${r.type} · ${fmtDateTime(r.date)} · ${r.text}`} slotProps={{ primary: { noWrap: true, sx: { fontWeight: 600 } }, secondary: { noWrap: true } }} sx={{ minWidth: 0 }} />
                      <StatusChip status={r.p.status} />
                    </ListItemButton>
                  )) : m.latest.map((p) => (
                    <ListItemButton key={p.id} onClick={() => drawer.open(p.id)} sx={{ gap: 1.5, borderRadius: 3 }}>
                      <UserAvatar name={p.company} size={40} />
                      <ListItemText primary={p.company} secondary={[p.trade, p.city].filter(Boolean).join(' · ')} slotProps={{ primary: { noWrap: true, sx: { fontWeight: 600 } }, secondary: { noWrap: true } }} sx={{ minWidth: 0 }} />
                      <StatusChip status={p.status} />
                    </ListItemButton>
                  ))}
                </List>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6">Avancement</Typography>
                  <Gauge won={m.won.length} running={m.running} lost={m.lost.length} total={m.list.length} />
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5, justifyContent: 'center', mt: 2 }}>
                    <Legend color="#3f28b5" label="Gagnés" value={m.won.length} />
                    <Legend color="#5539d9" label="En cours" value={m.running} />
                    <Legend color="#a8a5b8" label="Perdus" value={m.lost.length} />
                    <Legend hatch label="À traiter" value={m.list.length - m.won.length - m.running - m.lost.length} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, lg: 3 }}>
          <Stack spacing={2} sx={{ height: '100%' }}>
            <Card sx={{ flex: 1 }}>
              <CardContent sx={{ pb: 0 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">Relances</Typography>
                  <Button variant="outlined" size="small" startIcon={<AddRounded />} onClick={() => drawer.create()}>Nouveau</Button>
                </Stack>
              </CardContent>
              {m.follow.length ? (
                <List sx={{ px: 1 }}>
                  {m.follow.slice(0, 7).map((p) => (
                    <ListItemButton key={p.id} onClick={() => drawer.open(p.id)} sx={{ gap: 1.5, borderRadius: 3 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: 'action.selected', color: 'primary.main', fontSize: 15, fontWeight: 700 }}>{p.company[0]?.toUpperCase()}</Avatar>
                      <ListItemText primary={p.company} secondary={`${followState(p) === 'overdue' ? 'En retard' : 'Échéance'} : ${fmtDate(p.nextFollowUp)}`} slotProps={{ primary: { noWrap: true, sx: { fontWeight: 500 } }, secondary: { noWrap: true } }} sx={{ minWidth: 0 }} />
                    </ListItemButton>
                  ))}
                </List>
              ) : <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>Aucune relance en attente.</Typography>}
            </Card>
            <CallTimer />
          </Stack>
        </Grid>

        <Grid size={12}>
          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
                <Typography variant="h6">Mes Maquettes</Typography>
                {[
                  ['Maquettes actives', store.templates.filter((t) => t.status === 'active').length],
                  ['Liens actifs', presentations.filter((p) => !p.revoked).length],
                  ['Vues des présentations', presentations.reduce((t, p) => t + p.viewCount, 0)],
                  ['Choix clients', store.templateClientSelections.length],
                ].map(([l, v]) => (
                  <Stack key={l} direction="row" spacing={1} sx={{ alignItems: 'baseline' }}><Typography variant="h5" component="span" color="primary">{v}</Typography><Typography variant="body2" color="text.secondary">{l}</Typography></Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  )
}
