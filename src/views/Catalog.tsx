import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { PACK_CATEGORIES } from '../data'
import { useStore } from '../store'
import type { Pack } from '../types'
import { eur, isClosed, uid } from '../utils'
import { Button, cx, Field, Modal, PageHeader } from '../components/ui'

export function Catalog({ onOpen }: { onOpen: (id: string) => void }) {
  const store = useStore()
  const [edit, setEdit] = useState<Pack | null>(null)
  const [sel, setSel] = useState<string[]>([])
  const [target, setTarget] = useState('')

  const chosen = store.packs.filter((k) => sel.includes(k.id))
  const oneShot = chosen.filter((k) => k.billing === 'oneshot').reduce((t, k) => t + k.price, 0)
  const mrr = chosen.filter((k) => k.billing === 'monthly').reduce((t, k) => t + k.price, 0)

  const save = (p: Pack) => {
    const exists = store.packs.some((x) => x.id === p.id)
    store.setPacks(exists ? store.packs.map((x) => (x.id === p.id ? p : x)) : [...store.packs, p])
    setEdit(null)
  }
  const remove = (id: string) => { store.setPacks(store.packs.filter((x) => x.id !== id)); setSel(sel.filter((x) => x !== id)); setEdit(null) }
  const apply = () => {
    if (!target) return
    const p = store.prospects.find((x) => x.id === target)
    if (!p) return
    store.updateProspect(target, { packIds: [...new Set([...p.packIds, ...sel])] })
    onOpen(target)
  }

  return (
    <div>
      <PageHeader title="Catalogue des packs" subtitle={store.isSuper ? 'Vos offres et tarifs HT. Modifiez-les ici : les devis se mettent à jour partout.' : 'Vos offres et tarifs HT. Seul le Super Admin peut modifier le catalogue.'}
        actions={store.isSuper && <Button variant="primary" onClick={() => setEdit({ id: uid(), name: '', category: 'site', price: 0, billing: 'oneshot', description: '', active: true })}><Plus size={16} />Nouveau pack</Button>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {PACK_CATEGORIES.map((c) => (
            <section key={c.id}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{c.label}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {store.packs.filter((k) => k.category === c.id).map((k) => {
                  const on = sel.includes(k.id)
                  return (
                    <div key={k.id} className={cx('card group relative flex flex-col p-3.5 transition', on && '!border-brand-500 ring-2 ring-brand-500/20', !k.active && 'opacity-55')}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-snug">{k.name}</p>
                        {store.isSuper && <button type="button" onClick={() => setEdit(k)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Modifier"><Pencil size={14} /></button>}
                      </div>
                      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">{k.description}</p>
                      <div className="mt-3 flex items-end justify-between">
                        <p className="text-lg font-semibold tabular-nums">{eur(k.price)}<span className="text-xs font-normal text-slate-500">{k.billing === 'monthly' ? ' HT / mois' : ' HT'}</span></p>
                        {k.active ? (
                          <Button size="sm" variant={on ? 'primary' : 'secondary'} onClick={() => setSel(on ? sel.filter((x) => x !== k.id) : [...sel, k.id])}>
                            {on ? <><Check size={13} />Ajouté</> : <><Plus size={13} />Simuler</>}
                          </Button>
                        ) : <span className="text-xs text-slate-400">Désactivé</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Simulateur */}
        <aside className="card h-fit p-4 lg:sticky lg:top-6">
          <h2 className="font-semibold">Simulateur de devis</h2>
          <p className="mb-3 text-xs text-slate-500">Ajoutez des packs pour chiffrer instantanément.</p>
          {chosen.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400 dark:border-slate-700">Aucun pack sélectionné</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {chosen.map((k) => (
                <li key={k.id} className="flex justify-between gap-2">
                  <span className="truncate">{k.name}</span>
                  <span className="shrink-0 tabular-nums text-slate-600 dark:text-slate-300">{eur(k.price)}{k.billing === 'monthly' && '/m'}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Total one-shot</span><span className="font-semibold tabular-nums">{eur(oneShot)} HT</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">MRR récurrent</span><span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{eur(mrr)} / mois</span></div>
            <div className="flex justify-between text-xs text-slate-500"><span>Valeur 1ʳᵉ année</span><span className="tabular-nums">{eur(oneShot + mrr * 12)} HT</span></div>
          </div>
          <div className="mt-4 space-y-2">
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Appliquer à un prospect…</option>
              {store.prospects.filter((p) => !isClosed(p)).map((p) => <option key={p.id} value={p.id}>{p.company}</option>)}
            </select>
            <div className="flex gap-2">
              <Button className="flex-1" variant="primary" disabled={!target || !sel.length} onClick={apply}>Appliquer & ouvrir</Button>
              {sel.length > 0 && <Button onClick={() => setSel([])}>Vider</Button>}
            </div>
          </div>
        </aside>
      </div>

      {edit && <PackEditor pack={edit} isNew={!store.packs.some((x) => x.id === edit.id)} onSave={save} onDelete={remove} onClose={() => setEdit(null)} />}
    </div>
  )
}

function PackEditor({ pack, isNew, onSave, onDelete, onClose }: { pack: Pack; isNew: boolean; onSave: (p: Pack) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [p, setP] = useState(pack)
  const [confirm, setConfirm] = useState(false)
  return (
    <Modal title={isNew ? 'Nouveau pack' : 'Modifier le pack'} onClose={onClose}
      footer={<>
        {!isNew && (confirm
          ? <Button variant="danger" className="mr-auto" onClick={() => onDelete(p.id)}>Confirmer la suppression</Button>
          : <Button variant="ghost" className="mr-auto !text-rose-600" onClick={() => setConfirm(true)}><Trash2 size={14} />Supprimer</Button>)}
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="primary" disabled={!p.name.trim()} onClick={() => onSave(p)}>Enregistrer</Button>
      </>}>
      <div className="space-y-3">
        <Field label="Nom du pack"><input className="input" autoFocus value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Catégorie">
            <select className="input" value={p.category} onChange={(e) => setP({ ...p, category: e.target.value as Pack['category'] })}>
              {PACK_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Prix HT (€)"><input className="input" type="number" min={0} value={p.price} onChange={(e) => setP({ ...p, price: Number(e.target.value) || 0 })} /></Field>
          <Field label="Facturation">
            <select className="input" value={p.billing} onChange={(e) => setP({ ...p, billing: e.target.value as Pack['billing'] })}>
              <option value="oneshot">Unique</option>
              <option value="monthly">Mensuelle</option>
            </select>
          </Field>
        </div>
        <Field label="Contenu du pack"><textarea className="input min-h-[80px]" value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={p.active} onChange={(e) => setP({ ...p, active: e.target.checked })} className="h-4 w-4 accent-brand-600" />
          Pack actif (proposé dans les devis)
        </label>
      </div>
    </Modal>
  )
}
