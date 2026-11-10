import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { AgencySettings, Quote } from '@/lib/shared/types'
import { quoteTotals } from '@/lib/shared/utils'

/*
 * Devis A4 généré dans le navigateur (@react-pdf/renderer).
 * Police Helvetica intégrée au PDF : pas de téléchargement de police, accents et « € » pris en charge.
 */

const VIOLET = '#5539d9'
const INK = '#0f172a'
const MUTED = '#64748b'
const LINE = '#e2e8f0'

/** Montant « 1 400,00 € » avec des espaces simples (Intl produit des espaces fines que Helvetica n'a pas). */
export const money = (n: number) => {
  const [int, dec] = Math.abs(n).toFixed(2).split('.')
  return `${n < 0 ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${dec} €`
}
export const longDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const st = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 56, paddingHorizontal: 44, fontFamily: 'Helvetica', fontSize: 9.5, color: INK, lineHeight: 1.4 },
  row: { flexDirection: 'row' },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  logo: { maxWidth: 140, maxHeight: 56, objectFit: 'contain', marginBottom: 8 },
  agencyName: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: VIOLET, marginBottom: 2 },
  muted: { color: MUTED },
  small: { fontSize: 8, color: MUTED },
  bold: { fontFamily: 'Helvetica-Bold' },
  title: { fontSize: 22, lineHeight: 1.1, fontFamily: 'Helvetica-Bold', color: INK, textAlign: 'right', marginBottom: 4 },
  number: { fontSize: 11, color: VIOLET, fontFamily: 'Helvetica-Bold', textAlign: 'right', marginTop: 2 },
  preview: { marginTop: 6, alignSelf: 'flex-end', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 3, backgroundColor: '#fef3c7', color: '#92400e', fontSize: 8, fontFamily: 'Helvetica-Bold' },
  clientBox: { width: 230, padding: 12, borderRadius: 4, backgroundColor: '#f5f3ff' },
  label: { fontSize: 7.5, color: VIOLET, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8, marginBottom: 4 },
  table: { marginTop: 18 },
  th: { flexDirection: 'row', backgroundColor: INK, color: '#fff', paddingVertical: 6, paddingHorizontal: 8, fontFamily: 'Helvetica-Bold', fontSize: 8.5, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  tr: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: LINE },
  cDesc: { flex: 1, paddingRight: 10 },
  cType: { width: 70 },
  cPrice: { width: 90, textAlign: 'right' },
  totals: { marginTop: 10, marginLeft: 'auto', width: 250 },
  tLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  tGrand: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, paddingHorizontal: 8, marginTop: 4, backgroundColor: VIOLET, color: '#fff', borderRadius: 3, fontFamily: 'Helvetica-Bold', fontSize: 11 },
  tMonthly: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 8, marginTop: 6, backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: 3, fontFamily: 'Helvetica-Bold' },
  section: { marginTop: 14 },
  sign: { marginTop: 16, flexDirection: 'row' },
  signBox: { flex: 1, height: 70, borderWidth: 1, borderColor: LINE, borderRadius: 4, padding: 10 },
  footerRule: { position: 'absolute', bottom: 36, left: 44, right: 44, borderTopWidth: 1, borderTopColor: LINE },
  footerLeft: { position: 'absolute', bottom: 22, left: 44, width: 380, fontSize: 7.5, color: MUTED },
  footerRight: { position: 'absolute', bottom: 22, right: 44, width: 120, fontSize: 7.5, color: MUTED, textAlign: 'right' },
})

