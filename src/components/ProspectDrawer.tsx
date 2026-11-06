import {
  AlarmClock, Calendar, Check, Copy, ExternalLink, FileText, Globe, LayoutTemplate, Link2, Mail, MapPin, MessageSquare, MonitorPlay, Phone, Send, Star, Trash2, X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { NEEDS, PACK_CATEGORIES, SECTORS, STATUSES } from '../data'
import { useStore } from '../store'
import type { InteractionType, Member, Prospect } from '../types'
import {
  addDays, ensureHttp, eur, fmtDate, fmtDateTime, followState, mapsUrl, quote, telHref, todayISO,
} from '../utils'
import { imgUrl } from '../images'
import { PresentationRow } from '../views/Templates'
import { suggestPacks, useApplyTemplateToQuote, usePresenter } from './templates/Presenter'
import { Avatar, Button, btn, cx, Drawer, Field } from './ui'

export type DrawerTab = 'infos' | 'journal' | 'devis' | 'maquettes'
type Tab = DrawerTab
const TYPES: { id: InteractionType; icon: typeof Phone }[] = [
  { id: 'Appel', icon: Phone }, { id: 'Email', icon: Mail }, { id: 'SMS', icon: MessageSquare }, { id: 'RDV', icon: Calendar }, { id: 'Note', icon: FileText },
]

export function ProspectDrawer({ id, draft: initialDraft, onClose, onCreated, initialTab = 'infos' }: {
  id: string | null
  initialTab?: Tab
  draft: Prospect | null
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const store = useStore()
  const isNew = !!initialDraft
  const [draft, setDraft] = useState<Prospect | null>(initialDraft)
  const p = isNew ? draft : store.prospects.find((x) => x.id === id) ?? null
  const [tab, setTab] = useState<Tab>(initialTab)
  const presenter = usePresenter()
  const [confirmDel, setConfirmDel] = useState(false)

  if (!p) return null
  const patch = (ch: Partial<Prospect>) => (isNew ? setDraft({ ...p, ...ch }) : store.updateProspect(p.id, ch))
  const fs = followState(p)

  const create = () => {
    if (!p.company.trim()) return
    store.saveProspect(p)
    onCreated(p.id)
  }

  return (
    <Drawer onClose={onClose}>
      {/* En-tête */}
      <div className="border-b border-slate-100 px-4 pb-3 pt-4 sm:px-6 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <input value={p.company} onChange={(e) => patch({ company: e.target.value })} placeholder="Nom de l'entreprise"
            autoFocus={isNew}
            className="min-w-0 flex-1 bg-transparent text-xl font-semibold tracking-tight outline-none placeholder:text-slate-300" />
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fermer"><X size={18} /></Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select value={p.status} onChange={(e) => patch({ status: e.target.value as Prospect['status'] })}
            className="input !h-8 !w-auto !py-0 text-xs font-medium">
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <Avatar name={p.assignee} />
            <select value={p.assignee ?? ''} onChange={(e) => patch({ assignee: (e.target.value || null) as Member | null })}
              className="input !h-8 !w-auto !py-0 text-xs">
              <option value="">Non assigné</option>
              {[...store.members, ...(p.assignee && !store.members.includes(p.assignee) ? [p.assignee] : [])].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        {/* Actions rapides */}
        <div className="mt-3 grid grid-cols-5 gap-2">
          <a href={p.phone ? telHref(p.phone) : undefined} className={cx(btn('primary', 'sm'), !p.phone && 'pointer-events-none opacity-40')}><Phone size={14} /><span className="hidden sm:inline">Appeler</span></a>
          <a href={p.email ? `mailto:${p.email}` : undefined} className={cx(btn('secondary', 'sm'), !p.email && 'pointer-events-none opacity-40')}><Mail size={14} /><span className="hidden sm:inline">Email</span></a>
          <a href={p.url ? ensureHttp(p.url) : undefined} target="_blank" rel="noreferrer" className={cx(btn('secondary', 'sm'), !p.url && 'pointer-events-none opacity-40')}><Globe size={14} /><span className="hidden sm:inline">Site</span></a>
          <a href={mapsUrl(`${p.company} ${p.city}`)} target="_blank" rel="noreferrer" className={btn('secondary', 'sm')}><MapPin size={14} /><span className="hidden sm:inline">Maps</span></a>
          <button type="button" disabled={isNew} onClick={() => presenter.share({ prospectId: p.id })} title="Présenter des maquettes" className={btn('secondary', 'sm')}><LayoutTemplate size={14} /><span className="hidden sm:inline">Maquettes</span></button>
        </div>
        {/* Relance */}
        <div className={cx('mt-3 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm',
          fs === 'overdue' ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
            : fs === 'today' ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300'
              : 'bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300')}>
          <AlarmClock size={15} />
          <span className="font-medium">
            {fs === 'overdue' ? `Relance en retard (${fmtDate(p.nextFollowUp)})` : fs === 'today' ? "Relance aujourd'hui" : 'Prochaine relance'}
          </span>
          <input type="date" value={p.nextFollowUp ?? ''} onChange={(e) => patch({ nextFollowUp: e.target.value || null })}
            className="input !h-7 !w-auto !py-0 text-xs" />
          <div className="flex gap-1">
            {[['+1j', 1], ['+3j', 3], ['+1 sem', 7]].map(([l, n]) => (
              <button key={l} type="button" onClick={() => patch({ nextFollowUp: addDays(todayISO(), n as number) })}
                className="rounded-md bg-white/70 px-1.5 py-0.5 text-xs font-medium hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900">{l}</button>
            ))}
            {p.nextFollowUp && <button type="button" onClick={() => patch({ nextFollowUp: null })} className="px-1 text-xs underline-offset-2 hover:underline">effacer</button>}
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-slate-100 px-4 sm:px-6 dark:border-slate-800">
        {([['infos', 'Infos'], ['journal', `Journal (${p.interactions.length})`], ['devis', 'Devis'], ['maquettes', 'Maquettes']] as [Tab, string][]).map(([t, l]) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={cx('-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition',
              tab === t ? 'border-brand-600 text-brand-700 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')}>
            {l}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {tab === 'infos' && <InfosTab p={p} patch={patch} />}
        {tab === 'journal' && <JournalTab p={p} isNew={isNew} patch={patch} />}
        {tab === 'devis' && <DevisTab p={p} patch={patch} isNew={isNew} />}
        {tab === 'maquettes' && <MaquettesTab p={p} isNew={isNew} goDevis={() => setTab('devis')} />}
      </div>

      {/* Pied */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 sm:px-6 dark:border-slate-800">
        {isNew ? (
          <>
            <span className="text-xs text-slate-400">{p.company.trim() ? '' : "Renseignez au moins le nom de l'entreprise"}</span>
            <div className="flex gap-2">
              <Button onClick={onClose}>Annuler</Button>
              <Button variant="primary" onClick={create} disabled={!p.company.trim()}><Check size={15} />Créer le prospect</Button>
            </div>
          </>
        ) : (
          <>
            {confirmDel ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-rose-600">Supprimer définitivement ?</span>
                <Button variant="danger" size="sm" onClick={() => { store.deleteProspect(p.id); onClose() }}>Oui, supprimer</Button>
                <Button size="sm" onClick={() => setConfirmDel(false)}>Non</Button>
              </div>
            ) : store.isSuper ? (
              <Button variant="ghost" size="sm" onClick={() => setConfirmDel(true)} className="!text-rose-600"><Trash2 size={14} />Supprimer</Button>
            ) : <span />}
            <span className="hidden text-xs text-slate-400 sm:inline">Enregistré automatiquement · modifié le {fmtDateTime(p.updatedAt)}</span>
          </>
        )}
      </div>
    </Drawer>
  )
}

function InfosTab({ p, patch }: { p: Prospect; patch: (c: Partial<Prospect>) => void }) {
  const toggleSector = (s: string) => patch({ sectors: p.sectors.includes(s) ? p.sectors.filter((x) => x !== s) : [...p.sectors, s] })
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Contact principal"><input className="input" value={p.contact} onChange={(e) => patch({ contact: e.target.value })} placeholder="Prénom Nom" /></Field>
        <Field label="Téléphone"><input className="input" type="tel" value={p.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="06 00 00 00 00" /></Field>
        <Field label="Email"><input className="input" type="email" value={p.email} onChange={(e) => patch({ email: e.target.value })} placeholder="contact@exemple.fr" /></Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Ville" className="col-span-2"><input className="input" value={p.city} onChange={(e) => patch({ city: e.target.value })} /></Field>
          <Field label="Code postal"><input className="input" value={p.postalCode} onChange={(e) => patch({ postalCode: e.target.value })} /></Field>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
        <Field label="Site actuel">
          <div className="flex h-9 items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            {[true, false].map((v) => (
              <button key={String(v)} type="button" onClick={() => patch({ hasWebsite: v })}
                className={cx('h-full rounded-md px-4 text-sm font-medium', p.hasWebsite === v ? 'bg-white shadow-sm dark:bg-slate-950' : 'text-slate-500')}>
                {v ? 'Oui' : 'Non'}
              </button>
            ))}
          </div>
        </Field>
        <Field label="URL du site">
          <div className="flex gap-2">
            <input className="input" value={p.url} onChange={(e) => patch({ url: e.target.value })} placeholder="https://…" disabled={!p.hasWebsite} />
            {p.url && <a href={ensureHttp(p.url)} target="_blank" rel="noreferrer" className={btn('secondary')} title="Ouvrir"><ExternalLink size={15} /></a>}
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Type de besoin">
          <select className="input" value={p.need} onChange={(e) => patch({ need: e.target.value as Prospect['need'] })}>
            <option value="">— Non défini</option>
            {NEEDS.map((n) => <option key={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Budget estimé (€)">
          <input className="input" type="number" min={0} step={50} value={p.budget ?? ''} placeholder="ex. 800"
            onChange={(e) => patch({ budget: e.target.value === '' ? null : Number(e.target.value) })} />
        </Field>
      </div>

      <div>
        <span className="label">Secteur d'activité</span>
        <div className="flex flex-wrap gap-1.5">
          {[...SECTORS, ...p.sectors.filter((s) => !SECTORS.includes(s))].map((s) => (
            <button key={s} type="button" onClick={() => toggleSector(s)}
              className={cx('rounded-full border px-2.5 py-1 text-xs font-medium transition',
                p.sectors.includes(s) ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <Field label="Description de l'activité">
        <textarea className="input min-h-[70px]" value={p.activity} onChange={(e) => patch({ activity: e.target.value })}
          placeholder="Ce que fait l'entreprise, spécialités…" />
      </Field>
      <p className="text-xs text-slate-400">Source : {p.source || '—'} · créé le {fmtDateTime(p.createdAt)}</p>
    </div>
  )
}

function JournalTab({ p, isNew, patch }: { p: Prospect; isNew: boolean; patch: (c: Partial<Prospect>) => void }) {
  const store = useStore()
  const [type, setType] = useState<InteractionType>('Appel')
  const [text, setText] = useState('')
  const [follow, setFollow] = useState<number | null>(null)

  const add = () => {
    if (!text.trim()) return
    if (isNew) {
      patch({ interactions: [{ id: Math.random().toString(36).slice(2), date: new Date().toISOString(), author: store.me.name, type, text: text.trim() }, ...p.interactions] })
    } else store.addInteraction(p.id, { type, text: text.trim() })
    if (follow) patch({ nextFollowUp: addDays(todayISO(), follow) })
    setText(''); setFollow(null)
  }

  return (
    <div className="space-y-5">
      <div className="card p-3">
        <div className="mb-2 flex flex-wrap gap-1">
          {TYPES.map(({ id, icon: I }) => (
            <button key={id} type="button" onClick={() => setType(id)}
              className={cx('inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
                type === id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')}>
              <I size={12} />{id}
            </button>
          ))}
        </div>
        <textarea className="input min-h-[80px]" value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) add() }}
          placeholder="Compte-rendu de l'appel, objections, prochaine étape…" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            Relancer dans
            {[1, 3, 7, 14].map((n) => (
              <button key={n} type="button" onClick={() => setFollow(follow === n ? null : n)}
                className={cx('rounded-md px-1.5 py-0.5 font-medium', follow === n ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800')}>
                {n === 7 ? '1 sem' : n === 14 ? '2 sem' : `${n}j`}
              </button>
            ))}
          </div>
          <Button variant="primary" size="sm" onClick={add} disabled={!text.trim()}><Send size={13} />Ajouter au journal</Button>
        </div>
      </div>

      {p.interactions.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Aucun échange enregistré pour l'instant.</p>
      ) : (
        <ol className="relative space-y-4 border-l border-slate-200 pl-5 dark:border-slate-700">
          {p.interactions.map((i) => {
            const T = TYPES.find((t) => t.id === i.type) ?? TYPES[4]
            return (
              <li key={i.id} className="relative">
                <span className="absolute -left-[29px] top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white ring-2 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                  <T.icon size={10} className="text-slate-500" />
                </span>
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{i.type}</span>
                  <span>·</span><span>{fmtDateTime(i.date)}</span><span>·</span>
                  <span className="inline-flex items-center gap-1"><Avatar name={i.author} />{i.author}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{i.text}</p>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function DevisTab({ p, patch, isNew }: { p: Prospect; patch: (c: Partial<Prospect>) => void; isNew: boolean }) {
  const store = useStore()
  const packs = store.packs.filter((k) => k.active || p.packIds.includes(k.id))
  const q = quote(p, store.packs)
  const [copied, setCopied] = useState(false)
  const toggle = (id: string) => patch({ packIds: p.packIds.includes(id) ? p.packIds.filter((x) => x !== id) : [...p.packIds, id] })

  const tpl = p.templateId ? store.templates.find((t) => t.id === p.templateId) ?? null : null
  const suggested = tpl ? suggestPacks(tpl, p, store.packs).filter((id) => !p.packIds.includes(id)) : []
  const proposal = useMemo(() => {
    if (!q.sel.length) return ''
    const lines = q.sel.map((k) => `• ${k.name} — ${eur(k.price)} HT${k.billing === 'monthly' ? ' / mois' : ''}\n   ${k.description}`)
    const parts = [
      `Bonjour${p.contact ? ' ' + p.contact : ''},`,
      '',
      `Suite à notre échange, voici notre proposition pour ${p.company || 'votre entreprise'}${p.city ? ` (${p.city})` : ''} :`,
      '',
      ...lines,
      '',
    ]
    if (tpl) {
      parts.push(`Base graphique retenue : « ${tpl.name} » (${tpl.siteType}).`)
      if (tpl.description || tpl.shortDescription) parts.push(tpl.description || tpl.shortDescription)
      if (tpl.features.length) parts.push(`Inclus : ${tpl.features.join(', ')}.`)
      if (tpl.demoUrl) parts.push(`Aperçu en ligne : ${tpl.demoUrl}`)
      parts.push('')
    }
    if (q.oneShotRaw) {
      if (p.discount) parts.push(`Sous-total création : ${eur(q.oneShotRaw)} HT`, `Remise exceptionnelle : -${p.discount} %`)
      parts.push(`Total à la mise en ligne : ${eur(q.oneShot)} HT`)
    }
    if (q.mrr) parts.push(`Abonnement mensuel : ${eur(q.mrr)} HT / mois (sans engagement au-delà de 12 mois)`)
    parts.push('', 'Délai indicatif : 2 à 3 semaines après réception de vos contenus.', 'Je reste disponible pour en discuter par téléphone.', '',
      'Bien cordialement,', store.me.name)
    return parts.join('\n')
  }, [q, p, store.me.name, tpl])

  const subject = `Proposition site web – ${p.company}`
  const copy = async () => {
    try { await navigator.clipboard.writeText(proposal); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
  }
  const markSent = () => {
    patch({ status: 'devis', nextFollowUp: addDays(todayISO(), 3) })
    const txt = `Devis envoyé : ${q.sel.map((k) => k.name).join(' + ')} — ${eur(q.oneShot)} HT${q.mrr ? ` + ${eur(q.mrr)}/mois` : ''}`
    if (!isNew) store.addInteraction(p.id, { type: 'Email', text: txt })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
        <LayoutTemplate size={16} className="text-slate-400" />
        <span className="text-sm font-medium">Maquette associée</span>
        <select className="input !h-8 !w-auto min-w-0 flex-1 text-sm" value={p.templateId ?? ''}
          onChange={(e) => patch({ templateId: e.target.value || null, templateIdUpdatedAt: new Date().toISOString() })}>
          <option value="">— Aucune</option>
          {store.templates.filter((t) => t.status === 'active' || t.id === p.templateId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {suggested.length > 0 && (
          <Button size="sm" variant="primary" onClick={() => patch({ packIds: [...p.packIds, ...suggested] })}>
            + {store.packs.filter((k) => suggested.includes(k.id)).map((k) => k.name).join(', ')}
          </Button>
        )}
      </div>
      {PACK_CATEGORIES.map((c) => {
        const list = packs.filter((k) => k.category === c.id)
        if (!list.length) return null
        return (
          <div key={c.id}>
            <p className="label">{c.label}</p>
            <div className="space-y-1.5">
              {list.map((k) => {
                const on = p.packIds.includes(k.id)
                return (
                  <button key={k.id} type="button" onClick={() => toggle(k.id)}
                    className={cx('flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition',
                      on ? 'border-brand-500 bg-brand-50/70 dark:bg-brand-500/10' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700')}>
                    <span className={cx('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-slate-600')}>{on && <Check size={11} strokeWidth={3} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{k.name}</span>
                      <span className="block text-xs text-slate-500">{k.description}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{eur(k.price)}{k.billing === 'monthly' && <span className="text-xs font-normal text-slate-500">/mois</span>}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="card grid grid-cols-2 gap-px overflow-hidden bg-slate-100 sm:grid-cols-3 dark:bg-slate-800">
        <div className="bg-white p-3 dark:bg-slate-900">
          <p className="text-xs text-slate-500">Total one-shot</p>
          <p className="text-lg font-semibold tabular-nums">{eur(q.oneShot)}</p>
          {p.discount > 0 && q.oneShotRaw > 0 && <p className="text-xs text-slate-400 line-through">{eur(q.oneShotRaw)}</p>}
        </div>
        <div className="bg-white p-3 dark:bg-slate-900">
          <p className="text-xs text-slate-500">MRR récurrent</p>
          <p className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{eur(q.mrr)}<span className="text-xs font-normal">/mois</span></p>
          {q.mrr > 0 && <p className="text-xs text-slate-400">{eur(q.mrr * 12)} / an</p>}
        </div>
        <div className="col-span-2 bg-white p-3 sm:col-span-1 dark:bg-slate-900">
          <label className="text-xs text-slate-500">Remise one-shot (%)</label>
          <input type="number" min={0} max={50} className="input mt-1 !h-8" value={p.discount || ''} placeholder="0"
            onChange={(e) => patch({ discount: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
        </div>
      </div>

      {proposal ? (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label !mb-0">Proposition commerciale (générée)</span>
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-xs leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">{proposal}</pre>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copié' : 'Copier'}</Button>
            <a className={cx(btn('secondary', 'sm'), !p.email && 'pointer-events-none opacity-40')}
              href={`mailto:${p.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(proposal)}`}><Mail size={14} />Ouvrir dans ma messagerie</a>
            <Button variant="primary" size="sm" onClick={markSent} disabled={p.status === 'devis'}><Send size={14} />Marquer « Devis envoyé »</Button>
          </div>
          {p.status !== 'devis' && <p className="mt-1.5 text-xs text-slate-400">« Marquer devis envoyé » passe le statut à Devis envoyé, l'ajoute au journal et programme une relance à J+3.</p>}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400 dark:border-slate-700">
          Cochez un ou plusieurs packs pour chiffrer et générer la proposition.
        </p>
      )}
    </div>
  )
}

function MaquettesTab({ p, isNew, goDevis }: { p: Prospect; isNew: boolean; goDevis: () => void }) {
  const store = useStore()
  const presenter = usePresenter()
  const apply = useApplyTemplateToQuote()
  if (isNew) return <p className="py-8 text-center text-sm text-slate-400">Créez d'abord le prospect pour lui présenter des maquettes.</p>
  const tpl = p.templateId ? store.templates.find((t) => t.id === p.templateId) : undefined
  const cover = tpl ? store.coverOf(tpl) : undefined
  const pres = store.templatePresentations.filter((x) => x.prospectId === p.id)
  const choices = store.templateClientSelections.filter((x) => x.prospectId === p.id)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => presenter.share({ prospectId: p.id })}><Link2 size={15} />Présenter des maquettes</Button>
        {store.templates.some((t) => t.status === 'active') && (
          <Button onClick={() => presenter.present({ templateIds: store.templates.filter((t) => t.status === 'active').map((t) => t.id), prospectId: p.id })}><MonitorPlay size={15} />Mode présentation</Button>
        )}
      </div>

      <section>
        <p className="label">Maquette retenue</p>
        {tpl ? (
          <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <div className="h-20 w-32 shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">{cover && <img src={imgUrl(cover.thumb)} alt="" className="h-full w-full object-cover object-top" />}</div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-medium"><Star size={14} className="text-amber-500" fill="currentColor" />{tpl.name}</p>
              <p className="text-xs text-slate-500">{store.categoryName(tpl.categoryId)} · {tpl.siteType}</p>
              {tpl.demoUrl && <a href={tpl.demoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"><ExternalLink size={11} />Voir la démo</a>}
            </div>
            <Button variant="primary" size="sm" onClick={() => { apply(p, tpl); goDevis() }}><FileText size={14} />Créer le devis</Button>
          </div>
        ) : <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400 dark:border-slate-700">Aucune maquette choisie pour l'instant. Elle apparaîtra ici dès que le client aura fait son choix.</p>}
      </section>

      {choices.length > 0 && (
        <section>
          <p className="label">Choix du client</p>
          <ul className="space-y-1.5">
            {choices.map((c) => (
              <li key={c.id} className="rounded-lg bg-amber-50 px-3 py-2 text-sm dark:bg-amber-500/10">
                <span className="font-medium">{store.templates.find((t) => t.id === c.templateId)?.name ?? 'Maquette supprimée'}</span>
                <span className="text-xs text-slate-500"> · {fmtDateTime(c.createdAt)}{c.clientName ? ` · ${c.clientName}` : ''}{c.presentationId ? ' · via lien' : ' · en rendez-vous'}</span>
                {c.message && <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">« {c.message} »</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <p className="label">Liens de présentation ({pres.length})</p>
        {pres.length ? <div className="card divide-y divide-slate-100 dark:divide-slate-800">{pres.map((x) => <PresentationRow key={x.id} id={x.id} showProspect={false} />)}</div>
          : <p className="text-sm text-slate-400">Aucun lien envoyé.</p>}
      </section>
    </div>
  )
}
