'use client'
import { PictureAsPdfOutlined } from '@mui/icons-material'
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { downloadQuotePdf, previewQuote } from '@/lib/client/quotePdf'
import { useStore } from '@/lib/client/store'
import type { Prospect, Quote, QuoteClient } from '@/lib/shared/types'
import { eur, quoteTotals } from '@/lib/shared/utils'

/**
 * Émission d'un devis PDF.
 * - avec un lead : crée un devis numéroté (DEV-AAAA-NNN), enregistré et ajouté au journal ;
 * - sans lead : simple aperçu PDF « Simulation », rien n'est enregistré.
 */
export function QuoteDialog({ lead, packIds, discount, onClose, onCreated }: {
  lead: Prospect | null; packIds: string[]; discount: number; onClose: () => void; onCreated?: (q: Quote) => void
}) {
  const store = useStore()
  const s = store.settings
  const [client, setClient] = useState<QuoteClient>({
    company: lead?.company ?? '', contact: lead?.contact ?? '', email: lead?.email ?? '', phone: lead?.phone?.split(',')[0]?.trim() ?? '',
    address: lead?.address ?? '', postalCode: lead?.postalCode ?? '', city: lead?.city ?? '',
  })
  const [validityDays, setValidityDays] = useState(s.quoteValidityDays || 30)
  const [notes, setNotes] = useState(s.quoteNotes)
  const [paymentTerms, setPaymentTerms] = useState(s.paymentTerms)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const packs = packIds.map((id) => store.packs.find((k) => k.id === id)).filter((k) => !!k)
  const t = quoteTotals({ lines: packs.map((k) => ({ ...k })), discount, vatRate: s.vatRate })
  const missingLegal = [!s.siret && 'SIRET', !s.address && 'adresse', !(s.legalName || s.agencyName) && 'raison sociale'].filter(Boolean)
  const set = (k: keyof QuoteClient) => (e: React.ChangeEvent<HTMLInputElement>) => setClient({ ...client, [k]: e.target.value })

  const go = async () => {
    setBusy(true); setErr(null)
    try {
      if (lead) {
        const q = await store.createQuote({ leadId: lead.id, packIds, discount, client, validityDays, notes, paymentTerms })
        await downloadQuotePdf(q, s)
        store.notify(`Devis ${q.number} créé`)
        onCreated?.(q)
      } else {
        const q = previewQuote(packs, discount, { ...client, company: client.company || 'Client' }, { ...s, quoteValidityDays: validityDays }, store.me.name)
        await downloadQuotePdf({ ...q, notes, paymentTerms }, s, true)
      }
      onClose()
    } catch (e) { setErr((e as Error).message || 'Génération impossible') } finally { setBusy(false) }
  }

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{lead ? 'Émettre le devis PDF' : 'Télécharger la simulation PDF'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {packs.length} prestation{packs.length > 1 ? 's' : ''} · {eur(t.oneShotTTC)} {s.vatRate ? 'TTC' : ''}{t.monthlyHT ? ` + ${eur(s.vatRate ? t.monthlyTTC : t.monthlyHT)}/mois` : ''}
            {lead ? ' · un numéro légal sera attribué (non supprimable, annulable).' : ' · aperçu sans numéro, rien n’est enregistré.'}
          </Typography>
          {missingLegal.length > 0 && <Alert severity="warning" variant="outlined">Mentions manquantes : {missingLegal.join(', ')}. Complétez-les dans Paramètres → Agence{store.isSuper ? '' : ' (Super Admin)'}.</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Client / entreprise" required={!!lead} value={client.company} onChange={set('company')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Contact" value={client.contact} onChange={set('contact')} /></Grid>
            <Grid size={12}><TextField label="Adresse" value={client.address} onChange={set('address')} /></Grid>
            <Grid size={{ xs: 4 }}><TextField label="Code postal" value={client.postalCode} onChange={set('postalCode')} /></Grid>
            <Grid size={{ xs: 8 }}><TextField label="Ville" value={client.city} onChange={set('city')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Email" value={client.email} onChange={set('email')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField label="Téléphone" value={client.phone} onChange={set('phone')} /></Grid>
            <Grid size={{ xs: 12, sm: 4 }}><TextField label="Validité (jours)" type="number" value={validityDays} onChange={(e) => setValidityDays(Math.max(1, Number(e.target.value) || 30))} /></Grid>
            <Grid size={{ xs: 12, sm: 8 }}><TextField label="Conditions de paiement" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} /></Grid>
            <Grid size={12}><TextField label="Notes" multiline minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Grid>
          </Grid>
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Annuler</Button>
        <Button variant="contained" disabled={busy || !packs.length || (!!lead && !client.company.trim())} onClick={go}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfOutlined />}>
          {lead ? 'Créer et télécharger' : 'Télécharger'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
