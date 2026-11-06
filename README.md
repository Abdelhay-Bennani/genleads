# AgenceFlow CRM — v2 (Next.js · MUI · PostgreSQL)

CRM de l'agence : leads, journal, relances, devis, catalogue, **Mes Maquettes**, présentations clients, comptes Super Admin / Admin.
Interface basée sur le template **Dashboard de MUI**, habillage **Web3** (mode sombre par défaut, mode clair disponible).

## Lancer sur Windows

1. Node.js 20.9 ou plus (déjà installé : v24).
2. Double-cliquez sur **`lancer.bat`** (mode production, rapide) :
   - 1ʳᵉ fois : installation des dépendances (2-3 min) ;
   - il demande l'**URL PostgreSQL** (voir ci-dessous) et la teste ;
   - après chaque mise à jour, il prépare la version optimisée (1-2 min) ;
   - l'application s'ouvre sur **http://localhost:5173**.
   `dev.bat` lance le mode développement (rechargement à chaud, pour modifier le code).
3. Laissez la fenêtre noire ouverte ; fermez-la pour arrêter.

En cas de souci, `lancer.log` indique l'étape qui bloque.

## Base de données PostgreSQL (Neon ou Supabase)

1. Créez un compte gratuit sur https://neon.tech → **New project** (région Europe).
2. Copiez la **Connection string** (`postgresql://…`).
3. Collez-la quand `lancer.bat` la demande (clic droit pour coller). Elle est enregistrée dans `.env.local`.

Pour changer de base : `node scripts/setup.mjs --force`.

Au premier démarrage, les tables sont créées automatiquement et **les données de l'ancienne version
(`data/db.json` + `data/uploads`) sont importées** : comptes (mêmes mots de passe), prospects, journal, packs,
requêtes, maquettes, images et liens de présentation. Le dossier `data` peut ensuite être archivé.

## Commandes

```bash
npm install
npm run setup     # configurer / tester DATABASE_URL
npm run dev       # développement → http://localhost:5173
npm run build && npm start   # version optimisée (plus rapide au quotidien)
```

## Structure

```
app/(crm)/…            pages : dashboard, leads, clients, taches, devis, factures, paiements,
                       catalogue, maquettes, presentations, rapports, parametres
app/p/[token]          page publique de présentation (sans connexion)
app/api/…              API (auth, leads, packs, maquettes, fichiers, présentations…)
components/shell       barre latérale, en-tête, connexion, fiche lead (tiroir)
components/templates   vitrine client, partage de maquettes
components/theme       thème MUI Web3 (sombre / clair) + thème clair des pages clients
lib/server             PostgreSQL : schéma, requêtes, sessions, import de l'ancienne version
lib/shared, lib/client types, calculs, état de l'application
```

## Tables PostgreSQL

`users`, `sessions`, `leads`, `lead_interactions`, `packs`, `prospecting_queries`, `settings`, `files` (images),
`website_templates`, `template_categories`, `template_images`, `template_presentations`,
`template_presentation_items`, `template_client_selections`.

## Rôles

| | Super Admin | Admin |
| --- | :---: | :---: |
| Leads, journal, relances, devis, maquettes, présentations, prospection, CSV | ✅ | ✅ |
| Supprimer un lead / une maquette / une catégorie | ✅ | — |
| Tarifs du catalogue, identité de l'agence | ✅ | — |
| Utilisateurs (créer, désactiver, réinitialiser un mot de passe) | ✅ | — |
| Restaurer / réinitialiser les données | ✅ | — |

## Modules à venir (étape 2)

Factures, Paiements, Rapports (pages « Bientôt » déjà en place), fiche client complète.

## Mise en ligne sur Vercel

1. Double-cliquez sur **`deployer-vercel.bat`** :
   - connexion à votre compte Vercel (page web) ;
   - création du projet `agenceflow-crm` ;
   - enregistrement de `DATABASE_URL` en secret (pour Supabase, le « Transaction pooler » IPv4, port 6543, est trouvé automatiquement) ;
   - déploiement en production (serveurs à Paris, `cdg1`).
2. Ouvrez l'adresse affichée, connectez-vous, puis **Paramètres → Agence → Adresse publique** : collez l'adresse du site
   pour que les liens de présentation envoyés aux prospects pointent vers la version en ligne.
3. Après chaque mise à jour du code, relancez `deployer-vercel.bat` : une fois le build Vercel réussi, le code est aussi envoyé sur GitHub (`Abdelhay-Bennani/genleads`). `pousser-github.bat` fait uniquement l'envoi GitHub.

Le site en ligne et l'application locale partagent la même base Supabase : les données sont identiques.
Les images envoyées sont limitées à 4 Mo (après compression automatique), limite des fonctions Vercel.
