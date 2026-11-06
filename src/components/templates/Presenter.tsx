import { Check, Copy, ExternalLink, Link2, Mail, MessageCircle, MonitorPlay, Search, TriangleAlert } from 'lucide-react'
import { createContext, ReactNode, useContext, useMemo, useState } from 'react'
import { imgUrl } from '../../images'
import { useStore } from '../../store'
import type { Pack, Presentation, PortfolioTemplate, Prospect, WebsiteTemplate } from '../../types'
import { normalize } from '../../utils'
import { Button, btn, cx, Field, Modal } from '../ui'
import { Portfolio } from './Portfolio'

/* ------------------------------------------------------------ helpers */

export function useToPortfolio() {
  const store = useStore()
  return (t: WebsiteTemplate): PortfolioTemplate => ({
    id: t.id, name: t.name, category: store.categoryName(t.categoryId), siteType: t.siteType,
    shortDescription: t.shortDescription, description: t.description, features: t.features, technologies: t.technologies,
    demoUrl: t.demoUrl, demoUrlMobile: t.demoUrlMobile, coverImageId: t.coverImageId,
    images: store.imagesOf(t.id),
  })
}

/** Pack de création/refonte proposé pour une maquette et un prospect. */
export function suggestPacks(t: WebsiteTemplate, p: Prospect | null, packs: Pack[]): string[] {
  const active = packs.filter((k) => k.active)
  const fromTpl = t.suggestedPackIds.filter((id) => active.some((k) => k.id === id))
  if (fromTpl.length) return fromTpl
  const want = p?.need === 'Refonte' ? 'pk-refonte'
    : t.siteType === 'E-commerce' ? 'pk-ecom'
      : ['One-page', 'Landing page'].includes(t.siteType) ? 'pk-onepage' : 'pk-vitrine'
  if (active.some((k) => k.id === want)) return [want]
  const site = active.find((k) => k.category === 'site')
  return site ? [site.id] : []
}

/** Associe la maquette au prospect et ajoute le pack proposé au devis. */
export function useApplyTemplateToQuote() {
  const store = useStore()
  return (p: Prospect, t: WebsiteTemplate) => {
    const add = suggestPacks(t, p, store.packs)
    store.updateProspect(p.id, {
      templateId: t.id, templateIdUpdatedAt: new Date().toISOString(),
      packIds: [...new Set([...p.packIds, ...add])],
      need: p.need || (p.hasWebsite ? 'Refonte' : 'Création'),
    })
    store.addInteraction(p.id, { type: 'Note', text: `Devis préparé à partir de la maquette « ${t.name} »${add.length ? ` — pack proposé : ${store.packs.filter((k) => add.includes(k.id)).map((k) => k.name).join(', ')}` : ''}.` })
  }
}

export const isPrivateUrl = (u: string) => {
  try {
    const h = new URL(u).hostname
    return h === 'localhost' || h.endsWith('.local') || /^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(h)
  } catch { return true }
}

/* ------------------------------------------------- mode présentation */

interface PresentArgs { templateIds: string[]; prospectId?: string | null; title?: string; message?: string }
const Ctx = createContext<{ present: (a: PresentArgs) => void; share: (a: { prospectId?: string | null; templateIds?: string[] }) => void } | null>(null)
export const usePresenter = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('PresenterProvider manquant')
  return c
}

