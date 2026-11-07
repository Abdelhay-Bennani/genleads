'use client'
import { AlarmRounded, AutoGraphRounded, CheckCircleOutlineRounded, EuroRounded, GroupsRounded, RepeatRounded, StarRounded } from '@mui/icons-material'
import { Box, Card, CardContent, Chip, Divider, Grid, List, ListItemButton, ListItemText, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import { SparkLineChart } from '@mui/x-charts/SparkLineChart'
import { ReactNode, useMemo, useState } from 'react'
import { useLeadDrawer } from '@/components/shell/LeadDrawerContext'
import { brand } from '@/components/theme/theme'
import { GradientText, PageHeader, UserAvatar } from '@/components/ui'
import { useStore } from '@/lib/client/store'
import { STATUSES } from '@/lib/shared/data'
import { dealValue, eur, fmtDate, fmtDateTime, followState, isClosed, quote } from '@/lib/shared/utils'

const WEEKS = 8
const weekIndex = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / (7 * 864e5)
  return WEEKS - 1 - Math.floor(diff)
}

function StatCard({ icon, label, value, sub, series, color = brand.violet }: { icon: ReactNode; label: string; value: string; sub?: string; series?: number[]; color?: string }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
          <Box sx={{ width: 28, height: 28, borderRadius: 2, display: 'grid', placeItems: 'center', color, bgcolor: `${color}1f`, '& svg': { fontSize: 16 } }}>{icon}</Box>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
        </Stack>
        <Stack direction="row" sx={{ mt: 1.5, alignItems: 'flex-end', justifyContent: 'space-between', gap: 1 }}>
          <Box>
            <Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
            {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
          </Box>
          {series && series.some(Boolean) && (
            <Box sx={{ width: 96, height: 44 }}>
              <SparkLineChart data={series} height={44} width={96} area curve="natural" color={color} />
            </Box>
          )}
        </Stack>
      </CardContent>
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
    const weekly = (dates: string[]) => { const a = Array(WEEKS).fill(0); for (const d of dates) { const i = weekIndex(d); if (i >= 0 && i < WEEKS) a[i]++ } return a }
    return {
      list, active, won, lost,
      potential: active.reduce((t, p) => t + dealValue(p, store.packs), 0),
      validated: won.reduce((t, p) => t + dealValue(p, store.packs), 0),
      mrr: won.reduce((t, p) => t + quote(p, store.packs).mrr, 0),
      mrrPipe: active.reduce((t, p) => t + quote(p, store.packs).mrr, 0),
      follow: active.filter((p) => ['overdue', 'today'].includes(followState(p))).sort((a, b) => (a.nextFollowUp ?? '').localeCompare(b.nextFollowUp ?? '')),
      upcoming: active.filter((p) => followState(p) === 'upcoming').sort((a, b) => (a.nextFollowUp ?? '').localeCompare(b.nextFollowUp ?? '')).slice(0, 6),
      stages: STATUSES.map((s) => { const it = list.filter((p) => p.status === s.id); return { ...s, count: it.length, value: it.reduce((t, p) => t + dealValue(p, store.packs), 0) } }),
      recent: list.flatMap((p) => p.interactions.map((i) => ({ ...i, p }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7),
      seriesLeads: weekly(list.map((p) => p.createdAt)),
      seriesActivity: weekly(list.flatMap((p) => p.interactions.map((i) => i.date))),
      seriesWon: weekly(won.map((p) => p.updatedAt)),
    }
  }, [store.prospects, store.packs, who])

  const rate = m.list.length ? Math.round((m.won.length / m.list.length) * 100) : 0
  const closed = m.won.length + m.lost.length
  const overdue = m.follow.filter((p) => followState(p) === 'overdue').length
  const choices = store.templateClientSelections.length
  const hello = new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'

  return (
    <>
      <PageHeader title={<>{hello}, <GradientText>{store.me.name}</GradientText></>}
        subtitle={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        actions={
          <ToggleButtonGroup size="small" exclusive value={who} onChange={(_e, v) => v && setWho(v)}>
            <ToggleButton value="all" sx={{ px: 2 }}>Tous</ToggleButton>
            {store.members.map((n) => <ToggleButton key={n} value={n} sx={{ gap: 1, px: 1.5 }}><UserAvatar name={n} size={20} />{n}</ToggleButton>)}
          </ToggleButtonGroup>
        } />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><StatCard icon={<GroupsRounded />} label="Prospects dans le pipe" value={String(m.active.length)} sub={`${m.list.length} au total`} series={m.seriesLeads} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><StatCard icon={<AutoGraphRounded />} label="Taux de conversion" value={`${rate} %`} color={brand.cyan} sub={`${m.won.length} gagné${m.won.length > 1 ? 's' : ''}${closed ? ` · ${Math.round((m.won.length / closed) * 100)} % des affaires closes` : ''}`} series={m.seriesWon} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><StatCard icon={<EuroRounded />} label="CA one-shot validé" value={eur(m.validated)} color="#34d399" sub={`${eur(m.potential)} en potentiel`} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><StatCard icon={<RepeatRounded />} label="MRR (SEO + maintenance)" value={eur(m.mrr)} color={brand.pink} sub={`/mois · +${eur(m.mrrPipe)} en négociation`} /></Grid>
        <Grid size={{ xs: 12, sm: 12, lg: 2.4 }}><StatCard icon={<AlarmRounded />} label="Relances à faire" value={String(m.follow.length)} color="#fbbf24" sub={overdue ? `dont ${overdue} en retard` : "aujourd'hui"} series={m.seriesActivity} /></Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6">Répartition du pipeline</Typography>
              <Typography variant="caption" color="text.secondary">Nombre de leads par étape</Typography>
              <BarChart height={290} layout="horizontal" borderRadius={6} grid={{ vertical: true }}
                yAxis={[{ scaleType: 'band', data: m.stages.map((s) => s.label), width: 140, colorMap: { type: 'ordinal', values: m.stages.map((s) => s.label), colors: m.stages.map((s) => s.hex) } }]}
                xAxis={[{ tickMinStep: 1 }]}
                series={[{ data: m.stages.map((s) => s.count), label: 'Leads', valueFormatter: (v, { dataIndex }) => `${v} · ${eur(m.stages[dataIndex].value)}` }]}
                hideLegend margin={{ left: 0, right: 16 }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ pb: 1 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">À relancer aujourd'hui</Typography>
                {m.follow.length > 0 && <Chip size="small" color="warning" label={m.follow.length} />}
              </Stack>
            </CardContent>
            {m.follow.length === 0 ? (
              <Stack direction="row" spacing={1} sx={{ px: 2, pb: 2, color: 'text.secondary', alignItems: 'center' }}><CheckCircleOutlineRounded color="success" fontSize="small" /><Typography variant="body2">Aucune relance en attente. Bien joué !</Typography></Stack>
            ) : (
              <List dense sx={{ px: 1 }}>
                {m.follow.slice(0, 6).map((p) => (
                  <ListItemButton key={p.id} onClick={() => drawer.open(p.id)} sx={{ gap: 1.5 }}>
                    <UserAvatar name={p.assignee} />
                    <ListItemText primary={p.company} secondary={p.interactions[0]?.text ?? p.city} slotProps={{ primary: { noWrap: true, sx: { fontWeight: 600 } }, secondary: { noWrap: true } }} />
                    <Chip size="small" variant="outlined" color={followState(p) === 'overdue' ? 'error' : 'warning'} label={followState(p) === 'overdue' ? `Retard · ${fmtDate(p.nextFollowUp)}` : "Aujourd'hui"} />
                  </ListItemButton>
                ))}
              </List>
            )}
            {m.upcoming.length > 0 && (
              <>
                <Divider />
                <Box sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">À venir</Typography>
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
                    {m.upcoming.map((p) => <Chip key={p.id} size="small" label={`${p.company} · ${fmtDate(p.nextFollowUp)}`} onClick={() => drawer.open(p.id)} />)}
                  </Stack>
                </Box>
              </>
            )}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent sx={{ pb: 0 }}><Typography variant="h6">Activité récente</Typography></CardContent>
            {m.recent.length === 0 ? <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>Les appels, emails et notes ajoutés au journal apparaîtront ici.</Typography> : (
              <List sx={{ px: 1 }}>
                {m.recent.map((r) => (
                  <ListItemButton key={r.id} onClick={() => drawer.open(r.p.id, 'journal')} sx={{ gap: 1.5, alignItems: 'flex-start' }}>
                    <UserAvatar name={r.author} />
                    <ListItemText primary={<><b>{r.type}</b> · {r.p.company}</>} secondary={r.text} slotProps={{ secondary: { noWrap: true } }} sx={{ minWidth: 0 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', mt: 0.5 }}>{fmtDateTime(r.date)}</Typography>
                  </ListItemButton>
                ))}
              </List>
            )}
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6">Mes Maquettes</Typography>
              <Typography variant="caption" color="text.secondary">Présentations envoyées aux prospects</Typography>
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {[
                  ['Maquettes actives', store.templates.filter((t) => t.status === 'active').length],
                  ['Liens actifs', store.templatePresentations.filter((p) => !p.revoked).length],
                  ['Vues des présentations', store.templatePresentations.reduce((t, p) => t + p.viewCount, 0)],
                ].map(([l, v]) => (
                  <Stack key={l as string} direction="row" sx={{ justifyContent: 'space-between' }}><Typography variant="body2" color="text.secondary">{l}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{v}</Typography></Stack>
                ))}
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Choix clients</Typography>
                  <Chip size="small" icon={<StarRounded />} label={choices} color={choices ? 'warning' : 'default'} variant="outlined" />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  )
}

