import type { KeywordQuery, Pack, Prospect } from '../shared/types'

// Données initiales : packs, requêtes de prospection et les 4 prospects du Google Sheet.

export const DEFAULT_PACKS: Pack[] = [
  { id: 'pk-onepage', name: 'Pack One-Page Artisan', category: 'site', price: 750, billing: 'oneshot', active: true,
    description: '1 page responsive, formulaire de contact, SEO de base, intégration Google Maps / avis.' },
  { id: 'pk-vitrine', name: 'Pack Vitrine Pro 5 pages', category: 'site', price: 1400, billing: 'oneshot', active: true,
    description: 'Accueil, Services, Réalisations/Galerie, À propos, Contact, SEO local optimisé.' },
  { id: 'pk-refonte', name: 'Pack Refonte Moderne', category: 'site', price: 950, billing: 'oneshot', active: true,
    description: 'Modernisation UI/UX, migration de contenu, optimisation vitesse mobile & conversion.' },
  { id: 'pk-ecom', name: 'Pack E-commerce Starter', category: 'site', price: 2200, billing: 'oneshot', active: true,
    description: 'Boutique en ligne clé en main : catalogue, paiement en ligne, livraison, formation.' },
  { id: 'pk-gbp', name: 'Pack Google Business & SEO Local', category: 'seo', price: 350, billing: 'oneshot', active: true,
    description: 'Création/optimisation Google Business Profile, photos, catégories, citations locales.' },
  { id: 'pk-seo', name: 'Abonnement SEO Mensuel Artisan', category: 'seo', price: 290, billing: 'monthly', active: true,
    description: 'Optimisation on-page, netlinking local, articles/pages locales, rapport mensuel.' },
  { id: 'pk-maint', name: 'Maintenance Essentielle', category: 'maintenance', price: 39, billing: 'monthly', active: true,
    description: 'Sauvegardes hebdomadaires, mises à jour CMS/extensions, monitoring de sécurité.' },
  { id: 'pk-serenite', name: 'Maintenance Sérénité & Modifications', category: 'maintenance', price: 79, billing: 'monthly', active: true,
    description: 'Sauvegardes quotidiennes, support prioritaire, 1 h de modifications de contenu par mois.' },
]

let k = 0
const kw = (category: KeywordQuery['category'], label: string, query: string): KeywordQuery => ({ id: `kw-${++k}`, category, label, query })

export const DEFAULT_KEYWORDS: KeywordQuery[] = [
  kw('artisans', 'Recherche simple', '{secteur} {ville}'),
  kw('artisans', 'Dépannage / urgence', '{secteur} dépannage urgence {ville}'),
  kw('artisans', 'Devis gratuit', 'artisan {secteur} {ville} devis gratuit'),
  kw('artisans', 'Avis clients', 'meilleur {secteur} {ville} avis'),
  kw('artisans', 'Annuaire PagesJaunes', 'site:pagesjaunes.fr {secteur} {ville}'),
  kw('dorks', 'Uniquement une page Facebook', 'site:facebook.com "{secteur}" "{ville}"'),
  kw('dorks', 'Site Wix gratuit', 'site:wixsite.com "{secteur}" "{ville}"'),
  kw('dorks', 'Site Jimdo gratuit', 'site:jimdofree.com "{secteur}" "{ville}"'),
  kw('dorks', 'Footer ancien (© 2015-2018)', '"{secteur}" "{ville}" ("© 2015" OR "© 2016" OR "© 2017" OR "© 2018")'),
  kw('dorks', 'Site en construction', '"{secteur}" "{ville}" "site en construction"'),
  kw('dorks', 'Nouvelles entreprises', 'site:societe.com "{secteur}" "{ville}"'),
  kw('agences', 'Agences web locales', 'agence web {ville}'),
  kw('agences', 'Sous-traitance', 'agence web {ville} "sous-traitance"'),
  kw('agences', 'Marque blanche', '"agence" "marque blanche" site internet {ville}'),
  kw('agences', 'Agences de communication', 'agence de communication {ville}'),
  kw('ecommerce', 'Boutique en ligne locale', '"boutique en ligne" {secteur} {ville}'),
  kw('ecommerce', 'Click & collect', '{secteur} {ville} "click and collect"'),
  kw('ecommerce', 'Producteurs / vente directe', 'producteur local {ville} "vente directe"'),
  kw('ecommerce', 'Boutiques Shopify', 'site:myshopify.com "{ville}"'),
]

