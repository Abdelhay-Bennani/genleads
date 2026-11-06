'use client'
import { BadgeOutlined } from '@mui/icons-material'
import { Alert, Card, Chip, Grid, Stack, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { useLeadDrawer } from '@/components/shell/LeadDrawerContext'
import { EmptyState, PageHeader, UserAvatar } from '@/components/ui'
import { useStore } from '@/lib/client/store'
import type { Prospect } from '@/lib/shared/types'
import { dealValue, eur, fmtDate, quote } from '@/lib/shared/utils'

export default function ClientsPage() {
  const store = useStore()
  const drawer = useLeadDrawer()
  const clients = store.prospects.filter((p) => p.status === 'gagne')
  const ca = clients.reduce((t, p) => t + dealValue(p, store.packs), 0)
  const mrr = clients.reduce((t, p) => t + quote(p, store.packs).mrr, 0)
  const cols: GridColDef<Prospect>[] = [
    { field: 'company', headerName: 'Client', flex: 1.3, minWidth: 180, renderCell: ({ row }) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.company}</Typography> },
    { field: 'contact', headerName: 'Contact', flex: 1, minWidth: 130 },
    { field: 'city', headerName: 'Ville', flex: 0.8, minWidth: 110 },
    { field: 'template', headerName: 'Maquette', flex: 1, minWidth: 150, valueGetter: (_v, r) => store.templates.find((t) => t.id === r.templateId)?.name ?? '—' },
    { field: 'ca', headerName: 'CA one-shot', width: 130, type: 'number', valueGetter: (_v, r) => dealValue(r, store.packs), renderCell: ({ value }) => eur(value as number) },
    { field: 'mrr', headerName: 'MRR', width: 110, type: 'number', valueGetter: (_v, r) => quote(r, store.packs).mrr, renderCell: ({ value }) => value ? <Chip size="small" color="success" variant="outlined" label={`${eur(value as number)}/mois`} /> : '—' },
    { field: 'assignee', headerName: 'Commercial', width: 110, renderCell: ({ row }) => <UserAvatar name={row.assignee} /> },
    { field: 'updatedAt', headerName: 'Gagné / maj', width: 120, renderCell: ({ row }) => fmtDate(row.updatedAt) },
  ]
  return (
    <>
      <PageHeader title="Clients" subtitle="Les leads gagnés de votre pipeline." />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[['Clients', String(clients.length)], ['CA one-shot signé', eur(ca)], ['Revenu récurrent', `${eur(mrr)}/mois`]].map(([l, v]) => (
          <Grid key={l} size={{ xs: 12, sm: 4 }}><Card sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">{l}</Typography><Typography variant="h4">{v}</Typography></Card></Grid>
        ))}
      </Grid>
      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>La fiche client complète (contrats, projets, factures) arrive avec l’étape 2. Un lead passe ici dès qu’il est au statut « Gagné / Terminé ».</Alert>
      <Card>
        {clients.length ? (
          <DataGrid rows={clients} columns={cols} autoHeight disableRowSelectionOnClick onRowClick={({ row }) => drawer.open(row.id)}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} pageSizeOptions={[25, 50]} sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }} />
        ) : <EmptyState icon={<BadgeOutlined />} title="Aucun client pour l’instant"><Stack>Passez un lead au statut « Gagné / Terminé » pour le retrouver ici.</Stack></EmptyState>}
      </Card>
    </>
  )
}
