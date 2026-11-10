'use client'
import { AddRounded, AutorenewRounded, DownloadRounded, ReceiptLongOutlined } from '@mui/icons-material'
import { Alert, Button, Card, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Grid, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { useMemo, useState } from 'react'
import { InvoiceActions, InvoiceStateChip } from '@/components/invoice/InvoiceBits'
import { InvoiceDialog } from '@/components/invoice/InvoiceDialog'
import { useLeadDrawer } from '@/components/shell/LeadDrawerContext'
import { EmptyState, PageHeader } from '@/components/ui'
import { useStore } from '@/lib/client/store'
import type { Invoice } from '@/lib/shared/types'
import { csvCell, download, eur2, fmtDateLong, INVOICE_STATE, INVOICE_TYPE, invoiceState, invoiceTotals, periodLabel, quoteTotals, round2, todayISO } from '@/lib/shared/utils'

type Tab = 'all' | 'open' | 'late' | 'paid' | 'cancelled'

export default function FacturesPage() {
  const store = useStore()
  const drawer = useLeadDrawer()
  const [tab, setTab] = useState<Tab>('all')
  const [creating, setCreating] = useState(false)
  const [recurring, setRecurring] = useState(false)
  const stateOf = (i: Invoice) => invoiceState(i, store.paidOf(i.id))
  const leftOf = (i: Invoice) => (i.kind === 'facture' && i.status !== 'annulee' ? round2(invoiceTotals(i).ttc - store.paidOf(i.id)) : 0)
  const year = todayISO().slice(0, 4)
  const open = store.invoices.filter((i) => i.kind === 'facture' && !['annulee', 'payee'].includes(i.status))
  const late = open.filter((i) => stateOf(i) === 'retard')
  // Une facture annulée reste émise : c'est son avoir (négatif) qui la compense
  const yearHT = store.invoices.filter((i) => i.issueDate.startsWith(year)).reduce((t, i) => t + invoiceTotals(i).ht, 0)
  const list = store.invoices.filter((i) => {
    if (tab === 'open') return open.includes(i)
    if (tab === 'late') return late.includes(i)
    if (tab === 'paid') return i.status === 'payee'
    if (tab === 'cancelled') return i.status === 'annulee' || i.kind === 'avoir'
    return true
  })
  const sum = (l: Invoice[]) => l.reduce((t, i) => t + leftOf(i), 0)

  const cols: GridColDef<Invoice>[] = [
    { field: 'number', headerName: 'N°', width: 130, renderCell: ({ row }) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.number}</Typography> },
    { field: 'client', headerName: 'Client', flex: 1.3, minWidth: 170, valueGetter: (_v, r) => r.client.company },
    { field: 'type', headerName: 'Type', width: 140, valueGetter: (_v, r) => (r.period ? `${INVOICE_TYPE[r.type]} ${r.period.slice(5)}/${r.period.slice(2, 4)}` : INVOICE_TYPE[r.type]) },
    { field: 'issueDate', headerName: 'Émise le', width: 105, renderCell: ({ row }) => fmtDateLong(row.issueDate) },
    { field: 'dueDate', headerName: 'Échéance', width: 105, renderCell: ({ row }) => (row.kind === 'facture' ? fmtDateLong(row.dueDate) : '—') },
    { field: 'ttc', headerName: 'Total', width: 115, type: 'number', valueGetter: (_v, r) => invoiceTotals(r).ttc, renderCell: ({ value }) => eur2(value as number) },
    { field: 'left', headerName: 'Reste dû', width: 115, type: 'number', valueGetter: (_v, r) => leftOf(r), renderCell: ({ value }) => (value ? eur2(value as number) : '—') },
    { field: 'state', headerName: 'Statut', width: 140, valueGetter: (_v, r) => INVOICE_STATE[stateOf(r)].label, renderCell: ({ row }) => <InvoiceStateChip i={row} /> },
    { field: 'actions', headerName: '', width: 90, sortable: false, filterable: false, renderCell: ({ row }) => <InvoiceActions i={row} /> },
  ]

  const exportCsv = () => {
    const head = ['Numéro', 'Type', 'Date', 'Échéance', 'Client', 'HT', 'TVA', 'TTC', 'Réglé', 'Reste dû', 'Statut']
    const num = (n: number) => n.toFixed(2).replace('.', ',')
    const rows = store.invoices.map((i) => {
      const t = invoiceTotals(i)
      return [i.number, INVOICE_TYPE[i.type], i.issueDate, i.dueDate, i.client.company, num(t.ht), num(t.vat), num(t.ttc), num(store.paidOf(i.id)), num(leftOf(i)), INVOICE_STATE[stateOf(i)].label].map(csvCell).join(';')
    })
    download(`factures-${todayISO()}.csv`, '﻿' + [head.join(';'), ...rows].join('\r\n'), 'text/csv;charset=utf-8')
  }

  return (
    <>
      <PageHeader title="Factures" subtitle="Numérotation légale, acomptes, soldes, mensualités et avoirs."
        actions={<>
          <Button variant="outlined" startIcon={<DownloadRounded />} disabled={!store.invoices.length} onClick={exportCsv}>Export comptable</Button>
          <Button variant="outlined" startIcon={<AutorenewRounded />} onClick={() => setRecurring(true)}>Mensualités</Button>
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setCreating(true)}>Nouvelle facture</Button>
        </>} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[[`Facturé ${year} HT`, eur2(yearHT), 'Avoirs déduits'], ['À encaisser', eur2(sum(open)), `${open.length} facture(s)`], ['En retard', eur2(sum(late)), `${late.length} facture(s)`]].map(([l, v, s]) => (
          <Grid key={l} size={{ xs: 12, sm: 4 }}><Card sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">{l}</Typography><Typography variant="h4">{v}</Typography><Typography variant="caption" color="text.secondary">{s}</Typography></Card></Grid>
        ))}
      </Grid>
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable" sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="all" label={`Toutes (${store.invoices.length})`} />
        <Tab value="open" label={`À encaisser (${open.length})`} />
        <Tab value="late" label={`En retard (${late.length})`} />
        <Tab value="paid" label="Payées" />
        <Tab value="cancelled" label="Annulées et avoirs" />
      </Tabs>
      <Card>
        {list.length ? (
          <DataGrid rows={list} columns={cols} autoHeight disableRowSelectionOnClick onRowClick={({ row }) => row.leadId && store.prospects.some((p) => p.id === row.leadId) && drawer.open(row.leadId, 'factures')}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} pageSizeOptions={[25, 50, 100]} sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }} />
        ) : <EmptyState icon={<ReceiptLongOutlined />} title="Aucune facture ici">Facturez un devis accepté depuis la page Devis, ou créez une facture libre.</EmptyState>}
      </Card>
      {creating && <InvoiceDialog onClose={() => setCreating(false)} />}
      {recurring && <RecurringDialog onClose={() => setRecurring(false)} />}
    </>
  )
}

