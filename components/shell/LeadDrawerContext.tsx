'use client'
import { createContext, ReactNode, useCallback, useContext, useState } from 'react'
import { useStore } from '@/lib/client/store'
import type { Prospect } from '@/lib/shared/types'
import { uid } from '@/lib/shared/utils'
import { LeadDrawer, type LeadTab } from '../leads/LeadDrawer'

interface Ctx { open: (id: string, tab?: LeadTab) => void; create: (seed?: Partial<Prospect>) => void }
const C = createContext<Ctx | null>(null)
export const useLeadDrawer = () => {
  const c = useContext(C)
  if (!c) throw new Error('LeadDrawerProvider manquant')
  return c
}

export const newProspect = (seed: Partial<Prospect> | undefined, user: string): Prospect => {
  const now = new Date().toISOString()
  return {
    id: uid(), company: '', contact: '', phone: '', email: '', city: '', postalCode: '', sectors: [], activity: '', hasWebsite: false, url: '',
    need: '', budget: null, assignee: user, status: 'a_qualifier', nextFollowUp: null, interactions: [], packIds: [], discount: 0,
    source: 'Saisie manuelle', createdAt: now, updatedAt: now, ...seed,
  }
}

export function LeadDrawerProvider({ children }: { children: ReactNode }) {
  const store = useStore()
  const [state, setState] = useState<{ id: string | null; draft: Prospect | null; tab: LeadTab; key: number } | null>(null)
  const canOpen = store.can('leads', 'prospects', 'clients')
  const { notify } = store
  const open = useCallback((id: string, tab: LeadTab = 'infos') => {
    if (!canOpen) { notify('La fiche lead n’est pas accessible avec vos modules actifs.', false); return }
    setState({ id, draft: null, tab, key: Date.now() })
  }, [canOpen, notify])
  const create = useCallback((seed?: Partial<Prospect>) => setState({ id: null, draft: newProspect(seed, store.me.name), tab: 'infos', key: Date.now() }), [store.me.name])
  return (
    <C.Provider value={{ open, create }}>
      {children}
      {state && (
        <LeadDrawer key={state.key} id={state.id} draft={state.draft} initialTab={state.tab}
          onClose={() => setState(null)} onCreated={(id) => setState({ id, draft: null, tab: 'infos', key: Date.now() })} />
      )}
    </C.Provider>
  )
}
