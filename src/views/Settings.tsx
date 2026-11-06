import { Database, Download, FileSpreadsheet, RotateCcw, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useStore } from '../store'
import type { AppData, Prospect } from '../types'
import { csvToProspects, download, normalize, prospectsToCSV, todayISO } from '../utils'
import { Button, Modal, PageHeader } from '../components/ui'
import { AgencyIdentity } from './AgencyIdentity'

export function Settings() {
  const store = useStore()
  const csvRef = useRef<HTMLInputElement>(null)
  const jsonRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ all: Prospect[]; fresh: Prospect[] } | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const onCSV = async (f: File | undefined) => {
    if (!f) return
    const list = csvToProspects(await f.text(), store.members)
    if (!list.length) { setMsg({ ok: false, text: "Aucun prospect trouvé : vérifiez que la 1ʳᵉ ligne contient les en-têtes (Client / Entreprise, Ville…)." }); return }
    const existing = new Set(store.prospects.map((p) => normalize(p.company)))
    setPreview({ all: list, fresh: list.filter((p) => !existing.has(normalize(p.company))) })
  }
  const onJSON = async (f: File | undefined) => {
    if (!f) return
    let d: AppData
    try {
      d = JSON.parse(await f.text()) as AppData
      if (!Array.isArray(d.prospects) || !Array.isArray(d.packs)) throw new Error()
    } catch { setMsg({ ok: false, text: 'Fichier de sauvegarde invalide.' }); return }
    try {
      await store.replaceAll({ prospects: d.prospects, packs: d.packs, keywords: d.keywords ?? store.keywords })
      setMsg({ ok: true, text: `Sauvegarde restaurée : ${d.prospects.length} prospects, ${d.packs.length} packs.` })
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }) }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Données & réglages" subtitle="Les données sont enregistrées sur le serveur local (dossier data du projet). Exportez régulièrement une sauvegarde." />

      {msg && <div className={`mb-4 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>{msg.text}</div>}

      {store.isSuper && <AgencyIdentity />}

      <section className="card mb-4 p-4">
        <h2 className="flex items-center gap-2 font-semibold"><FileSpreadsheet size={17} />Google Sheets / Excel (CSV)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Dans Google Sheets : <b>Fichier → Télécharger → Valeurs séparées par des virgules (.csv)</b> sur l'onglet « Prospects », puis importez le fichier ici.
          Les colonnes Statut, Client / Entreprise, Site Web, URL site web, Téléphone, Email, Ville, Besoin Client, Secteur et Budget sont reconnues automatiquement.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => csvRef.current?.click()}><Upload size={15} />Importer un CSV</Button>
          <Button onClick={() => download(`agenceflow-prospects-${todayISO()}.csv`, prospectsToCSV(store.prospects, store.packs), 'text/csv;charset=utf-8')}><Download size={15} />Exporter les prospects (CSV)</Button>
          <input ref={csvRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { onCSV(e.target.files?.[0]); e.target.value = '' }} />
        </div>
      </section>

      <section className="card mb-4 p-4">
        <h2 className="flex items-center gap-2 font-semibold"><Database size={17} />Sauvegarde complète</h2>
        <p className="mt-1 text-sm text-slate-500">Prospects, journal, packs et requêtes dans un fichier JSON. {store.isSuper ? 'La restauration remplace toutes les données actuelles.' : 'La restauration est réservée au Super Admin.'}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => download(`agenceflow-sauvegarde-${todayISO()}.json`, JSON.stringify({ prospects: store.prospects, packs: store.packs, keywords: store.keywords }, null, 2), 'application/json')}><Download size={15} />Télécharger la sauvegarde</Button>
          {store.isSuper && <Button onClick={() => jsonRef.current?.click()}><Upload size={15} />Restaurer une sauvegarde</Button>}
          <input ref={jsonRef} type="file" accept=".json,application/json" hidden onChange={(e) => { onJSON(e.target.files?.[0]); e.target.value = '' }} />
        </div>
      </section>

      {store.isSuper && <section className="card p-4">
        <h2 className="flex items-center gap-2 font-semibold"><RotateCcw size={17} />Réinitialiser</h2>
        <p className="mt-1 text-sm text-slate-500">Remet les prospects, packs et requêtes par défaut (4 prospects d'origine). Les comptes utilisateurs sont conservés.</p>
        <div className="mt-3">
          {confirmReset
            ? <div className="flex gap-2"><Button variant="danger" onClick={() => { setConfirmReset(false); store.resetAll().then(() => setMsg({ ok: true, text: 'Données réinitialisées (les comptes utilisateurs sont conservés).' }), (e) => setMsg({ ok: false, text: e.message })) }}>Oui, tout effacer</Button><Button onClick={() => setConfirmReset(false)}>Annuler</Button></div>
            : <Button variant="danger" onClick={() => setConfirmReset(true)}>Réinitialiser les données</Button>}
        </div>
      </section>}

      {preview && (
        <Modal title="Importer des prospects" onClose={() => setPreview(null)}
          footer={<>
            <Button onClick={() => setPreview(null)}>Annuler</Button>
            {preview.fresh.length < preview.all.length && (
              <Button onClick={() => { store.addProspects(preview.all); setMsg({ ok: true, text: `${preview.all.length} prospects importés (doublons inclus).` }); setPreview(null) }}>Tout importer</Button>
            )}
            <Button variant="primary" disabled={!preview.fresh.length} onClick={() => { store.addProspects(preview.fresh); setMsg({ ok: true, text: `${preview.fresh.length} nouveaux prospects importés.` }); setPreview(null) }}>
              Importer {preview.fresh.length} nouveau{preview.fresh.length > 1 ? 'x' : ''}
            </Button>
          </>}>
          <p className="text-sm">{preview.all.length} lignes lues · <b>{preview.fresh.length} nouveaux</b>{preview.all.length - preview.fresh.length > 0 && <> · {preview.all.length - preview.fresh.length} déjà présents (même nom d'entreprise)</>}</p>
          <ul className="mt-3 max-h-64 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-100 text-sm dark:divide-slate-800 dark:border-slate-800">
            {preview.all.slice(0, 50).map((p) => (
              <li key={p.id} className="flex justify-between gap-2 px-3 py-1.5">
                <span className="truncate">{p.company}</span>
                <span className="shrink-0 text-xs text-slate-500">{p.city}{preview.fresh.includes(p) ? '' : ' · doublon'}</span>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  )
}
