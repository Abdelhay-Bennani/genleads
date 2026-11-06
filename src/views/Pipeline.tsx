import { AlarmClock, ArrowDown, ArrowUp, ChevronsUpDown, Columns3, Globe, Mail, Phone, Plus, Search, Table2, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { NEEDS, SECTORS, STATUSES } from '../data'
import { useStore } from '../store'
import type { Member, Prospect, Status } from '../types'
import { dealValue, ensureHttp, eur, fmtDate, followState, normalize, telHref } from '../utils'
import { Avatar, Button, cx, Empty, NeedBadge, PageHeader, Segmented, StatusBadge, Tag } from '../components/ui'

type SortKey = 'company' | 'city' | 'need' | 'value' | 'status' | 'assignee' | 'follow' | 'updated'
const VIEW_KEY = 'agenceflow-crm:pipeview'

export function Pipeline({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const store = useStore()
  const [view, setView] = useState<'table' | 'kanban'>(() => {
    try { return (localStorage.getItem(VIEW_KEY) as 'table' | 'kanban') || 'table' } catch { return 'table' }
  })
  const changeView = (v: 'table' | 'kanban') => { setView(v); try { localStorage.setItem(VIEW_KEY, v) } catch { /* noop */ } }

  const [q, setQ] = useState('')
  const [fStatus, setFStatus] = useState<Status | ''>('')
  const [fNeed, setFNeed] = useState('')
  const [fSector, setFSector] = useState('')
  const [fCity, setFCity] = useState('')
  const [fAssignee, setFAssignee] = useState<Member | '' | 'none'>('')
  const [onlyFollow, setOnlyFollow] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'updated', dir: -1 })

  const cities = useMemo(() => [...new Set(store.prospects.map((p) => p.city.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')), [store.prospects])
  const sectors = useMemo(() => [...new Set([...SECTORS, ...store.prospects.flatMap((p) => p.sectors)])], [store.prospects])

  const filtered = useMemo(() => {
    const nq = normalize(q)
    let list = store.prospects.filter((p) => {
      if (nq && !normalize([p.company, p.contact, p.city, p.email, p.phone, p.activity, p.sectors.join(' ')].join(' ')).includes(nq)) return false
      if (fStatus && view === 'table' && p.status !== fStatus) return false
      if (fNeed && p.need !== fNeed) return false
      if (fSector && !p.sectors.includes(fSector)) return false
      if (fCity && p.city.trim() !== fCity) return false
      if (fAssignee === 'none' ? p.assignee : fAssignee && p.assignee !== fAssignee) return false
      if (onlyFollow && !['overdue', 'today'].includes(followState(p))) return false
      return true
    })
    const order = STATUSES.map((s) => s.id)
    const val = (p: Prospect): string | number => {
      switch (sort.key) {
        case 'company': return normalize(p.company)
        case 'city': return normalize(p.city)
        case 'need': return p.need
        case 'value': return dealValue(p, store.packs)
        case 'status': return order.indexOf(p.status)
        case 'assignee': return p.assignee ?? 'zz'
        case 'follow': return p.nextFollowUp ?? '9999'
        case 'updated': return p.updatedAt
      }
    }
    list = [...list].sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir })
    return list
  }, [store.prospects, store.packs, q, fStatus, fNeed, fSector, fCity, fAssignee, onlyFollow, sort, view])

  const active = [fStatus, fNeed, fSector, fCity, fAssignee, onlyFollow ? 'x' : ''].filter(Boolean).length
  const clear = () => { setFStatus(''); setFNeed(''); setFSector(''); setFCity(''); setFAssignee(''); setOnlyFollow(false); setQ('') }

  return (
    <div>
      <PageHeader title="Pipeline prospects" subtitle={`${filtered.length} prospect${filtered.length > 1 ? 's' : ''} affiché${filtered.length > 1 ? 's' : ''} sur ${store.prospects.length}`}
        actions={<>
          <Segmented value={view} onChange={changeView} options={[
            { value: 'table', label: <><Table2 size={15} /><span className="hidden sm:inline">Tableau</span></> },
            { value: 'kanban', label: <><Columns3 size={15} /><span className="hidden sm:inline">Kanban</span></> },
          ]} />
          <Button variant="primary" onClick={onNew}><Plus size={16} />Nouveau prospect</Button>
        </>} />

      {/* Filtres */}
      <div className="card mb-4 flex flex-col gap-2 p-2.5 lg:flex-row lg:items-center">
        <div className="relative lg:w-64">
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-8" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-1 lg:flex-wrap">
          {view === 'table' && (
            <select className="input lg:!w-auto" value={fStatus} onChange={(e) => setFStatus(e.target.value as Status | '')}>
              <option value="">Tous statuts</option>
              {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          )}
          <select className="input lg:!w-auto" value={fCity} onChange={(e) => setFCity(e.target.value)}>
            <option value="">Toutes villes</option>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="input lg:!w-auto" value={fNeed} onChange={(e) => setFNeed(e.target.value)}>
            <option value="">Tous besoins</option>
            {NEEDS.map((n) => <option key={n}>{n}</option>)}
          </select>
          <select className="input lg:!w-auto" value={fSector} onChange={(e) => setFSector(e.target.value)}>
            <option value="">Tous secteurs</option>
            {sectors.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="input lg:!w-auto" value={fAssignee} onChange={(e) => setFAssignee(e.target.value as Member | '' | 'none')}>
            <option value="">Toute l'équipe</option>
            {store.members.map((m) => <option key={m} value={m}>{m}</option>)}
            <option value="none">Non assignés</option>
          </select>
          <button type="button" onClick={() => setOnlyFollow(!onlyFollow)}
            className={cx('input inline-flex items-center justify-center gap-1.5 lg:!w-auto', onlyFollow && '!border-amber-400 !bg-amber-50 text-amber-800 dark:!bg-amber-500/10 dark:text-amber-300')}>
            <AlarmClock size={14} />À relancer
          </button>
        </div>
        {active > 0 && <Button variant="ghost" size="sm" onClick={clear}><X size={14} />Effacer ({active})</Button>}
      </div>

      {store.prospects.length === 0 ? (
        <div className="card"><Empty icon={<Users size={36} />} title="Aucun prospect">Ajoutez votre premier prospect ou importez votre CSV depuis Réglages.</Empty></div>
      ) : view === 'table' ? (
        <TableView list={filtered} sort={sort} setSort={setSort} onOpen={onOpen} />
      ) : (
        <KanbanView list={filtered} onOpen={onOpen} />
      )}
    </div>
  )
}

function FollowChip({ p }: { p: Prospect }) {
  const s = followState(p)
  if (s === 'none') return <span className="text-xs text-slate-400">—</span>
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium',
      s === 'overdue' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
        : s === 'today' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
          : 'text-slate-500')}>
      <AlarmClock size={11} />{s === 'today' ? "Aujourd'hui" : fmtDate(p.nextFollowUp)}
    </span>
  )
}

function TableView({ list, sort, setSort, onOpen }: {
  list: Prospect[]; sort: { key: SortKey; dir: 1 | -1 }; setSort: (s: { key: SortKey; dir: 1 | -1 }) => void; onOpen: (id: string) => void
}) {
  const store = useStore()
  const H = ({ k, children, className }: { k: SortKey; children: string; className?: string }) => (
    <th className={cx('px-3 py-2.5 text-left font-medium', className)}>
      <button type="button" className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
        onClick={() => setSort({ key: k, dir: sort.key === k ? (sort.dir === 1 ? -1 : 1) : 1 })}>
        {children}
        {sort.key === k ? (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ChevronsUpDown size={12} className="opacity-40" />}
      </button>
    </th>
  )
  if (!list.length) return <div className="card"><Empty icon={<Search size={32} />} title="Aucun résultat">Modifiez ou effacez les filtres.</Empty></div>

  return (
    <>
      {/* Desktop */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 text-xs text-slate-500 dark:border-slate-800">
            <tr>
              <H k="company">Entreprise</H>
              <H k="city">Ville</H>
              <th className="px-3 py-2.5 text-left font-medium">Secteur</th>
              <H k="need">Besoin</H>
              <H k="value" className="text-right">Valeur</H>
              <H k="status">Statut</H>
              <H k="assignee">Assigné</H>
              <H k="follow">Relance</H>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {list.map((p) => {
              const v = dealValue(p, store.packs)
              return (
                <tr key={p.id} onClick={() => onOpen(p.id)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{p.company}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      {p.hasWebsite ? <><Globe size={11} />{p.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') || 'Oui'}</> : <span className="text-orange-600 dark:text-orange-400">Sans site</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{p.city || '—'}</td>
                  <td className="px-3 py-2.5"><div className="flex max-w-[180px] flex-wrap gap-1">{p.sectors.slice(0, 2).map((s) => <Tag key={s}>{s}</Tag>)}{p.sectors.length > 2 && <Tag>+{p.sectors.length - 2}</Tag>}</div></td>
                  <td className="px-3 py-2.5"><NeedBadge need={p.need} /></td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{v ? eur(v) : <span className="text-slate-400">—</span>}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={p.status} /></td>
                  <td className="px-3 py-2.5"><Avatar name={p.assignee} /></td>
                  <td className="px-3 py-2.5"><FollowChip p={p} /></td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-0.5">
                      {p.phone && <a href={telHref(p.phone)} title={p.phone} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"><Phone size={14} /></a>}
                      {p.email && <a href={`mailto:${p.email}`} title={p.email} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"><Mail size={14} /></a>}
                      {p.url && <a href={ensureHttp(p.url)} target="_blank" rel="noreferrer" title="Ouvrir le site" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"><Globe size={14} /></a>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile : cartes */}
      <div className="space-y-2 md:hidden">
        {list.map((p) => (
          <div key={p.id} onClick={() => onOpen(p.id)} className="card cursor-pointer p-3 active:bg-slate-50 dark:active:bg-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{p.company}</p>
                <p className="truncate text-xs text-slate-500">{[p.city, p.sectors.join(', ')].filter(Boolean).join(' · ')}</p>
              </div>
              <Avatar name={p.assignee} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5"><StatusBadge status={p.status} /><NeedBadge need={p.need} /><FollowChip p={p} /></div>
            {(p.phone || p.email) && (
              <div className="mt-2.5 flex gap-2" onClick={(e) => e.stopPropagation()}>
                {p.phone && <a href={telHref(p.phone)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2 text-sm font-medium text-white"><Phone size={14} />Appeler</a>}
                {p.email && <a href={`mailto:${p.email}`} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm font-medium dark:border-slate-700"><Mail size={14} />Email</a>}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

function KanbanView({ list, onOpen }: { list: Prospect[]; onOpen: (id: string) => void }) {
  const store = useStore()
  const [over, setOver] = useState<Status | null>(null)
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
      {STATUSES.map((s) => {
        const items = list.filter((p) => p.status === s.id)
        const total = items.reduce((t, p) => t + dealValue(p, store.packs), 0)
        return (
          <div key={s.id}
            onDragOver={(e) => { e.preventDefault(); setOver(s.id) }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) store.updateProspect(id, { status: s.id }); setOver(null) }}
            className={cx('flex w-[272px] shrink-0 snap-start flex-col rounded-xl bg-slate-100/80 p-2 transition dark:bg-slate-900/60',
              over === s.id && 'ring-2 ring-brand-500/50')}>
            <div className="flex items-center justify-between px-1.5 pb-2 pt-1">
              <div className="flex items-center gap-2">
                <span className={cx('h-2 w-2 rounded-full', s.dot)} />
                <span className="text-sm font-semibold">{s.label}</span>
                <span className="rounded-full bg-white px-1.5 text-xs text-slate-500 dark:bg-slate-800">{items.length}</span>
              </div>
              {total > 0 && <span className="text-xs tabular-nums text-slate-500">{eur(total)}</span>}
            </div>
            <div className="flex min-h-[120px] flex-col gap-2">
              {items.map((p) => (
                <div key={p.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)} onClick={() => onOpen(p.id)}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition hover:border-brand-400 hover:shadow dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{p.company}</p>
                    <Avatar name={p.assignee} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{[p.city, p.sectors[0]].filter(Boolean).join(' · ') || '—'}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <NeedBadge need={p.need} />
                    {dealValue(p, store.packs) > 0 && <span className="text-xs font-medium tabular-nums">{eur(dealValue(p, store.packs))}</span>}
                    {followState(p) !== 'none' && <FollowChip p={p} />}
                  </div>
                </div>
              ))}
              {!items.length && <p className="py-6 text-center text-xs text-slate-400">Glissez une carte ici</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
