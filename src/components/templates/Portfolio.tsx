import { ArrowLeft, Check, ChevronLeft, ChevronRight, ExternalLink, Heart, Loader2, Mail, Monitor, Phone, Smartphone, X } from 'lucide-react'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { imgUrl } from '../../images'
import type { PortfolioTemplate } from '../../types'

/** Vitrine « Présentation client » : utilisée en rendez-vous (interne) et sur la page publique partagée. */

export interface AgencyInfo { name: string; tagline?: string; logoFile?: string | null; email?: string; phone?: string }
export interface SelectForm { name: string; message: string; prospectId: string }

const cls = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export const safeHref = (u: string) => (/^https?:\/\//i.test(u) ? u : undefined)
const host = (u: string) => { try { return new URL(u).host.replace(/^www\./, '') } catch { return '' } }

export function AgencyMark({ agency, size = 'md' }: { agency: AgencyInfo; size?: 'md' | 'lg' }) {
  return (
    <div className="flex items-center gap-3">
      {agency.logoFile
        ? <img src={imgUrl(agency.logoFile)} alt={agency.name} className={cls('w-auto object-contain', size === 'lg' ? 'h-12' : 'h-9')} />
        : (
          <span className={cls('flex items-center justify-center rounded-xl bg-[#1f55d1] text-white', size === 'lg' ? 'h-12 w-12' : 'h-9 w-9')}>
            <svg width={size === 'lg' ? 22 : 17} height={size === 'lg' ? 22 : 17} viewBox="0 0 32 32" fill="none"><path d="M7 24 L16 7 L25 24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        )}
      <div className="leading-tight">
        <p className={cls('font-semibold tracking-tight text-slate-900', size === 'lg' ? 'text-xl' : 'text-base')}>{agency.name}</p>
        {agency.tagline && <p className="text-xs text-slate-500">{agency.tagline}</p>}
      </div>
    </div>
  )
}

export function Portfolio({
  agency, eyebrow, title, message, templates, selectedIds = [], selectMode, prospects, defaultProspectId, onSelect, onClose, footer,
}: {
  agency: AgencyInfo
  eyebrow?: string
  title: string
  message?: string
  templates: PortfolioTemplate[]
  selectedIds?: string[]
  selectMode: 'public' | 'internal' | 'none'
  prospects?: { id: string; company: string }[]
  defaultProspectId?: string | null
  onSelect?: (templateId: string, form: SelectForm) => Promise<void>
  onClose?: () => void
  footer?: ReactNode
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const open = templates.find((t) => t.id === openId) ?? null
  const idx = open ? templates.indexOf(open) : -1

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'ArrowRight' && idx < templates.length - 1) setOpenId(templates[idx + 1].id)
      if (e.key === 'ArrowLeft' && idx > 0) setOpenId(templates[idx - 1].id)
      if (e.key === 'Escape') setOpenId(null)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, idx, templates])

  return (
    <div className="min-h-full bg-[#f6f7f9] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <AgencyMark agency={agency} />
          <div className="flex items-center gap-2">
            {agency.phone && <a href={`tel:${agency.phone.replace(/[^\d+]/g, '')}`} className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 sm:inline-flex"><Phone size={14} />{agency.phone}</a>}
            {onClose && <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"><X size={14} />Quitter</button>}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-6 sm:pt-14">
        {eyebrow && <p className="mb-2 text-sm font-medium uppercase tracking-[0.14em] text-[#1f55d1]">{eyebrow}</p>}
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {message && <p className="mt-4 max-w-2xl whitespace-pre-line text-base leading-relaxed text-slate-600">{message}</p>}
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {templates.map((t) => {
          const cover = t.images.find((i) => i.id === t.coverImageId) ?? t.images[0]
          const chosen = selectedIds.includes(t.id)
          return (
            <article key={t.id} className={cls('group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-1 transition hover:-translate-y-1 hover:shadow-xl', chosen ? 'ring-2 ring-emerald-500' : 'ring-slate-200/80')}>
              <button type="button" onClick={() => setOpenId(t.id)} className="relative block aspect-[16/10] overflow-hidden bg-slate-100 text-left">
                {cover
                  ? <img src={imgUrl(cover.thumb || cover.file)} alt={t.name} loading="lazy" className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]" />
                  : <div className="flex h-full items-center justify-center text-sm text-slate-400">Aperçu bientôt disponible</div>}
                {chosen && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white shadow"><Check size={12} strokeWidth={3} />Votre choix</span>}
              </button>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{[t.category, t.siteType].filter(Boolean).join(' · ')}</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">{t.name}</h2>
                {(t.shortDescription || t.description) && <p className="mt-1.5 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">{t.shortDescription || t.description}</p>}
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setOpenId(t.id)} className="flex-1 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Découvrir</button>
                  {safeHref(t.demoUrl) && <a href={safeHref(t.demoUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><ExternalLink size={14} />Démo</a>}
                </div>
              </div>
            </article>
          )
        })}
        {!templates.length && <p className="col-span-full py-16 text-center text-slate-400">Aucune maquette à afficher.</p>}
      </section>

      {(footer || agency.email || agency.phone) && (
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>{agency.name}{agency.tagline ? ` — ${agency.tagline}` : ''}</span>
            <div className="flex flex-wrap gap-4">
              {agency.email && <a href={`mailto:${agency.email}`} className="inline-flex items-center gap-1.5 hover:text-slate-800"><Mail size={14} />{agency.email}</a>}
              {agency.phone && <a href={`tel:${agency.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-slate-800"><Phone size={14} />{agency.phone}</a>}
            </div>
            {footer}
          </div>
        </footer>
      )}

      {open && (
        <Detail key={open.id} t={open} chosen={selectedIds.includes(open.id)} selectMode={selectMode} prospects={prospects} defaultProspectId={defaultProspectId}
          onSelect={onSelect} onClose={() => setOpenId(null)}
          onPrev={idx > 0 ? () => setOpenId(templates[idx - 1].id) : undefined}
          onNext={idx < templates.length - 1 ? () => setOpenId(templates[idx + 1].id) : undefined} />
      )}
    </div>
  )
}

function Detail({ t, chosen, selectMode, prospects, defaultProspectId, onSelect, onClose, onPrev, onNext }: {
  t: PortfolioTemplate; chosen: boolean; selectMode: 'public' | 'internal' | 'none'
  prospects?: { id: string; company: string }[]; defaultProspectId?: string | null
  onSelect?: (templateId: string, form: SelectForm) => Promise<void>
  onClose: () => void; onPrev?: () => void; onNext?: () => void
}) {
  const desktop = t.images.filter((i) => i.kind !== 'mobile')
  const mobile = t.images.filter((i) => i.kind === 'mobile')
  const [device, setDevice] = useState<'desktop' | 'mobile'>(desktop.length ? 'desktop' : 'mobile')
  const shots = device === 'desktop' ? desktop : mobile
  const [shotId, setShotId] = useState<string | null>(null)
  const shot = shots.find((s) => s.id === shotId) ?? shots[0]
  const [asking, setAsking] = useState(false)
  const [form, setForm] = useState<SelectForm>({ name: '', message: '', prospectId: defaultProspectId ?? '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(chosen)
  const demo = safeHref(device === 'mobile' && t.demoUrlMobile ? t.demoUrlMobile : t.demoUrl)

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  const confirm = async () => {
    if (!onSelect) return
    if (selectMode === 'internal' && !form.prospectId) { setErr('Choisissez le prospect concerné.'); return }
    setBusy(true); setErr(null)
    try { await onSelect(t.id, form); setDone(true); setAsking(false) } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const sortedProspects = useMemo(() => [...(prospects ?? [])].sort((a, b) => a.company.localeCompare(b.company, 'fr')), [prospects])

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-white text-slate-900">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
        <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"><ArrowLeft size={16} />Toutes les maquettes</button>
        <div className="flex items-center gap-1">
          <button type="button" disabled={!onPrev} onClick={onPrev} className="rounded-full p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30" aria-label="Précédente"><ChevronLeft size={18} /></button>
          <button type="button" disabled={!onNext} onClick={onNext} className="rounded-full p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30" aria-label="Suivante"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="grid flex-1 overflow-y-auto lg:grid-cols-[1fr_380px] lg:overflow-hidden">
        {/* Visuel */}
        <div className="flex min-h-0 flex-col bg-[#eef0f3] p-4 sm:p-6 lg:overflow-hidden">
          {desktop.length > 0 && mobile.length > 0 && (
            <div className="mx-auto mb-4 inline-flex rounded-full bg-white p-1 shadow-sm">
              {(['desktop', 'mobile'] as const).map((d) => (
                <button key={d} type="button" onClick={() => { setDevice(d); setShotId(null) }}
                  className={cls('inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition', device === d ? 'bg-slate-900 text-white' : 'text-slate-600')}>
                  {d === 'desktop' ? <Monitor size={14} /> : <Smartphone size={14} />}{d === 'desktop' ? 'Ordinateur' : 'Mobile'}
                </button>
              ))}
            </div>
          )}
          <div className="flex min-h-0 flex-1 justify-center">
            {!shot ? (
              <div className="flex h-72 w-full items-center justify-center rounded-xl bg-white text-slate-400">Pas encore de capture d'écran</div>
            ) : device === 'desktop' ? (
              <div className="flex h-[60vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/5 lg:h-full">
                <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-3 truncate rounded-md bg-white px-3 py-0.5 text-xs text-slate-400 ring-1 ring-slate-200">{host(t.demoUrl) || t.name}</span>
                </div>
                <div className="flex-1 overflow-y-auto"><img src={imgUrl(shot.file)} alt={shot.caption || t.name} className="block w-full" /></div>
              </div>
            ) : (
              <div className="flex h-[70vh] w-[300px] shrink-0 flex-col overflow-hidden rounded-[2.4rem] border-[10px] border-slate-900 bg-white shadow-2xl lg:h-full lg:max-h-[720px]">
                <div className="mx-auto mt-1 h-1.5 w-16 shrink-0 rounded-full bg-slate-900" />
                <div className="mt-1 flex-1 overflow-y-auto"><img src={imgUrl(shot.file)} alt={shot.caption || t.name} className="block w-full" /></div>
              </div>
            )}
          </div>
          {shots.length > 1 && (
            <div className="mt-4 flex shrink-0 justify-center gap-2 overflow-x-auto pb-1">
              {shots.map((s) => (
                <button key={s.id} type="button" onClick={() => setShotId(s.id)}
                  className={cls('h-14 w-20 shrink-0 overflow-hidden rounded-md bg-white ring-2 transition', s.id === shot?.id ? 'ring-slate-900' : 'ring-transparent opacity-70 hover:opacity-100')}>
                  <img src={imgUrl(s.thumb || s.file)} alt="" className="h-full w-full object-cover object-top" />
                </button>
              ))}
            </div>
          )}
          {shot?.caption && <p className="mt-2 text-center text-sm text-slate-500">{shot.caption}</p>}
        </div>

        {/* Infos */}
        <aside className="flex flex-col border-l border-slate-200 lg:overflow-y-auto">
          <div className="flex-1 p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{[t.category, t.siteType].filter(Boolean).join(' · ')}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{t.name}</h2>
            {t.description && <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-slate-600">{t.description}</p>}
            {t.features.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-semibold">Fonctionnalités principales</h3>
                <ul className="space-y-1.5">
                  {t.features.map((f) => <li key={f} className="flex gap-2 text-sm text-slate-700"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />{f}</li>)}
                </ul>
              </div>
            )}
            {t.technologies.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-semibold">Technologies</h3>
                <div className="flex flex-wrap gap-1.5">{t.technologies.map((x) => <span key={x} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{x}</span>)}</div>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              {demo && <a href={demo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"><ExternalLink size={14} />Voir le site de démonstration</a>}
              {safeHref(t.demoUrlMobile) && device === 'desktop' && <a href={safeHref(t.demoUrlMobile)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"><Smartphone size={14} />Version mobile</a>}
            </div>
          </div>

          {selectMode !== 'none' && (
            <div className="sticky bottom-0 border-t border-slate-200 bg-white p-5">
              {done ? (
                <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="flex items-center gap-2 font-semibold"><Check size={16} strokeWidth={3} />Choix enregistré</p>
                  <p className="mt-1 text-emerald-700">{selectMode === 'public' ? 'Merci ! Nous revenons vers vous très vite pour la suite.' : 'Le choix a été ajouté à la fiche du prospect.'}</p>
                </div>
              ) : asking ? (
                <div className="space-y-2.5">
                  <p className="text-sm font-semibold">Vous aimez « {t.name} » ?</p>
                  {selectMode === 'internal' ? (
                    <select value={form.prospectId} onChange={(e) => setForm({ ...form, prospectId: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                      <option value="">Prospect concerné…</option>
                      {sortedProspects.map((p) => <option key={p.id} value={p.id}>{p.company}</option>)}
                    </select>
                  ) : (
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Votre nom (facultatif)" maxLength={80}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900" />
                  )}
                  <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={2} maxLength={1000}
                    placeholder="Une remarque ? (couleurs, pages souhaitées…)" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900" />
                  {err && <p className="text-sm text-rose-600">{err}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setAsking(false)} className="rounded-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Annuler</button>
                    <button type="button" onClick={confirm} disabled={busy} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                      {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}Confirmer mon choix
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setAsking(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
                  <Heart size={16} />Cette maquette m'intéresse
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
