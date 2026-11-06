'use client'
import { AlarmRounded, CheckCircleOutlineRounded, EventAvailableRounded, ScheduleRounded, WarningAmberRounded } from '@mui/icons-material'
import { Box, Button, Card, Chip, Divider, Grid, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import { ReactNode, useState } from 'react'
import { useLeadDrawer } from '@/components/shell/LeadDrawerContext'
import { PageHeader, StatusChip, UserAvatar } from '@/components/ui'
import { useStore } from '@/lib/client/store'
import type { Prospect } from '@/lib/shared/types'
import { addDays, fmtDate, isClosed, todayISO } from '@/lib/shared/utils'

export default function TachesPage() {
  const store = useStore()
  const drawer = useLeadDrawer()
  const [who, setWho] = useState<string>('all')
  const t = todayISO()
  const in7 = addDays(t, 7)
  const base = store.prospects.filter((p) => !isClosed(p) && (who === 'all' || p.assignee === who))
  const by = (fn: (p: Prospect) => boolean) => base.filter(fn).sort((a, b) => (a.nextFollowUp ?? '').localeCompare(b.nextFollowUp ?? ''))
  const groups: { key: string; title: string; icon: ReactNode; color: 'error' | 'warning' | 'info' | 'default'; items: Prospect[] }[] = [
    { key: 'late', title: 'En retard', icon: <WarningAmberRounded />, color: 'error', items: by((p) => !!p.nextFollowUp && p.nextFollowUp < t) },
    { key: 'today', title: "Aujourd'hui", icon: <AlarmRounded />, color: 'warning', items: by((p) => p.nextFollowUp === t) },
    { key: 'week', title: '7 prochains jours', icon: <EventAvailableRounded />, color: 'info', items: by((p) => !!p.nextFollowUp && p.nextFollowUp > t && p.nextFollowUp <= in7) },
    { key: 'later', title: 'Plus tard', icon: <ScheduleRounded />, color: 'default', items: by((p) => !!p.nextFollowUp && p.nextFollowUp > in7) },
  ]
  const none = base.filter((p) => !p.nextFollowUp)

  const Row = ({ p }: { p: Prospect }) => (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ p: 1.5, alignItems: { sm: 'center' } }}>
      <Stack direction="row" spacing={1.5} sx={{ flex: 1, minWidth: 0, alignItems: 'center', cursor: 'pointer' }} onClick={() => drawer.open(p.id, 'journal')}>
        <UserAvatar name={p.assignee} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{p.company}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="p">{p.interactions[0]?.text ?? [p.city, p.phone].filter(Boolean).join(' · ')}</Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
        <StatusChip status={p.status} />
        {p.nextFollowUp && <Chip size="small" variant="outlined" label={fmtDate(p.nextFollowUp)} />}
        <Tooltip title="Reporter de 3 jours"><Button size="small" variant="outlined" onClick={() => store.updateProspect(p.id, { nextFollowUp: addDays(t, 3) })}>+3j</Button></Tooltip>
        <Tooltip title="Marquer comme faite (retire la relance)"><Button size="small" variant="contained" color="success" startIcon={<CheckCircleOutlineRounded />} onClick={() => { store.updateProspect(p.id, { nextFollowUp: null }); store.addInteraction(p.id, { type: 'Note', text: 'Relance effectuée.' }) }}>Fait</Button></Tooltip>
      </Stack>
    </Stack>
  )

  return (
    <>
      <PageHeader title="Tâches & Relances" subtitle="Toutes les relances programmées sur vos leads."
        actions={<ToggleButtonGroup size="small" exclusive value={who} onChange={(_e, v) => v && setWho(v)}>
          <ToggleButton value="all" sx={{ px: 2 }}>Toute l'équipe</ToggleButton>
          {store.members.map((n) => <ToggleButton key={n} value={n} sx={{ gap: 1, px: 1.5 }}><UserAvatar name={n} size={20} />{n}</ToggleButton>)}
        </ToggleButtonGroup>} />
      <Grid container spacing={2}>
        {groups.map((g) => (
          <Grid key={g.key} size={{ xs: 12, lg: 6 }}>
            <Card sx={{ height: '100%' }}>
              <Stack direction="row" spacing={1} sx={{ p: 2, alignItems: 'center' }}>
                <Box sx={{ color: g.color === 'default' ? 'text.secondary' : `${g.color}.main`, display: 'flex' }}>{g.icon}</Box>
                <Typography variant="h6">{g.title}</Typography>
                <Chip size="small" color={g.color} label={g.items.length} />
              </Stack>
              <Divider />
              {g.items.length ? g.items.map((p, i) => <Box key={p.id}>{i > 0 && <Divider />}<Row p={p} /></Box>)
                : <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>Rien à signaler.</Typography>}
            </Card>
          </Grid>
        ))}
        <Grid size={12}>
          <Card>
            <Stack direction="row" spacing={1} sx={{ p: 2, alignItems: 'center' }}>
              <Typography variant="h6">Leads actifs sans relance</Typography><Chip size="small" label={none.length} />
            </Stack>
            <Divider />
            <Stack direction="row" sx={{ p: 2, flexWrap: 'wrap', gap: 1 }}>
              {none.map((p) => <Chip key={p.id} label={p.company} onClick={() => drawer.open(p.id)} onDelete={() => store.updateProspect(p.id, { nextFollowUp: addDays(t, 1) })} deleteIcon={<Tooltip title="Relancer demain"><AlarmRounded /></Tooltip>} />)}
              {!none.length && <Typography variant="body2" color="text.secondary">Tous vos leads actifs ont une relance programmée. 👌</Typography>}
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </>
  )
}
