'use client'
import { alpha, createTheme } from '@mui/material/styles'
import type {} from '@mui/x-data-grid/themeAugmentation'

/**
 * Thème AgenceFlow — base du template « Dashboard » de MUI, habillage Web3 :
 * fond sombre profond, dégradés violet → cyan, surfaces en verre dépoli, lueurs.
 */
export const brand = {
  violet: '#8b5cf6',
  violetLight: '#a78bfa',
  violetDark: '#6d28d9',
  cyan: '#22d3ee',
  pink: '#f472b6',
  gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 45%, #22d3ee 100%)',
  gradientText: 'linear-gradient(90deg, #c4b5fd 0%, #67e8f9 100%)',
}

const display = '"Space Grotesk Variable", "Inter Variable", system-ui, sans-serif'

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  defaultColorScheme: 'dark',
  colorSchemes: {
    dark: {
      palette: {
        primary: { main: brand.violet, light: brand.violetLight, dark: brand.violetDark, contrastText: '#fff' },
        secondary: { main: brand.cyan, contrastText: '#06121a' },
        success: { main: '#34d399' },
        warning: { main: '#fbbf24' },
        error: { main: '#f87171' },
        info: { main: '#38bdf8' },
        background: { default: '#07060e', paper: '#100e1d' },
        text: { primary: '#eceaff', secondary: '#a19dc2' },
        divider: 'rgba(167, 139, 250, 0.14)',
      },
    },
    light: {
      palette: {
        primary: { main: '#7c3aed', light: '#a78bfa', dark: '#5b21b6', contrastText: '#fff' },
        secondary: { main: '#0891b2', contrastText: '#fff' },
        success: { main: '#059669' },
        warning: { main: '#d97706' },
        error: { main: '#dc2626' },
        info: { main: '#0284c7' },
        background: { default: '#f5f3ff', paper: '#ffffff' },
        text: { primary: '#1b1530', secondary: '#5f5878' },
        divider: 'rgba(91, 33, 182, 0.12)',
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h1: { fontFamily: display, fontWeight: 600, fontSize: '2.4rem', letterSpacing: '-0.02em' },
    h2: { fontFamily: display, fontWeight: 600, fontSize: '2rem', letterSpacing: '-0.02em' },
    h3: { fontFamily: display, fontWeight: 600, fontSize: '1.6rem', letterSpacing: '-0.015em' },
    h4: { fontFamily: display, fontWeight: 600, fontSize: '1.45rem', letterSpacing: '-0.015em' },
    h5: { fontFamily: display, fontWeight: 600, fontSize: '1.15rem' },
    h6: { fontFamily: display, fontWeight: 600, fontSize: '1rem' },
    subtitle2: { fontWeight: 600 },
    overline: { fontWeight: 600, letterSpacing: '0.08em', fontSize: '0.68rem' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        body: {
          minHeight: '100vh',
          ...theme.applyStyles('dark', {
            backgroundImage: [
              'radial-gradient(900px 520px at 8% -8%, rgba(139, 92, 246, 0.20), transparent 60%)',
              'radial-gradient(800px 500px at 100% 0%, rgba(34, 211, 238, 0.12), transparent 60%)',
              'radial-gradient(700px 500px at 60% 110%, rgba(244, 114, 182, 0.08), transparent 60%)',
            ].join(','),
            backgroundAttachment: 'fixed',
          }),
          ...theme.applyStyles('light', {
            backgroundImage: 'radial-gradient(900px 500px at 0% -10%, rgba(139, 92, 246, 0.12), transparent 60%), radial-gradient(700px 400px at 100% 0%, rgba(34, 211, 238, 0.10), transparent 60%)',
            backgroundAttachment: 'fixed',
          }),
        },
        '::selection': { background: alpha(brand.violet, 0.35) },
      }),
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          ...theme.applyStyles('dark', { backgroundColor: 'rgba(19, 16, 36, 0.72)', backdropFilter: 'blur(16px)' }),
        }),
        outlined: ({ theme }) => ({ borderColor: theme.vars.palette.divider }),
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 16,
          borderColor: theme.vars.palette.divider,
          ...theme.applyStyles('dark', {
            background: 'linear-gradient(180deg, rgba(31, 26, 58, 0.62) 0%, rgba(15, 13, 29, 0.62) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 30px -12px rgba(0,0,0,0.6)',
          }),
          ...theme.applyStyles('light', { boxShadow: '0 1px 2px rgba(27,21,48,0.04), 0 8px 24px -16px rgba(91,33,182,0.25)' }),
        }),
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 14,
          variants: [{
            props: { variant: 'contained', color: 'primary' },
            style: {
              backgroundImage: brand.gradient,
              color: '#fff',
              boxShadow: '0 6px 20px -6px rgba(139, 92, 246, 0.65)',
              '&:hover': { backgroundImage: brand.gradient, filter: 'brightness(1.08)', boxShadow: '0 8px 26px -6px rgba(34, 211, 238, 0.55)' },
              '&.Mui-disabled': { backgroundImage: 'none' },
            },
          }],
        },
        outlined: ({ theme }) => ({ borderColor: theme.vars.palette.divider, '&:hover': { borderColor: theme.vars.palette.primary.main } }),
        sizeSmall: { paddingInline: 10 },
      },
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 8 },
        sizeSmall: { height: 22, fontSize: '0.72rem' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 10,
          ...theme.applyStyles('dark', { backgroundColor: 'rgba(255,255,255,0.025)' }),
          '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.vars.palette.divider },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.vars.palette.primary.main, boxShadow: `0 0 0 3px ${alpha(brand.violet, 0.2)}` },
        }),
      },
    },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderColor: theme.vars.palette.divider,
          ...theme.applyStyles('dark', { backgroundColor: 'rgba(10, 9, 20, 0.85)', backdropFilter: 'blur(18px)' }),
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 18,
          border: `1px solid ${theme.vars.palette.divider}`,
          ...theme.applyStyles('dark', { backgroundColor: 'rgba(18, 15, 34, 0.96)' }),
        }),
      },
    },
    MuiTooltip: { defaultProps: { arrow: true } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44 } } },
    MuiTabs: { styleOverrides: { root: { minHeight: 44 } } },
    MuiListItemButton: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiDataGrid: {
      styleOverrides: {
        root: ({ theme }) => ({
          border: 'none',
          '--DataGrid-containerBackground': 'transparent',
          '& .MuiDataGrid-columnHeaders': { borderBottom: `1px solid ${theme.vars.palette.divider}` },
          '& .MuiDataGrid-cell': { borderColor: theme.vars.palette.divider, display: 'flex', alignItems: 'center' },
          '& .MuiDataGrid-row:hover': { backgroundColor: alpha(brand.violet, 0.08) },
          '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600, color: theme.vars.palette.text.secondary, fontSize: '0.78rem' },
          '& .MuiDataGrid-footerContainer': { borderColor: theme.vars.palette.divider },
          '& .MuiDataGrid-withBorderColor': { borderColor: theme.vars.palette.divider },
        }),
      },
    },
  },
})

/** Thème clair et sobre pour les pages vues par les clients (présentation de maquettes). */
export const publicTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#111827' },
    secondary: { main: '#7c3aed' },
    success: { main: '#059669' },
    background: { default: '#f6f7f9', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#475569' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h1: { fontFamily: display, fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontFamily: display, fontWeight: 600, letterSpacing: '-0.02em' },
    h4: { fontFamily: display, fontWeight: 600 },
    h5: { fontFamily: display, fontWeight: 600 },
    h6: { fontFamily: display, fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 999, paddingInline: 18 } } },
    MuiCssBaseline: { styleOverrides: { body: { backgroundImage: 'none' } } },
  },
})
