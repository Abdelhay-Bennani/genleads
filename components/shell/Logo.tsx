'use client'
import { Box, Stack, Typography } from '@mui/material'
import { brand } from '../theme/theme'

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <Box sx={{ width: size, height: size, borderRadius: size / 3.4, background: brand.gradient, display: 'grid', placeItems: 'center', boxShadow: '0 0 22px -4px rgba(139,92,246,0.8)', flexShrink: 0 }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 32 32" fill="none"><path d="M7 24 L16 7 L25 24" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </Box>
  )
}

export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <LogoMark size={size === 'lg' ? 38 : 30} />
      <Typography sx={{ fontFamily: '"Space Grotesk Variable", sans-serif', fontWeight: 700, fontSize: size === 'lg' ? 22 : 17, letterSpacing: '-0.01em' }}>
        AgenceFlow
      </Typography>
    </Stack>
  )
}
