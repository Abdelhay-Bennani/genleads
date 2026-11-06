import { CheckCircle2, KeyRound, LayoutDashboard, LayoutTemplate, LogOut, Menu, Moon, Package, Search, Settings as Cog, ShieldCheck, Sun, TriangleAlert, Users as UsersIcon, UserCog } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BootScreen, LoginScreen, PasswordInput, SetupScreen, useAuth, AuthProvider } from './auth'
import { ProspectDrawer, type DrawerTab } from './components/ProspectDrawer'
import { PresenterProvider } from './components/templates/Presenter'
import { Avatar, Button, cx, Field, Modal } from './components/ui'
import { DataProvider, useStore } from './store'
import type { Prospect } from './types'
import { ROLE_LABEL } from './types'
import { todayISO, uid } from './utils'
import { Catalog } from './views/Catalog'
import { Dashboard } from './views/Dashboard'
import { Pipeline } from './views/Pipeline'
import { Prospection, type ProspectSeed } from './views/Prospection'
import { Settings } from './views/Settings'
import { Templates } from './views/Templates'
import { Users } from './views/Users'

type View = 'dashboard' | 'pipeline' | 'maquettes' | 'catalogue' | 'prospection' | 'reglages' | 'utilisateurs'
const NAV: { id: View; label: string; short: string; icon: typeof UsersIcon; superOnly?: boolean; mobileMain?: boolean }[] = [
  { id: 'dashboard', label: 'Tableau de bord', short: 'Accueil', icon: LayoutDashboard, mobileMain: true },
  { id: 'pipeline', label: 'Pipeline', short: 'Pipeline', icon: UsersIcon, mobileMain: true },
  { id: 'maquettes', label: 'Mes Maquettes', short: 'Maquettes', icon: LayoutTemplate, mobileMain: true },
  { id: 'prospection', label: 'Prospection', short: 'Recherche', icon: Search, mobileMain: true },
  { id: 'catalogue', label: 'Packs & tarifs', short: 'Packs', icon: Package },
  { id: 'reglages', label: 'Données', short: 'Données', icon: Cog },
  { id: 'utilisateurs', label: 'Utilisateurs', short: 'Équipe', icon: UserCog, superOnly: true },
]
const readHash = (): View => {
  const h = window.location.hash.replace('#/', '') as View
  return NAV.some((n) => n.id === h) ? h : 'dashboard'
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none"><path d="M7 24 L16 7 L25 24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">AgenceFlow<span className="ml-1 font-normal text-slate-400">CRM</span></span>
    </div>
  )
}

const newProspect = (seed: Partial<Prospect> | undefined, user: string): Prospect => {
  const now = new Date().toISOString()
  return {
    id: uid(), company: '', contact: '', phone: '', email: '', city: '', postalCode: '', sectors: [], activity: '', hasWebsite: false, url: '',
    need: '', budget: null, assignee: user, status: 'a_qualifier', nextFollowUp: null, interactions: [], packIds: [], discount: 0,
    source: 'Saisie manuelle', createdAt: now, updatedAt: now, ...seed,
  }
}

export default function Root() {
  return (
    <AuthProvider>
      {({ loading, needsSetup, user, error }) =>
        loading || error ? <BootScreen error={error} />
          : needsSetup ? <SetupScreen />
            : !user ? <LoginScreen />
              : <DataProvider key={user.id}><PresenterProvider><App /></PresenterProvider></DataProvider>}
    </AuthProvider>
  )
}

