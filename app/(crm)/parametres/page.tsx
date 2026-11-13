'use client'
import {
  AddPhotoAlternateOutlined, AddRounded, BusinessRounded, CloseRounded, DownloadRounded, EditOutlined, KeyRounded, ManageAccountsOutlined,
  RestartAltRounded, ShieldOutlined, StorageRounded, UploadFileRounded, DeleteOutlineRounded, PeopleAltOutlined,
  ContentCopyRounded, FiberManualRecord, VisibilityOffOutlined, VisibilityOutlined, HistoryRounded, BackupOutlined,
} from '@mui/icons-material'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, Grid,
  IconButton, List, ListItem, ListItemText, Stack, Switch, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material'
import { useRef, useState } from 'react'
import { AccountDialog } from '@/components/shell/AccountDialog'
import { ActivityLog } from '@/components/shell/ActivityLog'
import { BackupsPanel } from '@/components/shell/BackupsPanel'
import { PasswordField } from '@/components/shell/AuthScreens'
import { PermissionsPanel } from '@/components/shell/PermissionsPanel'
import { AgencyMark } from '@/components/templates/Portfolio'
import { PageHeader, UserAvatar } from '@/components/ui'
import { uploadLogo } from '@/lib/client/images'
import { useStore } from '@/lib/client/store'
import { isPrivateUrl } from '@/lib/client/templates'
import { MODULES, type ModuleId } from '@/lib/shared/modules'
import type { AppData, Prospect, PublicUser, Role } from '@/lib/shared/types'
import { ROLE_LABEL } from '@/lib/shared/types'
import { csvToProspects, download, fmtDateTime, normalize, prospectsToCSV, todayISO } from '@/lib/shared/utils'

type T = 'agence' | 'utilisateurs' | 'permissions' | 'journal' | 'donnees' | 'sauvegardes' | 'compte'

export default function ParametresPage() {
  const store = useStore()
  const showData = store.can('leads', 'prospects')
  const [tab, setTab] = useState<T>(store.isSuper ? 'agence' : 'donnees')
  const [account, setAccount] = useState(false)
  return (
    <>
      <PageHeader title="Paramètres" subtitle="Identité de l'agence, équipe, données et compte." />
      <Tabs value={showData || store.isSuper ? tab : false} onChange={(_e, v) => v === 'compte' ? setAccount(true) : setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }} variant="scrollable">
        {store.isSuper && <Tab value="agence" icon={<BusinessRounded fontSize="small" />} iconPosition="start" label="Agence" />}
        {store.isSuper && <Tab value="utilisateurs" icon={<PeopleAltOutlined fontSize="small" />} iconPosition="start" label="Utilisateurs" />}
        {store.isSuper && <Tab value="permissions" icon={<ShieldOutlined fontSize="small" />} iconPosition="start" label="Permissions" />}
        {store.isSuper && <Tab value="journal" icon={<HistoryRounded fontSize="small" />} iconPosition="start" label="Journal" />}
        {showData && <Tab value="donnees" icon={<StorageRounded fontSize="small" />} iconPosition="start" label="Données" />}
        {store.isSuper && <Tab value="sauvegardes" icon={<BackupOutlined fontSize="small" />} iconPosition="start" label="Sauvegardes" />}
        <Tab value="compte" icon={<ManageAccountsOutlined fontSize="small" />} iconPosition="start" label="Mon compte" />
      </Tabs>
      {tab === 'agence' && store.isSuper && <Agency />}
      {tab === 'utilisateurs' && store.isSuper && <Users />}
      {tab === 'permissions' && store.isSuper && <PermissionsPanel />}
      {tab === 'journal' && store.isSuper && <ActivityLog />}
      {tab === 'donnees' && showData && <Data />}
      {tab === 'sauvegardes' && store.isSuper && <BackupsPanel />}
      {account && <AccountDialog onClose={() => setAccount(false)} />}
    </>
  )
}

