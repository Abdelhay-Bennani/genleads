'use client'
import { AddRounded, DeleteOutlineRounded, PictureAsPdfOutlined } from '@mui/icons-material'
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { useStore } from '@/lib/client/store'
import type { InvoiceLine, Prospect, Quote, QuoteClient } from '@/lib/shared/types'
import { eur2, invoiceTotals, periodLabel, quoteTotals, round2, todayISO } from '@/lib/shared/utils'
import { useInvoicePdf } from './InvoiceBits'

type Mode = 'totale' | 'acompte' | 'solde' | 'mensualite'
const MODE_LABEL: Record<Mode, string> = { totale: 'Facture totale', acompte: 'Acompte', solde: 'Solde', mensualite: 'Mensualité' }
const emptyClient = (p?: Prospect | null): QuoteClient => ({
  company: p?.company ?? '', contact: p?.contact ?? '', email: p?.email ?? '', phone: p?.phone?.split(',')[0]?.trim() ?? '', address: p?.address ?? '', postalCode: p?.postalCode ?? '', city: p?.city ?? '',
})

/** Émission d'une facture : à partir d'un devis accepté, ou saisie libre. Le numéro légal est attribué à la validation. */
export function InvoiceDialog({ quote, lead, onClose }: { quote?: Quote; lead?: Prospect; onClose: () => void }) {
  const store = useStore()
  const s = store.settings
  const pdf = useInvoicePdf()
  const accepted = useMemo(() => store.quotes.filter((q) => q.status === 'accepte' && (!lead || q.leadId === lead.id)), [store.quotes, lead])
  const [source, setSource] = useState<'devis' | 'libre'>(quote || accepted.length ? 'devis' : 'libre')
  const [quoteId, setQuoteId] = useState(quote?.id ?? accepted[0]?.id ?? '')
  const [chosen, setChosen] = useState<Mode | null>(null)
  const [percent, setPercent] = useState(30)
  const [period, setPeriod] = useState(todayISO().slice(0, 7))
  const [leadId, setLeadId] = useState(lead?.id ?? '')
  const [client, setClient] = useState<QuoteClient>(emptyClient(lead))
  const [lines, setLines] = useState<InvoiceLine[]>([{ name: '', description: '', quantity: 1, unitPrice: 0 }])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const q = store.quotes.find((x) => x.id === quoteId)
  const t = q ? quoteTotals(q) : null
  const prior = q ? store.invoices.filter((i) => i.quoteId === q.id && i.kind === 'facture' && i.status !== 'annulee') : []
  const oneShot = prior.filter((i) => i.type !== 'mensualite')
  const billed = round2(oneShot.reduce((sum, i) => sum + invoiceTotals(i).ht, 0))
  const closed = oneShot.some((i) => i.type === 'totale' || i.type === 'solde')
  const remaining = t ? round2(t.oneShotHT - billed) : 0
  const modes: Mode[] = !t ? [] : [
    ...(t.oneShotHT > 0 && !oneShot.length ? ['acompte', 'totale'] as Mode[] : []),
    ...(t.oneShotHT > 0 && oneShot.length && !closed && remaining > 0 ? ['acompte', 'solde'] as Mode[] : []),
    ...(t.monthlyHT > 0 ? ['mensualite'] as Mode[] : []),
  ]
  const mode = chosen && modes.includes(chosen) ? chosen : modes[0]
  const previewHT = !t ? 0 : mode === 'totale' ? t.oneShotHT : mode === 'solde' ? remaining : mode === 'acompte' ? round2((t.oneShotHT * percent) / 100) : mode === 'mensualite' ? t.monthlyHT : 0
  const free = invoiceTotals({ lines, vatRate: s.vatRate })
  const missingLegal = [!s.siret && 'SIRET', !s.address && 'adresse', !s.iban && 'IBAN'].filter(Boolean)
  const set = (k: keyof QuoteClient) => (e: React.ChangeEvent<HTMLInputElement>) => setClient({ ...client, [k]: e.target.value })
  const setLine = (n: number, patch: Partial<InvoiceLine>) => setLines(lines.map((l, i) => (i === n ? { ...l, ...patch } : l)))
  const canSubmit = source === 'devis' ? !!q && !!mode && previewHT > 0 : !!client.company.trim() && free.ht > 0 && lines.every((l) => l.name.trim())

  const submit = async () => {
    setBusy(true); setErr(null)
    try {
      const inv = await store.createInvoice(source === 'devis' ? { quoteId, mode, percent, period } : { client, lines, leadId: leadId || null })
      store.notify(`Facture ${inv.number} créée`)
      try { await pdf(inv) } catch { store.notify(`Facture ${inv.number} créée, mais le PDF n’a pas pu être généré. Relancez-le depuis la liste.`, false) }
      onClose()
    } catch (e) { setErr((e as Error).message || 'Émission impossible') } finally { setBusy(false) }
  }

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>Nouvelle facture</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {!quote && (
            <ToggleButtonGroup exclusive size="small" value={source} onChange={(_e, v) => v && setSource(v)}>
              <ToggleButton value="devis" disabled={!accepted.length}>Depuis un devis accepté</ToggleButton>
              <ToggleButton value="libre">Facture libre</ToggleButton>
            </ToggleButtonGroup>
          )}
          {missingLegal.length > 0 && <Alert severity="warning" variant="outlined">Mentions manquantes : {missingLegal.join(', ')}. Complétez-les dans Paramètres → Agence{store.isSuper ? '' : ' (Super Admin)'}.</Alert>}

          {source === 'devis' ? (
            <>
              <TextField select label="Devis accepté" value={quoteId} disabled={!!quote} onChange={(e) => { setQuoteId(e.target.value); setChosen(null) }}>
                {(quote && !accepted.includes(quote) ? [quote, ...accepted] : accepted).map((x) => <MenuItem key={x.id} value={x.id}>{x.number} · {x.client.company} · {eur2(quoteTotals(x).oneShotHT)} HT</MenuItem>)}
              </TextField>
              {q && !modes.length && <Alert severity="info" variant="outlined">Ce devis est déjà entièrement facturé.</Alert>}
              {mode && (
                <ToggleButtonGroup exclusive size="small" value={mode} onChange={(_e, v) => v && setChosen(v)}>
                  {modes.map((m) => <ToggleButton key={m} value={m}>{MODE_LABEL[m]}</ToggleButton>)}
                </ToggleButtonGroup>
              )}
              {mode === 'acompte' && <TextField label="Acompte (%)" type="number" value={percent} onChange={(e) => setPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} sx={{ maxWidth: 180 }} />}
              {mode === 'mensualite' && <TextField label="Mois facturé" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} sx={{ maxWidth: 220 }} slotProps={{ inputLabel: { shrink: true } }} helperText={/^\d{4}-\d{2}$/.test(period) ? periodLabel(period) : undefined} />}
              {mode && <Typography variant="h6">{eur2(previewHT)} HT{q && q.vatRate > 0 ? ` · ${eur2(round2(previewHT * (1 + q.vatRate / 100)))} TTC` : ''}</Typography>}
              {oneShot.length > 0 && <Typography variant="caption" color="text.secondary">Déjà facturé sur ce devis : {eur2(billed)} HT ({oneShot.map((i) => i.number).join(', ')}). Reste : {eur2(remaining)} HT.</Typography>}
            </>
          ) : (
            <>
              {!lead && (
                <TextField select label="Lead associé (facultatif)" value={leadId} onChange={(e) => { setLeadId(e.target.value); if (e.target.value) setClient(emptyClient(store.prospects.find((p) => p.id === e.target.value))) }} slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}>
                  <MenuItem value="">Aucun</MenuItem>
                  {[...store.prospects].sort((a, b) => a.company.localeCompare(b.company, 'fr')).map((p) => <MenuItem key={p.id} value={p.id}>{p.company}</MenuItem>)}
                </TextField>
              )}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}><TextField label="Client / entreprise" required value={client.company} onChange={set('company')} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><TextField label="Contact" value={client.contact} onChange={set('contact')} /></Grid>
                <Grid size={12}><TextField label="Adresse" value={client.address} onChange={set('address')} /></Grid>
                <Grid size={4}><TextField label="Code postal" value={client.postalCode} onChange={set('postalCode')} /></Grid>
                <Grid size={8}><TextField label="Ville" value={client.city} onChange={set('city')} /></Grid>
              </Grid>
              <Stack spacing={1}>
                {lines.map((l, n) => (
                  <Stack key={n} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <TextField label="Désignation" value={l.name} onChange={(e) => setLine(n, { name: e.target.value })} sx={{ flex: 3 }} />
                    <TextField label="Qté" type="number" value={l.quantity} onChange={(e) => setLine(n, { quantity: Number(e.target.value) || 0 })} sx={{ flex: 1, minWidth: 70 }} />
                    <TextField label="P.U. HT (€)" type="number" value={l.unitPrice} onChange={(e) => setLine(n, { unitPrice: Number(e.target.value) || 0 })} sx={{ flex: 1.3, minWidth: 100 }} />
                    <IconButton aria-label="Retirer la ligne" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_x, i) => i !== n))}><DeleteOutlineRounded fontSize="small" /></IconButton>
                  </Stack>
                ))}
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button size="small" startIcon={<AddRounded />} onClick={() => setLines([...lines, { name: '', description: '', quantity: 1, unitPrice: 0 }])}>Ajouter une ligne</Button>
                  <Typography variant="h6">{eur2(free.ht)} HT{s.vatRate > 0 ? ` · ${eur2(free.ttc)} TTC` : ''}</Typography>
                </Stack>
              </Stack>
            </>
          )}
          <Typography variant="caption" color="text.secondary">Un numéro légal sera attribué. Une facture émise n'est plus modifiable : elle s'annule par un avoir.</Typography>
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Annuler</Button>
        <Button variant="contained" disabled={busy || !canSubmit} onClick={submit} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfOutlined />}>Émettre et télécharger</Button>
      </DialogActions>
    </Dialog>
  )
}
