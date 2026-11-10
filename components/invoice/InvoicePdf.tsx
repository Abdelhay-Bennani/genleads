import { Document, Image, Page, Text, View } from '@react-pdf/renderer'
import type { AgencySettings, Invoice } from '@/lib/shared/types'
import { invoiceTotals } from '@/lib/shared/utils'
import { longDate, money, st } from '../quote/QuotePdf'

const TITLE: Record<Invoice['type'], string> = { totale: 'FACTURE', acompte: 'FACTURE D’ACOMPTE', solde: 'FACTURE DE SOLDE', mensualite: 'FACTURE', libre: 'FACTURE', avoir: 'AVOIR' }

export function InvoicePdf({ invoice: i, settings: s, logoUrl, creditedNumber, paid }: { invoice: Invoice; settings: AgencySettings; logoUrl: string | null; creditedNumber?: string; paid: number }) {
  const t = invoiceTotals(i)
  const name = s.legalName || s.agencyName
  const franchise = i.vatRate === 0
  const avoir = i.kind === 'avoir'
  const legal = [name, s.siret && `SIRET ${s.siret}`, s.vatNumber && `TVA ${s.vatNumber}`].filter(Boolean).join(' · ')
  const clientLines = [i.client.contact, i.client.address, [i.client.postalCode, i.client.city].filter(Boolean).join(' '), i.client.email, i.client.phone].filter(Boolean)
  return (
    <Document title={`${avoir ? 'Avoir' : 'Facture'} ${i.number}`} author={name} creator="AgenceFlow" language="fr">
      <Page size="A4" style={st.page}>
        <View style={st.between}>
          <View style={{ width: 260 }}>
            {logoUrl ? <Image src={logoUrl} style={st.logo} /> : <Text style={st.agencyName}>{s.agencyName}</Text>}
            {logoUrl && <Text style={st.bold}>{name}</Text>}
            {!logoUrl && s.legalName && s.legalName !== s.agencyName && <Text>{s.legalName}</Text>}
            {s.address && <Text style={st.muted}>{s.address}</Text>}
            {(s.postalCode || s.city) && <Text style={st.muted}>{[s.postalCode, s.city].filter(Boolean).join(' ')}</Text>}
            {s.contactEmail && <Text style={st.muted}>{s.contactEmail}</Text>}
            {s.contactPhone && <Text style={st.muted}>{s.contactPhone}</Text>}
            {s.siret && <Text style={st.small}>SIRET {s.siret}</Text>}
            {s.vatNumber && <Text style={st.small}>TVA intracommunautaire {s.vatNumber}</Text>}
          </View>
          <View>
            <Text style={[st.title, { fontSize: 18 }]}>{TITLE[i.type]}</Text>
            <Text style={st.number}>N° {i.number}</Text>
          </View>
        </View>

        <View style={[st.between, { marginTop: 14, alignItems: 'flex-end' }]}>
          <View>
            <Text style={st.label}>DÉTAILS</Text>
            <Text>Date d’émission : {longDate(i.issueDate)}</Text>
            {!avoir && <Text>Échéance : {longDate(i.dueDate)}</Text>}
            {creditedNumber && <Text>Annule la facture {creditedNumber}</Text>}
          </View>
          <View style={st.clientBox}>
            <Text style={st.label}>CLIENT</Text>
            <Text style={st.bold}>{i.client.company}</Text>
            {clientLines.map((l, n) => <Text key={n}>{l}</Text>)}
          </View>
        </View>

        <View style={st.table}>
          <View style={st.th} fixed>
            <Text style={st.cDesc}>Désignation</Text>
            <Text style={{ width: 34, textAlign: 'right' }}>Qté</Text>
            <Text style={{ width: 80, textAlign: 'right' }}>P.U. HT</Text>
            <Text style={{ width: 84, textAlign: 'right' }}>Total HT</Text>
          </View>
          {i.lines.map((l, n) => (
            <View key={n} style={st.tr} wrap={false}>
              <View style={st.cDesc}>
                <Text style={st.bold}>{l.name}</Text>
                {l.description && <Text style={[st.muted, { fontSize: 8.5, marginTop: 1 }]}>{l.description}</Text>}
              </View>
              <Text style={{ width: 34, textAlign: 'right' }}>{l.quantity}</Text>
              <Text style={{ width: 80, textAlign: 'right' }}>{money(l.unitPrice)}</Text>
              <Text style={{ width: 84, textAlign: 'right' }}>{money(l.quantity * l.unitPrice)}</Text>
            </View>
          ))}
        </View>

        <View style={st.totals} wrap={false}>
          <View style={st.tLine}><Text style={st.muted}>Total HT</Text><Text style={st.bold}>{money(t.ht)}</Text></View>
          {!franchise && <View style={st.tLine}><Text style={st.muted}>TVA {i.vatRate} %</Text><Text>{money(t.vat)}</Text></View>}
          <View style={st.tGrand}><Text>{franchise ? 'Total' : 'Total TTC'}</Text><Text>{money(t.ttc)}</Text></View>
          {!avoir && paid > 0 && <View style={st.tLine}><Text style={st.muted}>Déjà réglé</Text><Text>{money(paid)}</Text></View>}
          {!avoir && paid > 0 && <View style={st.tLine}><Text style={st.bold}>Reste à payer</Text><Text style={st.bold}>{money(Math.max(0, t.ttc - paid))}</Text></View>}
          {franchise && <Text style={[st.small, { textAlign: 'right', marginTop: 4 }]}>TVA non applicable, art. 293 B du CGI</Text>}
        </View>

        {(i.paymentTerms || i.notes || s.iban) && (
          <View style={st.section} wrap={false}>
            <Text style={st.label}>{avoir ? 'NOTES' : 'CONDITIONS DE RÈGLEMENT'}</Text>
            {!avoir && i.paymentTerms && <Text>{i.paymentTerms}</Text>}
            {!avoir && s.iban && <Text style={st.muted}>Règlement par virement — IBAN {s.iban}{s.bic ? ` · BIC ${s.bic}` : ''}</Text>}
            {i.notes && <Text style={{ marginTop: 4, fontSize: 8.5 }}>{i.notes}</Text>}
          </View>
        )}

        <View style={st.footerRule} fixed />
        <Text style={st.footerLeft} fixed>{legal}</Text>
        <Text style={st.footerRight} fixed>{avoir ? 'Avoir' : 'Facture'} {i.number}</Text>
      </Page>
    </Document>
  )
}
