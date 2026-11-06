import { Building2, ImagePlus, Loader2, TriangleAlert, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { AgencyMark } from '../components/templates/Portfolio'
import { isPrivateUrl } from '../components/templates/Presenter'
import { Button, Field } from '../components/ui'
import { uploadLogo } from '../images'
import { useStore } from '../store'

/** Nom, logo et coordonnées affichés sur les pages de présentation envoyées aux prospects. */
export function AgencyIdentity() {
  const store = useStore()
  const [s, setS] = useState(store.settings)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)
  const base = s.publicBaseUrl || window.location.origin

  const upload = async (f?: File) => {
    if (!f) return
    setUploading(true); setErr(null)
    try { setS({ ...s, logoFile: await uploadLogo(f) }) } catch (e) { setErr((e as Error).message) } finally { setUploading(false) }
  }
  const save = async () => {
    setBusy(true); setErr(null)
    try { await store.saveSettings(s); store.notify("Identité de l'agence enregistrée") } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <section className="card mb-4 p-4">
      <h2 className="flex items-center gap-2 font-semibold"><Building2 size={17} />Identité de l'agence</h2>
      <p className="mt-1 text-sm text-slate-500">Affichée sur les pages de présentation des maquettes envoyées aux prospects.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
        <div>
          <span className="label">Logo</span>
          <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white p-3 dark:border-slate-700">
            {uploading ? <Loader2 className="animate-spin text-slate-400" /> : <AgencyMark agency={{ name: s.agencyName || 'Agence', logoFile: s.logoFile }} />}
          </div>
          <div className="mt-2 flex gap-1.5">
            <Button size="sm" onClick={() => ref.current?.click()}><ImagePlus size={13} />{s.logoFile ? 'Changer' : 'Ajouter'}</Button>
            {s.logoFile && <Button size="sm" variant="ghost" onClick={() => setS({ ...s, logoFile: null })}><X size={13} /></Button>}
          </div>
          <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom de l'agence"><input className="input" value={s.agencyName} onChange={(e) => setS({ ...s, agencyName: e.target.value })} /></Field>
          <Field label="Accroche"><input className="input" value={s.agencyTagline} onChange={(e) => setS({ ...s, agencyTagline: e.target.value })} /></Field>
          <Field label="Email de contact"><input className="input" type="email" value={s.contactEmail} onChange={(e) => setS({ ...s, contactEmail: e.target.value })} /></Field>
          <Field label="Téléphone de contact"><input className="input" value={s.contactPhone} onChange={(e) => setS({ ...s, contactPhone: e.target.value })} /></Field>
          <Field label="Adresse publique de l'application (pour les liens partagés)" className="sm:col-span-2">
            <input className="input" value={s.publicBaseUrl} onChange={(e) => setS({ ...s, publicBaseUrl: e.target.value })} placeholder="https://crm.votre-agence.fr" />
          </Field>
          {isPrivateUrl(base) && (
            <p className="flex gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 sm:col-span-2 dark:bg-amber-500/10 dark:text-amber-300">
              <TriangleAlert size={15} className="shrink-0" />
              Les liens actuels pointent vers {base} : ils ne s'ouvrent que sur votre ordinateur ou votre réseau. Une fois l'application en ligne, indiquez ici son adresse publique.
            </p>
          )}
        </div>
      </div>
      {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}
      <div className="mt-4 flex justify-end"><Button variant="primary" onClick={save} disabled={busy || uploading}>Enregistrer</Button></div>
    </section>
  )
}
