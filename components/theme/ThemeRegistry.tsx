'use client'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { theme } from './theme'

export default function ThemeRegistry({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme} defaultMode="dark" modeStorageKey="agenceflow-mode">
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  )
}
