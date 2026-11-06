'use client'
import { ComingSoon } from '@/components/ui/ComingSoon'

export default function PaiementsPage() {
  return <ComingSoon title="Paiements" subtitle="Encaissements et suivi de trésorerie."
    features={['Enregistrement des paiements reçus', 'Rapprochement avec les factures', 'Relances automatiques des impayés', 'Suivi du MRR encaissé', 'Liens de paiement en ligne', 'Export comptable (CSV)']} />
}