export function PresenterProvider({ children }: { children: ReactNode }) {
  const store = useStore()
  const toPortfolio = useToPortfolio()
  const [args, setArgs] = useState<PresentArgs | null>(null)
  const [shareArgs, setShareArgs] = useState<{ prospectId?: string | null; templateIds?: string[] } | null>(null)
  const prospect = args?.prospectId ? store.prospects.find((p) => p.id === args.prospectId) : null
  const s = store.settings
  const selected = args ? store.templateClientSelections.filter((x) => x.prospectId && x.prospectId === args.prospectId).map((x) => x.templateId) : []

  return (
    <Ctx.Provider value={{ present: setArgs, share: setShareArgs }}>
      {children}
      {shareArgs && <ShareModal {...shareArgs} onClose={() => setShareArgs(null)} onPresent={(a) => { setShareArgs(null); setArgs(a) }} />}
      {args && (
        <div className="fixed inset-0 z-[65] overflow-y-auto bg-[#f6f7f9]">
          <Portfolio
            agency={{ name: s.agencyName, tagline: s.agencyTagline, logoFile: s.logoFile, email: s.contactEmail, phone: s.contactPhone }}
            eyebrow={prospect ? `Sélection pour ${prospect.company}` : 'Nos réalisations'}
            title={args.title || (prospect ? 'Des modèles pensés pour votre activité' : 'Nos maquettes de sites web')}
            message={args.message}
            templates={args.templateIds.map((id) => store.templates.find((t) => t.id === id)).filter((t): t is WebsiteTemplate => !!t).map(toPortfolio)}
            selectedIds={selected}
            selectMode="internal"
            prospects={store.prospects.map((p) => ({ id: p.id, company: p.company }))}
            defaultProspectId={args.prospectId}
            onSelect={async (templateId, f) => { await store.selectInternal(templateId, f.prospectId, f.message); store.notify('Choix enregistré dans la fiche du prospect') }}
            onClose={() => setArgs(null)} />
        </div>
      )}
    </Ctx.Provider>
  )
}

/* ------------------------------------- « Présenter des maquettes » / partage */

