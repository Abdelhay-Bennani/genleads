'use client'
import type { Pack, PortfolioTemplate, Prospect, WebsiteTemplate } from '../shared/types'
import { useStore } from './store'

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
export const safeHref = (u: string) => (/^https?:\/\//i.test(u) ? u : undefined)