export function QuotePdf({ quote: q, settings: s, logoUrl, preview = false }: { quote: Quote; settings: AgencySettings; logoUrl: string | null; preview?: boolean }) {
  const t = quoteTotals(q)
  const name = s.legalName || s.agencyName
  const franchise = q.vatRate === 0
  const hasOneShot = q.lines.some((l) => l.billing === 'oneshot')
  const legal = [name, s.siret && `SIRET ${s.siret}`, s.vatNumber && `TVA ${s.vatNumber}`].filter(Boolean).join(' · ')
  const clientLines = [q.client.contact, q.client.address, [q.client.postalCode, q.client.city].filter(Boolean).join(' '), q.client.email, q.client.phone].filter(Boolean)

  return (
    <Document title={preview ? 'Simulation de devis' : `Devis ${q.number}`} author={name} creator="AgenceFlow" language="fr">
      <Page size="A4" style={st.page}>
        {/* En-tête : agence à gauche, titre à droite */}
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
            <Text style={st.title}>DEVIS</Text>
            <Text style={st.number}>{preview ? 'Simulation' : `N° ${q.number}`}</Text>
            {preview && <Text style={st.preview}>SIMULATION — SANS VALEUR CONTRACTUELLE</Text>}
          </View>
        </View>

        {/* Dates à gauche, client à droite */}
        <View style={[st.between, { marginTop: 14, alignItems: 'flex-end' }]}>
          <View>
            <Text style={st.label}>DÉTAILS</Text>
            <Text>Date : {longDate(q.createdAt)}</Text>
            <Text>Valable jusqu’au {longDate(q.validUntil)}</Text>
            <Text style={st.muted}>Établi par {q.createdBy}</Text>
          </View>
          <View style={st.clientBox}>
            <Text style={st.label}>CLIENT</Text>
            <Text style={st.bold}>{q.client.company}</Text>
            {clientLines.map((l, i) => <Text key={i}>{l}</Text>)}
          </View>
        </View>

        {/* Prestations */}
        <View style={st.table}>
          <View style={st.th} fixed>
            <Text style={st.cDesc}>Désignation</Text>
            <Text style={st.cType}>Facturation</Text>
            <Text style={st.cPrice}>Prix HT</Text>
          </View>
          {q.lines.map((l, i) => (
            <View key={i} style={st.tr} wrap={false}>
              <View style={st.cDesc}>
                <Text style={st.bold}>{l.name}</Text>
                {l.description && <Text style={[st.muted, { fontSize: 8.5, marginTop: 1 }]}>{l.description}</Text>}
              </View>
              <Text style={st.cType}>{l.billing === 'monthly' ? 'Mensuelle' : 'Unique'}</Text>
              <Text style={st.cPrice}>{`${money(l.price)}${l.billing === 'monthly' ? ' /mois' : ''}`}</Text>
            </View>
          ))}
        </View>

        {/* Totaux */}
        <View style={st.totals} wrap={false}>
          {hasOneShot && (
            <>
              {q.discount > 0 && (
                <>
                  <View style={st.tLine}><Text style={st.muted}>Sous-total création HT</Text><Text>{money(t.oneShotRaw)}</Text></View>
                  <View style={st.tLine}><Text style={st.muted}>Remise {q.discount} %</Text><Text>- {money(t.discountAmount)}</Text></View>
                </>
              )}
              <View style={st.tLine}><Text style={st.muted}>Total création HT</Text><Text style={st.bold}>{money(t.oneShotHT)}</Text></View>
              {!franchise && <View style={st.tLine}><Text style={st.muted}>TVA {q.vatRate} %</Text><Text>{money(t.oneShotVAT)}</Text></View>}
              <View style={st.tGrand}><Text>{franchise ? 'Total à régler' : 'Total TTC'}</Text><Text>{money(t.oneShotTTC)}</Text></View>
            </>
          )}
          {t.monthlyHT > 0 && (
            <View style={st.tMonthly}>
              <Text>Abonnement mensuel</Text>
              <Text>{`${money(franchise ? t.monthlyHT : t.monthlyTTC)}${franchise ? '' : ' TTC'} /mois`}</Text>
            </View>
          )}
          {t.monthlyHT > 0 && !franchise && <Text style={[st.small, { textAlign: 'right', marginTop: 2 }]}>soit {money(t.monthlyHT)} HT /mois</Text>}
          {franchise && <Text style={[st.small, { textAlign: 'right', marginTop: 4 }]}>TVA non applicable, art. 293 B du CGI</Text>}
        </View>

        {/* Conditions */}
        {(q.paymentTerms || q.notes || s.iban) && (
          <View style={st.section} wrap={false}>
            <Text style={st.label}>CONDITIONS</Text>
            {q.paymentTerms && <Text>{q.paymentTerms}</Text>}
            {s.iban && <Text style={st.muted}>Règlement par virement — IBAN {s.iban}{s.bic ? ` · BIC ${s.bic}` : ''}</Text>}
            {q.notes && <Text style={{ marginTop: 4 }}>{q.notes}</Text>}
          </View>
        )}

        {/* Bon pour accord */}
        <View style={st.sign} wrap={false}>
          <View style={[st.signBox, { marginRight: 14 }]}>
            <Text style={st.label}>POUR {name.toUpperCase()}</Text>
            <Text style={st.small}>{q.createdBy}</Text>
          </View>
          <View style={st.signBox}>
            <Text style={st.label}>BON POUR ACCORD — CLIENT</Text>
            <Text style={st.small}>Date, signature et cachet, précédés de la mention « Bon pour accord »</Text>
          </View>
        </View>

        <View style={st.footerRule} fixed />
        <Text style={st.footerLeft} fixed>{legal}</Text>
        <Text style={st.footerRight} fixed>{preview ? 'Simulation' : `Devis ${q.number}`}</Text>
      </Page>
    </Document>
  )
}
