'use client'
import { Box, Stack, Typography } from '@mui/material'

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <Box sx={{ width: size, height: size, borderRadius: '50%', bgcolor: 'primary.main', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 32 32" fill="none"><path d="M7 24 L16 7 L25 24" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </Box>
  )
}

export function Logo({ size = 'md', name = 'AgenceFlow' }: { size?: 'md' | 'lg'; name?: string }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <LogoMark size={size === 'lg' ? 38 : 30} />
      <Typography sx={{ fontWeight: 700, fontSize: size === 'lg' ? 22 : 17, letterSpacing: '-0.01em' }}>
        {name}
      </Typography>
    </Stack>
  )
}
