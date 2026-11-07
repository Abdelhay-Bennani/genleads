'use client'
import { DescriptionOutlined, PictureAsPdfOutlined } from '@mui/icons-material'
import { Card, Chip, Grid, Stack, Tab, Tabs, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { useState } from 'react'
import { isExpired, QuoteActions, QuoteStatusChip } from '@/components/quote/QuoteList'
import { useLeadDrawer } from '@/components/shell/LeadDrawerContext'
import { EmptyState, PageHeader, StatusChip } from '@/components/ui'
import { useStore } from '@/lib/client/store'
import { STATUSES } from '@/lib/shared/data'
import type { Prospect, Quote } from '@/lib/shared/types'
import { eur, fmtDate, quote, quoteTotals } from '@/lib/shared/utils'

export default function DevisPage() {
  const store = useStore()
  const drawer = useLeadDrawer()
  const [tab, setTab] = useState<'emis' | 'chiffrages'>('emis')
  const live = store.quotes.filter((q) => q.status !== 'annule')
  const sumHT = (l: Quote[]) => l.reduce((t, q) => t + quoteTotals(q).oneShotHT, 0)
  const sumMRR = (l: Quote[]) => l.reduce((t, q) => t + quoteTotals(q).monthlyHT, 0)
  const pending = live.filter((q) => q.status === 'envoye' && !isExpired(q))
  const accepted = live.filter((q) => q.status === 'accepte')
  const decided = live.filter((q) => q.status === 'accepte' || q.status === 'refuse').length

  const drafts = store.prospects.filter((p) => p.packIds.length > 0)

  const quoteCols: GridColDef<Quote>[] = [
    { field: 'number', headerName: 'N°', width: 130, renderCell: ({ row }) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.number}</Typography> },
    { field: 'client', headerName: 'Client', flex: 1.2, minWidth: 160, valueGetter: (_v, r) => r.client.company },
    { field: 'lines', headerName: 'Prestations', flex: 2, minWidth: 220, sortable: false, renderCell: ({ row }) => <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, py: 1 }}>{row.lines.map((l, i) => <Chip key={i} size="small" variant="outlined" label={l.name} />)}</Stack> },
    { field: 'ht', headerName: 'Création HT', width: 120, type: 'number', valueGetter: (_v, r) => quoteTotals(r).oneShotHT, renderCell: ({ value }) => eur(value as number) },
    { field: 'mrr', headerName: 'Mensuel HT', width: 115, type: 'number', valueGetter: (_v, r) => quoteTotals(r).monthlyHT, renderCell: ({ value }) => value ? `${eur(value as number)}/mois` : '—' },
    { field: 'status', headerName: 'Statut', width: 115, renderCell: ({ row }) => <QuoteStatusChip q={row} /> },
    { field: 'createdAt', headerName: 'Émis le', width: 95, renderCell: ({ row }) => fmtDate(row.createdAt) },
    { field: 'validUntil', headerName: 'Valable', width: 95, renderCell: ({ row }) => fmtDate(row.validUntil) },
    { field: 'actions', headerName: '', width: 90, sortable: false, filterable: false, renderCell: ({ row }) => <QuoteActions q={row} /> },
  ]
  const draftCols: GridColDef<Prospect>[] = [
    { field: 'company', headerName: 'Lead', flex: 1.2, minWidth: 170, renderCell: ({ row }) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.company}</Typography> },
    { field: 'packs', headerName: 'Prestations', flex: 2, minWidth: 220, sortable: false, renderCell: ({ row }) => <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, py: 1 }}>{quote(row, store.packs).sel.map((k) => <Chip key={k.id} size="small" variant="outlined" label={k.name} />)}</Stack> },
    { field: 'template', headerName: 'Maquette', flex: 1, minWidth: 140, valueGetter: (_v, r) => store.templates.find((t) => t.id === r.templateId)?.name ?? '—' },
    { field: 'oneShot', headerName: 'One-shot HT', width: 130, type: 'number', valueGetter: (_v, r) => quote(r, store.packs).oneShot, renderCell: ({ value }) => eur(value as number) },
    { field: 'mrr', headerName: 'Mensuel HT', width: 120, type: 'number', valueGetter: (_v, r) => quote(r, store.packs).mrr, renderCell: ({ value }) => value ? `${eur(value as number)}/mois` : '—' },
    { field: 'issued', headerName: 'PDF émis', width: 100, valueGetter: (_v, r) => store.quotes.filter((q) => q.leadId === r.id && q.status !== 'annule').length, renderCell: ({ value }) => value || '—' },
    { field: 'status', headerName: 'Statut lead', width: 180, sortComparator: (a, b) => STATUSES.findIndex((s) => s.id === a) - STATUSES.findIndex((s) => s.id === b), renderCell: ({ row }) => <StatusChip status={row.status} /> },
  ]

  return (
    <>
      <PageHeader title="Devis" subtitle="Les devis PDF numérotés et les chiffrages en préparation dans les fiches leads." />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          ['Devis émis', String(live.length), `${store.quotes.length - live.length} annulé(s)`],
          ['En attente de réponse', eur(sumHT(pending)), `${pending.length} devis · + ${eur(sumMRR(pending))}/mois`],
          ['Acceptés', eur(sumHT(accepted)), `+ ${eur(sumMRR(accepted))}/mois`],
          ['Taux d’acceptation', decided ? `${Math.round((accepted.length / decided) * 100)} %` : '—', `${decided} devis tranché(s)`],
        ].map(([l, v, s]) => (
          <Grid key={l} size={{ xs: 12, sm: 6, md: 3 }}><Card sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">{l}</Typography><Typography variant="h4">{v}</Typography><Typography variant="caption" color="text.secondary">{s}</Typography></Card></Grid>
        ))}
      </Grid>
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="emis" label={`Devis émis (${store.quotes.length})`} />
        <Tab value="chiffrages" label={`Chiffrages en cours (${drafts.length})`} />
      </Tabs>
      <Card>
        {tab === 'emis' ? (store.quotes.length ? (
          <DataGrid rows={store.quotes} columns={quoteCols} autoHeight getRowHeight={() => 'auto'} disableRowSelectionOnClick
            onRowClick={({ row }) => row.leadId && store.prospects.some((p) => p.id === row.leadId) && drawer.open(row.leadId, 'devis')}
            initialState={{ sorting: { sortModel: [{ field: 'number', sort: 'desc' }] }, pagination: { paginationModel: { pageSize: 25 } } }} pageSizeOptions={[25, 50]}
            sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }} />
        ) : <EmptyState icon={<PictureAsPdfOutlined />} title="Aucun devis émis">Depuis une fiche lead (onglet « Devis ») ou le simulateur, cliquez sur « Émettre le devis PDF ».</EmptyState>
        ) : drafts.length ? (
          <DataGrid rows={drafts} columns={draftCols} autoHeight getRowHeight={() => 'auto'} disableRowSelectionOnClick onRowClick={({ row }) => drawer.open(row.id, 'devis')}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} pageSizeOptions={[25, 50]}
            sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }} />
        ) : <EmptyState icon={<DescriptionOutlined />} title="Aucun chiffrage">Ouvrez un lead, onglet « Devis », et cochez des prestations du catalogue.</EmptyState>}
      </Card>
    </>
  )
}
