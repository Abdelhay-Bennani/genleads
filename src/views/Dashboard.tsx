import { AlarmClock, CheckCircle2, Euro, Repeat, Target, Users } from 'lucide-react'
import { ReactNode, useMemo, useState } from 'react'
import { STATUSES } from '../data'
import { useStore } from '../store'
import type { Member } from '../types'
import { dealValue, eur, fmtDate, fmtDateTime, followState, isClosed, quote } from '../utils'
import { Avatar, cx, PageHeader, Segmented, StatusBadge } from '../components/ui'

function Kpi({ icon, label, value, sub, tone }: { icon: ReactNode; label: string; value: string; sub?: string; tone?: 'warn' | 'good' }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className={cx('flex h-6 w-6 items-center justify-center rounded-md',
          tone === 'warn' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
            : tone === 'good' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
              : 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-200')}>{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export function Dashboard({ onOpen }: { onOpen: (id: string) => void }) {
  const store = useStore()
  const [who, setWho] = useState<Member | 'all'>('all')

  const m = useMemo(() => {
    const list = who === 'all' ? store.prospects : store.prospects.filter((p) => p.assignee === who)
    const activeList = list.filter((p) => !isClosed(p))
    const won = list.filter((p) => p.status === 'gagne')
    const lost = list.filter((p) => p.status === 'perdu')
    const potential = activeList.reduce((t, p) => t + dealValue(p, store.packs), 0)
    const validated = won.reduce((t, p) => t + dealValue(p, store.packs), 0)
    const mrr = won.reduce((t, p) => t + quote(p, store.packs).mrr, 0)
    const mrrPipe = activeList.reduce((t, p) => t + quote(p, store.packs).mrr, 0)
    const follow = activeList.filter((p) => ['overdue', 'today'].includes(followState(p)))
      .sort((a, b) => (a.nextFollowUp ?? '').localeCompare(b.nextFollowUp ?? ''))
    const upcoming = activeList.filter((p) => followState(p) === 'upcoming')
      .sort((a, b) => (a.nextFollowUp ?? '').localeCompare(b.nextFollowUp ?? '')).slice(0, 5)
    const stages = STATUSES.map((s) => {
      const items = list.filter((p) => p.status === s.id)
      return { ...s, count: items.length, value: items.reduce((t, p) => t + dealValue(p, store.packs), 0) }
    })
    const recent = list.flatMap((p) => p.interactions.map((i) => ({ ...i, p })))
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)
    const noAssign = activeList.filter((p) => !p.assignee).length
    return { list, activeList, won, lost, potential, validated, mrr, mrrPipe, follow, upcoming, stages, recent, noAssign }
  }, [store.prospects, store.packs, who])

  const rate = m.list.length ? Math.round((m.won.length / m.list.length) * 100) : 0
  const closedRate = m.won.length + m.lost.length ? Math.round((m.won.length / (m.won.length + m.lost.length)) * 100) : null
  const maxCount = Math.max(1, ...m.stages.map((s) => s.count))
  const hello = new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'

  return (
    <div>
      <PageHeader title={`${hello} ${store.me.name} 👋`.trim()}
        subtitle={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        actions={<Segmented value={who} onChange={setWho} options={[
          { value: 'all', label: 'Tous' },
          ...store.members.map((x) => ({ value: x, label: <><Avatar name={x} />{x}</> })),
        ]} />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icon={<Users size={14} />} label="Prospects dans le pipe" value={String(m.activeList.length)} sub={`${m.list.length} au total`} />
        <Kpi icon={<Target size={14} />} label="Taux de conversion" value={`${rate} %`}
          sub={`${m.won.length} gagné${m.won.length > 1 ? 's' : ''}${closedRate !== null ? ` · ${closedRate} % des affaires closes` : ''}`} />
        <Kpi icon={<Euro size={14} />} label="CA one-shot" value={eur(m.validated)} sub={`validé · ${eur(m.potential)} potentiel`} tone="good" />
        <Kpi icon={<Repeat size={14} />} label="MRR (SEO + maintenance)" value={`${eur(m.mrr)}`} sub={`/mois · +${eur(m.mrrPipe)} en négociation`} tone="good" />
        <Kpi icon={<AlarmClock size={14} />} label="Relances à faire" value={String(m.follow.length)}
          sub={m.follow.filter((p) => followState(p) === 'overdue').length ? `dont ${m.follow.filter((p) => followState(p) === 'overdue').length} en retard` : "aujourd'hui"} tone={m.follow.length ? 'warn' : undefined} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* Relances */}
        <section className="card min-w-0 lg:col-span-3">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><AlarmClock size={15} />À relancer aujourd'hui</h2>
            {m.noAssign > 0 && <span className="text-xs text-slate-500">{m.noAssign} prospect{m.noAssign > 1 ? 's' : ''} non assigné{m.noAssign > 1 ? 's' : ''}</span>}
          </header>
          {m.follow.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500"><CheckCircle2 size={16} className="text-emerald-500" />Aucune relance en attente. Bien joué !</div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {m.follow.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => onOpen(p.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <Avatar name={p.assignee} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.company}</p>
                      <p className="truncate text-xs text-slate-500">{p.interactions[0]?.text ?? p.city}</p>
                    </div>
                    <StatusBadge status={p.status} className="hidden sm:inline-flex" />
                    <span className={cx('shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium',
                      followState(p) === 'overdue' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300')}>
                      {followState(p) === 'overdue' ? `Retard · ${fmtDate(p.nextFollowUp)}` : "Aujourd'hui"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {m.upcoming.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
              <p className="mb-1.5 text-xs font-medium text-slate-500">À venir</p>
              <div className="flex flex-wrap gap-1.5">
                {m.upcoming.map((p) => (
                  <button key={p.id} type="button" onClick={() => onOpen(p.id)} className="rounded-md bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
                    {p.company} · <span className="text-slate-500">{fmtDate(p.nextFollowUp)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Entonnoir */}
        <section className="card min-w-0 p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Répartition du pipeline</h2>
          <div className="space-y-2.5">
            {m.stages.map((s) => (
              <div key={s.id}>
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="font-medium text-slate-600 dark:text-slate-300">{s.label}</span>
                  <span className="tabular-nums text-slate-500">{s.count}{s.value > 0 && ` · ${eur(s.value)}`}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className={cx('h-full rounded-full', s.dot)} style={{ width: `${(s.count / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Activité récente */}
      <section className="card mt-4">
        <header className="border-b border-slate-100 px-4 py-3 dark:border-slate-800"><h2 className="text-sm font-semibold">Activité récente</h2></header>
        {m.recent.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">Les appels, emails et notes ajoutés au journal des prospects apparaîtront ici.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {m.recent.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => onOpen(r.p.id)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <Avatar name={r.author} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm"><span className="font-medium">{r.type}</span> · {r.p.company}</p>
                    <p className="truncate text-xs text-slate-500">{r.text}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{fmtDateTime(r.date)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
