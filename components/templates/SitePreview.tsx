'use client'
import { Box } from '@mui/material'

/** Miniature vivante d'un site importé : page affichée 3× plus large, réduite au format de la carte. */
export function SitePreview({ url, title }: { url: string; title: string }) {
  return (
    <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', bgcolor: '#fff', pointerEvents: 'none' }}>
      <Box component="iframe" src={url} title={`Aperçu de ${title}`} loading="lazy" sandbox="allow-scripts" tabIndex={-1} aria-hidden
        sx={{ width: '300%', height: '300%', border: 0, transform: 'scale(calc(1 / 3))', transformOrigin: '0 0' }} />
    </Box>
  )
}