function Agency() {
  const store = useStore()
  const [s, setS] = useState(store.settings)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)
  const base = s.publicBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  const upload = async (f?: File) => {
    if (!f) return
    setUploading(true); setErr(null)
    try { setS({ ...s, logoFile: await uploadLogo(f) }) } catch (e) { setErr((e as Error).message) } finally { setUploading(false) }
  }
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Identité de l'agence</Typography>
        <Typography variant="body2" color="text.secondary">Affichée sur les pages de présentation de maquettes envoyées aux prospects.</Typography>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ height: 120, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: '#fff', color: '#0f172a', border: 1, borderColor: 'divider' }}>
              {uploading ? <CircularProgress size={24} /> : <AgencyMark agency={{ name: s.agencyName || 'Agence', logoFile: s.logoFile }} />}
            </Box>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button size="small" variant="outlined" startIcon={<AddPhotoAlternateOutlined />} onClick={() => ref.current?.click()}>{s.logoFile ? 'Changer le logo' : 'Ajouter un logo'}</Button>
              {s.logoFile && <IconButton size="small" onClick={() => setS({ ...s, logoFile: null })}><CloseRounded fontSize="small" /></IconButton>}
            </Stack>
            <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Nom de l'agence" value={s.agencyName} onChange={(e) => setS({ ...s, agencyName: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Accroche" value={s.agencyTagline} onChange={(e) => setS({ ...s, agencyTagline: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Email de contact" type="email" value={s.contactEmail} onChange={(e) => setS({ ...s, contactEmail: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Téléphone de contact" value={s.contactPhone} onChange={(e) => setS({ ...s, contactPhone: e.target.value })} /></Grid>
              <Grid size={12}><TextField label="Adresse publique de l'application (liens partagés)" value={s.publicBaseUrl} onChange={(e) => setS({ ...s, publicBaseUrl: e.target.value })} placeholder="https://crm.votre-agence.fr" /></Grid>
              {isPrivateUrl(base) && <Grid size={12}><Alert severity="warning" variant="outlined">Les liens actuels pointent vers {base} : ils ne s'ouvrent que sur votre ordinateur ou votre réseau. Une fois l'application en ligne, indiquez ici son adresse publique.</Alert></Grid>}
            </Grid>
          </Grid>
        </Grid>
        <Divider sx={{ my: 3 }} />
        <Typography variant="h6">Mentions légales & devis</Typography>
        <Typography variant="body2" color="text.secondary">Imprimées sur les devis et factures PDF. Un document sans ces mentions n’est pas conforme.</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, sm: 6 }}><TextField label="Raison sociale" value={s.legalName} onChange={(e) => setS({ ...s, legalName: e.target.value })} placeholder={s.agencyName} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField label="Adresse" value={s.address} onChange={(e) => setS({ ...s, address: e.target.value })} /></Grid>
          <Grid size={{ xs: 4, sm: 2 }}><TextField label="Code postal" value={s.postalCode} onChange={(e) => setS({ ...s, postalCode: e.target.value })} /></Grid>
          <Grid size={{ xs: 8, sm: 4 }}><TextField label="Ville" value={s.city} onChange={(e) => setS({ ...s, city: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, sm: 3 }}><TextField label="SIRET" value={s.siret} onChange={(e) => setS({ ...s, siret: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, sm: 3 }}><TextField label="N° TVA intracom." value={s.vatNumber} onChange={(e) => setS({ ...s, vatNumber: e.target.value })} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><TextField label="Taux de TVA (%)" type="number" value={s.vatRate} onChange={(e) => setS({ ...s, vatRate: Number(e.target.value) || 0 })} helperText={s.vatRate === 0 ? 'Franchise : « TVA non applicable, art. 293 B du CGI »' : undefined} /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><TextField label="Validité des devis (jours)" type="number" value={s.quoteValidityDays} onChange={(e) => setS({ ...s, quoteValidityDays: Number(e.target.value) || 30 })} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><TextField label="IBAN" value={s.iban} onChange={(e) => setS({ ...s, iban: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, sm: 2 }}><TextField label="BIC" value={s.bic} onChange={(e) => setS({ ...s, bic: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField label="Conditions de paiement" multiline minRows={2} value={s.paymentTerms} onChange={(e) => setS({ ...s, paymentTerms: e.target.value })} /></Grid>
          <Grid size={12}><TextField label="Mentions par défaut en bas du devis" multiline minRows={2} value={s.quoteNotes} onChange={(e) => setS({ ...s, quoteNotes: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, sm: 3 }}><TextField label="Délai de paiement des factures (jours)" type="number" value={s.invoiceDueDays} onChange={(e) => setS({ ...s, invoiceDueDays: Math.max(0, Math.min(60, Number(e.target.value) || 0)) })} helperText="60 jours maximum" /></Grid>
          <Grid size={{ xs: 12, sm: 9 }}><TextField label="Mentions obligatoires des factures" multiline minRows={2} value={s.invoiceNotes} onChange={(e) => setS({ ...s, invoiceNotes: e.target.value })} helperText="Pénalités de retard et indemnité forfaitaire de 40 € : obligatoires entre professionnels." /></Grid>
        </Grid>
        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
          <Button variant="contained" disabled={busy || uploading} onClick={async () => { setBusy(true); try { await store.saveSettings(s); store.notify("Paramètres de l'agence enregistrés") } catch (e) { setErr((e as Error).message) } finally { setBusy(false) } }}>Enregistrer</Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

function Users() {
  const store = useStore()
  const [editing, setEditing] = useState<{ mode: 'new' | 'edit' | 'password' | 'delete'; user?: PublicUser } | null>(null)
  const assigned = (n: string) => store.prospects.filter((p) => p.assignee === n).length
  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}><Card sx={{ p: 2, height: '100%' }}><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><ShieldOutlined color="primary" fontSize="small" /><Typography sx={{ fontWeight: 600 }}>Super Admin</Typography></Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Tout faire, plus : gérer les utilisateurs et leurs modules, modifier les tarifs et l'identité de l'agence, supprimer des leads ou maquettes, restaurer ou réinitialiser les données.</Typography></Card></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Card sx={{ p: 2, height: '100%' }}><Typography sx={{ fontWeight: 600 }}>Admin</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Accès aux modules que vous lui ouvrez dans l'onglet « Permissions » : tous par défaut.</Typography></Card></Grid>
      </Grid>
      <Card>
        <Stack direction="row" sx={{ p: 2, justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Équipe</Typography>
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setEditing({ mode: 'new' })}>Nouvel utilisateur</Button>
        </Stack>
        <Divider />
        <List disablePadding>
          {store.users.map((u, i) => (
            <Box key={u.id}>
              {i > 0 && <Divider />}
              <ListItem sx={{ py: 1.5, opacity: u.active ? 1 : 0.6, flexWrap: 'wrap', gap: 1.5 }}>
                <UserAvatar name={u.name} size={38} />
                <ListItemText sx={{ minWidth: 200 }}
                  primary={<Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}><b>{u.name}</b>{u.id === store.me.id && <Typography variant="caption" color="text.secondary">(vous)</Typography>}<Chip size="small" label={ROLE_LABEL[u.role]} color={u.role === 'super_admin' ? 'primary' : 'default'} variant="outlined" />{!u.active && <Chip size="small" color="error" variant="outlined" label="Désactivé" />}{u.active && <OnlineChip user={u} />}</Stack>}
                  secondary={<>
                    {`@${u.username} · ${assigned(u.name)} lead(s) · ${u.lastLoginAt ? `dernière connexion ${fmtDateTime(u.lastLoginAt)}` : 'jamais connecté'}`}
                    <PasswordReveal password={u.password} />
                  </>}
                  slotProps={{ secondary: { component: 'div' } }} />
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" startIcon={<EditOutlined />} onClick={() => setEditing({ mode: 'edit', user: u })}>Modifier</Button>
                  <Button size="small" variant="outlined" startIcon={<KeyRounded />} onClick={() => setEditing({ mode: 'password', user: u })}>Mot de passe</Button>
                  {u.id !== store.me.id && <IconButton size="small" color="error" onClick={() => setEditing({ mode: 'delete', user: u })}><DeleteOutlineRounded fontSize="small" /></IconButton>}
                </Stack>
              </ListItem>
            </Box>
          ))}
        </List>
      </Card>
      {editing && (editing.mode === 'new' || editing.mode === 'edit') && <UserForm user={editing.user} onClose={() => setEditing(null)} />}
      {editing?.mode === 'password' && editing.user && <ResetPassword user={editing.user} onClose={() => setEditing(null)} />}
      {editing?.mode === 'delete' && editing.user && <DeleteUser user={editing.user} onClose={() => setEditing(null)} />}
    </Stack>
  )
}

function OnlineChip({ user }: { user: PublicUser }) {
  const title = user.online ? 'Actif dans les 2 dernières minutes' : user.lastSeenAt ? `Vu pour la dernière fois ${fmtDateTime(user.lastSeenAt)}` : 'Jamais vu en ligne'
  return (
    <Tooltip title={title}>
      <Chip size="small" variant="outlined" color={user.online ? 'success' : 'default'} label={user.online ? 'En ligne' : 'Hors ligne'}
        icon={<FiberManualRecord sx={{ fontSize: '10px !important', color: user.online ? 'success.main' : 'text.disabled' }} />} />
    </Tooltip>
  )
}

/** Mot de passe visible par le Super Admin (masqué par défaut). */
function PasswordReveal({ password }: { password?: string | null }) {
  const store = useStore()
  const [show, setShow] = useState(false)
  if (password === undefined) return null
  if (password === null) return <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25 }}>Mot de passe : inconnu (visible après sa prochaine connexion ou une réinitialisation)</Typography>
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.25 }}>
      <Typography variant="caption" color="text.secondary">Mot de passe :</Typography>
      <Typography variant="caption" sx={{ fontFamily: 'monospace', userSelect: show ? 'text' : 'none' }}>{show ? password : '••••••••'}</Typography>
      <Tooltip title={show ? 'Masquer' : 'Afficher'}><IconButton size="small" onClick={() => setShow(!show)}>{show ? <VisibilityOffOutlined sx={{ fontSize: 16 }} /> : <VisibilityOutlined sx={{ fontSize: 16 }} />}</IconButton></Tooltip>
      {show && <Tooltip title="Copier"><IconButton size="small" onClick={() => { navigator.clipboard?.writeText(password); store.notify('Mot de passe copié') }}><ContentCopyRounded sx={{ fontSize: 16 }} /></IconButton></Tooltip>}
    </Stack>
  )
}