function AccountModal({ onClose }: { onClose: () => void }) {
  const auth = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const submit = async () => {
    if (next !== confirm) { setMsg({ ok: false, text: 'Les deux nouveaux mots de passe ne correspondent pas.' }); return }
    try { await auth.changePassword(current, next); setMsg({ ok: true, text: 'Mot de passe modifié.' }); setCurrent(''); setNext(''); setConfirm('') }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }) }
  }
  const u = auth.user!
  return (
    <Modal title="Mon compte" onClose={onClose}
      footer={<><Button variant="ghost" className="mr-auto" onClick={auth.logout}><LogOut size={14} />Se déconnecter</Button><Button variant="primary" disabled={!current || !next || !confirm} onClick={submit}>Changer le mot de passe</Button></>}>
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={u.name} size="lg" />
        <div>
          <p className="font-semibold">{u.name}</p>
          <p className="text-sm text-slate-500">@{u.username} · {ROLE_LABEL[u.role]}</p>
        </div>
      </div>
      <div className="space-y-3">
        <Field label="Mot de passe actuel"><PasswordInput value={current} onChange={setCurrent} autoComplete="current-password" /></Field>
        <Field label="Nouveau mot de passe (8 caractères min.)"><PasswordInput value={next} onChange={setNext} autoComplete="new-password" /></Field>
        <Field label="Confirmer le nouveau mot de passe"><PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" /></Field>
        {msg && <p className={cx('rounded-lg px-3 py-2 text-sm', msg.ok ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300')}>{msg.text}</p>}
        <button type="button" onClick={auth.toggleDark} className="flex items-center gap-2 pt-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
          {auth.dark ? <Sun size={15} /> : <Moon size={15} />}{auth.dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        </button>
      </div>
    </Modal>
  )
}

function App() {
  const store = useStore()
  const auth = useAuth()
  const [view, setView] = useState<View>(readHash)
  const [openId, setOpenId] = useState<string | null>(null)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('infos')
  const [more, setMore] = useState(false)
  const [draft, setDraft] = useState<Prospect | null>(null)
  const [account, setAccount] = useState(false)
  const nav = NAV.filter((n) => !n.superOnly || store.isSuper)
  const current: View = nav.some((n) => n.id === view) ? view : 'dashboard'

  useEffect(() => {
    const h = () => setView(readHash())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  const go = (v: View) => { window.location.hash = `/${v}`; setView(v); setMore(false); window.scrollTo(0, 0) }

  const open = (id: string, tab: DrawerTab = 'infos') => { setDraft(null); setDrawerTab(tab); setOpenId(id) }
  const createNew = (seed?: ProspectSeed) => { setOpenId(null); setDrawerTab('infos'); setDraft(newProspect(seed, store.me.name)) }
  const close = () => { setOpenId(null); setDraft(null) }
  const followCount = store.prospects.filter((p) => !['gagne', 'perdu'].includes(p.status) && p.nextFollowUp && p.nextFollowUp <= todayISO()).length

  if (!store.loaded) return <BootScreen error={null} />

  return (
    <div className="min-h-screen lg:pl-60">
      {/* Barre latérale (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-200 bg-white px-3 py-4 lg:flex dark:border-slate-800 dark:bg-slate-900">
        <div className="px-2"><Logo /></div>
        <nav className="mt-6 flex-1 space-y-0.5">
          {nav.map((n) => (
            <button key={n.id} type="button" onClick={() => go(n.id)}
              className={cx('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition',
                current === n.id ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>
              <n.icon size={17} />{n.label}
              {n.id === 'dashboard' && followCount > 0 && <span className="ml-auto rounded-full bg-amber-100 px-1.5 text-xs text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">{followCount}</span>}
            </button>
          ))}
        </nav>
        <div className="space-y-1 border-t border-slate-100 pt-3 dark:border-slate-800">
          <button type="button" onClick={auth.toggleDark} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            {auth.dark ? <Sun size={16} /> : <Moon size={16} />}{auth.dark ? 'Mode clair' : 'Mode sombre'}
          </button>
          <div className="flex items-center gap-1 rounded-lg px-1.5 py-1.5">
            <button type="button" onClick={() => setAccount(true)} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 text-left hover:bg-slate-100 dark:hover:bg-slate-800">
              <Avatar name={store.me.name} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{store.me.name}</p>
                <p className="flex items-center gap-1 text-xs text-slate-500">{store.isSuper && <ShieldCheck size={11} className="text-brand-600" />}{ROLE_LABEL[store.me.role]}</p>
              </div>
            </button>
            <button type="button" title="Mon mot de passe" onClick={() => setAccount(true)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><KeyRound size={15} /></button>
            <button type="button" title="Se déconnecter" onClick={auth.logout} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><LogOut size={15} /></button>
          </div>
        </div>
      </aside>

      {/* Barre du haut (mobile) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <Logo />
        <button type="button" onClick={() => setAccount(true)} title="Mon compte"><Avatar name={store.me.name} size="md" /></button>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
        {current === 'dashboard' && <Dashboard onOpen={(id) => open(id)} />}
        {current === 'pipeline' && <Pipeline onOpen={(id) => open(id)} onNew={() => createNew()} />}
        {current === 'prospection' && <Prospection onConvert={(s) => createNew(s)} />}
        {current === 'catalogue' && <Catalog onOpen={(id) => open(id)} />}
        {current === 'reglages' && <Settings />}
        {current === 'maquettes' && <Templates onOpenProspect={open} />}
        {current === 'utilisateurs' && <Users />}
      </main>

      {/* Navigation basse (mobile) */}
      {more && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-x-3 bottom-[4.5rem] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            {nav.filter((n) => !n.mobileMain).map((n) => (
              <button key={n.id} type="button" onClick={() => go(n.id)} className={cx('flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium', current === n.id ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200' : 'text-slate-700 dark:text-slate-200')}>
                <n.icon size={18} />{n.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <button type="button" onClick={() => setMore(!more)} className={cx('order-last flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium', more || nav.some((n) => !n.mobileMain && n.id === current) ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500')}>
          <Menu size={20} />Plus
        </button>
        {nav.filter((n) => n.mobileMain).map((n) => (
          <button key={n.id} type="button" onClick={() => go(n.id)}
            className={cx('relative flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium', current === n.id ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500')}>
            <n.icon size={20} />{n.short}
            {n.id === 'dashboard' && followCount > 0 && <span className="absolute right-1/2 top-1 translate-x-4 rounded-full bg-amber-500 px-1 text-[10px] leading-4 text-white">{followCount}</span>}
          </button>
        ))}
      </nav>

      {(openId || draft) && (
        <ProspectDrawer key={(draft?.id ?? openId) + drawerTab} id={openId} draft={draft} initialTab={drawerTab} onClose={close}
          onCreated={(id) => { setDraft(null); setOpenId(id); if (current !== 'pipeline' && current !== 'dashboard') go('pipeline') }} />
      )}
      {account && <AccountModal onClose={() => setAccount(false)} />}

      {store.toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4 lg:bottom-6">
          <div className={cx('flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium shadow-lg',
            store.toast.ok ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-rose-600 text-white')}>
            {store.toast.ok ? <CheckCircle2 size={16} /> : <TriangleAlert size={16} />}{store.toast.text}
          </div>
        </div>
      )}
    </div>
  )
}
