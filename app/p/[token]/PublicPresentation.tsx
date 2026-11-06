'use client'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { AgencyInfo, Portfolio } from '@/components/templates/Portfolio'
import type { PortfolioTemplate } from '@/lib/shared/types'

interface Payload { agency: AgencyInfo; title: string; message: string; company: string; contact: string; templates: PortfolioTemplate[]; selectedTemplateIds: string[] }

/** Page publique /p/<jeton> — accessible sans connexion. */
export function PublicPresentation({ token }: { token: string }) {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/public/presentations/${encodeURIComponent(token)}`)
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Présentation introuvable.'); return j as Payload })
      .then((d) => { setData(d); document.title = `${d.title} — ${d.agency.name}` })
      .catch((e) => setError(e.message))
  }, [token])

  const wrap = { position: 'fixed' as const, inset: 0, overflowY: 'auto' as const, bgcolor: '#f6f7f9', color: '#0f172a', zIndex: 1 }
  if (error) return <Box sx={{ ...wrap, display: 'grid', placeItems: 'center', p: 3, textAlign: 'center' }}><Box><Typography sx={{ fontSize: 40 }}>🔒</Typography><Typography variant="h6" sx={{ maxWidth: 460 }}>{error}</Typography></Box></Box>
  if (!data) return <Box sx={{ ...wrap, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>

  const select = async (templateId: string, f: { name: string; message: string }) => {
    const r = await fetch(`/api/public/presentations/${encodeURIComponent(token)}/select`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId, name: f.name || data.contact, message: f.message }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j.error || 'Impossible d’enregistrer votre choix.')
    setData({ ...data, selectedTemplateIds: [...data.selectedTemplateIds, templateId] })
  }

  return (
    <Box sx={wrap}>
      <Portfolio agency={data.agency} eyebrow={data.company ? `Sélection préparée pour ${data.company}` : 'Notre sélection'} title={data.title} message={data.message}
        templates={data.templates} selectedIds={data.selectedTemplateIds} selectMode="public" onSelect={select} />
    </Box>
  )
}
