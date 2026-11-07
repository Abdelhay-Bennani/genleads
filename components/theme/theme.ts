'use client'
import { frFR as coreFrFR } from '@mui/material/locale'
import { createTheme } from '@mui/material/styles'
import { frFR as gridFrFR } from '@mui/x-data-grid/locales'
import type {} from '@mui/x-data-grid/themeAugmentation'

/**
 * Thème AgenceFlow : thème MUI standard, sobre.
 * Couleurs de la palette par défaut de Material UI, mode clair par défaut (le mode sombre reste disponible).
 */
export const brand = {
  primary: '#1976d2',
  secondary: '#9c27b0',
  success: '#2e7d32',
  warning: '#ed6c02',
  info: '#0288d1',
  /** Conservés pour compatibilité : couleurs pleines, plus de dégradés. */
  violet: '#1976d2',
  cyan: '#0288d1',
  pink: '#9c27b0',
  gradient: '#1976d2',
}

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  defaultColorScheme: 'light',
  colorSchemes: {
    light: { palette: { background: { default: '#f5f6f8', paper: '#ffffff' } } },
    dark: true,
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 600, fontSize: '1.6rem' },
    h5: { fontWeight: 600, fontSize: '1.2rem' },
    h6: { fontWeight: 600, fontSize: '1.05rem' },
    subtitle2: { fontWeight: 600 },
    overline: { fontWeight: 600, letterSpacing: '0.06em' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiTooltip: { defaultProps: { arrow: true } },
    MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
          '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 },
        },
      },
    },
  },
}, gridFrFR, coreFrFR) // tableaux et composants MUI en français (pagination, filtres…)

/** Thème clair pour les pages vues par les clients (présentation de maquettes). */
export const publicTheme = createTheme({
  palette: { mode: 'light', background: { default: '#f5f6f8', paper: '#ffffff' } },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
  },
}, coreFrFR)
