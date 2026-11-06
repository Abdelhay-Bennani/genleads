'use client'
import { AddLinkRounded, FolderOpenOutlined, SlideshowRounded } from '@mui/icons-material'
import { Box, Button, Card, Divider, Grid, Tab, Tabs, Typography } from '@mui/material'
import { useState } from 'react'
import { useLeadDrawer } from '@/components/shell/LeadDrawerContext'
import { PresentationRow } from '@/components/templates/PresentationRow'
import { usePresenter } from '@/components/templates/PresenterContext'
import { EmptyState, PageHeader } from '@/components/ui'
import { useStore } from '@/lib/client/store'

export default function PresentationsPage() {
  const store = useStore()
  const drawer = useLeadDrawer()
  const presenter = usePresenter()
  const [tab, setTab] = useState<'active' | 'revoked' | 'all'>('active')
  const list = store.templatePresentations.filter((p) => tab === 'all' || (tab === 'active' ? !p.revoked : p.revoked))
  const views = store.templatePresentations.reduce((t, p) => t + p.viewCount, 0)
  const active = store.templates.filter((t) => t.status === 'active')
  return (
    <>
      <PageHeader title="Présentations clients" subtitle="Les liens de maquettes envoyés aux prospects, leurs vues et les choix des clients."
        actions={<>
          <Button variant="outlined" startIcon={<SlideshowRounded />} disabled={!active.length} onClick={() => presenter.present({ templateIds: active.map((t) => t.id) })}>Mode présentation</Button>
          <Button variant="contained" startIcon={<AddLinkRounded />} onClick={() => presenter.share({})}>Nouveau lien</Button>
        </>} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[['Liens actifs', store.templatePresentations.filter((p) => !p.revoked).length], ['Vues totales', views], ['Choix des clients', store.templateClientSelections.length]].map(([l, v]) => (
          <Grid key={l as string} size={{ xs: 12, sm: 4 }}><Card sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">{l}</Typography><Typography variant="h4">{v}</Typography></Card></Grid>
        ))}
      </Grid>
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="active" label="Actifs" /><Tab value="revoked" label="Désactivés" /><Tab value="all" label="Tous" />
      </Tabs>
      <Card>
        {list.length ? list.map((p, i) => <Box key={p.id}>{i > 0 && <Divider />}<PresentationRow id={p.id} onOpenProspect={(id) => drawer.open(id, 'maquettes')} /></Box>)
          : <EmptyState icon={<FolderOpenOutlined />} title="Aucun lien ici">Depuis une fiche lead, cliquez sur « Maquettes » pour générer un lien de présentation.</EmptyState>}
      </Card>
    </>
  )
}
