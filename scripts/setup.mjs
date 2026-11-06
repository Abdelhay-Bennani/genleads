// Configuration de la base PostgreSQL (Neon / Supabase) : teste l'URL de .env.local (ou la demande) et l'enregistre.
// Pour Supabase, si l'adresse directe (souvent IPv6 uniquement) ne répond pas, le « pooler » IPv4 est essayé automatiquement.
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'
import { findSupabasePooler, supabaseRef, testUrl } from './db-url.mjs'

const envFile = path.join(process.cwd(), '.env.local')
const readUrl = () => (fs.existsSync(envFile) ? (fs.readFileSync(envFile, 'utf8').match(/^DATABASE_URL=(.*)$/m)?.[1] ?? '').trim() : '')
const force = process.argv.includes('--force')

function saveUrl(url) {
  const others = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('DATABASE_URL=')) : []
  fs.writeFileSync(envFile, [`DATABASE_URL=${url}`, ...others].join('\n') + '\n')
}

const test = testUrl

async function trySupabasePooler(url) {
  if (!supabaseRef(url)) return null
  console.log('  ↻ Connexion directe impossible (souvent IPv6). Recherche du « pooler » Supabase compatible IPv4…')
  return findSupabasePooler(url, '5432')
}

async function resolve(url) {
  const r = await test(url)
  if (r.ok) return { url, version: r.version }
  const pooled = await trySupabasePooler(url)
  if (pooled) return pooled
  return { error: r.error }
}

const current = readUrl()
if (current && !force) {
  const r = await resolve(current)
  if (r.url) {
    if (r.url !== current) { saveUrl(r.url); console.log('  ✅ Pooler Supabase trouvé et enregistré dans .env.local') }
    console.log(`  ✅ Base de données joignable (${r.version}).`)
    process.exit(0)
  }
  console.log(`  ⚠️  La base configurée ne répond pas : ${r.error}`)
}

console.log(`
  ──────────────────────────────────────────────────────────────
   Configuration de la base de données PostgreSQL
  ──────────────────────────────────────────────────────────────
   Supabase : Project Settings → Database → Connection string
              (choisissez de préférence « Session pooler »)
   Neon     : Dashboard → Connection string
   Collez l'URL ci-dessous (clic droit dans cette fenêtre) puis Entrée.
`)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
for (;;) {
  const url = (await rl.question('  URL PostgreSQL : ')).trim().replace(/^psql\s+/, '').replace(/^["']|["']$/g, '')
  if (!/^postgres(ql)?:\/\//.test(url)) { console.log('  ✖ L’URL doit commencer par postgresql://'); continue }
  if (url.includes('[YOUR-PASSWORD]')) { console.log('  ✖ Remplacez [YOUR-PASSWORD] par le mot de passe de la base.'); continue }
  process.stdout.write('  Test de connexion…\n')
  const r = await resolve(url)
  if (!r.url) { console.log(`  ✖ ${r.error}\n  Vérifiez l’URL (mot de passe compris) puis réessayez.`); continue }
  saveUrl(r.url)
  console.log(`  ✅ Connexion OK (${r.version}) — enregistrée dans .env.local\n`)
  break
}
rl.close()
