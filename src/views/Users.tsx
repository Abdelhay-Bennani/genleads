import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserX } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { PasswordInput } from '../auth'
import { Avatar, Button, cx, Field, Modal, PageHeader } from '../components/ui'
import { useStore } from '../store'
import type { PublicUser, Role } from '../types'
import { ROLE_LABEL } from '../types'
import { fmtDateTime } from '../utils'

type Editing = { mode: 'new' } | { mode: 'edit'; user: PublicUser } | { mode: 'password'; user: PublicUser } | { mode: 'delete'; user: PublicUser }

export function Users() {
  const store = useStore()
  const [editing, setEditing] = useState<Editing | null>(null)
  const assigned = (name: string) => store.prospects.filter((p) => p.assignee === name).length

  return (
    <div className="max-w-4xl">
      <PageHeader title="Utilisateurs" subtitle="Gérez les comptes de l'équipe et leurs droits."
        actions={<Button variant="primary" onClick={() => setEditing({ mode: 'new' })}><Plus size={16} />Nouvel utilisateur</Button>} />

      <div className="card mb-4 grid gap-px overflow-hidden bg-slate-100 text-sm sm:grid-cols-2 dark:bg-slate-800">
        <div className="bg-white p-4 dark:bg-slate-900">
          <p className="flex items-center gap-1.5 font-semibold"><ShieldCheck size={15} className="text-brand-600" />Super Admin</p>
          <p className="mt-1 text-slate-500">Tout faire, plus : gérer les utilisateurs, modifier les packs et tarifs, supprimer des prospects, restaurer ou réinitialiser les données.</p>
        </div>
        <div className="bg-white p-4 dark:bg-slate-900">
          <p className="font-semibold">Admin</p>
          <p className="mt-1 text-slate-500">Travail commercial au quotidien : créer et modifier les prospects, journal, relances, devis, prospection, import et export CSV.</p>
        </div>
      </div>

      <div className="card divide-y divide-slate-100 dark:divide-slate-800">
        {store.users.map((u) => (
          <div key={u.id} className={cx('flex flex-col gap-3 p-4 sm:flex-row sm:items-center', !u.active && 'opacity-60')}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={u.name} size="md" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {u.name}
                  {u.id === store.me.id && <span className="text-xs font-normal text-slate-400">(vous)</span>}
                  <span className={cx('rounded-full px-2 py-0.5 text-xs font-medium', u.role === 'super_admin' ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>
                    {ROLE_LABEL[u.role]}
                  </span>
                  {!u.active && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">Désactivé</span>}
                </p>
                <p className="truncate text-xs text-slate-500">
                  @{u.username} · {assigned(u.name)} prospect{assigned(u.name) > 1 ? 's' : ''} · {u.lastLoginAt ? `dernière connexion ${fmtDateTime(u.lastLoginAt)}` : 'jamais connecté'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" onClick={() => setEditing({ mode: 'edit', user: u })}><Pencil size={13} />Modifier</Button>
              <Button size="sm" onClick={() => setEditing({ mode: 'password', user: u })}><KeyRound size={13} />Mot de passe</Button>
              {u.id !== store.me.id && <Button size="sm" variant="ghost" className="!text-rose-600" onClick={() => setEditing({ mode: 'delete', user: u })} aria-label="Supprimer"><Trash2 size={13} /></Button>}
            </div>
          </div>
        ))}
      </div>

      {editing?.mode === 'new' && <UserForm onClose={() => setEditing(null)} />}
      {editing?.mode === 'edit' && <UserForm user={editing.user} onClose={() => setEditing(null)} />}
      {editing?.mode === 'password' && <ResetPassword user={editing.user} onClose={() => setEditing(null)} />}
      {editing?.mode === 'delete' && <DeleteUser user={editing.user} onClose={() => setEditing(null)} />}
    </div>
  )
}

function Err({ text }: { text: string | null }) {
  return text ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{text}</p> : null
}

function UserForm({ user, onClose }: { user?: PublicUser; onClose: () => void }) {
  const store = useStore()
  const [name, setName] = useState(user?.name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [role, setRole] = useState<Role>(user?.role ?? 'admin')
  const [active, setActive] = useState(user?.active ?? true)
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const self = user?.id === store.me.id

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    setBusy(true); setErr(null)
    try {
      if (user) await store.updateUser(user.id, { name, username, role, active })
      else await store.createUser({ name, username, password, role })
      store.notify(user ? 'Utilisateur modifié' : `Compte créé pour ${name}`)
      onClose()
    } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal title={user ? `Modifier ${user.name}` : 'Nouvel utilisateur'} onClose={onClose}
      footer={<><Button onClick={onClose}>Annuler</Button><Button variant="primary" disabled={busy || !name || !username || (!user && !password)} onClick={() => submit()}>{user ? 'Enregistrer' : 'Créer le compte'}</Button></>}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nom affiché"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Yassine" autoFocus /></Field>
        <Field label="Identifiant de connexion"><input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex. yassine" autoComplete="off" /></Field>
        {!user && <Field label="Mot de passe provisoire (8 caractères min.)"><PasswordInput value={password} onChange={setPassword} autoComplete="new-password" /></Field>}
        <div>
          <span className="label">Rôle</span>
          <div className="grid grid-cols-2 gap-2">
            {(['admin', 'super_admin'] as Role[]).map((r) => (
              <button key={r} type="button" onClick={() => setRole(r)} disabled={self}
                className={cx('rounded-lg border px-3 py-2 text-left text-sm font-medium transition disabled:opacity-60', role === r ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200' : 'border-slate-200 dark:border-slate-700')}>
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          {self && <p className="mt-1 text-xs text-slate-400">Vous ne pouvez pas changer votre propre rôle.</p>}
        </div>
        {user && !self && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            Compte actif <span className="text-xs text-slate-400">(décoché : la personne ne peut plus se connecter)</span>
          </label>
        )}
        {user && user.name !== name && <p className="text-xs text-slate-500">Les prospects assignés et le journal seront mis à jour avec le nouveau nom.</p>}
        <Err text={err} />
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

function ResetPassword({ user, onClose }: { user: PublicUser; onClose: () => void }) {
  const store = useStore()
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const submit = async () => {
    setErr(null)
    try {
      await store.updateUser(user.id, { password })
      store.notify(`Mot de passe de ${user.name} modifié`)
      onClose()
    } catch (x) { setErr((x as Error).message) }
  }
  return (
    <Modal title={`Nouveau mot de passe pour ${user.name}`} onClose={onClose}
      footer={<><Button onClick={onClose}>Annuler</Button><Button variant="primary" disabled={!password} onClick={submit}>Enregistrer</Button></>}>
      <div className="space-y-3">
        <Field label="Nouveau mot de passe (8 caractères min.)"><PasswordInput value={password} onChange={setPassword} autoComplete="new-password" autoFocus /></Field>
        {user.id !== store.me.id && <p className="text-xs text-slate-500">{user.name} sera déconnecté(e) et devra utiliser ce nouveau mot de passe. Communiquez-le-lui directement.</p>}
        <Err text={err} />
      </div>
    </Modal>
  )
}

function DeleteUser({ user, onClose }: { user: PublicUser; onClose: () => void }) {
  const store = useStore()
  const [err, setErr] = useState<string | null>(null)
  const go = async () => {
    try { await store.deleteUser(user.id); store.notify(`Compte de ${user.name} supprimé`); onClose() } catch (x) { setErr((x as Error).message) }
  }
  return (
    <Modal title="Supprimer le compte ?" onClose={onClose}
      footer={<><Button onClick={onClose}>Annuler</Button><Button variant="danger" onClick={go}><Trash2 size={14} />Supprimer</Button></>}>
      <div className="space-y-3 text-sm">
        <p>Le compte de <b>{user.name}</b> (@{user.username}) sera supprimé définitivement. Ses prospects et son journal restent dans le CRM.</p>
        <p className="flex items-start gap-2 text-slate-500"><UserX size={15} className="mt-0.5 shrink-0" />Pour simplement bloquer l'accès, préférez « Modifier » puis décocher « Compte actif ».</p>
        <Err text={err} />
      </div>
    </Modal>
  )
}
