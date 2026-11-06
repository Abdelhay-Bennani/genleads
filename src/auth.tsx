import { Eye, EyeOff, Loader2, Moon, ShieldCheck, Sun } from 'lucide-react'
import { createContext, FormEvent, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'
import { Button, Field } from './components/ui'
import type { PublicUser } from './types'

const THEME_KEY = 'agenceflow-crm:theme'

interface Auth {
  user: PublicUser | null
  isSuper: boolean
  login: (username: string, password: string) => Promise<void>
  setup: (name: string, username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  expire: () => void
  setUser: (u: PublicUser) => void
  changePassword: (current: string, next: string) => Promise<void>
  dark: boolean
  toggleDark: () => void
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
  const [dark, setDark] = useState<boolean>(() => {
    try { const t = localStorage.getItem(THEME_KEY); if (t) return t === 'dark' } catch { /* noop */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light') } catch { /* noop */ }
  }, [dark])

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
    dark, toggleDark: () => setDark((d) => !d),
  }
  return <Ctx.Provider value={value}>{children({ loading, needsSetup, user, error })}</Ctx.Provider>
}

/* ---------------------------------------------------------------- écrans */

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { dark, toggleDark } = useAuth()
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <button type="button" onClick={toggleDark} className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Thème">
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
            <svg width="17" height="17" viewBox="0 0 32 32" fill="none"><path d="M7 24 L16 7 L25 24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="text-lg font-semibold tracking-tight">AgenceFlow<span className="ml-1 font-normal text-slate-400">CRM</span></span>
        </div>
        <div className="card p-6">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="mb-5 mt-1 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

export function PasswordInput({ value, onChange, autoComplete, autoFocus, placeholder }: {
  value: string; onChange: (v: string) => void; autoComplete: string; autoFocus?: boolean; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input className="input !pr-9" type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete} autoFocus={autoFocus} placeholder={placeholder} />
      <button type="button" tabIndex={-1} onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600" aria-label="Afficher le mot de passe">
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

function ErrorLine({ text }: { text: string | null }) {
  return text ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{text}</p> : null
}

export function LoginScreen() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try { await login(username, password) } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  return (
    <Shell title="Connexion" subtitle="Accès réservé à l'équipe de l'agence.">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Identifiant"><input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus /></Field>
        <Field label="Mot de passe"><PasswordInput value={password} onChange={setPassword} autoComplete="current-password" /></Field>
        <ErrorLine text={err} />
        <Button type="submit" variant="primary" className="w-full" disabled={busy || !username || !password}>
          {busy && <Loader2 size={15} className="animate-spin" />}Se connecter
        </Button>
        <p className="pt-1 text-center text-xs text-slate-400">Mot de passe oublié ? Demandez au Super Admin de le réinitialiser.</p>
      </form>
    </Shell>
  )
}

export function SetupScreen() {
  const { setup } = useAuth()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setErr('Les deux mots de passe ne correspondent pas.'); return }
    setBusy(true); setErr(null)
    try { await setup(name, username, password) } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  return (
    <Shell title="Bienvenue 👋" subtitle="Première ouverture : créez le compte Super Admin. Vous pourrez ensuite ajouter les comptes Admin.">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
          <ShieldCheck size={15} />Le Super Admin gère les utilisateurs, les tarifs et les données.
        </div>
        <Field label="Nom affiché"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Abdelhay" autoFocus /></Field>
        <Field label="Identifiant de connexion"><input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex. abdelhay" autoComplete="username" /></Field>
        <Field label="Mot de passe (8 caractères min.)"><PasswordInput value={password} onChange={setPassword} autoComplete="new-password" /></Field>
        <Field label="Confirmer le mot de passe"><PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" /></Field>
        <ErrorLine text={err} />
        <Button type="submit" variant="primary" className="w-full" disabled={busy || !name || !username || !password || !confirm}>
          {busy && <Loader2 size={15} className="animate-spin" />}Créer le compte Super Admin
        </Button>
      </form>
    </Shell>
  )
}

export function BootScreen({ error }: { error: string | null }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      {error ? <p className="max-w-sm text-sm text-rose-600">{error}</p> : <Loader2 className="animate-spin text-slate-400" />}
    </div>
  )
}
