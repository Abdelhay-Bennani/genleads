// Envoi du projet sur GitHub (https://github.com/Abdelhay-Bennani/genleads) depuis ce PC.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const REMOTE = process.env.GENLEADS_REMOTE || 'https://github.com/Abdelhay-Bennani/genleads.git'
const git = (args, opts = {}) => spawnSync('git', args, { encoding: 'utf8', shell: false, ...opts })
const out = (args) => (git(args).stdout ?? '').trim()
const fail = (m) => { console.log(`\n  ✖ ${m}\n`); process.exit(1) }

console.log('\n  ── Envoi sur GitHub ─────────────────────────────────────')
if (git(['--version']).status !== 0) fail('Git n’est pas installé : https://git-scm.com/download/win puis relancez.')

if (!fs.existsSync('.git')) { git(['init', '-b', 'main'], { stdio: 'inherit' }) }
if (!out(['config', 'user.name'])) git(['config', 'user.name', 'Abdelhay Bennani'])
if (!out(['config', 'user.email'])) git(['config', 'user.email', 'aracom101@gmail.com'])
git(['checkout', '-B', 'main'])

const remotes = out(['remote'])
git(remotes.split('\n').includes('origin') ? ['remote', 'set-url', 'origin', REMOTE] : ['remote', 'add', 'origin', REMOTE])

git(['add', '-A'])
// Garde-fou : aucun secret ni donnée locale ne doit partir sur GitHub
const staged = out(['diff', '--cached', '--name-only']).split('\n').concat(out(['ls-files']).split('\n')).filter(Boolean)
const leak = staged.find((f) => /(^|\/)\.env|^data\/|^\.vercel\/|lancer\.log$/.test(f))
if (leak) { git(['reset']); fail(`Fichier sensible détecté (${leak}) : envoi annulé.`) }

const msg = `AgenceFlow CRM v${JSON.parse(fs.readFileSync('package.json', 'utf8')).version} — Next.js, MUI, PostgreSQL, Mes Maquettes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Gq7HiqswFeztT4aZrYnMKS`
if (out(['status', '--porcelain'])) {
  const c = git(['commit', '-m', msg], { stdio: 'inherit' })
  if (c.status !== 0) fail('Le commit a échoué.')
} else console.log('  Aucun changement à enregistrer.')

console.log('  Connexion à GitHub (une fenêtre de connexion peut s’ouvrir la première fois)…')
const remoteHasMain = git(['ls-remote', '--exit-code', '--heads', 'origin', 'main']).status === 0
if (remoteHasMain && git(['merge-base', '--is-ancestor', 'origin/main', 'HEAD']).status !== 0) {
  git(['fetch', 'origin', 'main'], { stdio: 'inherit' })
  // Dépôt GitHub déjà initialisé (README, licence…) : on fusionne en gardant nos fichiers en cas de conflit
  const m = git(['merge', 'origin/main', '--allow-unrelated-histories', '-X', 'ours', '--no-edit'], { stdio: 'inherit' })
  if (m.status !== 0) fail('Fusion avec le dépôt GitHub impossible.')
}
const p = git(['push', '-u', 'origin', 'main'], { stdio: 'inherit' })
if (p.status !== 0) fail('L’envoi a échoué (droits d’accès au dépôt ?).')
console.log(`\n  ✅ Projet envoyé sur ${REMOTE.replace(/\.git$/, '')}\n`)
