'use client'
import { createElement } from 'react'
import type { AgencySettings, Pack, Quote, QuoteClient } from '../shared/types'

/** Génère le PDF dans le navigateur et le télécharge. La librairie (~500 Ko) n'est chargée qu'au premier clic. */
export async function downloadQuotePdf(quote: Quote, settings: AgencySettings, preview = false) {
  const [{ pdf }, { QuotePdf }] = await Promise.all([import('@react-pdf/renderer'), import('@/components/quote/QuotePdf')])
  const logoUrl = settings.logoFile ? `${window.location.origin}/api/files/${settings.logoFile}` : null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(createElement(QuotePdf, { quote, settings, logoUrl, preview }) as any).toBlob()
  const slug = (quote.client.company || 'client').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = preview ? `simulation-devis-${slug}.pdf` : `${quote.number}-${slug}.pdf`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

/** Devis non enregistré (simulation libre) : mêmes calculs, sans numéro. */
export function previewQuote(packs: Pack[], discount: number, client: QuoteClient, settings: AgencySettings, author: string): Quote {
  const now = new Date()
  const until = new Date(now); until.setDate(until.getDate() + (settings.quoteValidityDays || 30))
  return {
    id: 'preview', number: 'SIMULATION', leadId: null, status: 'brouillon', client,
    lines: packs.map((k) => ({ name: k.name, description: k.description, price: k.price, billing: k.billing })),
    discount, vatRate: settings.vatRate, validUntil: until.toISOString().slice(0, 10),
    paymentTerms: settings.paymentTerms, notes: settings.quoteNotes, createdBy: author, createdAt: now.toISOString(), updatedAt: now.toISOString(),
  }
}
