'use client'
import { ComingSoon } from '@/components/ui/ComingSoon'

export default function RapportsPage() {
  return <ComingSoon title="Rapports" subtitle="Analyse de l’activité commerciale."
    features={['Évolution du CA et du MRR', 'Taux de conversion par source et par secteur', 'Performance par commercial', 'Durée moyenne du cycle de vente', 'Maquettes les plus choisies', 'Exports PDF / CSV']} />
}
