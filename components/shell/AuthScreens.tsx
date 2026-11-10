'use client'
import { DarkModeOutlined, LightModeOutlined, ShieldOutlined, Visibility, VisibilityOff } from '@mui/icons-material'
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, IconButton, InputAdornment, Stack, TextField, Typography,
} from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import { FormEvent, ReactNode, useState } from 'react'
import { useAuth } from '@/lib/client/auth'
import { Logo } from './Logo'

export function ModeToggle() {
  const { mode, systemMode, setMode } = useColorScheme()
  const resolved = mode === 'system' ? systemMode : mode
  return (
    <IconButton aria-label="Changer de thème" onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')} size="small"
      sx={{ width: 44, height: 44, bgcolor: 'background.default' }}>
      {resolved === 'dark' ? <LightModeOutlined fontSize="small" /> : <DarkModeOutlined fontSize="small" />}
    </IconButton>
  )
}

export function PasswordField({ label, value, onChange, autoComplete, autoFocus }: {
  label: string; value: string; onChange: (v: string) => void; autoComplete: string; autoFocus?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <TextField label={label} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete} autoFocus={autoFocus}
      slotProps={{ input: { endAdornment: (
        <InputAdornment position="end">
          <IconButton size="small" tabIndex={-1} onClick={() => setShow(!show)} aria-label="Afficher le mot de passe">
            {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
          </IconButton>
        </InputAdornment>
      ) } }} />
  )
}

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2, position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}><ModeToggle /></Box>
      <Box sx={{ width: '100%', maxWidth: 400 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}><Logo size="lg" /></Box>
        <Card>
          <CardContent sx={{ p: 3.5 }}>
            <Typography variant="h5">{title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>{subtitle}</Typography>
            {children}
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
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
      <Stack component="form" onSubmit={submit} spacing={2}>
        <TextField label="Identifiant" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
        <PasswordField label="Mot de passe" value={password} onChange={setPassword} autoComplete="current-password" />
        {err && <Alert severity="error">{err}</Alert>}
        <Button type="submit" variant="contained" size="large" disabled={busy || !username || !password} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}>
          Se connecter
        </Button>
        <Typography variant="caption" color="text.secondary" align="center">Mot de passe oublié ? Demandez au Super Admin de le réinitialiser.</Typography>
      </Stack>
    </Shell>
  )
}

export function SetupScreen() {
  const { setup } = useAuth()
  const [f, setF] = useState({ name: '', username: '', password: '', confirm: '' })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (f.password !== f.confirm) { setErr('Les deux mots de passe ne correspondent pas.'); return }
    setBusy(true); setErr(null)
    try { await setup(f.name, f.username, f.password) } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  return (
    <Shell title="Bienvenue 👋" subtitle="Première ouverture : créez le compte Super Admin. Vous ajouterez ensuite les comptes Admin.">
      <Stack component="form" onSubmit={submit} spacing={2}>
        <Alert icon={<ShieldOutlined fontSize="small" />} severity="info" variant="outlined">Le Super Admin gère les utilisateurs, les tarifs et les données.</Alert>
        <TextField label="Nom affiché" placeholder="ex. Abdelhay" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        <TextField label="Identifiant de connexion" placeholder="ex. abdelhay" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoComplete="username" />
        <PasswordField label="Mot de passe (8 caractères min.)" value={f.password} onChange={(v) => setF({ ...f, password: v })} autoComplete="new-password" />
        <PasswordField label="Confirmer le mot de passe" value={f.confirm} onChange={(v) => setF({ ...f, confirm: v })} autoComplete="new-password" />
        {err && <Alert severity="error">{err}</Alert>}
        <Button type="submit" variant="contained" size="large" disabled={busy || !f.name || !f.username || !f.password || !f.confirm}>Créer le compte Super Admin</Button>
      </Stack>
    </Shell>
  )
}

export function BootScreen({ error }: { error: string | null }) {
  if (!error) return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  const config = /DATABASE_URL/.test(error)
  return (
    <Shell title={config ? 'Base de données à configurer' : 'Connexion impossible'} subtitle={config ? 'AgenceFlow a besoin d’une base PostgreSQL (Neon ou Supabase).' : 'Le serveur ou la base de données ne répond pas.'}>
      <Alert severity={config ? 'warning' : 'error'} sx={{ mb: 2 }}>{error}</Alert>
      {config && (
        <Typography variant="body2" color="text.secondary">
          Fermez la fenêtre AgenceFlow puis relancez <b>lancer.bat</b> : il vous demandera l’URL de connexion (Neon → Connection string).
        </Typography>
      )}
      <Button sx={{ mt: 2 }} fullWidth variant="outlined" onClick={() => window.location.reload()}>Réessayer</Button>
    </Shell>
  )
}