function UserForm({ user, onClose }: { user?: PublicUser; onClose: () => void }) {
  const store = useStore()
  const [f, setF] = useState({ name: user?.name ?? '', username: user?.username ?? '', role: (user?.role ?? 'admin') as Role, active: user?.active ?? true, password: '' })
  const [off, setOff] = useState<ModuleId[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const self = user?.id === store.me.id
  const submit = async () => {
    setBusy(true); setErr(null)
    try {
      if (user) await store.updateUser(user.id, { name: f.name, username: f.username, role: f.role, active: f.active })
      else await store.createUser({ name: f.name, username: f.username, password: f.password, role: f.role, disabledModules: off })
      store.notify(user ? 'Utilisateur modifié' : `Compte créé pour ${f.name}`); onClose()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{user ? `Modifier ${user.name}` : 'Nouvel utilisateur'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Nom affiché" placeholder="ex. Yassine" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <TextField label="Identifiant de connexion" placeholder="ex. yassine" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoComplete="off" />
          {!user && <PasswordField label="Mot de passe provisoire (8 caractères min.)" value={f.password} onChange={(v) => setF({ ...f, password: v })} autoComplete="new-password" />}
          <ToggleButtonGroup exclusive fullWidth size="small" value={f.role} disabled={self} onChange={(_e, v) => v && setF({ ...f, role: v })}>
            <ToggleButton value="admin">Admin</ToggleButton><ToggleButton value="super_admin">Super Admin</ToggleButton>
          </ToggleButtonGroup>
          {self && <Typography variant="caption" color="text.secondary">Vous ne pouvez pas changer votre propre rôle.</Typography>}
          {!user && f.role === 'admin' && (
            <Box>
              <Typography variant="caption" color="text.secondary">Modules ouverts (modifiables ensuite dans « Permissions »)</Typography>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
                {MODULES.map((m) => { const on = !off.includes(m.id); return <Chip key={m.id} size="small" label={m.label} color={on ? 'primary' : 'default'} variant={on ? 'filled' : 'outlined'} onClick={() => setOff(on ? [...off, m.id] : off.filter((x) => x !== m.id))} /> })}
              </Stack>
            </Box>
          )}
          {user && !self && <FormControlLabel control={<Switch checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />} label="Compte actif" />}
          {user && user.name !== f.name && <Typography variant="caption" color="text.secondary">Les leads assignés et le journal seront mis à jour avec le nouveau nom.</Typography>}
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Annuler</Button><Button variant="contained" disabled={busy || !f.name || !f.username || (!user && !f.password)} onClick={submit}>{user ? 'Enregistrer' : 'Créer le compte'}</Button></DialogActions>
    </Dialog>
  )
}

function ResetPassword({ user, onClose }: { user: PublicUser; onClose: () => void }) {
  const store = useStore()
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Nouveau mot de passe pour {user.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <PasswordField label="Nouveau mot de passe (8 caractères min.)" value={pw} onChange={setPw} autoComplete="new-password" autoFocus />
          {user.id !== store.me.id && <Typography variant="caption" color="text.secondary">{user.name} sera déconnecté(e). Communiquez-lui le nouveau mot de passe directement.</Typography>}
          {err && <Alert severity="error">{err}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Annuler</Button><Button variant="contained" disabled={!pw} onClick={async () => { try { await store.updateUser(user.id, { password: pw }); store.notify(`Mot de passe de ${user.name} modifié`); onClose() } catch (e) { setErr((e as Error).message) } }}>Enregistrer</Button></DialogActions>
    </Dialog>
  )
}

function DeleteUser({ user, onClose }: { user: PublicUser; onClose: () => void }) {
  const store = useStore()
  const [err, setErr] = useState<string | null>(null)
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Supprimer le compte ?</DialogTitle>
      <DialogContent>
        <Typography>Le compte de <b>{user.name}</b> (@{user.username}) sera supprimé définitivement. Ses leads et son journal restent dans le CRM.</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>Pour simplement bloquer l'accès, préférez « Modifier » puis désactivez le compte.</Typography>
        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Annuler</Button><Button color="error" variant="contained" onClick={async () => { try { await store.deleteUser(user.id); store.notify(`Compte de ${user.name} supprimé`); onClose() } catch (e) { setErr((e as Error).message) } }}>Supprimer</Button></DialogActions>
    </Dialog>
  )
}

function Data() {
  const store = useStore()
  const csvRef = useRef<HTMLInputElement>(null)
  const jsonRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ all: Prospect[]; fresh: Prospect[] } | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const onCSV = async (f?: File) => {
    if (!f) return
    const list = csvToProspects(await f.text(), store.members)
    if (!list.length) { setMsg({ ok: false, text: 'Aucun lead trouvé : vérifiez que la 1ʳᵉ ligne contient les en-têtes (Client / Entreprise, Ville…).' }); return }
    const existing = new Set(store.prospects.map((p) => normalize(p.company)))
    setPreview({ all: list, fresh: list.filter((p) => !existing.has(normalize(p.company))) })
  }
  const onJSON = async (f?: File) => {
    if (!f) return
    let d: AppData
    try { d = JSON.parse(await f.text()); if (!Array.isArray(d.prospects) || !Array.isArray(d.packs)) throw new Error() } catch { setMsg({ ok: false, text: 'Fichier de sauvegarde invalide.' }); return }
    try { await store.replaceAll({ prospects: d.prospects, packs: d.packs, keywords: d.keywords ?? store.keywords }); setMsg({ ok: true, text: `Sauvegarde restaurée : ${d.prospects.length} leads, ${d.packs.length} packs.` }) }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }) }
  }
  return (
    <Stack spacing={2}>
      {msg && <Alert severity={msg.ok ? 'success' : 'error'} onClose={() => setMsg(null)}>{msg.text}</Alert>}
      <Card><CardContent>
        <Typography variant="h6">Google Sheets / Excel (CSV)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Dans Google Sheets : <b>Fichier → Télécharger → CSV</b> sur l'onglet « Prospects », puis importez le fichier. Colonnes reconnues : Statut, Client / Entreprise, Site Web, URL site web, Téléphone, Email, Ville, Besoin Client, Secteur, Budget.</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
          <Button variant="contained" startIcon={<UploadFileRounded />} onClick={() => csvRef.current?.click()}>Importer un CSV</Button>
          <Button variant="outlined" startIcon={<DownloadRounded />} onClick={() => download(`agenceflow-leads-${todayISO()}.csv`, prospectsToCSV(store.prospects, store.packs), 'text/csv;charset=utf-8')}>Exporter les leads (CSV)</Button>
          <input ref={csvRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { onCSV(e.target.files?.[0]); e.target.value = '' }} />
        </Stack>
      </CardContent></Card>
      <Card><CardContent>
        <Typography variant="h6">Sauvegarde</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Leads, journal, packs, requêtes, devis, factures et paiements dans un fichier JSON. {store.isSuper ? 'La restauration remplace les leads, packs et requêtes actuels ; les devis, factures et paiements ne sont jamais modifiés.' : 'La restauration est réservée au Super Admin.'} Les maquettes et leurs images restent dans la base PostgreSQL.</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
          <Button variant="outlined" startIcon={<DownloadRounded />} onClick={() => download(`agenceflow-sauvegarde-${todayISO()}.json`, JSON.stringify({ prospects: store.prospects, packs: store.packs, keywords: store.keywords, quotes: store.quotes, invoices: store.invoices, payments: store.payments }, null, 2), 'application/json')}>Télécharger la sauvegarde</Button>
          {store.isSuper && <Button variant="outlined" startIcon={<UploadFileRounded />} onClick={() => jsonRef.current?.click()}>Restaurer une sauvegarde</Button>}
          <input ref={jsonRef} type="file" accept=".json,application/json" hidden onChange={(e) => { onJSON(e.target.files?.[0]); e.target.value = '' }} />
        </Stack>
      </CardContent></Card>
      {store.isSuper && (
        <Card><CardContent>
          <Typography variant="h6">Réinitialiser</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Remet les leads, packs et requêtes par défaut (4 leads d'origine). Les comptes, maquettes et réglages sont conservés.</Typography>
          <Box sx={{ mt: 2 }}>
            {confirmReset ? <Stack direction="row" spacing={1}><Button color="error" variant="contained" startIcon={<RestartAltRounded />} onClick={() => { setConfirmReset(false); store.resetAll().then(() => setMsg({ ok: true, text: 'Données réinitialisées.' }), (e) => setMsg({ ok: false, text: e.message })) }}>Oui, tout effacer</Button><Button onClick={() => setConfirmReset(false)}>Annuler</Button></Stack>
              : <Button color="error" variant="outlined" startIcon={<RestartAltRounded />} onClick={() => setConfirmReset(true)}>Réinitialiser les données</Button>}
          </Box>
        </CardContent></Card>
      )}
      {preview && (
        <Dialog open onClose={() => setPreview(null)} fullWidth maxWidth="sm">
          <DialogTitle>Importer des leads</DialogTitle>
          <DialogContent>
            <Typography variant="body2">{preview.all.length} lignes lues · <b>{preview.fresh.length} nouveaux</b>{preview.all.length - preview.fresh.length > 0 && <> · {preview.all.length - preview.fresh.length} déjà présents</>}</Typography>
            <List dense sx={{ mt: 1, maxHeight: 280, overflow: 'auto' }}>
              {preview.all.slice(0, 50).map((p) => <ListItem key={p.id} divider><ListItemText primary={p.company} secondary={`${p.city}${preview.fresh.includes(p) ? '' : ' · doublon'}`} /></ListItem>)}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreview(null)}>Annuler</Button>
            {preview.fresh.length < preview.all.length && <Button onClick={() => { store.addProspects(preview.all); setMsg({ ok: true, text: `${preview.all.length} leads importés.` }); setPreview(null) }}>Tout importer</Button>}
            <Button variant="contained" disabled={!preview.fresh.length} onClick={() => { store.addProspects(preview.fresh); setMsg({ ok: true, text: `${preview.fresh.length} nouveaux leads importés.` }); setPreview(null) }}>Importer {preview.fresh.length} nouveau{preview.fresh.length > 1 ? 'x' : ''}</Button>
          </DialogActions>
        </Dialog>
      )}
    </Stack>
  )
}
