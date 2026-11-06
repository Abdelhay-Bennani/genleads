// Serveur AgenceFlow CRM : authentification, API et base de données (fichier data/db.json).
// En développement il sert aussi l'interface via Vite (rechargement à chaud).
import bcrypt from 'bcryptjs'
import { exec } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { seedData } from './seed.js'
import { registerTemplates, templateDefaults } from './templates.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')
const PROD = process.env.NODE_ENV === 'production' || process.argv.includes('--prod')
const PORT = Number(process.env.PORT) || 5173
const SESSION_DAYS = 7
const COOKIE = 'af_session'

/* ------------------------------------------------------------------ base */

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const d = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
      const merged = { users: [], sessions: [], ...seedData(), ...templateDefaults(), ...d }
      merged.settings = { ...templateDefaults().settings, ...(d.settings ?? {}) }
      return merged
    }
  } catch (e) {
    const bad = DB_FILE + '.corrompu-' + Date.now()
    fs.copyFileSync(DB_FILE, bad)
    console.error(`⚠️  db.json illisible, copie conservée dans ${bad}. Nouvelle base créée.`)
  }
  return { users: [], sessions: [], ...seedData(), ...templateDefaults() }
}
const db = loadDb()

function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = DB_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2))
  fs.renameSync(tmp, DB_FILE)
}
save()

const uid = () => crypto.randomBytes(8).toString('hex')
const now = () => new Date().toISOString()
const pub = (u) => ({ id: u.id, name: u.name, username: u.username, role: u.role, active: u.active, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt ?? null })
const norm = (s) => String(s ?? '').trim().toLowerCase()
const findUserByName = (username) => db.users.find((u) => norm(u.username) === norm(username))
const activeSupers = () => db.users.filter((u) => u.role === 'super_admin' && u.active)

/* -------------------------------------------------------------- sessions */

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((c) => c.trim().split('=')).filter(([k]) => k).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]))
}
function startSession(res, user) {
  const token = crypto.randomBytes(32).toString('hex')
  const hash = crypto.createHash('sha256').update(token).digest('hex')
  db.sessions = db.sessions.filter((s) => new Date(s.expiresAt) > new Date())
  db.sessions.push({ hash, userId: user.id, expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5).toISOString() })
  user.lastLoginAt = now()
  save()
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`)
}
function endSession(req, res) {
  const token = parseCookies(req.headers.cookie)[COOKIE]
  if (token) {
    const hash = crypto.createHash('sha256').update(token).digest('hex')
    db.sessions = db.sessions.filter((s) => s.hash !== hash)
    save()
  }
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`)
}
function currentUser(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE]
  if (!token) return null
  const hash = crypto.createHash('sha256').update(token).digest('hex')
  const s = db.sessions.find((x) => x.hash === hash && new Date(x.expiresAt) > new Date())
  const u = s && db.users.find((x) => x.id === s.userId)
  return u && u.active ? u : null
}

const auth = (req, res, next) => {
  const u = currentUser(req)
  if (!u) return res.status(401).json({ error: 'Session expirée, reconnectez-vous.' })
  req.user = u
  next()
}
const superOnly = (req, res, next) =>
  req.user.role === 'super_admin' ? next() : res.status(403).json({ error: 'Action réservée au Super Admin.' })

/* ------------------------------------------------- limitation des essais */

const attempts = new Map() // clé -> { n, until }
const isLocked = (key) => (attempts.get(key)?.until ?? 0) > Date.now()
function fail(key) {
  const a = attempts.get(key) ?? { n: 0, until: 0 }
  a.n += 1
  if (a.n >= 5) { a.until = Date.now() + 5 * 60e3; a.n = 0 }
  attempts.set(key, a)
}

function checkPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.'
  return null
}
function checkUsername(username, exceptId) {
  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username ?? '')) return "Identifiant : 3 à 30 caractères (lettres, chiffres, . _ -)."
  const other = findUserByName(username)
  if (other && other.id !== exceptId) return 'Cet identifiant est déjà utilisé.'
  return null
}

/* ------------------------------------------------------------------- app */

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '15mb' }))
const api = express.Router()

api.get('/session', (req, res) => {
  const u = currentUser(req)
  res.json({ needsSetup: db.users.length === 0, user: u ? pub(u) : null })
})

api.post('/setup', async (req, res) => {
  if (db.users.length) return res.status(409).json({ error: 'Le compte Super Admin existe déjà.' })
  const { name, username, password } = req.body ?? {}
  if (!String(name ?? '').trim()) return res.status(400).json({ error: 'Indiquez votre nom.' })
  const e = checkUsername(username) || checkPassword(password)
  if (e) return res.status(400).json({ error: e })
  const user = { id: uid(), name: String(name).trim(), username: String(username).trim(), role: 'super_admin', active: true, passwordHash: await bcrypt.hash(password, 10), createdAt: now() }
  db.users.push(user)
  startSession(res, user)
  res.json({ user: pub(user) })
})

