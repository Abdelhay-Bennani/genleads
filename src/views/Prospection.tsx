import { Check, Copy, MapPin, Plus, Search, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { KEYWORD_CATS, SECTORS } from '../data'
import { useStore } from '../store'
import type { KeywordCat, KeywordQuery } from '../types'
import { googleUrl, mapsUrl, uid } from '../utils'
import { Button, btn, cx, Field, Modal, PageHeader } from '../components/ui'

const PARAMS_KEY = 'agenceflow-crm:prospection'
const SECTOR_TERMS = ['chauffagiste', 'plombier', 'climatisation', 'paysagiste', 'électricien', 'maçon', 'menuisier', 'peintre en bâtiment', 'couvreur', 'salle de bain', 'rénovation']
const TERM_TO_SECTOR: Record<string, string> = {
  chauffagiste: 'Chauffage', plombier: 'Plomberie', climatisation: 'Climatisation', paysagiste: 'Paysagiste', 'électricien': 'Électricité',
  'maçon': 'Maçonnerie', menuisier: 'Menuiserie', 'peintre en bâtiment': 'Peinture', couvreur: 'Toiture', 'salle de bain': 'Salle de bain', 'rénovation': 'BTP',
}

export interface ProspectSeed { city: string; sectors: string[]; source: string }

export function Prospection({ onConvert }: { onConvert: (s: ProspectSeed) => void }) {
  const store = useStore()
  const [params, setParams] = useState<{ secteur: string; ville: string }>(() => {
    try { return JSON.parse(localStorage.getItem(PARAMS_KEY) || '') } catch { return { secteur: 'chauffagiste', ville: 'Marseille' } }
  })
  const setP = (p: typeof params) => { setParams(p); try { localStorage.setItem(PARAMS_KEY, JSON.stringify(p)) } catch { /* noop */ } }
  const [cat, setCat] = useState<KeywordCat>('artisans')
  const [copied, setCopied] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const resolve = (q: string) => q.replace(/\{secteur\}/g, params.secteur.trim()).replace(/\{ville\}/g, params.ville.trim()).replace(/\s+/g, ' ').trim()
  const list = store.keywords.filter((k) => k.category === cat)
  const copy = async (k: KeywordQuery) => {
    try { await navigator.clipboard.writeText(resolve(k.query)); setCopied(k.id); setTimeout(() => setCopied(null), 1200) } catch { /* noop */ }
  }
  const convert = (k: KeywordQuery) => {
    const sec = TERM_TO_SECTOR[params.secteur.trim().toLowerCase()] ?? SECTORS.find((s) => s.toLowerCase() === params.secteur.trim().toLowerCase())
    onConvert({ city: params.ville.trim(), sectors: sec ? [sec] : [], source: `Recherche : ${resolve(k.query)}` })
  }

  return (
    <div>
      <PageHeader title="Prospection assistée" subtitle="Bibliothèque de requêtes Google prêtes à l'emploi. Choisissez un métier et une ville, puis lancez la recherche."
        actions={<Button variant="primary" onClick={() => setAdding(true)}><Plus size={16} />Nouvelle requête</Button>} />

      <div className="card mb-4 grid gap-3 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Métier / secteur  →  {secteur}">
          <input className="input" list="secteurs" value={params.secteur} onChange={(e) => setP({ ...params, secteur: e.target.value })} />
          <datalist id="secteurs">{SECTOR_TERMS.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label="Ville  →  {ville}">
          <input className="input" value={params.ville} onChange={(e) => setP({ ...params, ville: e.target.value })} />
        </Field>
        <a href={mapsUrl(`${params.secteur} ${params.ville}`)} target="_blank" rel="noreferrer" className={btn('secondary')}><MapPin size={15} />Voir sur Google Maps</a>
      </div>

      <div className="-mx-4 mb-3 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {KEYWORD_CATS.map((c) => (
          <button key={c.id} type="button" onClick={() => setCat(c.id)}
            className={cx('shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition',
              cat === c.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>
            {c.label} <span className="opacity-60">{store.keywords.filter((k) => k.category === c.id).length}</span>
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm text-slate-500">{KEYWORD_CATS.find((c) => c.id === cat)?.hint}</p>

      <div className="card divide-y divide-slate-100 dark:divide-slate-800">
        {list.map((k) => (
          <div key={k.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{k.label}</p>
              <code className="mt-0.5 block truncate text-xs text-brand-700 dark:text-brand-200" title={resolve(k.query)}>{resolve(k.query)}</code>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <a href={googleUrl(resolve(k.query))} target="_blank" rel="noreferrer" className={btn('primary', 'sm')}><Search size={13} />Lancer la recherche</a>
              <Button size="sm" onClick={() => copy(k)} title="Copier la requête">{copied === k.id ? <Check size={13} /> : <Copy size={13} />}</Button>
              <Button size="sm" onClick={() => convert(k)} title="Créer un prospect depuis cette recherche"><UserPlus size={13} /><span className="hidden md:inline">Convertir en prospect</span></Button>
              <Button size="sm" variant="ghost" onClick={() => store.setKeywords(store.keywords.filter((x) => x.id !== k.id))} title="Supprimer"><Trash2 size={13} /></Button>
            </div>
          </div>
        ))}
        {!list.length && <p className="p-6 text-center text-sm text-slate-400">Aucune requête dans cette catégorie.</p>}
      </div>

      {adding && <AddQuery defaultCat={cat} onClose={() => setAdding(false)} onSave={(k) => { store.setKeywords([...store.keywords, k]); setCat(k.category); setAdding(false) }} />}
    </div>
  )
}

function AddQuery({ defaultCat, onSave, onClose }: { defaultCat: KeywordCat; onSave: (k: KeywordQuery) => void; onClose: () => void }) {
  const [k, setK] = useState<KeywordQuery>({ id: uid(), category: defaultCat, label: '', query: '' })
  return (
    <Modal title="Nouvelle requête" onClose={onClose}
      footer={<><Button onClick={onClose}>Annuler</Button><Button variant="primary" disabled={!k.query.trim()} onClick={() => onSave({ ...k, label: k.label.trim() || k.query.trim() })}>Ajouter</Button></>}>
      <div className="space-y-3">
        <Field label="Catégorie">
          <select className="input" value={k.category} onChange={(e) => setK({ ...k, category: e.target.value as KeywordCat })}>
            {KEYWORD_CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Nom"><input className="input" value={k.label} onChange={(e) => setK({ ...k, label: e.target.value })} placeholder="ex. Artisans sans site" /></Field>
        <Field label="Requête Google"><input className="input font-mono text-xs" autoFocus value={k.query} onChange={(e) => setK({ ...k, query: e.target.value })} placeholder='"{secteur}" "{ville}" -site:pagesjaunes.fr' /></Field>
        <p className="text-xs text-slate-500">Utilisez <code>{'{secteur}'}</code> et <code>{'{ville}'}</code> : ils seront remplacés par les valeurs choisies en haut de page.</p>
      </div>
    </Modal>
  )
}
