'use client'
import { AddRounded, CallRounded, FilterAltOffRounded, MapOutlined, SearchRounded, ShareOutlined, TravelExploreRounded } from '@mui/icons-material'
import { Box, Button, Card, CardContent, Grid, IconButton, InputAdornment, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { useEffect, useMemo, useState } from 'react'
import { useLeadDrawer } from '@/components/shell/LeadDrawerContext'
import { EmptyState, PageHeader, StatTile, StatusChip } from '@/components/ui'
import { useStore } from '@/lib/client/store'
import { STATUSES } from '@/lib/shared/data'
import type { Prospect, Status } from '@/lib/shared/types'
import { ensureHttp, followState, googleUrl, isClosed, isSiteUnverified, mapsUrl, normalize, telHref } from '@/lib/shared/utils'

const EMPTY = { q: '', trade: '', city: '', department: '', session: '', status: 'open', phone: 'all', site: 'none' }
const uniq = (l: (string | undefined)[]) => [...new Set(l.map((x) => (x ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'))
const socialLink = (s: string) => ensureHttp(s.split(/\s+\(/)[0].trim())

export default function ProspectsPage() {
  const store = useStore()
  const drawer = useLeadDrawer()
  const [f, setF] = useState(EMPTY)
  const [search, setSearch] = useState({ trade: 'électricien', city: 'Saverne' })
  const set = (patch: Partial<typeof EMPTY>) => setF((x) => ({ ...x, ...patch }))

  // Lien direct vers une session de phoning depuis le Dashboard : /prospects?session=…
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('session')
    if (s) setF((x) => ({ ...x, session: s }))
  }, [])

  const trades = useMemo(() => uniq(store.prospects.map((p) => p.trade)), [store.prospects])
  const cities = useMemo(() => uniq(store.prospects.map((p) => p.city)), [store.prospects])
  const departments = useMemo(() => uniq(store.prospects.map((p) => p.department)), [store.prospects])
  const sessions = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of store.prospects) if (p.callSession) m.set(p.callSession, p.nextFollowUp ?? '9999')
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0])).map(([s]) => s)
  }, [store.prospects])

  const list = useMemo(() => {
    const nq = normalize(f.q)
    return store.prospects.filter((p) => {
      if (nq && !normalize([p.company, p.trade, p.activity, p.city, p.address, p.phone, p.email, p.sectors.join(' ')].join(' ')).includes(nq)) return false
      if (f.trade && p.trade !== f.trade) return false
      if (f.city && p.city !== f.city) return false
      if (f.department && p.department !== f.department) return false
      if (f.session && p.callSession !== f.session) return false
      if (f.status === 'open' ? isClosed(p) : f.status && p.status !== f.status) return false
      if (f.phone === 'with' && !p.phone) return false
      if (f.phone === 'without' && p.phone) return false
      if (f.site === 'none' && p.hasWebsite) return false
      return true
    })
  }, [store.prospects, f])

  const noSite = store.prospects.filter((p) => !p.hasWebsite && !isClosed(p) && !isSiteUnverified(p))
  const toCall = noSite.filter((p) => p.status === 'a_contacter' && p.phone)
  const missingPhone = noSite.filter((p) => !p.phone)
  const due = store.prospects.filter((p) => ['overdue', 'today'].includes(followState(p)))
  const overdue = due.filter((p) => followState(p) === 'overdue').length
  const filtered = JSON.stringify(f) !== JSON.stringify(EMPTY)
  const q = `${search.trade} ${search.city}`.trim()

  const columns: GridColDef<Prospect>[] = [
    { field: 'company', headerName: 'Entreprise', flex: 1.5, minWidth: 190, renderCell: ({ row }) => (
      <Box sx={{ minWidth: 0, py: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{row.company}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap component="p">{row.address || 'Adresse non renseignée'}</Typography>
      </Box>
    ) },
    { field: 'trade', headerName: 'Métier', flex: 0.9, minWidth: 130, valueGetter: (_v, r) => r.trade || r.sectors[0] || '—' },
    { field: 'city', headerName: 'Commune', flex: 1, minWidth: 130 },
    { field: 'phone', headerName: 'Téléphone', width: 165, sortable: false, renderCell: ({ row }) => row.phone
      ? <Button size="small" startIcon={<CallRounded />} href={telHref(row.phone)} onClick={(e) => e.stopPropagation()} sx={{ px: 0.5, whiteSpace: 'nowrap' }}>{row.phone}</Button>
      : <Typography variant="caption" color="text.disabled">À trouver</Typography> },
    { field: 'callSession', headerName: 'Session', width: 165, valueGetter: (_v, r) => r.callSession || '—' },
    { field: 'status', headerName: 'Statut', width: 185, sortComparator: (a, b) => STATUSES.findIndex((s) => s.id === a) - STATUSES.findIndex((s) => s.id === b), renderCell: ({ row }) => <StatusChip status={row.status} /> },
    { field: 'actions', headerName: '', width: 88, sortable: false, filterable: false, align: 'right', renderCell: ({ row }) => (
      <Stack direction="row" onClick={(e) => e.stopPropagation()}>
        <Tooltip title="Revérifier la fiche Google Maps"><IconButton size="small" href={mapsUrl(`${row.company} ${row.address ?? ''} ${row.city}`)} target="_blank"><MapOutlined fontSize="small" /></IconButton></Tooltip>
        {row.socials && <Tooltip title={row.socials}><IconButton size="small" href={socialLink(row.socials)} target="_blank"><ShareOutlined fontSize="small" /></IconButton></Tooltip>}
      </Stack>
    ) },
  ]

  return (
    <>
      <PageHeader title="Trouver des prospects" subtitle="Filtrez votre base d’entreprises sans site, préparez vos appels et cherchez-en de nouvelles."
        actions={<Button variant="contained" startIcon={<AddRounded />} onClick={() => drawer.create({ city: search.city, trade: search.trade, source: 'Recherche de prospects' })}>Ajouter un prospect</Button>} />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatTile filled label="Prospects sans site" value={noSite.length} sub="Dans votre pipeline" onClick={() => setF({ ...EMPTY })} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatTile label="Prêts à appeler" value={toCall.length} sub="Avec un numéro de téléphone" onClick={() => setF({ ...EMPTY, status: 'a_contacter', phone: 'with' })} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatTile label="Appels à faire" value={due.length} sub={overdue ? `Dont ${overdue} en retard` : 'Aujourd’hui'} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatTile label="Téléphone manquant" value={missingPhone.length} sub="À compléter avant l’appel" onClick={() => setF({ ...EMPTY, phone: 'without' })} /></Grid>
      </Grid>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField placeholder="Entreprise, métier, adresse, téléphone…" value={f.q} onChange={(e) => set({ q: e.target.value })} aria-label="Rechercher"
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}><TextField select label="Métier" value={f.trade} onChange={(e) => set({ trade: e.target.value })}><MenuItem value="">Tous</MenuItem>{trades.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 6, md: 3 }}><TextField select label="Commune" value={f.city} onChange={(e) => set({ city: e.target.value })}><MenuItem value="">Toutes</MenuItem>{cities.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 12, md: 3 }}><TextField select label="Session d’appels" value={f.session} onChange={(e) => set({ session: e.target.value })}><MenuItem value="">Toutes</MenuItem>{sessions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 6, md: 2 }}><TextField select label="Statut" value={f.status} onChange={(e) => set({ status: e.target.value })}><MenuItem value="open">En cours</MenuItem><MenuItem value="">Tous</MenuItem>{STATUSES.map((s) => <MenuItem key={s.id} value={s.id as Status}>{s.label}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 6, md: 2 }}><TextField select label="Département" value={f.department} onChange={(e) => set({ department: e.target.value })}><MenuItem value="">Tous</MenuItem>{departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 12, sm: 'auto' }}>
              <ToggleButtonGroup size="small" exclusive value={f.phone} onChange={(_e, v) => v && set({ phone: v })} aria-label="Téléphone">
                <ToggleButton value="all">Tous</ToggleButton><ToggleButton value="with">Avec tél.</ToggleButton><ToggleButton value="without">Sans tél.</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid size={{ xs: 12, sm: 'auto' }}>
              <ToggleButtonGroup size="small" exclusive value={f.site} onChange={(_e, v) => v && set({ site: v })} aria-label="Site web">
                <ToggleButton value="none">Sans site</ToggleButton><ToggleButton value="all">Avec et sans</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid size="grow" sx={{ textAlign: 'right' }}>
              {filtered && <Button startIcon={<FilterAltOffRounded />} onClick={() => setF({ ...EMPTY })}>Effacer les filtres</Button>}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        {list.length ? (
          <DataGrid rows={list} columns={columns} autoHeight getRowHeight={() => 'auto'} disableRowSelectionOnClick onRowClick={({ row }) => drawer.open(row.id)}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} pageSizeOptions={[25, 50, 100]} sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }} />
        ) : <EmptyState icon={<SearchRounded />} title="Aucun prospect ne correspond">Modifiez ou effacez les filtres.</EmptyState>}
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6">Chercher de nouvelles entreprises</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Ouvre la recherche dans un nouvel onglet : gardez celles sans bouton « Site web » puis ajoutez-les ici.</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
            <TextField label="Métier" value={search.trade} onChange={(e) => setSearch({ ...search, trade: e.target.value })} />
            <TextField label="Ville" value={search.city} onChange={(e) => setSearch({ ...search, city: e.target.value })} />
            <Button variant="contained" startIcon={<MapOutlined />} disabled={!q} href={mapsUrl(q)} target="_blank" sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>Google Maps</Button>
            <Button variant="outlined" startIcon={<TravelExploreRounded />} disabled={!q} href={googleUrl(`site:pagesjaunes.fr ${q}`)} target="_blank" sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>Pages Jaunes</Button>
            <Button variant="outlined" startIcon={<TravelExploreRounded />} disabled={!q} href={googleUrl(`site:facebook.com "${search.trade.trim()}" "${search.city.trim()}"`)} target="_blank" sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>Facebook</Button>
          </Stack>
        </CardContent>
      </Card>
    </>
  )
}
