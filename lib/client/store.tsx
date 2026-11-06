'use client'
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api, ApiError } from './api'
import { useAuth } from './auth'
import type { AgencySettings, AppData, Interaction, KeywordQuery, Member, Pack, Presentation, Prospect, PublicUser, Role, TemplateData, TemplateImage, WebsiteTemplate } from '../shared/types'
import { uid } from '../shared/utils'

interface Data extends AppData, TemplateData { users: PublicUser[] }

const EMPTY: Data = {
  prospects: [], packs: [], keywords: [], users: [],
  templateCategories: [], templates: [], templateImages: [], templatePresentations: [], templatePresentationItems: [], templateClientSelections: [],
  settings: { agencyName: 'AgenceFlow', agencyTagline: '', logoFile: null, publicBaseUrl: '', contactEmail: '', contactPhone: '' },
  siteTypes: [],
}

interface Store extends Data {
  me: PublicUser
  isSuper: boolean
  /** Noms des utilisateurs actifs (pour l'assignation). */
  members: Member[]
  loaded: boolean
  saveProspect: (p: Prospect) => void
  updateProspect: (id: string, patch: Partial<Prospect>) => void
  deleteProspect: (id: string) => void
  addInteraction: (id: string, i: Omit<Interaction, 'id' | 'date' | 'author'> & { date?: string }) => void
  addProspects: (list: Prospect[]) => void
  setPacks: (p: Pack[]) => void
  setKeywords: (k: KeywordQuery[]) => void
  replaceAll: (d: AppData) => Promise<void>
  resetAll: () => Promise<void>
  refresh: (force?: boolean) => Promise<void>
  createUser: (u: { name: string; username: string; password: string; role: Role }) => Promise<void>
  updateUser: (id: string, patch: Partial<{ name: string; username: string; role: Role; active: boolean; password: string }>) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  /* Maquettes */
  saveTemplate: (t: WebsiteTemplate, images: Omit<TemplateImage, 'templateId' | 'order'>[]) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  createCategory: (name: string) => Promise<string>
  renameCategory: (id: string, name: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  createPresentation: (p: { templateIds: string[]; prospectId: string | null; title: string; message: string }) => Promise<Presentation>
  setPresentationRevoked: (id: string, revoked: boolean) => Promise<void>
  deletePresentation: (id: string) => Promise<void>
  selectInternal: (templateId: string, prospectId: string, message?: string) => Promise<void>
  saveSettings: (s: AgencySettings) => Promise<void>
  presentationUrl: (p: Presentation) => string
  imagesOf: (templateId: string) => TemplateImage[]
  coverOf: (t: WebsiteTemplate) => TemplateImage | undefined
  categoryName: (id: string | null) => string
  toast: { text: string; ok: boolean } | null
  notify: (text: string, ok?: boolean) => void
}

const Ctx = createContext<Store | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const me = auth.user!
  const [data, setData] = useState<Data>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)
  const dataRef = useRef(data)
  dataRef.current = data
  const timers = useRef(new Map<string, number>())
  const lastLocal = useRef(0)
  const toastTimer = useRef<number | undefined>(undefined)

  const notify = useCallback((text: string, ok = true) => {
    setToast({ text, ok })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), ok ? 2500 : 6000)
  }, [])

  const onErr = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { auth.expire(); return }
    notify((e as Error).message || 'Erreur inconnue', false)
  }, [auth, notify])

  const refresh = useCallback(async (force = false) => {
    if (!force && (timers.current.size > 0 || Date.now() - lastLocal.current < 4000)) return
    try {
      const d = await api<Data>('GET', '/api/data')
      setData({ ...EMPTY, ...d })
      setLoaded(true)
      const self = d.users.find((u) => u.id === me.id)
      if (self && (self.name !== me.name || self.role !== me.role)) auth.setUser(self)
    } catch (e) { onErr(e) }
  }, [onErr, me.id, me.name, me.role, auth])

  // Chargement initial + synchronisation régulière (pour voir le travail de l'associé)
  useEffect(() => {
    refresh(true)
    const iv = window.setInterval(() => refresh(), 20000)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => { window.clearInterval(iv); window.removeEventListener('focus', onFocus) }
  }, [refresh])

  // Envoi immédiat des modifications en attente si on ferme l'onglet
  useEffect(() => {
    const flush = () => {
      for (const [id, t] of timers.current) {
        window.clearTimeout(t)
        const p = dataRef.current.prospects.find((x) => x.id === id)
        if (p) fetch(`/api/prospects/${id}`, { method: 'PUT', keepalive: true, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
      }
      timers.current.clear()
    }
    window.addEventListener('beforeunload', flush)
    return () => { window.removeEventListener('beforeunload', flush); flush() }
  }, [])

  const schedulePut = useCallback((id: string, delay = 600) => {
    lastLocal.current = Date.now()
    window.clearTimeout(timers.current.get(id))
    timers.current.set(id, window.setTimeout(() => {
      timers.current.delete(id)
      const p = dataRef.current.prospects.find((x) => x.id === id)
      if (p && p.company.trim()) api('PUT', `/api/prospects/${id}`, p).catch(onErr)
    }, delay))
  }, [onErr])

  const store = useMemo<Store>(() => {
    const patchLocal = (id: string, fn: (p: Prospect) => Prospect) => setData((d) => ({
      ...d, prospects: d.prospects.map((x) => (x.id === id ? { ...fn(x), updatedAt: new Date().toISOString() } : x)),
    }))
    return {
      ...data,
      me, isSuper: me.role === 'super_admin', loaded, toast, notify, refresh,
      members: data.users.filter((u) => u.active).map((u) => u.name),
      saveProspect: (p) => {
        const stamped = { ...p, updatedAt: new Date().toISOString() }
        setData((d) => ({ ...d, prospects: d.prospects.some((x) => x.id === p.id) ? d.prospects.map((x) => (x.id === p.id ? stamped : x)) : [stamped, ...d.prospects] }))
        lastLocal.current = Date.now()
        api('PUT', `/api/prospects/${p.id}`, stamped).then(() => notify('Prospect enregistré')).catch(onErr)
      },
      updateProspect: (id, patch) => { patchLocal(id, (x) => ({ ...x, ...patch })); schedulePut(id) },
      addInteraction: (id, i) => {
        patchLocal(id, (x) => ({ ...x, interactions: [{ id: uid(), date: i.date ?? new Date().toISOString(), author: me.name, type: i.type, text: i.text }, ...x.interactions] }))
        schedulePut(id, 50)
      },
      deleteProspect: (id) => {
        window.clearTimeout(timers.current.get(id)); timers.current.delete(id)
        setData((d) => ({ ...d, prospects: d.prospects.filter((x) => x.id !== id) }))
        api('DELETE', `/api/prospects/${id}`).then(() => notify('Prospect supprimé')).catch((e) => { onErr(e); refresh(true) })
      },
      addProspects: (list) => {
        setData((d) => ({ ...d, prospects: [...list, ...d.prospects] }))
        api('POST', '/api/prospects/bulk', list).catch((e) => { onErr(e); refresh(true) })
      },
      setPacks: (packs) => {
        setData((d) => ({ ...d, packs }))
        api('PUT', '/api/packs', packs).catch((e) => { onErr(e); refresh(true) })
      },
      setKeywords: (keywords) => {
        setData((d) => ({ ...d, keywords }))
        api('PUT', '/api/keywords', keywords).catch((e) => { onErr(e); refresh(true) })
      },
      replaceAll: async (nd) => { await api('PUT', '/api/data', nd); await refresh(true) },
      resetAll: async () => { await api('POST', '/api/reset'); await refresh(true) },
      createUser: async (u) => { await api('POST', '/api/users', u); await refresh(true) },
      updateUser: async (id, patch) => { await api('PATCH', `/api/users/${id}`, patch); await refresh(true) },
      deleteUser: async (id) => { await api('DELETE', `/api/users/${id}`); await refresh(true) },
      saveTemplate: async (t, images) => { await api('PUT', `/api/templates/${t.id}`, { ...t, images }); await refresh(true) },
      deleteTemplate: async (id) => { await api('DELETE', `/api/templates/${id}`); await refresh(true) },
      createCategory: async (name) => { const c = await api<{ id: string }>('POST', '/api/template-categories', { name }); await refresh(true); return c.id },
      renameCategory: async (id, name) => { await api('PATCH', `/api/template-categories/${id}`, { name }); await refresh(true) },
      deleteCategory: async (id) => { await api('DELETE', `/api/template-categories/${id}`); await refresh(true) },
      createPresentation: async (p) => { const r = await api<Presentation>('POST', '/api/presentations', p); await refresh(true); return r },
      setPresentationRevoked: async (id, revoked) => { await api('PATCH', `/api/presentations/${id}`, { revoked }); await refresh(true) },
      deletePresentation: async (id) => { await api('DELETE', `/api/presentations/${id}`); await refresh(true) },
      selectInternal: async (templateId, prospectId, message) => {
        await api('POST', '/api/presentations/select-internal', { templateId, prospectId, message })
        await refresh(true)
      },
      saveSettings: async (st) => { await api('PUT', '/api/settings', st); await refresh(true) },
      presentationUrl: (p) => `${(data.settings.publicBaseUrl || window.location.origin).replace(/\/+$/, '')}/p/${p.token}`,
      imagesOf: (templateId) => data.templateImages.filter((i) => i.templateId === templateId).sort((a, b) => a.order - b.order),
      coverOf: (t) => data.templateImages.find((i) => i.id === t.coverImageId) ?? data.templateImages.filter((i) => i.templateId === t.id).sort((a, b) => a.order - b.order)[0],
      categoryName: (id) => data.templateCategories.find((c) => c.id === id)?.name ?? 'Sans catégorie',
    }
  }, [data, me, loaded, toast, notify, refresh, onErr, schedulePut])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export const useStore = () => {
  const s = useContext(Ctx)
  if (!s) throw new Error('DataProvider manquant')
  return s
}
