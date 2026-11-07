'use client'
import { RocketLaunchRounded } from '@mui/icons-material'
import { Box, Card, Chip, Grid, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { PageHeader } from '.'

export function ComingSoon({ title, subtitle, features, children }: { title: string; subtitle: string; features: string[]; children?: ReactNode }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={<Chip label="Étape 2 · bientôt" color="primary" variant="outlined" />} />
      <Card sx={{ p: { xs: 3, md: 5 } }}>
        <Stack spacing={2} sx={{ maxWidth: 720 }}>
          <Box sx={{ width: 52, height: 52, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'primary.main' }}><RocketLaunchRounded sx={{ color: '#fff' }} /></Box>
          <Typography variant="h5">Ce module arrive dans la prochaine étape</Typography>
          <Typography color="text.secondary">La migration vers la nouvelle plateforme est terminée ; ce module sera construit ensuite. Voici ce qui est prévu :</Typography>
          <Grid container spacing={1.5}>
            {features.map((f) => (
              <Grid key={f} size={{ xs: 12, sm: 6 }}>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
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
