'use client'
import { Avatar, Box, Chip, Stack, Typography, type ChipProps, type SxProps } from '@mui/material'
import type { ReactNode } from 'react'
import { NEED_HEX, statusMeta } from '@/lib/shared/data'
import type { Status } from '@/lib/shared/types'

const AV = ['#1976d2', '#9c27b0', '#2e7d32', '#ed6c02', '#0288d1', '#d32f2f', '#5d4037']
export const colorFor = (name: string) => AV[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % AV.length]

export function UserAvatar({ name, size = 28 }: { name: string | null | undefined; size?: number }) {
  if (!name) return <Avatar sx={{ width: size, height: size, fontSize: size * 0.42, bgcolor: 'transparent', border: '1px dashed', borderColor: 'divider', color: 'text.secondary' }}>?</Avatar>
  const c = colorFor(name)
  return (
    <Avatar title={name} sx={{ width: size, height: size, fontSize: size * 0.42, fontWeight: 700, color: c, bgcolor: `${c}22`, border: `1px solid ${c}55` }}>
      {name[0]?.toUpperCase()}
    </Avatar>
  )
}

export function StatusChip({ status, size = 'small' }: { status: Status; size?: ChipProps['size'] }) {
  const m = statusMeta(status)
  return (
    <Chip size={size} label={m.label} variant="outlined"
      sx={{ color: m.hex, borderColor: `${m.hex}66`, bgcolor: `${m.hex}14`, '& .MuiChip-label': { px: 1 } }}
      icon={<Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: m.hex, ml: '8px !important', mr: '-2px !important' }} />} />
  )
}

export function NeedChip({ need }: { need: string }) {
  if (!need) return <Typography variant="caption" color="text.disabled">—</Typography>
  const c = NEED_HEX[need] ?? NEED_HEX.Autre
  return <Chip size="small" label={need} sx={{ color: c, bgcolor: `${c}18`, border: `1px solid ${c}40` }} />
}

/** Texte mis en avant (couleur principale du thème). */
export function GradientText({ children, sx }: { children: ReactNode; sx?: SxProps }) {
  return <Box component="span" sx={[{ color: 'primary.main' }, ...(Array.isArray(sx) ? sx : [sx])]}>{children}</Box>
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3, alignItems: { md: 'flex-end' }, justifyContent: 'space-between' }}>
      <Box>
        <Typography variant="h4" component="h1">{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>}
      </Box>
      {actions && <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>{actions}</Stack>}
    </Stack>
  )
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', py: 6, px: 3 }}>
      <Box sx={{ color: 'text.disabled', '& svg': { fontSize: 40 } }}>{icon}</Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{title}</Typography>
      {children && <Box sx={{ color: 'text.secondary', typography: 'body2' }}>{children}</Box>}
    </Stack>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{children}</Typography>
}

/** Petit badge (Nouveau, Bientôt…). */
export function GlowBadge({ label, tone = 'violet' }: { label: string; tone?: 'violet' | 'green' | 'cyan' | 'gray' }) {
  const color = ({ violet: 'primary', green: 'success', cyan: 'info', gray: 'default' } as const)[tone]
  return <Chip size="small" label={label} color={color} variant="outlined" sx={{ height: 20, fontSize: '0.66rem' }} />
}
