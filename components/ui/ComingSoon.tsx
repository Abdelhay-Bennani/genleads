'use client'
import { RocketLaunchRounded } from '@mui/icons-material'
import { Box, Card, Chip, Grid, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { brand } from '../theme/theme'
import { PageHeader } from '.'

export function ComingSoon({ title, subtitle, features, children }: { title: string; subtitle: string; features: string[]; children?: ReactNode }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={<Chip label="Étape 2 · bientôt" color="primary" variant="outlined" />} />
      <Card sx={{ position: 'relative', overflow: 'hidden', p: { xs: 3, md: 5 } }}>
        <Box sx={{ position: 'absolute', right: -80, top: -80, width: 320, height: 320, borderRadius: '50%', background: brand.gradient, filter: 'blur(90px)', opacity: 0.35 }} />
        <Stack spacing={2} sx={{ position: 'relative', maxWidth: 720 }}>
          <Box sx={{ width: 52, height: 52, borderRadius: 3, display: 'grid', placeItems: 'center', background: brand.gradient, boxShadow: '0 0 30px -4px rgba(139,92,246,0.8)' }}><RocketLaunchRounded sx={{ color: '#fff' }} /></Box>
          <Typography variant="h5">Ce module arrive dans la prochaine étape</Typography>
          <Typography color="text.secondary">La migration vers la nouvelle plateforme est terminée ; ce module sera construit ensuite. Voici ce qui est prévu :</Typography>
          <Grid container spacing={1.5}>
            {features.map((f) => (
              <Grid key={f} size={{ xs: 12, sm: 6 }}>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'secondary.main', boxShadow: '0 0 10px #22d3ee', flexShrink: 0 }} />
                  <Typography variant="body2">{f}</Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
          {children}
        </Stack>
      </Card>
    </>
  )
}
