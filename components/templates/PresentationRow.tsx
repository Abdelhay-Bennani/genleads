'use client'
import { CheckRounded, ContentCopyRounded, OpenInNewRounded, StarRounded } from '@mui/icons-material'
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import { useState } from 'react'
import { useStore } from '@/lib/client/store'
import type { WebsiteTemplate } from '@/lib/shared/types'
import { fmtDate, fmtDateTime } from '@/lib/shared/utils'

export function PresentationRow({ id, onOpenProspect, showProspect = true }: { id: string; onOpenProspect?: (id: string) => void; showProspect?: boolean }) {
  const store = useStore()
  const p = store.templatePresentations.find((x) => x.id === id)
  const [copied, setCopied] = useState(false)
  if (!p) return null
  const items = store.templatePresentationItems.filter((i) => i.presentationId === p.id).map((i) => store.templates.find((t) => t.id === i.templateId)).filter(Boolean) as WebsiteTemplate[]
  const choices = store.templateClientSelections.filter((s) => s.presentationId === p.id)
  const prospect = p.prospectId ? store.prospects.find((x) => x.id === p.prospectId) : null
  const url = store.presentationUrl(p)
  const toggle = async () => { try { await store.setPresentationRevoked(p.id, !p.revoked); store.notify(p.revoked ? 'Lien réactivé' : 'Lien désactivé') } catch (e) { store.notify((e as Error).message, false) } }
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ p: 1.75, alignItems: { sm: 'center' }, opacity: p.revoked ? 0.6 : 1 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
          {showProspect ? (prospect
            ? <Typography component="button" onClick={() => onOpenProspect?.(prospect.id)} sx={{ all: 'unset', cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>{prospect.company}</Typography>
            : <Typography color="text.secondary" sx={{ fontWeight: 600 }}>Sans prospect</Typography>)
            : <Typography sx={{ fontWeight: 600 }}>{p.title}</Typography>}
          <Chip size="small" label={p.revoked ? 'Désactivé' : 'Actif'} color={p.revoked ? 'default' : 'success'} variant="outlined" />
          {choices.length > 0 && <Chip size="small" color="warning" variant="outlined" icon={<StarRounded />} label={choices.map((c) => store.templates.find((t) => t.id === c.templateId)?.name).join(', ')} />}
        </Stack>
        <Typography variant="caption" color="text.secondary" noWrap component="p">
          {items.length} maquette{items.length > 1 ? 's' : ''} ({items.map((t) => t.name).join(', ')}) · créé le {fmtDate(p.createdAt)} par {p.createdBy} · {p.viewCount} vue{p.viewCount > 1 ? 's' : ''}{p.lastViewedAt ? ` (dernière ${fmtDateTime(p.lastViewedAt)})` : ''}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
        <Button size="small" variant="outlined" disabled={p.revoked} startIcon={copied ? <CheckRounded /> : <ContentCopyRounded />}
          onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* noop */ } }}>{copied ? 'Copié' : 'Copier'}</Button>
        <Tooltip title="Ouvrir la page"><span><IconButton size="small" href={url} target="_blank" disabled={p.revoked} sx={{ border: 1, borderColor: 'divider' }}><OpenInNewRounded fontSize="small" /></IconButton></span></Tooltip>
        <Button size="small" variant="outlined" color={p.revoked ? 'primary' : 'error'} onClick={toggle}>{p.revoked ? 'Réactiver' : 'Désactiver'}</Button>
      </Stack>
    </Stack>
  )
}
