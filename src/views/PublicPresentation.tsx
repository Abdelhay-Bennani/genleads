import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AgencyInfo, Portfolio } from '../components/templates/Portfolio'
import type { PortfolioTemplate } from '../types'

interface Payload {
  agency: AgencyInfo
  title: string
  message: string
  company: string
  contact: string
  templates: PortfolioTemplate[]
  selectedTemplateIds: string[]
}

/** Page publique /p/:token — accessible sans connexion. */
export function PublicPresentation({ token }: { token: string }) {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.remove('dark')
    const meta = document.createElement('meta')
    meta.name = 'robots'; meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    fetch(`/api/public/presentations/${encodeURIComponent(token)}`)
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Présentation introuvable.'); return j as Payload })
      .then((d) => { setData(d); document.title = `${d.title} — ${d.agency.name}` })
      .catch((e) => setError(e.message))
  }, [token])

  if (error) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f6f7f9] p-6 text-center text-slate-900">
      <p className="text-4xl">🔒</p>
      <p className="max-w-md text-lg font-medium">{error}</p>
    </div>
  )
  if (!data) return <div className="flex min-h-screen items-center justify-center bg-[#f6f7f9]"><Loader2 className="animate-spin text-slate-400" /></div>

  const select = async (templateId: string, f: { name: string; message: string }) => {
    const r = await fetch(`/api/public/presentations/${encodeURIComponent(token)}/select`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, name: f.name || data.contact, message: f.message }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j.error || 'Impossible d’enregistrer votre choix.')
    setData({ ...data, selectedTemplateIds: [...data.selectedTemplateIds, templateId] })
  }

  return (
    <Portfolio
      agency={data.agency}
      eyebrow={data.company ? `Sélection préparée pour ${data.company}` : 'Notre sélection'}
      title={data.title}
      message={data.message}
      templates={data.templates}
      selectedIds={data.selectedTemplateIds}
      selectMode="public"
      onSelect={select}
    />
  )
}
