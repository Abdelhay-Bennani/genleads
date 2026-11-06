import { X } from 'lucide-react'
import { ButtonHTMLAttributes, ReactNode, useEffect } from 'react'
import { NEED_COLORS, statusMeta } from '../data'
import type { Member, Status } from '../types'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
export const btn = (variant: Variant = 'secondary', size: 'sm' | 'md' = 'md') => cx(
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition select-none whitespace-nowrap',
  'disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
  size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
  variant === 'primary' && 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
  variant === 'secondary' && 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  variant === 'ghost' && 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  variant === 'danger' && 'border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-transparent dark:text-rose-400 dark:hover:bg-rose-500/10',
)

export function Button({ variant, size, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return <button type="button" className={cx(btn(variant, size), className)} {...rest} />
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="label">{label}</span>
      {children}
    </label>
  )
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const m = statusMeta(status)
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', m.badge, className)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  )
}

export function NeedBadge({ need }: { need: string }) {
  if (!need) return <span className="text-xs text-slate-400">—</span>
  return <span className={cx('inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset', NEED_COLORS[need] ?? NEED_COLORS.Autre)}>{need}</span>
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{children}</span>
}

const AVATAR = [
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
]
const avatarColor = (name: string) => AVATAR[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % AVATAR.length]
export function Avatar({ name, size = 'sm' }: { name: Member | null; size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'lg' ? 'h-14 w-14 text-xl' : size === 'md' ? 'h-8 w-8 text-sm' : 'h-6 w-6 text-[11px]'
  if (!name) return <span title="Non assigné" className={cx('inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 dark:border-slate-600', s)}>?</span>
  return <span title={name} className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', avatarColor(name), s)}>{name[0]?.toUpperCase()}</span>
}

export function Segmented<T extends string>({ value, options, onChange, size = 'md' }: {
  value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; size?: 'sm' | 'md'
}) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cx('inline-flex items-center gap-1.5 rounded-md font-medium transition',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            o.value === value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [onClose])
}

export function Drawer({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEscape(onClose)
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex h-full w-full flex-col bg-white shadow-2xl sm:max-w-2xl dark:bg-slate-900">{children}</div>
    </div>
  )
}

export function Modal({ title, onClose, children, footer, size = 'md' }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'md' | 'lg' | 'xl' }) {
  useEscape(onClose)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cx('relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900', size === 'xl' ? 'sm:max-w-5xl' : size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <h3 className="font-semibold">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fermer"><X size={16} /></Button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">{footer}</div>}
      </div>
    </div>
  )
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="text-slate-300 dark:text-slate-600">{icon}</div>
      <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {children && <div className="text-sm text-slate-500">{children}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
