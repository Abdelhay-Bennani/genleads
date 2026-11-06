'use client'
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'
import type { PublicUser } from '../shared/types'

interface Auth {
  user: PublicUser | null
  isSuper: boolean
  login: (username: string, password: string) => Promise<void>
  setup: (name: string, username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  expire: () => void
  setUser: (u: PublicUser) => void
  changePassword: (current: string, next: string) => Promise<void>
}

const Ctx = createContext<Auth | null>(null)
export const useAuth = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('AuthProvider manquant')
  return c
}

export function AuthProvider({ children }: { children: (s: { loading: boolean; needsSetup: boolean; user: PublicUser | null; error: string | null }) => ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [user, setUser] = useState<PublicUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    api<{ needsSetup: boolean; user: PublicUser | null }>('GET', '/api/session')
      .then((s) => { setNeedsSetup(s.needsSetup); setUser(s.user) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const r = await api<{ user: PublicUser }>('POST', '/api/login', { username, password })
    setUser(r.user)
  }, [])
  const setup = useCallback(async (name: string, username: string, password: string) => {
    const r = await api<{ user: PublicUser }>('POST', '/api/setup', { name, username, password })
    setNeedsSetup(false)
    setUser(r.user)
  }, [])
  const logout = useCallback(async () => {
    try { await api('POST', '/api/logout') } catch { /* déjà déconnecté */ }
    setUser(null)
  }, [])

  const value: Auth = {
    user, isSuper: user?.role === 'super_admin', login, setup, logout,
    expire: () => setUser(null),
    setUser,
    changePassword: async (current, next) => { await api('POST', '/api/me/password', { current, next }) },
  }
  return <Ctx.Provider value={value}>{children({ loading, needsSetup, user, error })}</Ctx.Provider>
}

