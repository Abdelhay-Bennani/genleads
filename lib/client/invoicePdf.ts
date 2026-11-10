'use client'
import { createElement } from 'react'
import type { AgencySettings, Invoice } from '../shared/types'

/** Génère le PDF de la facture dans le navigateur. La librairie n'est chargée qu'au premier clic. */
export async function downloadInvoicePdf(invoice: Invoice, settings: AgencySettings, opts: { creditedNumber?: string; paid: number }) {
  const [{ pdf }, { InvoicePdf }] = await Promise.all([import('@react-pdf/renderer'), import('@/components/invoice/InvoicePdf')])
  const logoUrl = settings.logoFile ? `${window.location.origin}/api/files/${settings.logoFile}` : null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(createElement(InvoicePdf, { invoice, settings, logoUrl, ...opts }) as any).toBlob()
  const slug = (invoice.client.company || 'client').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${invoice.number}-${slug}.pdf`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
