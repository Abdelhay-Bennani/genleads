'use client'
import { Alert, Snackbar } from '@mui/material'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/AppShell'
import { BootScreen, LoginScreen, SetupScreen } from '@/components/shell/AuthScreens'
import { LeadDrawerProvider } from '@/components/shell/LeadDrawerContext'
import { PresenterProvider } from '@/components/templates/PresenterContext'
import { AuthProvider } from '@/lib/client/auth'
import { DataProvider, useStore } from '@/lib/client/store'

function Ready({ children }: { children: ReactNode }) {
  const store = useStore()
  if (!store.loaded) return <BootScreen error={null} />
  return (
    <PresenterProvider>
      <LeadDrawerProvider>
        <AppShell>{children}</AppShell>
        <Snackbar open={!!store.toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert severity={store.toast?.ok ? 'success' : 'error'} variant="filled" sx={{ boxShadow: 6 }}>{store.toast?.text}</Alert>
        </Snackbar>
      </LeadDrawerProvider>
    </PresenterProvider>
  )
}

export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {({ loading, needsSetup, user, error }) =>
        loading || error ? <BootScreen error={error} />
          : needsSetup ? <SetupScreen />
            : !user ? <LoginScreen />
              : <DataProvider key={user.id}><Ready>{children}</Ready></DataProvider>}
    </AuthProvider>
  )
}
