'use client'
import { DescriptionOutlined } from '@mui/icons-material'
import { Card, Chip, Grid, Stack, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { useLeadDrawer } from '@/components/shell/LeadDrawerContext'
import { EmptyState, PageHeader, StatusChip } from '@/components/ui'
import { useStore } from '@/lib/client/store'
import { STATUSES } from '@/lib/shared/data'
import type { Prospect } from '@/lib/shared/types'
import { eur, fmtDate, quote } from '@/lib/shared/utils'

export default function DevisPage() {
  const store = useStore()
  const drawer = useLeadDrawer()
  const quotes = store.prospects.filter((p) => p.packIds.length > 0)
  const sum = (l: Prospect[], k: 'oneShot' | 'mrr') => l.reduce((t, p) => t + quote(p, store.packs)[k], 0)
  const sent = quotes.filter((p) => p.status === 'devis')
  const won = quotes.filter((p) => p.status === 'gagne')
  const cols: GridColDef<Prospect>[] = [
    { field: 'company', headerName: 'Lead', flex: 1.2, minWidth: 170, renderCell: ({ row }) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.company}</Typography> },
    { field: 'packs', headerName: 'Prestations', flex: 2, minWidth: 220, sortable: false, renderCell: ({ row }) => <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, py: 1 }}>{quote(row, store.packs).sel.map((k) => <Chip key={k.id} size="small" variant="outlined" label={k.name} />)}</Stack> },
    { field: 'template', headerName: 'Maquette', flex: 1, minWidth: 140, valueGetter: (_v, r) => store.templates.find((t) => t.id === r.templateId)?.name ?? '—' },
    { field: 'oneShot', headerName: 'One-shot HT', width: 130, type: 'number', valueGetter: (_v, r) => quote(r, store.packs).oneShot, renderCell: ({ value }) => eur(value as number) },
    { field: 'mrr', headerName: 'Mensuel HT', width: 120, type: 'number', valueGetter: (_v, r) => quote(r, store.packs).mrr, renderCell: ({ value }) => value ? `${eur(value as number)}/mois` : '—' },
    { field: 'status', headerName: 'Statut', width: 180, sortComparator: (a, b) => STATUSES.findIndex((s) => s.id === a) - STATUSES.findIndex((s) => s.id === b), renderCell: ({ row }) => <StatusChip status={row.status} /> },
    { field: 'updatedAt', headerName: 'Modifié', width: 110, renderCell: ({ row }) => fmtDate(row.updatedAt) },
  ]
  return (
    <>
      <PageHeader title="Devis" subtitle="Les chiffrages préparés dans les fiches leads (onglet Devis)." />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[['Devis en cours', String(quotes.length - won.length), ''], ['Envoyés, en attente', eur(sum(sent, 'oneShot')), `${sent.length} devis`], ['Signés', eur(sum(won, 'oneShot')), `+ ${eur(sum(won, 'mrr'))}/mois`]].map(([l, v, s]) => (
          <Grid key={l} size={{ xs: 12, sm: 4 }}><Card sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">{l}</Typography><Typography variant="h4">{v}</Typography>{s && <Typography variant="caption" color="text.secondary">{s}</Typography>}</Card></Grid>
        ))}
      </Grid>
      <Card>
        {quotes.length ? (
          <DataGrid rows={quotes} columns={cols} autoHeight getRowHeight={() => 'auto'} disableRowSelectionOnClick onRowClick={({ row }) => drawer.open(row.id, 'devis')}
            initialState={{ sorting: { sortModel: [{ field: 'updatedAt', sort: 'desc' }] }, pagination: { paginationModel: { pageSize: 25 } } }} pageSizeOptions={[25, 50]}
            sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }} />
        ) : <EmptyState icon={<DescriptionOutlined />} title="Aucun devis">Ouvrez un lead, onglet « Devis », et cochez des prestations du catalogue.</EmptyState>}
      </Card>
    </>
  )
}
