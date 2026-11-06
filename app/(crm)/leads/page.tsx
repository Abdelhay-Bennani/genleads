'use client'
import {
  AddRounded, AlarmRounded, CallRounded, EmailOutlined, FilterAltOffRounded, LanguageRounded, SearchRounded, TableRowsRounded, TravelExploreRounded, ViewKanbanRounded,
} from '@mui/icons-material'
import {
  Box, Button, Card, Chip, IconButton, InputAdornment, MenuItem, Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
  useMediaQuery, useTheme,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { useMemo, useState } from 'react'
import { Prospection } from '@/components/leads/Prospection'
import { useLeadDrawer } from '@/components/shell/LeadDrawerContext'
import { EmptyState, NeedChip, PageHeader, StatusChip, UserAvatar } from '@/components/ui'
import { useStore } from '@/lib/client/store'
import { NEEDS, SECTORS, STATUSES } from '@/lib/shared/data'
import type { Prospect, Status } from '@/lib/shared/types'
import { dealValue, ensureHttp, eur, fmtDate, followState, normalize, telHref } from '@/lib/shared/utils'

const VIEW_KEY = 'agenceflow:leads-view'

function FollowChip({ p }: { p: Prospect }) {
  const s = followState(p)
  if (s === 'none') return <Typography variant="caption" color="text.disabled">—</Typography>
  return <Chip size="small" icon={<AlarmRounded />} variant="outlined" color={s === 'overdue' ? 'error' : s === 'today' ? 'warning' : 'default'} label={s === 'today' ? "Aujourd'hui" : fmtDate(p.nextFollowUp)} />
}

export default function LeadsPage() {
  const store = useStore()
  const drawer = useLeadDrawer()
  const theme = useTheme()
  const mobile = useMediaQuery(theme.breakpoints.down('md'))
  const [tab, setTab] = useState<'pipeline' | 'prospection'>('pipeline')
  const [view, setView] = useState<'table' | 'kanban'>(() => { try { return (localStorage.getItem(VIEW_KEY) as 'table' | 'kanban') || 'table' } catch { return 'table' } })
  const [q, setQ] = useState('')
  const [f, setF] = useState({ status: '' as Status | '', city: '', need: '', sector: '', assignee: '', follow: false })

  const cities = useMemo(() => [...new Set(store.prospects.map((p) => p.city.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')), [store.prospects])
  const sectors = useMemo(() => [...new Set([...SECTORS, ...store.prospects.flatMap((p) => p.sectors)])], [store.prospects])
  const list = useMemo(() => {
    const nq = normalize(q)
    return store.prospects.filter((p) => {
      if (nq && !normalize([p.company, p.contact, p.city, p.email, p.phone, p.activity, p.sectors.join(' ')].join(' ')).includes(nq)) return false
      if (f.status && view === 'table' && p.status !== f.status) return false
      if (f.need && p.need !== f.need) return false
      if (f.sector && !p.sectors.includes(f.sector)) return false
      if (f.city && p.city.trim() !== f.city) return false
      if (f.assignee === 'none' ? p.assignee : f.assignee && p.assignee !== f.assignee) return false
      if (f.follow && !['overdue', 'today'].includes(followState(p))) return false
      return true
    })
  }, [store.prospects, q, f, view])
  const activeFilters = [f.status, f.city, f.need, f.sector, f.assignee, f.follow ? 'x' : ''].filter(Boolean).length
  const setViewSaved = (v: 'table' | 'kanban') => { setView(v); try { localStorage.setItem(VIEW_KEY, v) } catch { /* noop */ } }

  const columns: GridColDef<Prospect>[] = [
    { field: 'company', headerName: 'Entreprise', flex: 1.4, minWidth: 170, renderCell: ({ row }) => (
      <Box sx={{ minWidth: 0, py: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{row.company}</Typography>
        <Typography variant="caption" color={row.hasWebsite ? 'text.secondary' : 'warning.main'} noWrap component="p">{row.hasWebsite ? row.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') || 'Site : oui' : 'Sans site'}</Typography>
      </Box>
    ) },
    { field: 'city', headerName: 'Ville', flex: 0.7, minWidth: 100 },
    { field: 'sectors', headerName: 'Secteur', flex: 1, minWidth: 120, sortable: false, renderCell: ({ row }) => <Stack direction="row" spacing={0.5}>{row.sectors.slice(0, 2).map((s) => <Chip key={s} size="small" label={s} variant="outlined" />)}{row.sectors.length > 2 && <Chip size="small" label={`+${row.sectors.length - 2}`} />}</Stack> },
    { field: 'need', headerName: 'Besoin', width: 105, renderCell: ({ row }) => <NeedChip need={row.need} /> },
    { field: 'value', headerName: 'Valeur', width: 95, type: 'number', valueGetter: (_v, row) => dealValue(row, store.packs), renderCell: ({ value }) => value ? eur(value as number) : '—' },
    { field: 'status', headerName: 'Statut', width: 170, sortComparator: (a, b) => STATUSES.findIndex((s) => s.id === a) - STATUSES.findIndex((s) => s.id === b), renderCell: ({ row }) => <StatusChip status={row.status} /> },
    { field: 'assignee', headerName: 'Assigné', width: 80, renderCell: ({ row }) => <UserAvatar name={row.assignee} /> },
    { field: 'nextFollowUp', headerName: 'Relance', width: 120, renderCell: ({ row }) => <FollowChip p={row} /> },
    { field: 'actions', headerName: '', width: 108, sortable: false, align: 'right', renderCell: ({ row }) => (
      <Stack direction="row" onClick={(e) => e.stopPropagation()}>
        {row.phone && <Tooltip title={row.phone}><IconButton size="small" href={telHref(row.phone)}><CallRounded fontSize="small" /></IconButton></Tooltip>}
        {row.email && <Tooltip title={row.email}><IconButton size="small" href={`mailto:${row.email}`}><EmailOutlined fontSize="small" /></IconButton></Tooltip>}
        {row.url && <Tooltip title="Ouvrir le site"><IconButton size="small" href={ensureHttp(row.url)} target="_blank"><LanguageRounded fontSize="small" /></IconButton></Tooltip>}
      </Stack>
    ) },
  ]

  return (
    <>
      <PageHeader title="Leads CRM" subtitle={tab === 'pipeline' ? `${list.length} lead${list.length > 1 ? 's' : ''} affiché${list.length > 1 ? 's' : ''} sur ${store.prospects.length}` : 'Requêtes Google prêtes à l’emploi pour trouver de nouveaux leads.'}
        actions={<>
          {tab === 'pipeline' && <ToggleButtonGroup size="small" exclusive value={view} onChange={(_e, v) => v && setViewSaved(v)}>
            <ToggleButton value="table" sx={{ gap: 0.75, px: 1.5 }}><TableRowsRounded fontSize="small" />Tableau</ToggleButton>
            <ToggleButton value="kanban" sx={{ gap: 0.75, px: 1.5 }}><ViewKanbanRounded fontSize="small" />Kanban</ToggleButton>
          </ToggleButtonGroup>}
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => drawer.create()}>Nouveau lead</Button>
        </>} />

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="pipeline" label="Pipeline" />
        <Tab value="prospection" icon={<TravelExploreRounded fontSize="small" />} iconPosition="start" label="Prospection Google" />
      </Tabs>

      {tab === 'prospection' ? <Prospection onConvert={(seed) => drawer.create(seed)} /> : (
        <>
          <Card sx={{ p: 1.5, mb: 2 }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.25} sx={{ alignItems: { lg: 'center' } }}>
              <TextField placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ maxWidth: { lg: 260 } }}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> } }} />
              <Box sx={{ display: 'grid', gap: 1.25, flex: 1, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(auto-fill, minmax(150px, 1fr))' } }}>
                {view === 'table' && <TextField select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Status })} slotProps={{ select: { displayEmpty: true } }}><MenuItem value="">Tous statuts</MenuItem>{STATUSES.map((s) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}</TextField>}
                <TextField select value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} slotProps={{ select: { displayEmpty: true } }}><MenuItem value="">Toutes villes</MenuItem>{cities.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField>
                <TextField select value={f.need} onChange={(e) => setF({ ...f, need: e.target.value })} slotProps={{ select: { displayEmpty: true } }}><MenuItem value="">Tous besoins</MenuItem>{NEEDS.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}</TextField>
                <TextField select value={f.sector} onChange={(e) => setF({ ...f, sector: e.target.value })} slotProps={{ select: { displayEmpty: true } }}><MenuItem value="">Tous secteurs</MenuItem>{sectors.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
                <TextField select value={f.assignee} onChange={(e) => setF({ ...f, assignee: e.target.value })} slotProps={{ select: { displayEmpty: true } }}><MenuItem value="">Toute l'équipe</MenuItem>{store.members.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}<MenuItem value="none">Non assignés</MenuItem></TextField>
                <ToggleButton value="follow" selected={f.follow} size="small" color="warning" onChange={() => setF({ ...f, follow: !f.follow })} sx={{ gap: 0.75 }}><AlarmRounded fontSize="small" />À relancer</ToggleButton>
              </Box>
              {(activeFilters > 0 || q) && <Button size="small" startIcon={<FilterAltOffRounded />} onClick={() => { setQ(''); setF({ status: '', city: '', need: '', sector: '', assignee: '', follow: false }) }}>Effacer</Button>}
            </Stack>
          </Card>

          {store.prospects.length === 0 ? <Card><EmptyState icon={<TravelExploreRounded />} title="Aucun lead">Ajoutez votre premier lead ou importez votre CSV depuis Paramètres → Données.</EmptyState></Card>
            : view === 'kanban' ? <Kanban list={list} />
              : mobile ? (
                <Stack spacing={1.25}>
                  {list.map((p) => (
                    <Card key={p.id} sx={{ p: 1.75, cursor: 'pointer' }} onClick={() => drawer.open(p.id)}>
                      <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                        <Box sx={{ minWidth: 0 }}><Typography sx={{ fontWeight: 600 }} noWrap>{p.company}</Typography><Typography variant="caption" color="text.secondary" noWrap component="p">{[p.city, p.sectors.join(', ')].filter(Boolean).join(' · ')}</Typography></Box>
                        <UserAvatar name={p.assignee} />
                      </Stack>
                      <Stack direction="row" sx={{ mt: 1, flexWrap: 'wrap', gap: 0.75 }}><StatusChip status={p.status} /><NeedChip need={p.need} /><FollowChip p={p} /></Stack>
                      {(p.phone || p.email) && (
                        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} onClick={(e) => e.stopPropagation()}>
                          {p.phone && <Button fullWidth variant="contained" size="small" startIcon={<CallRounded />} href={telHref(p.phone)}>Appeler</Button>}
                          {p.email && <Button fullWidth variant="outlined" size="small" startIcon={<EmailOutlined />} href={`mailto:${p.email}`}>Email</Button>}
                        </Stack>
                      )}
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Card>
                  <DataGrid rows={list} columns={columns} getRowHeight={() => 'auto'} onRowClick={({ row }) => drawer.open(row.id)} disableRowSelectionOnClick
                    initialState={{ sorting: { sortModel: [{ field: 'nextFollowUp', sort: 'asc' }] }, pagination: { paginationModel: { pageSize: 25 } } }}
                    pageSizeOptions={[25, 50, 100]} autoHeight sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
                    localeText={{ noRowsLabel: 'Aucun résultat — modifiez ou effacez les filtres.', paginationRowsPerPage: 'Lignes par page' }} />
                </Card>
              )}
        </>
      )}
    </>
  )
}

function Kanban({ list }: { list: Prospect[] }) {
  const store = useStore()
  const drawer = useLeadDrawer()
  const [over, setOver] = useState<Status | null>(null)
  return (
    <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 2, mx: { xs: -2, sm: 0 }, px: { xs: 2, sm: 0 } }}>
      {STATUSES.map((s) => {
        const items = list.filter((p) => p.status === s.id)
        const total = items.reduce((t, p) => t + dealValue(p, store.packs), 0)
        return (
          <Box key={s.id}
            onDragOver={(e) => { e.preventDefault(); setOver(s.id) }} onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) store.updateProspect(id, { status: s.id }); setOver(null) }}
            sx={{ width: 280, flexShrink: 0, borderRadius: 3, p: 1.25, bgcolor: 'action.hover', border: 1, borderColor: over === s.id ? s.hex : 'divider', boxShadow: over === s.id ? `0 0 24px -6px ${s.hex}` : 'none', transition: '0.15s' }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 0.5, pb: 1.25 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.hex, boxShadow: `0 0 10px ${s.hex}` }} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.label}</Typography>
                <Chip size="small" label={items.length} />
              </Stack>
              {total > 0 && <Typography variant="caption" color="text.secondary">{eur(total)}</Typography>}
            </Stack>
            <Stack spacing={1} sx={{ minHeight: 120 }}>
              {items.map((p) => (
                <Card key={p.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)} onClick={() => drawer.open(p.id)}
                  sx={{ p: 1.5, cursor: 'grab', '&:hover': { borderColor: 'primary.main' } }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{p.company}</Typography>
                    <UserAvatar name={p.assignee} size={22} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" noWrap component="p">{[p.city, p.sectors[0]].filter(Boolean).join(' · ') || '—'}</Typography>
                  <Stack direction="row" sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                    <NeedChip need={p.need} />
                    {dealValue(p, store.packs) > 0 && <Typography variant="caption" sx={{ fontWeight: 700 }}>{eur(dealValue(p, store.packs))}</Typography>}
                    {followState(p) !== 'none' && <FollowChip p={p} />}
                  </Stack>
                </Card>
              ))}
              {!items.length && <Typography variant="caption" color="text.disabled" align="center" sx={{ py: 3 }}>Glissez une carte ici</Typography>}
            </Stack>
          </Box>
        )
      })}
    </Box>
  )
}
