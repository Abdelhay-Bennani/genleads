'use client'
import { BadgeOutlined } from '@mui/icons-material'
import { Card, Chip, Grid, Stack, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { useLeadDrawer } from '@/components/shell/LeadDrawerContext'
import { EmptyState, PageHeader, UserAvatar } from '@/components/ui'
import { useStore } from '@/lib/client/store'
import type { Prospect } from '@/lib/shared/types'
import { dealValue, eur, eur2, fmtDate, invoiceTotals, quote } from '@/lib/shared/utils'

export default function ClientsPage() {
  const store = useStore()
  const drawer = useLeadDrawer()
  const clients = store.prospects.filter((p) => p.status === 'gagne')
  const live = (id: string) => store.invoices.filter((i) => i.leadId === id && i.kind === 'facture' && i.status !== 'annulee')
  const billed = (id: string) => live(id).reduce((t, i) => t + invoiceTotals(i).ttc, 0)
  const due = (id: string) => Math.max(0, billed(id) - live(id).reduce((t, i) => t + store.paidOf(i.id), 0))
  const ca = clients.reduce((t, p) => t + dealValue(p, store.packs), 0)
  const mrr = clients.reduce((t, p) => t + quote(p, store.packs).mrr, 0)
  const outstanding = clients.reduce((t, p) => t + due(p.id), 0)
  const cols: GridColDef<Prospect>[] = [
    { field: 'company', headerName: 'Client', flex: 1.3, minWidth: 180, renderCell: ({ row }) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.company}</Typography> },
    { field: 'contact', headerName: 'Contact', flex: 1, minWidth: 130 },
    { field: 'city', headerName: 'Ville', flex: 0.8, minWidth: 110 },
    { field: 'template', headerName: 'Maquette', flex: 1, minWidth: 150, valueGetter: (_v, r) => store.templates.find((t) => t.id === r.templateId)?.name ?? '—' },
    { field: 'ca', headerName: 'CA one-shot', width: 130, type: 'number', valueGetter: (_v, r) => dealValue(r, store.packs), renderCell: ({ value }) => eur(value as number) },
    { field: 'mrr', headerName: 'MRR', width: 110, type: 'number', valueGetter: (_v, r) => quote(r, store.packs).mrr, renderCell: ({ value }) => value ? <Chip size="small" color="success" variant="outlined" label={`${eur(value as number)}/mois`} /> : '—' },
    { field: 'billed', headerName: 'Facturé', width: 120, type: 'number', valueGetter: (_v, r) => billed(r.id), renderCell: ({ value }) => value ? eur2(value as number) : '—' },
    { field: 'due', headerName: 'Reste dû', width: 120, type: 'number', valueGetter: (_v, r) => due(r.id), renderCell: ({ value }) => value ? eur2(value as number) : '—' },
    { field: 'assignee', headerName: 'Commercial', width: 110, renderCell: ({ row }) => <UserAvatar name={row.assignee} /> },
    { field: 'updatedAt', headerName: 'Gagné / maj', width: 120, renderCell: ({ row }) => fmtDate(row.updatedAt) },
  ]
  return (
    <>
      <PageHeader title="Clients" subtitle="Les leads gagnés, leur chiffre d’affaires et leur encours. Cliquez sur un client pour ouvrir sa fiche et ses factures." />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[['Clients', String(clients.length)], ['CA one-shot signé', eur(ca)], ['Revenu récurrent', `${eur(mrr)}/mois`], ['Reste à encaisser', eur2(outstanding)]].map(([l, v]) => (
          <Grid key={l} size={{ xs: 12, sm: 6, md: 3 }}><Card sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">{l}</Typography><Typography variant="h4">{v}</Typography></Card></Grid>
        ))}
      </Grid>
      <Card>
        {clients.length ? (
          <DataGrid rows={clients} columns={cols} autoHeight disableRowSelectionOnClick onRowClick={({ row }) => drawer.open(row.id, store.can('factures', 'paiements') ? 'factures' : 'infos')}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} pageSizeOptions={[25, 50]} sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }} />
        ) : <EmptyState icon={<BadgeOutlined />} title="Aucun client pour l’instant"><Stack>Passez un lead au statut « Gagné / Terminé » pour le retrouver ici.</Stack></EmptyState>}
      </Card>
    </>
  )
}
