// Déploiement d'AgenceFlow sur Vercel depuis ce PC (sans GitHub).
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { findSupabasePooler, supabaseRef, testUrl } from './db-url.mjs'

const CLI = 'vercel@64.7.0'
const run = (args, opts = {}) => spawnSync('npx', ['--yes', CLI, ...args], { stdio: 'inherit', shell: process.platform === 'win32', ...opts })
const step = (n, t) => console.log(`\n  ── Étape ${n} · ${t} ──────────────────────────────────`)
const fail = (msg) => { console.log(`\n  ✖ ${msg}\n`); process.exit(1) }

// 1. Connexion au compte Vercel
step(1, 'Connexion à Vercel')
const who = spawnSync('npx', ['--yes', CLI, 'whoami'], { encoding: 'utf8', shell: process.platform === 'win32' })
if (who.status !== 0) {
  console.log('  Une page Vercel va s’ouvrir : connectez-vous (ou créez un compte gratuit), puis revenez ici.')
  if (run(['login']).status !== 0) fail('Connexion à Vercel annulée.')
} else console.log(`  ✅ Connecté en tant que ${who.stdout.trim().split('\n').pop()}`)

// 2. Projet Vercel (la liaison peut réécrire .env.local : on préserve l'URL de la base locale)
step(2, 'Projet Vercel « agenceflow-crm »')
const readLocalUrl = () => (fs.existsSync('.env.local') ? (fs.readFileSync('.env.local', 'utf8').match(/^DATABASE_URL=(.*)$/m)?.[1] ?? '').trim() : '')
const savedUrl = readLocalUrl()
if (!fs.existsSync('.vercel/project.json')) {
  if (run(['link', '--yes', '--project', 'agenceflow-crm']).status !== 0) fail('Impossible de créer / relier le projet Vercel.')
} else console.log('  ✅ Projet déjà relié')
if (savedUrl && readLocalUrl() !== savedUrl) {
  const rest = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('DATABASE_URL=')) : []
  fs.writeFileSync('.env.local', [`DATABASE_URL=${savedUrl}`, ...rest].join('\n') + '\n')
  console.log('  ✅ URL de la base locale préservée dans .env.local')
}

// 3. Base de données
step(3, 'Base de données (DATABASE_URL)')
const local = fs.existsSync('.env.local') ? (fs.readFileSync('.env.local', 'utf8').match(/^DATABASE_URL=(.*)$/m)?.[1] ?? '').trim() : ''
if (!local) fail('Aucune base configurée : lancez d’abord lancer.bat.')
let prodUrl = local
if (supabaseRef(local)) {
  console.log('  Supabase détecté : Vercel nécessite le « Transaction pooler » (IPv4, port 6543). Recherche…')
  const pooled = await findSupabasePooler(local, '6543')
  if (!pooled) fail('Pooler Supabase introuvable. Copiez « Transaction pooler » dans Supabase → Connect, puis relancez avec : node scripts/setup.mjs --force')
  prodUrl = pooled.url
  console.log(`  ✅ Pooler OK (${pooled.version})`)
} else {
  const r = await testUrl(local)
  if (!r.ok) fail(`La base ne répond pas : ${r.error}`)
}
const add = spawnSync('npx', ['--yes', CLI, 'env', 'add', 'DATABASE_URL', 'production', '--force', '--sensitive'],
  { input: prodUrl + '\n', stdio: ['pipe', 'inherit', 'inherit'], shell: process.platform === 'win32' })
if (add.status !== 0) fail('Impossible d’enregistrer DATABASE_URL sur Vercel.')
console.log('  ✅ DATABASE_URL enregistrée sur Vercel (secret)')

// 4. Déploiement
step(4, 'Mise en ligne (2 à 4 minutes)')
const dep = spawnSync('npx', ['--yes', CLI, 'deploy', '--prod', '--yes', '--archive=tgz'], { encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'], shell: process.platform === 'win32' })
process.stdout.write(dep.stdout ?? '')
if (dep.status !== 0) fail('Le déploiement a échoué : voir les messages ci-dessus.')
const url = (dep.stdout.match(/https:\/\/[^\s]+\.vercel\.app/g) ?? []).pop()
fs.writeFileSync('vercel-url.txt', (url ?? '') + '\n')
console.log(`
  ✅ AgenceFlow est en ligne : ${url ?? '(voir ci-dessus)'}

  À faire maintenant :
   1. Ouvrez cette adresse et connectez-vous avec votre compte habituel.
   2. Paramètres → Agence → « Adresse publique » : collez l'adresse du site
      (de préférence le domaine court affiché dans Vercel, ex. https://agenceflow-crm.vercel.app).
`)

// 5. Build Vercel réussi → envoi du code sur GitHub
await import('./github-push.mjs')
