'use client'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { useStore } from '@/lib/client/store'
import type { Invoice, PaymentMethod } from '@/lib/shared/types'
import { eur2, invoiceTotals, PAYMENT_METHODS, round2, todayISO } from '@/lib/shared/utils'

export function PaymentDialog({ invoice, onClose }: { invoice?: Invoice; onClose: () => void }) {
  const store = useStore()
  const left = (i: Invoice) => round2(invoiceTotals(i).ttc - store.paidOf(i.id))
  const open = store.invoices.filter((i) => i.kind === 'facture' && i.status !== 'annulee' && i.status !== 'payee')
  const [id, setId] = useState(invoice?.id ?? open[0]?.id ?? '')
  const current = store.invoices.find((i) => i.id === id)
  const [amount, setAmount] = useState(current ? String(left(current)) : '')
  const [date, setDate] = useState(todayISO())
  const [method, setMethod] = useState<PaymentMethod>('virement')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const choose = (v: string) => { setId(v); const i = store.invoices.find((x) => x.id === v); if (i) setAmount(String(left(i))) }
  const submit = async () => {
    setBusy(true); setErr(null)
    try {
      await store.addPayment({ invoiceId: id, amount: Number(amount.replace(',', '.')), date, method, reference, notes })
      store.notify(`Paiement enregistré sur ${current?.number}`); onClose()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Enregistrer un paiement</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {invoice ? <Typography variant="body2"><b>{invoice.number}</b> · {invoice.client.company}</Typography> : (
            <TextField select label="Facture" value={id} onChange={(e) => choose(e.target.value)}>
              {open.map((i) => <MenuItem key={i.id} value={i.id}>{i.number} · {i.client.company} · reste {eur2(left(i))}</MenuItem>)}
            </TextField>
          )}
          {current && <Typography variant="caption" color="text.secondary">Total {eur2(invoiceTotals(current).ttc)} · déjà réglé {eur2(store.paidOf(current.id))} · reste dû {eur2(left(current))}</Typography>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}><TextField label="Montant (€)" value={amount} onChange={(e) => setAmount(e.target.value)} slotProps={{ htmlInput: { inputMode: 'decimal' } }} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField select label="Mode" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>{PAYMENT_METHODS.map((m) => <MenuItem key={m.id} value={m.id}>{m.label}</MenuItem>)}</TextField></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Référence (n° de chèque, virement…)" value={reference} onChange={(e) => setReference(e.target.value)} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} /></Grid>
          </Grid>
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Annuler</Button><Button variant="contained" disabled={busy || !id || !date || !(Number(amount.replace(',', '.')) > 0)} onClick={submit}>Enregistrer</Button></DialogActions>
    </Dialog>
  )
}