/** Génère en une fois les mensualités du mois. Décochez les abonnements arrêtés. */
function RecurringDialog({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const [period, setPeriod] = useState(todayISO().slice(0, 7))
  const [off, setOff] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const candidates = useMemo(() => store.quotes.filter((q) => q.status === 'accepte' && quoteTotals(q).monthlyHT > 0
    && !store.invoices.some((i) => i.quoteId === q.id && i.period === period && i.status !== 'annulee')), [store.quotes, store.invoices, period])
  const selected = candidates.filter((q) => !off.includes(q.id))
  const submit = async () => {
    setBusy(true); setErr(null)
    try { const r = await store.createRecurringInvoices(period, selected.map((q) => q.id)); store.notify(`${r.length} facture(s) de ${periodLabel(period)} émise(s)`); onClose() } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Facturer les mensualités</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Mois facturé" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} sx={{ maxWidth: 220 }} slotProps={{ inputLabel: { shrink: true } }} />
          {candidates.length ? (
            <List dense disablePadding>
              {candidates.map((q) => (
                <ListItem key={q.id} disablePadding divider>
                  <ListItemButton onClick={() => setOff(off.includes(q.id) ? off.filter((x) => x !== q.id) : [...off, q.id])}>
                    <ListItemIcon sx={{ minWidth: 36 }}><Checkbox edge="start" size="small" checked={!off.includes(q.id)} tabIndex={-1} /></ListItemIcon>
                    <ListItemText primary={q.client.company} secondary={`${q.number} · ${eur2(quoteTotals(q).monthlyHT)} HT / mois`} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          ) : <Alert severity="info" variant="outlined">Tous les abonnements sont déjà facturés pour ce mois, ou aucun devis accepté n'en comporte.</Alert>}
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Annuler</Button><Button variant="contained" disabled={busy || !selected.length || !/^\d{4}-\d{2}$/.test(period)} onClick={submit}>Émettre {selected.length} facture{selected.length > 1 ? 's' : ''}</Button></DialogActions>
    </Dialog>
  )
}
