'use client'
import { frFR as coreFrFR } from '@mui/material/locale'
import { alpha, createTheme } from '@mui/material/styles'
import { frFR as gridFrFR } from '@mui/x-data-grid/locales'
import type {} from '@mui/x-data-grid/themeAugmentation'

/** Thème AgenceFlow : violet #5539d9 et blanc, panneaux arrondis façon tableau de bord. */
export const brand = { primary: '#5539d9', dark: '#3f28b5', light: '#7e68e6', pale: '#efecfc' }

const violet = { main: brand.primary, dark: brand.dark, light: brand.light, contrastText: '#fff' }
const soft = { main: brand.light, dark: brand.primary, light: '#a597ef', contrastText: '#fff' }

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  defaultColorScheme: 'light',
  colorSchemes: {
    light: {
      palette: {
        primary: violet, secondary: soft, info: violet, success: violet, warning: soft,
        background: { default: '#f4f3fb', paper: '#ffffff' },
        text: { primary: '#18142f', secondary: '#6f6b85' },
        divider: '#ecebf4',
      },
    },
    dark: {
      palette: {
        primary: { ...violet, main: brand.light, dark: brand.primary, light: '#a597ef' }, secondary: soft, info: soft, success: soft, warning: soft,
        background: { default: '#100e1b', paper: '#1a1729' },
        divider: 'rgba(255,255,255,0.08)',
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h3: { fontWeight: 600, fontSize: '3rem', letterSpacing: '-0.03em', lineHeight: 1.1 },
    h4: { fontWeight: 600, fontSize: '2.1rem', letterSpacing: '-0.02em' },
    h5: { fontWeight: 600, fontSize: '1.25rem' },
    h6: { fontWeight: 600, fontSize: '1.1rem', letterSpacing: '-0.01em' },
    subtitle2: { fontWeight: 600 },
    overline: { fontWeight: 500, letterSpacing: '0.06em' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiCard: { defaultProps: { variant: 'outlined' }, styleOverrides: { root: { borderRadius: 20 } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 999, paddingInline: 18 } } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiTooltip: { defaultProps: { arrow: true } },
    MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiToggleButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiDataGrid: {
      styleOverrides: {
        root: ({ theme }) => ({
          border: 'none',
          '--DataGrid-containerBackground': brand.pale,
          ...theme.applyStyles('dark', { '--DataGrid-containerBackground': alpha(brand.light, 0.14) }),
          '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
          '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 },
          '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': { outline: 'none' },
        }),
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: brand.pale,
          ...theme.applyStyles('dark', { backgroundColor: alpha(brand.light, 0.14) }),
          '& .MuiTableCell-root': { fontWeight: 600 },
        }),
      },
    },
  },
}, gridFrFR, coreFrFR) // tableaux et composants MUI en français (pagination, filtres…)

/** Thème clair pour les pages vues par les clients (présentation de maquettes). */
export const publicTheme = createTheme({
  palette: { mode: 'light', primary: violet, secondary: soft, background: { default: '#f4f3fb', paper: '#ffffff' } },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 999 } } },
  },
}, coreFrFR)