const base = (p: Partial<Prospect> & { id: string; company: string }): Prospect => {
  const now = new Date().toISOString()
  return {
    contact: '', phone: '', email: '', city: '', postalCode: '', sectors: [], activity: '', hasWebsite: false, url: '',
    need: '', budget: null, assignee: null, status: 'a_contacter', nextFollowUp: null, interactions: [], packIds: [],
    discount: 0, source: 'Google Sheets', createdAt: now, updatedAt: now, ...p,
  }
}

export const seedProspects = (): Prospect[] => [
  base({ id: 'seed-smatec', company: 'Smatec', hasWebsite: true, url: 'https://www.smatec.fr/', phone: '04 42 70 30 70',
    email: 'smatec.jjb@aubagne-smatec.fr', city: 'Aubagne', need: 'Refonte', sectors: ['Chauffage'], activity: 'Dépannage de chaudière' }),
  base({ id: 'seed-intramuros', company: 'Intramuros', hasWebsite: true, url: 'https://www.intramuros-enr.fr/', phone: '06 07 27 96 64',
    email: 'contact@intramuros-enr.fr', city: 'Marseille', sectors: ['Climatisation', 'Chauffage'],
    activity: 'Installation, entretien, dépannage de climatisations et pompes à chaleur' }),
  base({ id: 'seed-ambiance', company: 'Ambiance botanique', hasWebsite: true, url: 'https://www.ambiance-botanique.com/',
    phone: '06 20 25 77 07, 02 99 92 80 07', city: 'Goven', sectors: ['Paysagiste'],
    activity: 'Accompagne tous les projets paysagers, étude et plan, entretien' }),
  base({ id: 'seed-rlefebvre', company: 'RLefebvre Plomberie', hasWebsite: true, url: 'https://rlefebvre-plombrie.fr/', phone: '07 62 71 15 10',
    email: 'rlefebvre.plomberie@gmail.com', city: 'Montpellier', sectors: ['Plomberie', 'Chauffage', 'Salle de bain'],
    activity: 'Plomberie, chauffage, salle de bain' }),
]

export const DEFAULT_CATEGORIES = [
  'Chauffage', 'Plomberie', 'Climatisation', 'Électricité', 'Paysagiste', 'BTP / Construction', 'Architecture',
  'Rénovation', 'Automobile', 'Restaurant', 'Hôtel / Tourisme', 'E-commerce', 'Site vitrine', 'Landing Page', 'Autres',
].map((name, i) => ({ id: `cat-${i + 1}`, name, builtin: true }))

export const DEFAULT_SETTINGS = {
  agencyName: 'AgenceFlow', agencyTagline: 'Création de sites web pour artisans et PME', logoFile: null as string | null,
  publicBaseUrl: '', contactEmail: '', contactPhone: '',
  legalName: '', address: '', postalCode: '', city: '', siret: '', vatNumber: '',
  vatRate: 20, iban: '', bic: '', quoteValidityDays: 30,
  paymentTerms: '30 % d’acompte à la signature, solde à la mise en ligne. Abonnements payables mensuellement.',
  quoteNotes: 'Délai indicatif : 2 à 3 semaines après réception de vos contenus.',
  invoiceDueDays: 30,
  invoiceNotes: 'En cas de retard de paiement : pénalités au taux de 3 fois le taux d’intérêt légal et indemnité forfaitaire pour frais de recouvrement de 40 €. Pas d’escompte pour paiement anticipé.',
}
