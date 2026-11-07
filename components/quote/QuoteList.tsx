'use client'
import { DownloadRounded, MoreVertRounded } from '@mui/icons-material'
import { Box, Chip, CircularProgress, Divider, IconButton, ListItemText, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material'
import { useState } from 'react'
import { downloadQuotePdf } from '@/lib/client/quotePdf'
import { useStore } from '@/lib/client/store'
import type { Quote, QuoteStatus } from '@/lib/shared/types'
import { eur, fmtDate, QUOTE_STATUS, quoteTotals, todayISO } from '@/lib/shared/utils'

export const isExpired = (q: Quote) => q.status === 'envoye' && q.validUntil < todayISO()

export function QuoteStatusChip({ q }: { q: Quote }) {
  const m = isExpired(q) ? { label: 'Expiré', hex: '#ed6c02' } : QUOTE_STATUS[q.status]
  return <Chip size="small" label={m.label} variant="outlined" sx={{ color: m.hex, borderColor: `${m.hex}66`, bgcolor: `${m.hex}14` }} />
}

/** Transitions proposées selon le statut actuel. */
const NEXT: Record<QuoteStatus, QuoteStatus[]> = {
  brouillon: ['envoye', 'annule'],
  envoye: ['accepte', 'refuse', 'annule'],
  accepte: ['annule'],
  refuse: ['envoye', 'annule'],
  annule: [],
}
const ACTION: Record<QuoteStatus, string> = { brouillon: 'Repasser en brouillon', envoye: 'Marquer envoyé', accepte: 'Marquer accepté (lead gagné)', refuse: 'Marquer refusé', annule: 'Annuler le devis' }

export function QuoteActions({ q }: { q: Quote }) {
  const store = useStore()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn() } catch (e) { store.notify((e as Error).message || 'Erreur', false) } finally { setBusy(false) } }
  return (
    <Stack direction="row" sx={{ alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
      <Tooltip title="Télécharger le PDF">
        <span><IconButton size="small" disabled={busy} onClick={() => run(() => downloadQuotePdf(q, store.settings))}>{busy ? <CircularProgress size={16} /> : <DownloadRounded fontSize="small" />}</IconButton></span>
      </Tooltip>
      {NEXT[q.status].length > 0 && <IconButton size="small" disabled={busy} aria-label="Changer le statut" onClick={(e) => setAnchor(e.currentTarget)}><MoreVertRounded fontSize="small" /></IconButton>}
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {NEXT[q.status].map((st) => (
          <MenuItem key={st} sx={st === 'annule' ? { color: 'error.main' } : undefined}
            onClick={() => { setAnchor(null); run(async () => { await store.setQuoteStatus(q.id, st); store.notify(`Devis ${q.number} : ${QUOTE_STATUS[st].label.toLowerCase()}`) }) }}>
            {ACTION[st]}
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  )
}

/** Liste compacte des devis émis (fiche lead). */
export function QuoteList({ quotes }: { quotes: Quote[] }) {
  if (!quotes.length) return null
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
      {quotes.map((q, i) => {
        const t = quoteTotals(q)
        return (
          <Box key={q.id}>
            {i > 0 && <Divider />}
            <Stack direction="row" spacing={1.5} sx={{ px: 1.5, py: 1, alignItems: 'center' }}>
              <ListItemText sx={{ m: 0 }}
                primary={<Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{q.number}</Typography><QuoteStatusChip q={q} /></Stack>}
                secondary={`${fmtDate(q.createdAt)} · ${eur(t.oneShotTTC)} ${q.vatRate ? 'TTC' : ''}${t.monthlyHT ? ` + ${eur(q.vatRate ? t.monthlyTTC : t.monthlyHT)}/mois` : ''} · ${q.createdBy}`} />
              <QuoteActions q={q} />
            </Stack>
          </Box>
        )
      })}
    </Box>
  )
}
