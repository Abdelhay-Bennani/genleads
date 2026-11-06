'use client'
import { ComingSoon } from '@/components/ui/ComingSoon'

export default function FacturesPage() {
  return <ComingSoon title="Factures" subtitle="Facturation des projets et abonnements."
    features={['Facture générée depuis un devis accepté', 'Numérotation automatique et mentions légales', 'Export PDF aux couleurs de l’agence', 'Acomptes et soldes', 'Factures récurrentes (SEO, maintenance)', 'Suivi : brouillon, envoyée, payée, en retard']} />
}
