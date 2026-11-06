import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import ThemeRegistry from '@/components/theme/ThemeRegistry'

export const metadata: Metadata = {
  title: { default: 'AgenceFlow CRM', template: '%s · AgenceFlow' },
  description: 'CRM de l’agence : prospects, devis, maquettes et présentations clients.',
  icons: { icon: '/icon.svg' },
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#07060e' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <InitColorSchemeScript attribute="class" defaultMode="dark" modeStorageKey="agenceflow-mode" />
        <AppRouterCacheProvider options={{ key: 'mui' }}>
          <ThemeRegistry>{children}</ThemeRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