function ShareModal({ prospectId: initialProspect, templateIds: initialIds, onClose, onPresent }: {
  prospectId?: string | null; templateIds?: string[]; onClose: () => void; onPresent: (a: PresentArgs) => void
}) {
  const store = useStore()
  const [prospectId, setProspectId] = useState(initialProspect ?? '')
  const prospect = store.prospects.find((p) => p.id === prospectId) ?? null
  const guessCat = useMemo(() => {
    if (!prospect || initialIds?.length) return ''
    // 1er secteur du prospect qui correspond à une catégorie contenant des maquettes actives
    for (const sector of prospect.sectors.map(normalize)) {
      const c = store.templateCategories.find((x) => {
        const n = normalize(x.name)
        return (n.includes(sector) || sector.includes(n.split(' ')[0])) && store.templates.some((t) => t.status === 'active' && t.categoryId === x.id)
      })
      if (c) return c.id
    }
    return ''
  }, [prospect, initialIds, store.templateCategories, store.templates])
  const [cat, setCat] = useState(guessCat)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string[]>(initialIds ?? [])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [created, setCreated] = useState<Presentation | null>(null)
  const [copied, setCopied] = useState(false)

  const list = store.templates.filter((t) => t.status === 'active'
    && (!cat || t.categoryId === cat)
    && (!q || normalize([t.name, t.tags.join(' '), t.shortDescription].join(' ')).includes(normalize(q))))
  const defTitle = prospect ? `Maquettes sélectionnées pour ${prospect.company}` : 'Notre sélection de maquettes'
  const defMessage = `Bonjour${prospect?.contact ? ' ' + prospect.contact : ''},\n\nVoici quelques modèles de sites que nous avons sélectionnés pour ${prospect?.company || 'vous'}. Cliquez sur « Découvrir » pour les voir en détail, puis sur « Cette maquette m'intéresse » pour nous indiquer votre préférence.\n\n${store.me.name}`
  const toggle = (id: string) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id])

  const generate = async () => {
    setBusy(true); setErr(null)
    try { setCreated(await store.createPresentation({ templateIds: sel, prospectId: prospectId || null, title: title || defTitle, message: message || defMessage })) }
    catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  if (created) {
    const url = store.presentationUrl(created)
    const text = `Bonjour${prospect?.contact ? ' ' + prospect.contact : ''}, voici notre sélection de maquettes pour ${prospect?.company || 'votre projet'} : ${url}`
    return (
      <Modal title="Lien de présentation prêt" onClose={onClose} footer={<Button variant="primary" onClick={onClose}>Terminé</Button>}>
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
            <Link2 size={15} className="shrink-0 text-slate-400" />
            <input readOnly value={url} className="min-w-0 flex-1 bg-transparent text-sm outline-none" onFocus={(e) => e.target.select()} />
            <Button size="sm" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* noop */ } }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copié' : 'Copier'}
            </Button>
          </div>
          {isPrivateUrl(url) && (
            <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              <span>Ce lien pointe vers votre ordinateur : il ne s'ouvrira que sur votre réseau. Pour l'envoyer à un prospect, l'application doit être en ligne et son adresse renseignée dans <b>Données → Identité de l'agence → Adresse publique</b>.</span>
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <a href={url} target="_blank" rel="noreferrer" className={btn('secondary', 'sm')}><ExternalLink size={13} />Ouvrir</a>
            <a href={`mailto:${prospect?.email ?? ''}?subject=${encodeURIComponent(created.title)}&body=${encodeURIComponent(text)}`} className={btn('secondary', 'sm')}><Mail size={13} />Email</a>
            <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className={btn('secondary', 'sm')}><MessageCircle size={13} />WhatsApp</a>
            <Button size="sm" onClick={() => onPresent({ templateIds: sel, prospectId: prospectId || null, title: created.title, message: created.message })}><MonitorPlay size={13} />Présenter</Button>
          </div>
          <p className="text-xs text-slate-500">Le choix du client sera ajouté automatiquement au journal{prospect ? ` de ${prospect.company}` : ''}. Vous pouvez désactiver ce lien à tout moment (fiche prospect → Maquettes, ou Mes Maquettes → Liens partagés).</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal size="xl" title="Présenter des maquettes" onClose={onClose}
      footer={<>
        <span className="mr-auto self-center text-sm text-slate-500">{sel.length} sélectionnée{sel.length > 1 ? 's' : ''}</span>
        <Button disabled={!sel.length} onClick={() => onPresent({ templateIds: sel, prospectId: prospectId || null, title: title || defTitle, message: message || undefined })}><MonitorPlay size={15} />Présenter maintenant</Button>
        <Button variant="primary" disabled={!sel.length || busy} onClick={generate}><Link2 size={15} />Générer le lien</Button>
      </>}>
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input !pl-8" placeholder="Rechercher une maquette…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="input sm:!w-52" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Toutes les catégories</option>
              {store.templateCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {list.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 dark:border-slate-700">
              {store.templates.length ? 'Aucune maquette active dans cette catégorie.' : 'Ajoutez d’abord des maquettes dans « Mes Maquettes ».'}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {list.map((t) => {
                const on = sel.includes(t.id)
                const cover = store.coverOf(t)
                return (
                  <button key={t.id} type="button" onClick={() => toggle(t.id)}
                    className={cx('relative overflow-hidden rounded-lg border text-left transition', on ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700')}>
                    <div className="aspect-[16/10] bg-slate-100 dark:bg-slate-800">{cover && <img src={imgUrl(cover.thumb)} alt="" className="h-full w-full object-cover object-top" />}</div>
                    <div className="p-2">
                      <p className="truncate text-sm font-medium">{t.name}</p>
                      <p className="truncate text-xs text-slate-500">{store.categoryName(t.categoryId)} · {t.siteType}</p>
                    </div>
                    <span className={cx('absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2', on ? 'border-brand-600 bg-brand-600 text-white' : 'border-white bg-white/70')}>{on && <Check size={12} strokeWidth={3} />}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <Field label="Prospect">
            <select className="input" value={prospectId} onChange={(e) => setProspectId(e.target.value)}>
              <option value="">— Sans prospect</option>
              {[...store.prospects].sort((a, b) => a.company.localeCompare(b.company, 'fr')).map((p) => <option key={p.id} value={p.id}>{p.company}</option>)}
            </select>
          </Field>
          <Field label="Titre de la page"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={defTitle} /></Field>
          <Field label="Message au client"><textarea className="input min-h-[150px] text-xs" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={defMessage} /></Field>
          {err && <p className="text-sm text-rose-600">{err}</p>}
        </div>
      </div>
    </Modal>
  )
}
