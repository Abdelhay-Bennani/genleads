import {
  Archive, ArrowLeft, ArrowRight, Check, Copy, ExternalLink, FileText, ImagePlus, LayoutGrid, Link2, List, Loader2, MonitorPlay,
  Pencil, Plus, Search, Share2, Star, Tags, Trash2, X,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useApplyTemplateToQuote, usePresenter, suggestPacks } from '../components/templates/Presenter'
import { safeHref } from '../components/templates/Portfolio'
import { Button, btn, cx, Empty, Field, Modal, PageHeader, Segmented, Tag } from '../components/ui'
import { imgUrl, uploadScreenshot } from '../images'
import { useStore } from '../store'
import type { ImageKind, TemplateImage, WebsiteTemplate } from '../types'
import { fmtDate, fmtDateTime, normalize, uid } from '../utils'

type Sort = 'recent' | 'old' | 'name'
const VIEW_KEY = 'agenceflow-crm:templates-view'

export function Templates({ onOpenProspect }: { onOpenProspect: (id: string, tab?: 'devis' | 'maquettes') => void }) {
  const store = useStore()
  const presenter = usePresenter()
  const [tab, setTab] = useState<'gallery' | 'links'>('gallery')
  const [layout, setLayout] = useState<'grid' | 'list'>(() => { try { return (localStorage.getItem(VIEW_KEY) as 'grid' | 'list') || 'grid' } catch { return 'grid' } })
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState<'active' | 'archived' | 'all'>('active')
  const [sort, setSort] = useState<Sort>('recent')
  const [editing, setEditing] = useState<WebsiteTemplate | null>(null)
  const [cats, setCats] = useState(false)
  const [quoteFor, setQuoteFor] = useState<WebsiteTemplate | null>(null)

  const list = useMemo(() => {
    const nq = normalize(q)
    const l = store.templates.filter((t) => (status === 'all' || t.status === status)
      && (!cat || t.categoryId === cat) && (!type || t.siteType === type)
      && (!nq || normalize([t.name, t.tags.join(' '), t.shortDescription, t.technologies.join(' ')].join(' ')).includes(nq)))
    return [...l].sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'fr') : sort === 'old' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt))
  }, [store.templates, q, cat, type, status, sort])

  const newTemplate = (): WebsiteTemplate => {
    const now = new Date().toISOString()
    return { id: uid(), name: '', categoryId: cat || store.templateCategories[0]?.id || null, siteType: 'Site vitrine', shortDescription: '', description: '', features: [], technologies: [], tags: [], demoUrl: '', demoUrlMobile: '', suggestedPackIds: [], status: 'active', coverImageId: null, createdAt: now, updatedAt: now }
  }
  const setLayoutSaved = (v: 'grid' | 'list') => { setLayout(v); try { localStorage.setItem(VIEW_KEY, v) } catch { /* noop */ } }
  const activeLinks = store.templatePresentations.filter((p) => !p.revoked).length

  return (
    <div>
      <PageHeader title="Mes Maquettes" subtitle="Votre catalogue de modèles de sites à montrer aux prospects."
        actions={<>
          <Button onClick={() => presenter.present({ templateIds: list.filter((t) => t.status === 'active').map((t) => t.id) })} disabled={!list.some((t) => t.status === 'active')}><MonitorPlay size={16} />Présentation client</Button>
          <Button onClick={() => setCats(true)}><Tags size={16} /><span className="hidden sm:inline">Catégories</span></Button>
          <Button variant="primary" onClick={() => setEditing(newTemplate())}><Plus size={16} />Nouvelle maquette</Button>
        </>} />

      <div className="mb-4 flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        {([['gallery', `Galerie (${store.templates.filter((t) => t.status === 'active').length})`], ['links', `Liens partagés (${activeLinks})`]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cx('-mb-px border-b-2 px-3 py-2 text-sm font-medium', tab === k ? 'border-brand-600 text-brand-700 dark:text-brand-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')}>{l}</button>
        ))}
      </div>

      {tab === 'links' ? <LinksTable onOpenProspect={onOpenProspect} /> : (
        <>
          <div className="card mb-4 flex flex-col gap-2 p-2.5 lg:flex-row lg:items-center">
            <div className="relative lg:w-64">
              <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input !pl-8" placeholder="Rechercher par nom, tag…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-1">
              <select className="input lg:!w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="">Tous secteurs</option>
                {store.templateCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="input lg:!w-auto" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Tous types</option>
                {store.siteTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
              <select className="input lg:!w-auto" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="active">Actives</option><option value="archived">Archivées</option><option value="all">Toutes</option>
              </select>
              <select className="input lg:!w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="recent">Plus récentes</option><option value="old">Plus anciennes</option><option value="name">Nom (A→Z)</option>
              </select>
            </div>
            <Segmented size="sm" value={layout} onChange={setLayoutSaved} options={[{ value: 'grid', label: <LayoutGrid size={15} /> }, { value: 'list', label: <List size={15} /> }]} />
          </div>

          {list.length === 0 ? (
            <div className="card">
              <Empty icon={<LayoutGrid size={36} />} title={store.templates.length ? 'Aucune maquette ne correspond' : 'Votre bibliothèque est vide'}>
                {store.templates.length ? 'Modifiez les filtres.' : <>Ajoutez votre première maquette avec ses captures d'écran.<div className="mt-3"><Button variant="primary" onClick={() => setEditing(newTemplate())}><Plus size={15} />Nouvelle maquette</Button></div></>}
              </Empty>
            </div>
          ) : layout === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((t) => <TemplateCard key={t.id} t={t} onEdit={() => setEditing(t)} onShare={() => presenter.share({ templateIds: [t.id] })} onQuote={() => setQuoteFor(t)} />)}
            </div>
          ) : (
            <div className="card divide-y divide-slate-100 dark:divide-slate-800">
              {list.map((t) => {
                const cover = store.coverOf(t)
                return (
                  <div key={t.id} className={cx('flex flex-col gap-3 p-3 sm:flex-row sm:items-center', t.status === 'archived' && 'opacity-60')}>
                    <button type="button" onClick={() => setEditing(t)} className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">{cover && <img src={imgUrl(cover.thumb)} alt="" className="h-full w-full object-cover object-top" />}</button>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium">{t.name}{t.status === 'archived' && <Tag>Archivée</Tag>}</p>
                      <p className="truncate text-xs text-slate-500">{store.categoryName(t.categoryId)} · {t.siteType} · ajoutée le {fmtDate(t.createdAt)} · {store.imagesOf(t.id).length} capture(s)</p>
                    </div>
                    <CardActions t={t} onEdit={() => setEditing(t)} onShare={() => presenter.share({ templateIds: [t.id] })} onQuote={() => setQuoteFor(t)} />
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {editing && <TemplateEditor key={editing.id} template={editing} onClose={() => setEditing(null)} />}
      {cats && <CategoriesModal onClose={() => setCats(false)} />}
      {quoteFor && <QuoteModal t={quoteFor} onClose={() => setQuoteFor(null)} onDone={(pid) => { setQuoteFor(null); onOpenProspect(pid, 'devis') }} />}
    </div>
  )
}

function CardActions({ t, onEdit, onShare, onQuote }: { t: WebsiteTemplate; onEdit: () => void; onShare: () => void; onQuote: () => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <a href={safeHref(t.demoUrl)} target="_blank" rel="noreferrer" className={cx(btn('secondary', 'sm'), !t.demoUrl && 'pointer-events-none opacity-40')}><ExternalLink size={13} />Voir la démo</a>
      <Button size="sm" onClick={onEdit}><Pencil size={13} />Modifier</Button>
      <Button size="sm" onClick={onShare} disabled={t.status === 'archived'}><Share2 size={13} />Partager</Button>
      <Button size="sm" variant="ghost" onClick={onQuote} title="Créer un devis à partir de cette maquette"><FileText size={13} />Devis</Button>
    </div>
  )
}

function TemplateCard({ t, onEdit, onShare, onQuote }: { t: WebsiteTemplate; onEdit: () => void; onShare: () => void; onQuote: () => void }) {
  const store = useStore()
  const cover = store.coverOf(t)
  const chosen = store.templateClientSelections.filter((s) => s.templateId === t.id).length
  return (
    <article className={cx('card group flex flex-col overflow-hidden', t.status === 'archived' && 'opacity-60')}>
      <button type="button" onClick={onEdit} className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
        {cover ? <img src={imgUrl(cover.thumb)} alt={t.name} loading="lazy" className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]" />
          : <span className="flex h-full items-center justify-center text-sm text-slate-400"><ImagePlus size={22} /></span>}
        <span className="absolute left-2 top-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm">{store.categoryName(t.categoryId)}</span>
        {t.status === 'archived' && <span className="absolute right-2 top-2 rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[11px] font-medium text-white">Archivée</span>}
        {chosen > 0 && <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[11px] font-semibold text-white"><Star size={10} fill="currentColor" />{chosen} choix client</span>}
      </button>
      <div className="flex flex-1 flex-col p-3.5">
        <p className="font-medium">{t.name}</p>
        <p className="text-xs text-slate-500">{t.siteType} · ajoutée le {fmtDate(t.createdAt)}</p>
        {t.shortDescription && <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-slate-600 dark:text-slate-300">{t.shortDescription}</p>}
        <div className="mt-3"><CardActions t={t} onEdit={onEdit} onShare={onShare} onQuote={onQuote} /></div>
      </div>
    </article>
  )
}

/* ---------------------------------------------------------- éditeur */

type DraftImage = Omit<TemplateImage, 'templateId' | 'order'>

function TemplateEditor({ template, onClose }: { template: WebsiteTemplate; onClose: () => void }) {
  const store = useStore()
  const isNew = !store.templates.some((t) => t.id === template.id)
  const [t, setT] = useState(template)
  const [images, setImages] = useState<DraftImage[]>(() => store.imagesOf(template.id).map(({ templateId: _a, order: _b, ...i }) => i))
  const [features, setFeatures] = useState(template.features.join('\n'))
  const [techs, setTechs] = useState(template.technologies.join(', '))
  const [tags, setTags] = useState(template.tags.join(', '))
  const [uploading, setUploading] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [newCat, setNewCat] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const sitePacks = store.packs.filter((k) => k.category === 'site' && k.active)

  const addFiles = async (files: FileList | null, kind: ImageKind = 'desktop') => {
    if (!files?.length) return
    setErr(null)
    const arr = [...files].slice(0, 20)
    setUploading((n) => n + arr.length)
    for (const f of arr) {
      try {
        const up = await uploadScreenshot(f)
        const guess: ImageKind = up.width < 900 && up.height > up.width ? 'mobile' : kind
        setImages((l) => [...l, { id: uid(), ...up, kind: guess, caption: '' }])
      } catch (e) { setErr(`${f.name} : ${(e as Error).message}`) }
      setUploading((n) => n - 1)
    }
  }
  const move = (i: number, d: -1 | 1) => setImages((l) => { const c = [...l]; const j = i + d; if (j < 0 || j >= c.length) return l; [c[i], c[j]] = [c[j], c[i]]; return c })
  const split = (s: string, sep: RegExp) => s.split(sep).map((x) => x.trim()).filter(Boolean)

  const save = async () => {
    if (!t.name.trim()) { setErr('Le nom de la maquette est obligatoire.'); return }
    setBusy(true); setErr(null)
    try {
      await store.saveTemplate({ ...t, features: split(features, /\n/), technologies: split(techs, /,/), tags: split(tags, /,/) }, images)
      store.notify(isNew ? 'Maquette ajoutée' : 'Maquette enregistrée')
      onClose()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  const addCategory = async () => {
    if (!newCat?.trim()) return
    try { const id = await store.createCategory(newCat.trim()); setT({ ...t, categoryId: id }); setNewCat(null) } catch (e) { setErr((e as Error).message) }
  }

  return (
    <Modal size="lg" title={isNew ? 'Nouvelle maquette' : `Modifier « ${template.name} »`} onClose={onClose}
      footer={<>
        {!isNew && store.isSuper && (confirmDel
          ? <Button variant="danger" className="mr-auto" onClick={async () => { try { await store.deleteTemplate(t.id); store.notify('Maquette supprimée'); onClose() } catch (e) { setErr((e as Error).message) } }}>Confirmer la suppression</Button>
          : <Button variant="ghost" className="mr-auto !text-rose-600" onClick={() => setConfirmDel(true)}><Trash2 size={14} />Supprimer</Button>)}
        {!isNew && !store.isSuper && <span className="mr-auto" />}
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="primary" onClick={save} disabled={busy || uploading > 0}>{(busy || uploading > 0) && <Loader2 size={14} className="animate-spin" />}{uploading > 0 ? `Envoi des images (${uploading})…` : 'Enregistrer'}</Button>
      </>}>
      <div className="space-y-5">
        {/* Images */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <span className="label !mb-0">Captures d'écran ({images.length}) — l'étoile désigne la couverture</span>
            <Button size="sm" onClick={() => fileRef.current?.click()}><ImagePlus size={14} />Ajouter</Button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
          </div>
          <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
            className="grid grid-cols-2 gap-2.5 rounded-xl border-2 border-dashed border-slate-200 p-2.5 sm:grid-cols-4 dark:border-slate-700">
            {images.map((im, i) => {
              const isCover = (t.coverImageId ?? images[0]?.id) === im.id
              return (
                <div key={im.id} className={cx('overflow-hidden rounded-lg border bg-white dark:bg-slate-900', isCover ? 'border-amber-400 ring-2 ring-amber-300/40' : 'border-slate-200 dark:border-slate-700')}>
                  <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                    <img src={imgUrl(im.thumb)} alt="" className="h-full w-full object-cover object-top" />
                    <button type="button" title="Image de couverture" onClick={() => setT({ ...t, coverImageId: im.id })}
                      className={cx('absolute left-1 top-1 rounded-md p-1', isCover ? 'bg-amber-400 text-white' : 'bg-white/80 text-slate-500 hover:text-amber-500')}><Star size={12} fill={isCover ? 'currentColor' : 'none'} /></button>
                    <button type="button" title="Retirer" onClick={() => setImages(images.filter((x) => x.id !== im.id))} className="absolute right-1 top-1 rounded-md bg-white/80 p-1 text-slate-500 hover:text-rose-600"><X size={12} /></button>
                  </div>
                  <div className="flex items-center gap-1 p-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowLeft size={12} /></button>
                    <select value={im.kind} onChange={(e) => setImages(images.map((x) => x.id === im.id ? { ...x, kind: e.target.value as ImageKind } : x))}
                      className="min-w-0 flex-1 rounded border-0 bg-slate-50 px-1 py-0.5 text-[11px] dark:bg-slate-800">
                      <option value="desktop">Ordinateur</option><option value="mobile">Mobile</option><option value="other">Autre</option>
                    </select>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowRight size={12} /></button>
                  </div>
                </div>
              )
            })}
            {Array.from({ length: uploading }).map((_, i) => <div key={'u' + i} className="flex aspect-[4/3] items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800"><Loader2 className="animate-spin text-slate-400" size={18} /></div>)}
            <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-lg text-xs text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-800">
              <ImagePlus size={20} />Glissez vos captures<br />ou cliquez
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">PNG, JPEG ou WebP. Les images sont compressées automatiquement. Les captures étroites et hautes sont classées « Mobile ».</p>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom de la maquette *"><input className="input" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} placeholder="ex. Plombier Pro – Bleu" autoFocus={isNew} /></Field>
          <Field label="Type de site">
            <select className="input" value={t.siteType} onChange={(e) => setT({ ...t, siteType: e.target.value })}>{store.siteTypes.map((x) => <option key={x}>{x}</option>)}</select>
          </Field>
          <Field label="Secteur / catégorie">
            {newCat === null ? (
              <div className="flex gap-2">
                <select className="input" value={t.categoryId ?? ''} onChange={(e) => setT({ ...t, categoryId: e.target.value })}>{store.templateCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                <Button onClick={() => setNewCat('')} title="Nouvelle catégorie"><Plus size={14} /></Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input className="input" autoFocus value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nouvelle catégorie" onKeyDown={(e) => e.key === 'Enter' && addCategory()} />
                <Button variant="primary" onClick={addCategory}><Check size={14} /></Button>
                <Button onClick={() => setNewCat(null)}><X size={14} /></Button>
              </div>
            )}
          </Field>
          <Field label="Statut">
            <Segmented value={t.status} onChange={(v) => setT({ ...t, status: v })} options={[{ value: 'active', label: 'Active' }, { value: 'archived', label: <><Archive size={13} />Archivée</> }]} />
          </Field>
          <Field label="URL de démonstration"><input className="input" value={t.demoUrl} onChange={(e) => setT({ ...t, demoUrl: e.target.value })} placeholder="https://demo.votre-agence.fr/plombier" /></Field>
          <Field label="URL démo mobile (si différente)"><input className="input" value={t.demoUrlMobile} onChange={(e) => setT({ ...t, demoUrlMobile: e.target.value })} placeholder="facultatif" /></Field>
        </div>
        <Field label="Description courte (cartes)"><input className="input" maxLength={220} value={t.shortDescription} onChange={(e) => setT({ ...t, shortDescription: e.target.value })} placeholder="Une phrase d'accroche" /></Field>
        <Field label="Description complète"><textarea className="input min-h-[90px]" value={t.description} onChange={(e) => setT({ ...t, description: e.target.value })} placeholder="Ambiance, cible, pages incluses…" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fonctionnalités principales (une par ligne)"><textarea className="input min-h-[90px]" value={features} onChange={(e) => setFeatures(e.target.value)} placeholder={'Formulaire de devis\nGalerie de réalisations\nBouton d’appel mobile'} /></Field>
          <div className="space-y-3">
            <Field label="Technologies (séparées par des virgules)"><input className="input" value={techs} onChange={(e) => setTechs(e.target.value)} placeholder="WordPress, Elementor" /></Field>
            <Field label="Tags / mots-clés"><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="bleu, moderne, urgence" /></Field>
          </div>
        </div>
        <div>
          <span className="label">Pack proposé dans les devis</span>
          <div className="flex flex-wrap gap-1.5">
            {sitePacks.map((k) => {
              const on = t.suggestedPackIds.includes(k.id)
              return <button key={k.id} type="button" onClick={() => setT({ ...t, suggestedPackIds: on ? t.suggestedPackIds.filter((x) => x !== k.id) : [...t.suggestedPackIds, k.id] })}
                className={cx('rounded-full border px-2.5 py-1 text-xs font-medium', on ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}>{k.name}</button>
            })}
          </div>
          <p className="mt-1 text-xs text-slate-400">Sans choix, le pack est déduit du type de site et du besoin du prospect (refonte, e-commerce, one-page…).</p>
        </div>
        {!isNew && <p className="text-xs text-slate-400">Ajoutée le {fmtDateTime(template.createdAt)} · modifiée le {fmtDateTime(template.updatedAt)}</p>}
        {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{err}</p>}
      </div>
    </Modal>
  )
}

/* -------------------------------------------------------- catégories */

function CategoriesModal({ onClose }: { onClose: () => void }) {
  const store = useStore()
  const [name, setName] = useState('')
  const [edit, setEdit] = useState<{ id: string; name: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const run = async (fn: () => Promise<unknown>) => { setErr(null); try { await fn() } catch (e) { setErr((e as Error).message) } }
  return (
    <Modal title="Catégories de maquettes" onClose={onClose} footer={<Button onClick={onClose}>Fermer</Button>}>
      <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) run(async () => { await store.createCategory(name.trim()); setName('') }) }}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvelle catégorie (ex. Toiture)" />
        <Button type="submit" variant="primary" disabled={!name.trim()}><Plus size={14} />Ajouter</Button>
      </form>
      {err && <p className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{err}</p>}
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
        {store.templateCategories.map((c) => {
          const n = store.templates.filter((t) => t.categoryId === c.id).length
          return (
            <li key={c.id} className="flex items-center gap-2 px-3 py-2">
              {edit?.id === c.id ? (
                <>
                  <input className="input !h-8" autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                  <Button size="sm" variant="primary" onClick={() => run(async () => { await store.renameCategory(c.id, edit.name); setEdit(null) })}><Check size={13} /></Button>
                  <Button size="sm" onClick={() => setEdit(null)}><X size={13} /></Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{c.name} <span className="text-xs text-slate-400">· {n} maquette{n > 1 ? 's' : ''}</span></span>
                  <Button size="sm" variant="ghost" onClick={() => setEdit({ id: c.id, name: c.name })}><Pencil size={13} /></Button>
                  {store.isSuper && <Button size="sm" variant="ghost" className="!text-rose-600" disabled={n > 0} title={n ? 'Catégorie utilisée' : 'Supprimer'} onClick={() => run(() => store.deleteCategory(c.id))}><Trash2 size={13} /></Button>}
                </>
              )}
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}

/* ------------------------------------------------------ devis depuis maquette */

function QuoteModal({ t, onClose, onDone }: { t: WebsiteTemplate; onClose: () => void; onDone: (prospectId: string) => void }) {
  const store = useStore()
  const apply = useApplyTemplateToQuote()
  const choosers = new Set(store.templateClientSelections.filter((s) => s.templateId === t.id).map((s) => s.prospectId))
  const sorted = [...store.prospects].sort((a, b) => Number(choosers.has(b.id)) - Number(choosers.has(a.id)) || a.company.localeCompare(b.company, 'fr'))
  const [pid, setPid] = useState(sorted.find((p) => choosers.has(p.id))?.id ?? '')
  const p = store.prospects.find((x) => x.id === pid) ?? null
  const packs = store.packs.filter((k) => suggestPacks(t, p, store.packs).includes(k.id))
  return (
    <Modal title={`Créer un devis avec « ${t.name} »`} onClose={onClose}
      footer={<><Button onClick={onClose}>Annuler</Button><Button variant="primary" disabled={!p} onClick={() => { if (p) { apply(p, t); onDone(p.id) } }}><FileText size={14} />Préparer le devis</Button></>}>
      <div className="space-y-3">
        <Field label="Prospect">
          <select className="input" value={pid} onChange={(e) => setPid(e.target.value)}>
            <option value="">Choisir un prospect…</option>
            {sorted.map((x) => <option key={x.id} value={x.id}>{choosers.has(x.id) ? '⭐ ' : ''}{x.company}</option>)}
          </select>
        </Field>
        <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
          <p className="font-medium">Ce qui sera fait :</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-600 dark:text-slate-300">
            <li>la maquette est associée à la fiche du prospect ;</li>
            <li>pack ajouté au devis : <b>{packs.map((k) => k.name).join(', ') || 'aucun pack de site actif'}</b> ;</li>
            <li>la proposition commerciale reprend la description de la maquette et son lien de démo.</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}

/* -------------------------------------------------------- liens partagés */

export function PresentationRow({ id, onOpenProspect, showProspect = true }: { id: string; onOpenProspect?: (id: string, tab?: 'devis' | 'maquettes') => void; showProspect?: boolean }) {
  const store = useStore()
  const p = store.templatePresentations.find((x) => x.id === id)
  const [copied, setCopied] = useState(false)
  if (!p) return null
  const items = store.templatePresentationItems.filter((i) => i.presentationId === p.id).map((i) => store.templates.find((t) => t.id === i.templateId)).filter(Boolean) as WebsiteTemplate[]
  const choices = store.templateClientSelections.filter((s) => s.presentationId === p.id)
  const prospect = p.prospectId ? store.prospects.find((x) => x.id === p.prospectId) : null
  const url = store.presentationUrl(p)
  const toggle = async () => { try { await store.setPresentationRevoked(p.id, !p.revoked); store.notify(p.revoked ? 'Lien réactivé' : 'Lien désactivé') } catch (e) { store.notify((e as Error).message, false) } }
  return (
    <div className={cx('flex flex-col gap-2 p-3 sm:flex-row sm:items-center', p.revoked && 'opacity-60')}>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {showProspect && (prospect ? <button type="button" className="hover:underline" onClick={() => onOpenProspect?.(prospect.id, 'maquettes')}>{prospect.company}</button> : <span className="text-slate-500">Sans prospect</span>)}
          {!showProspect && <span>{p.title}</span>}
          {p.revoked ? <Tag>Désactivé</Tag> : <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Actif</span>}
          {choices.length > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"><Star size={10} fill="currentColor" />{choices.map((c) => store.templates.find((t) => t.id === c.templateId)?.name).join(', ')}</span>}
        </p>
        <p className="truncate text-xs text-slate-500">
          {items.length} maquette{items.length > 1 ? 's' : ''} ({items.map((t) => t.name).join(', ')}) · créé le {fmtDate(p.createdAt)} par {p.createdBy} · {p.viewCount} vue{p.viewCount > 1 ? 's' : ''}{p.lastViewedAt ? ` (dernière ${fmtDateTime(p.lastViewedAt)})` : ''}
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button size="sm" disabled={p.revoked} onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* noop */ } }}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copié' : 'Copier'}</Button>
        <a href={url} target="_blank" rel="noreferrer" className={cx(btn('secondary', 'sm'), p.revoked && 'pointer-events-none opacity-40')}><ExternalLink size={13} /></a>
        <Button size="sm" variant={p.revoked ? 'secondary' : 'danger'} onClick={toggle}>{p.revoked ? 'Réactiver' : 'Désactiver'}</Button>
      </div>
    </div>
  )
}

function LinksTable({ onOpenProspect }: { onOpenProspect: (id: string, tab?: 'devis' | 'maquettes') => void }) {
  const store = useStore()
  if (!store.templatePresentations.length) return <div className="card"><Empty icon={<Link2 size={34} />} title="Aucun lien partagé">Depuis une fiche prospect, cliquez sur « Présenter des maquettes » pour générer un lien.</Empty></div>
  return <div className="card divide-y divide-slate-100 dark:divide-slate-800">{store.templatePresentations.map((p) => <PresentationRow key={p.id} id={p.id} onOpenProspect={onOpenProspect} />)}</div>
}
