'use client'
import { DownloadRounded, MoreVertRounded } from '@mui/icons-material'
import { Alert, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material'
import { useState } from 'react'
import { downloadInvoicePdf } from '@/lib/client/invoicePdf'
import { useStore } from '@/lib/client/store'
import type { Invoice } from '@/lib/shared/types'
import { eur2, INVOICE_STATE, invoiceState, invoiceTotals } from '@/lib/shared/utils'
import { PaymentDialog } from './PaymentDialog'

export function InvoiceStateChip({ i }: { i: Invoice }) {
  const store = useStore()
  const m = INVOICE_STATE[invoiceState(i, store.paidOf(i.id))]
  return <Chip size="small" variant="outlined" color={m.color} label={m.label} />
}

export function useInvoicePdf() {
  const store = useStore()
  return (i: Invoice) => downloadInvoicePdf(i, store.settings, {
    paid: store.paidOf(i.id), creditedNumber: store.invoices.find((x) => x.id === i.creditedInvoiceId)?.number,
  })
}

export function InvoiceActions({ i }: { i: Invoice }) {
  const store = useStore()
  const pdf = useInvoicePdf()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [paying, setPaying] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn() } catch (e) { store.notify((e as Error).message || 'Erreur', false) } finally { setBusy(false) } }
  const open = i.kind === 'facture' && i.status !== 'annulee'
  const canBill = store.can('factures')
  const canPay = open && i.status !== 'payee' && store.can('paiements')
  const items = (open && canBill && i.status === 'emise' ? 1 : 0) + (canPay ? 1 : 0) + (open && canBill ? 1 : 0)
  return (
    <Stack direction="row" sx={{ alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
      <Tooltip title="Télécharger le PDF"><span><IconButton size="small" disabled={busy} onClick={() => run(() => pdf(i))}>{busy ? <CircularProgress size={16} /> : <DownloadRounded fontSize="small" />}</IconButton></span></Tooltip>
      {items > 0 && <IconButton size="small" disabled={busy} aria-label="Actions de la facture" onClick={(e) => setAnchor(e.currentTarget)}><MoreVertRounded fontSize="small" /></IconButton>}
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {canPay && <MenuItem onClick={() => { setAnchor(null); setPaying(true) }}>Enregistrer un paiement</MenuItem>}
        {open && canBill && i.status === 'emise' && <MenuItem onClick={() => { setAnchor(null); run(async () => { await store.markInvoiceSent(i.id); store.notify(`Facture ${i.number} marquée envoyée`) }) }}>Marquer envoyée</MenuItem>}
        {open && canBill && <MenuItem sx={{ color: 'error.main' }} onClick={() => { setAnchor(null); setErr(null); setConfirm(true) }}>Annuler (créer un avoir)</MenuItem>}
      </Menu>
      {paying && <PaymentDialog invoice={i} onClose={() => setPaying(false)} />}
      {confirm && (
        <Dialog open onClose={() => setConfirm(false)} fullWidth maxWidth="xs">
          <DialogTitle>Annuler la facture {i.number} ?</DialogTitle>
          <DialogContent>
            <Typography variant="body2">Une facture émise ne peut pas être supprimée. Un avoir de {eur2(-invoiceTotals(i).ttc)} sera créé avec son propre numéro pour la compenser.</Typography>
            {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirm(false)}>Fermer</Button>
            <Button color="error" variant="contained" onClick={async () => { try { const a = await store.cancelInvoice(i.id); store.notify(`Facture annulée, avoir ${a.number} créé`); setConfirm(false) } catch (e) { setErr((e as Error).message) } }}>Créer l'avoir</Button>
          </DialogActions>
        </Dialog>
      )}
    </Stack>
  )
}