api.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {}
  const key = norm(username) + '|' + req.ip
  if (isLocked(key)) return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 5 minutes.' })
  const u = findUserByName(username)
  const ok = u && u.active && (await bcrypt.compare(String(password ?? ''), u.passwordHash))
  if (!ok) {
    fail(key)
    return res.status(401).json({ error: u && !u.active ? 'Ce compte est désactivé.' : 'Identifiant ou mot de passe incorrect.' })
  }
  attempts.delete(key)
  startSession(res, u)
  res.json({ user: pub(u) })
})

api.post('/logout', (req, res) => { endSession(req, res); res.json({ ok: true }) })

api.post('/me/password', auth, async (req, res) => {
  const { current, next } = req.body ?? {}
  if (!(await bcrypt.compare(String(current ?? ''), req.user.passwordHash))) return res.status(400).json({ error: 'Mot de passe actuel incorrect.' })
  const e = checkPassword(next)
  if (e) return res.status(400).json({ error: e })
  req.user.passwordHash = await bcrypt.hash(next, 10)
  save()
  res.json({ ok: true })
})

/* Données métier */
api.get('/data', auth, (req, res) => {
  res.json({ prospects: db.prospects, packs: db.packs, keywords: db.keywords, users: db.users.map(pub), ...tpl.dataPayload() })
})

const validProspect = (p) => p && typeof p.id === 'string' && typeof p.company === 'string' && p.company.trim()

api.put('/prospects/:id', auth, (req, res) => {
  const p = req.body
  if (!validProspect(p) || p.id !== req.params.id) return res.status(400).json({ error: 'Prospect invalide.' })
  p.updatedAt = now()
  const i = db.prospects.findIndex((x) => x.id === p.id)
  if (i >= 0) {
    // Ne jamais perdre une entrée de journal ajoutée côté serveur (ex. choix d'un client via un lien)
    const cur = db.prospects[i]
    const ids = new Set((p.interactions ?? []).map((x) => x.id))
    const extra = (cur.interactions ?? []).filter((x) => !ids.has(x.id))
    if (extra.length) p.interactions = [...extra, ...(p.interactions ?? [])].sort((a, b) => String(b.date).localeCompare(String(a.date)))
    if ((cur.templateIdUpdatedAt ?? '') > (p.templateIdUpdatedAt ?? '')) { p.templateId = cur.templateId; p.templateIdUpdatedAt = cur.templateIdUpdatedAt }
    db.prospects[i] = p
  }
  else db.prospects.unshift(p)
  save()
  res.json(p)
})

api.post('/prospects/bulk', auth, (req, res) => {
  const list = Array.isArray(req.body) ? req.body.filter(validProspect) : []
  const ids = new Set(db.prospects.map((p) => p.id))
  const fresh = list.filter((p) => !ids.has(p.id))
  db.prospects = [...fresh, ...db.prospects]
  save()
  res.json({ added: fresh.length })
})

api.delete('/prospects/:id', auth, superOnly, (req, res) => {
  db.prospects = db.prospects.filter((p) => p.id !== req.params.id)
  save()
  res.json({ ok: true })
})

api.put('/packs', auth, superOnly, (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Liste de packs invalide.' })
  db.packs = req.body
  save()
  res.json(db.packs)
})

api.put('/keywords', auth, (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Liste de requêtes invalide.' })
  db.keywords = req.body
  save()
  res.json(db.keywords)
})

api.put('/data', auth, superOnly, (req, res) => {
  const d = req.body ?? {}
  if (!Array.isArray(d.prospects) || !Array.isArray(d.packs)) return res.status(400).json({ error: 'Sauvegarde invalide.' })
  db.prospects = d.prospects.filter(validProspect)
  db.packs = d.packs
  if (Array.isArray(d.keywords)) db.keywords = d.keywords
  save()
  res.json({ ok: true })
})

api.post('/reset', auth, superOnly, (req, res) => {
  Object.assign(db, seedData())
  save()
  res.json({ ok: true })
})

/* Utilisateurs (Super Admin) */
api.post('/users', auth, superOnly, async (req, res) => {
  const { name, username, password, role } = req.body ?? {}
  if (!String(name ?? '').trim()) return res.status(400).json({ error: 'Indiquez un nom.' })
  if (!['admin', 'super_admin'].includes(role)) return res.status(400).json({ error: 'Rôle invalide.' })
  if (db.users.some((u) => norm(u.name) === norm(name))) return res.status(400).json({ error: 'Un utilisateur porte déjà ce nom.' })
  const e = checkUsername(username) || checkPassword(password)
  if (e) return res.status(400).json({ error: e })
  const user = { id: uid(), name: String(name).trim(), username: String(username).trim(), role, active: true, passwordHash: await bcrypt.hash(password, 10), createdAt: now() }
  db.users.push(user)
  save()
  res.json(pub(user))
})

