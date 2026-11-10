'use client'
import { AccountBalanceWalletOutlined, AddRounded, DeleteOutlineRounded, DownloadRounded } from '@mui/icons-material'
import { Button, Card, Grid, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { useState } from 'react'
import { PaymentDialog } from '@/components/invoice/PaymentDialog'
import { EmptyState, PageHeader } from '@/components/ui'
import { useStore } from '@/lib/client/store'
import type { Payment } from '@/lib/shared/types'
import { csvCell, download, eur2, fmtDateLong, invoiceState, invoiceTotals, PAYMENT_METHODS, round2, todayISO } from '@/lib/shared/utils'

const methodLabel = (m: string) => PAYMENT_METHODS.find((x) => x.id === m)?.label ?? m

export default function PaiementsPage() {
  const store = useStore()
  const [adding, setAdding] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)
  const inv = (id: string) => store.invoices.find((i) => i.id === id)
  const today = todayISO()
  const sumOn = (prefix: string) => store.payments.filter((p) => p.date.startsWith(prefix)).reduce((t, p) => t + p.amount, 0)
  const open = store.invoices.filter((i) => i.kind === 'facture' && !['annulee', 'payee'].includes(i.status))
  const leftOf = (id: string) => { const i = inv(id)!; return round2(invoiceTotals(i).ttc - store.paidOf(id)) }
  const toCollect = open.reduce((t, i) => t + leftOf(i.id), 0)
  const late = open.filter((i) => invoiceState(i, store.paidOf(i.id), today) === 'retard')

  const remove = async (id: string) => {
    try { await store.deletePayment(id); store.notify('Paiement supprimé') } catch (e) { store.notify((e as Error).message, false) } finally { setConfirm(null) }
  }
  const cols: GridColDef<Payment>[] = [
    { field: 'date', headerName: 'Date', width: 110, renderCell: ({ row }) => fmtDateLong(row.date) },
    { field: 'invoice', headerName: 'Facture', width: 130, valueGetter: (_v, r) => inv(r.invoiceId)?.number ?? '—' },
    { field: 'client', headerName: 'Client', flex: 1.2, minWidth: 170, valueGetter: (_v, r) => inv(r.invoiceId)?.client.company ?? '—' },
    { field: 'method', headerName: 'Mode', width: 130, valueGetter: (_v, r) => methodLabel(r.method) },
    { field: 'reference', headerName: 'Référence', flex: 1, minWidth: 130 },
    { field: 'amount', headerName: 'Montant', width: 120, type: 'number', renderCell: ({ value }) => eur2(value as number) },
    { field: 'createdBy', headerName: 'Saisi par', width: 110 },
    { field: 'actions', headerName: '', width: 170, sortable: false, filterable: false, align: 'right', renderCell: ({ row }) => confirm === row.id
      ? <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', height: '100%' }}><Button size="small" color="error" onClick={() => remove(row.id)}>Supprimer</Button><Button size="small" color="inherit" onClick={() => setConfirm(null)}>Non</Button></Stack>
      : <Tooltip title="Supprimer ce paiement"><IconButton size="small" aria-label="Supprimer ce paiement" onClick={() => setConfirm(row.id)}><DeleteOutlineRounded fontSize="small" /></IconButton></Tooltip> },
  ]
  const exportCsv = () => {
    const head = ['Date', 'Facture', 'Client', 'Mode', 'Référence', 'Montant']
    const rows = store.payments.map((p) => [p.date, inv(p.invoiceId)?.number, inv(p.invoiceId)?.client.company, methodLabel(p.method), p.reference, p.amount.toFixed(2).replace('.', ',')].map(csvCell).join(';'))
    download(`paiements-${today}.csv`, '﻿' + [head.join(';'), ...rows].join('\r\n'), 'text/csv;charset=utf-8')
  }
  return (
    <>
      <PageHeader title="Paiements" subtitle="Encaissements reçus et factures restant à payer."
        actions={<>
          <Button variant="outlined" startIcon={<DownloadRounded />} disabled={!store.payments.length} onClick={exportCsv}>Exporter</Button>
          <Button variant="contained" startIcon={<AddRounded />} disabled={!open.length} onClick={() => setAdding(true)}>Enregistrer un paiement</Button>
        </>} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[['Encaissé ce mois', eur2(sumOn(today.slice(0, 7))), ''], [`Encaissé ${today.slice(0, 4)}`, eur2(sumOn(today.slice(0, 4))), ''], ['À encaisser', eur2(toCollect), `${open.length} facture(s)`], ['En retard', eur2(late.reduce((t, i) => t + leftOf(i.id), 0)), `${late.length} facture(s)`]].map(([l, v, s]) => (
          <Grid key={l} size={{ xs: 12, sm: 6, md: 3 }}><Card sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">{l}</Typography><Typography variant="h4">{v}</Typography><Typography variant="caption" color="text.secondary">{s}</Typography></Card></Grid>
        ))}
      </Grid>
      <Card>
        {store.payments.length ? (
          <DataGrid rows={store.payments} columns={cols} autoHeight disableRowSelectionOnClick initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} pageSizeOptions={[25, 50, 100]} />
        ) : <EmptyState icon={<AccountBalanceWalletOutlined />} title="Aucun paiement enregistré">Enregistrez un encaissement : la facture passe automatiquement à « Payée » une fois soldée.</EmptyState>}
      </Card>
      {adding && <PaymentDialog onClose={() => setAdding(false)} />}
    </>
  )
}