api.patch('/users/:id', auth, superOnly, async (req, res) => {
  const u = db.users.find((x) => x.id === req.params.id)
  if (!u) return res.status(404).json({ error: 'Utilisateur introuvable.' })
  const { name, username, role, active, password } = req.body ?? {}
  const losingSuper = (role !== undefined && role !== 'super_admin') || active === false
  if (u.role === 'super_admin' && u.active && losingSuper && activeSupers().length <= 1)
    return res.status(400).json({ error: 'Il doit rester au moins un Super Admin actif.' })
  if (active === false && u.id === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte.' })
  if (username !== undefined) { const e = checkUsername(username, u.id); if (e) return res.status(400).json({ error: e }) }
  if (password) { const e = checkPassword(password); if (e) return res.status(400).json({ error: e }) }
  if (role !== undefined && !['admin', 'super_admin'].includes(role)) return res.status(400).json({ error: 'Rôle invalide.' })
  if (name !== undefined) {
    const n = String(name).trim()
    if (!n) return res.status(400).json({ error: 'Le nom est obligatoire.' })
    if (db.users.some((x) => x.id !== u.id && norm(x.name) === norm(n))) return res.status(400).json({ error: 'Un utilisateur porte déjà ce nom.' })
    if (n !== u.name) {
      // les prospects référencent le nom : on répercute le renommage
      for (const p of db.prospects) {
        if (p.assignee === u.name) p.assignee = n
        for (const i of p.interactions ?? []) if (i.author === u.name) i.author = n
      }
      u.name = n
    }
  }
  if (username !== undefined) u.username = String(username).trim()
  if (role !== undefined) u.role = role
  if (active !== undefined) {
    u.active = !!active
    if (!u.active) db.sessions = db.sessions.filter((s) => s.userId !== u.id)
  }
  if (password) {
    u.passwordHash = await bcrypt.hash(password, 10)
    if (u.id !== req.user.id) db.sessions = db.sessions.filter((s) => s.userId !== u.id)
  }
  save()
  res.json(pub(u))
})

api.delete('/users/:id', auth, superOnly, (req, res) => {
  const u = db.users.find((x) => x.id === req.params.id)
  if (!u) return res.status(404).json({ error: 'Utilisateur introuvable.' })
  if (u.id === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' })
  if (u.role === 'super_admin' && u.active && activeSupers().length <= 1) return res.status(400).json({ error: 'Il doit rester au moins un Super Admin actif.' })
  db.users = db.users.filter((x) => x.id !== u.id)
  db.sessions = db.sessions.filter((s) => s.userId !== u.id)
  save()
  res.json({ ok: true })
})

const tpl = registerTemplates({
  app, api, db, save, auth, superOnly, uid, now, dataDir: DATA_DIR,
  addInteraction: (prospect, i) => {
    prospect.interactions = [{ id: uid(), date: now(), ...i }, ...(prospect.interactions ?? [])]
    prospect.updatedAt = now()
  },
})

app.use('/api', api)
app.use('/api', (req, res) => res.status(404).json({ error: 'Route inconnue.' }))

/* --------------------------------------------------------- interface web */

const server = http.createServer(app)

if (PROD) {
  const dist = path.join(ROOT, 'dist')
  app.use(express.static(dist))
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')))
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({ root: ROOT, server: { middlewareMode: true, hmr: { server } }, appType: 'spa' })
  app.use(vite.middlewares)
}

const logLine = (t) => { try { fs.appendFileSync(path.join(ROOT, 'lancer.log'), `[${now()}] ${t}\n`) } catch { /* noop */ } }
process.on('uncaughtException', (e) => { logLine('ERREUR ' + (e?.stack || e)); console.error(e); process.exit(1) })

server.on('error', (e) => {
  logLine('ERREUR_ECOUTE ' + e.code)
  if (e.code === 'EADDRINUSE') console.error(`\n❌ Le port ${PORT} est déjà utilisé : AgenceFlow est peut-être déjà ouvert dans une autre fenêtre.\n`)
  else console.error(e)
  process.exit(1)
})

server.listen(PORT, '0.0.0.0', () => {
  const lan = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address)
  logLine(`SERVEUR_OK http://localhost:${PORT} (${PROD ? 'production' : 'développement'})`)
  console.log('\n  ✅ AgenceFlow CRM est lancé\n')
  console.log(`     Sur ce PC :            http://localhost:${PORT}`)
  for (const ip of lan) console.log(`     Sur le réseau local :  http://${ip}:${PORT}`)
  console.log(`\n     Données : ${DB_FILE}`)
  console.log('     Fermez cette fenêtre pour arrêter le serveur.\n')
  if (process.env.OPEN_BROWSER) {
    const url = `http://localhost:${PORT}`
    const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`
    exec(cmd)
  }
})
