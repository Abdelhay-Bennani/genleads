// Importe des démos websitedemos.net (Astra Starter Templates) dans « Maquettes », avec captures et miniatures.
//
//   npm run import-demos -- https://websitedemos.net/earth-02/?customize=template https://websitedemos.net/web-agency-04/
//
// Pour chaque lien : captures avec Chrome (accueil 1440×900, page complète, mobile), masquage des boutons
// « Customize / Try Now » et du bandeau « demo store », compression WebP + miniature 640 px, puis écriture en base
// (DATABASE_URL de .env.local). Ré-exécutable : une démo déjà importée (id tpl-wd-<slug>) est mise à jour.
// Les fiches connues ci-dessous ont un nom, une catégorie et une description en français ;
// pour un nouveau lien, ces informations sont déduites du titre de la page (à retoucher ensuite dans l'appli).
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import postgres from 'postgres'
import sharp from 'sharp'

/* ---------------------------------------------------------------- fiches connues */
// slug: [nom, catégorie, type de site, description courte, tags]
const KNOWN = {
  'organic-shop-02': ['Organic Store — Épicerie bio', 'cat-12', 'E-commerce', 'Boutique en ligne de produits bio et naturels : catalogue, panier et mise en avant des best-sellers.', ['bio', 'épicerie', 'boutique', 'alimentation']],
  'clothing-store-02': ['Wardrobe — Boutique de mode', 'cat-12', 'E-commerce', 'Boutique de prêt-à-porter élégante : grandes photos, collections et produits populaires.', ['mode', 'vêtements', 'boutique', 'élégant']],
  'earth-02': ['Earth — Association nature', 'cat-15', 'Site vitrine', 'Site vitrine illustré pour association ou projet environnemental : missions, services et contact.', ['nature', 'association', 'écologie', 'illustration']],
  'clothing-store-04': ['Velora — Mode & accessoires', 'cat-12', 'E-commerce', 'Boutique de mode moderne : nouveautés, catégories homme / femme / enfant et promotions.', ['mode', 'vêtements', 'boutique', 'moderne']],
  'wellness-coach-02': ['Lumora — Coach bien-être', 'cat-13', 'Réservation', 'Site de coach bien-être et nutrition avec prise de rendez-vous, services et témoignages.', ['coach', 'bien-être', 'nutrition', 'rendez-vous']],
  'electronic-store-04': ['Tronmart — Magasin high-tech', 'cat-12', 'E-commerce', 'Boutique d’électronique et d’électroménager : recherche produits, catégories et offres du jour.', ['high-tech', 'électroménager', 'boutique', 'promotions']],
  'outdoor-adventure-02': ['Outdoor Adventure — Activités plein air', 'cat-11', 'Site vitrine', 'Site pour club ou agence d’activités en plein air : événements, galerie et inscriptions.', ['tourisme', 'aventure', 'plein air', 'événements']],
  'web-agency-04': ['Web Rocket — Agence digitale', 'cat-13', 'Site vitrine', 'Site d’agence web / design : services, références clients, portfolio et prise de rendez-vous.', ['agence', 'digital', 'design', 'moderne']],
  'love-nature-02': ['Love Nature — Voyage & nature', 'cat-11', 'Site vitrine', 'Site vitrine aux grandes photos de paysages pour tourisme, randonnée ou gîte.', ['nature', 'voyage', 'randonnée', 'photo']],
  'brandstore-02': ['DNK — Boutique de marque', 'cat-12', 'E-commerce', 'Boutique en ligne de marque : bannières promotionnelles, collections homme / femme et accessoires.', ['mode', 'marque', 'boutique', 'promotions']],
  'construction-company-02': ['Urban Nest — Entreprise de construction', 'cat-6', 'Site vitrine', 'Site d’entreprise du BTP : projets réalisés, services, années d’expérience et demande de devis.', ['BTP', 'construction', 'devis', 'artisan']],
  'electrician-company-04': ['Spark Electrical — Électricien', 'cat-4', 'Site vitrine', 'Site d’électricien avec dépannage 24/7, services, réservation d’intervention et appel direct.', ['électricité', 'dépannage', 'urgence', 'artisan']],
}

/** Catégorie / type devinés d'après le slug pour un lien inconnu. */
function guess(slug, title) {
  const rules = [
    [/shop|store|boutique|fashion|cloth/, 'cat-12', 'E-commerce'], [/electric/, 'cat-4', 'Site vitrine'], [/plumb/, 'cat-2', 'Site vitrine'],
    [/hvac|heating|air-?cond/, 'cat-3', 'Site vitrine'], [/garden|landscap|lawn/, 'cat-5', 'Site vitrine'], [/construct|build|roof/, 'cat-6', 'Site vitrine'],
    [/architect|interior/, 'cat-7', 'Site vitrine'], [/renov|repair|handyman/, 'cat-8', 'Site vitrine'], [/car|auto|garage|mechanic/, 'cat-9', 'Site vitrine'],
    [/restaurant|cafe|food|bakery|pizza/, 'cat-10', 'Réservation'], [/hotel|travel|tour|adventure|resort/, 'cat-11', 'Site vitrine'],
    [/landing|app|saas/, 'cat-14', 'Landing page'], [/portfolio|photograph/, 'cat-15', 'Portfolio'],
  ]
  const [, cat, type] = rules.find(([re]) => re.test(slug)) ?? [null, 'cat-13', 'Site vitrine']
  const name = (title.replace(/^Home\s*[-–|]\s*/i, '').trim() || slug.replace(/-\d+$/, '').replace(/-/g, ' ')).replace(/\b\w/g, (c) => c.toUpperCase())
  return [name, cat, type, `Démo ${name} (thème WordPress Astra).`, []]
}

/* ---------------------------------------------------------------- arguments */
const links = process.argv.slice(2).filter((a) => /websitedemos\.net\//.test(a))
if (!links.length) {
  console.log('Usage : npm run import-demos -- <lien websitedemos.net> [autres liens…]')
  process.exit(1)
}
const demos = [...new Map(links.map((u) => {
  const slug = new URL(u).pathname.split('/').filter(Boolean)[0]
  return [slug, { slug, url: u }]
})).values()]

const envFile = path.join(process.cwd(), '.env.local')
const dbUrl = (fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8').match(/^DATABASE_URL=(.*)$/m)?.[1] ?? '' : process.env.DATABASE_URL ?? '').trim().replace(/^["']|["']$/g, '')
if (!dbUrl) { console.error('DATABASE_URL introuvable (.env.local).'); process.exit(1) }

const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find((p) => p && fs.existsSync(p))
if (!CHROME) { console.error('Chrome ou Edge introuvable (définissez CHROME_PATH).'); process.exit(1) }

/* ---------------------------------------------------------------- captures (Chrome DevTools Protocol) */
const PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'af-demos-'))
const CSS = `#showcase-cta-entry-root,.st-customizer-cta,.woocommerce-store-notice,p.demo_store{display:none!important}
.elementor-invisible{visibility:visible!important;opacity:1!important}
.animated,[class*="animate__"]{animation:none!important;opacity:1!important}
[data-aos]{opacity:1!important;transform:none!important}
.uagb-block-animation,.uag-animated{opacity:1!important;transform:none!important}`

async function newPage() {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }); if (r.ok) return r.json() } catch { /* Chrome démarre */ }
    await sleep(200)
  }
  throw new Error('Chrome injoignable')
}

async function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
  let n = 0
  const pending = new Map(), waiters = []
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data)
    if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.j(new Error(d.error.message)) : p.r(d.result) }
    else if (d.method) for (const w of [...waiters]) if (w.m === d.method) { waiters.splice(waiters.indexOf(w), 1); w.r(d.params) }
  }
  return {
    send: (method, params = {}) => new Promise((r, j) => { const id = ++n; pending.set(id, { r, j }); ws.send(JSON.stringify({ id, method, params })) }),
    once: (m, ms = 45000) => Promise.race([new Promise((r) => waiters.push({ m, r })), sleep(ms)]),
    close: () => ws.close(),
  }
}

/** Capture PNG d'une démo : 'desktop' (1440×900), 'full' (page complète, 7000 px max) ou 'mobile' (390×844 @2x). */
async function shoot(url, kind) {
  const t = await newPage()
  const s = await cdp(t.webSocketDebuggerUrl)
  try {
    const mobile = kind === 'mobile'
    const W = mobile ? 390 : 1440, H = mobile ? 844 : 900
    await s.send('Page.enable')
    await s.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: mobile ? 2 : 1, mobile })
    if (mobile) await s.send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' })
    await s.send('Page.addScriptToEvaluateOnNewDocument', { source: `document.addEventListener('DOMContentLoaded',()=>{const st=document.createElement('style');st.textContent=${JSON.stringify(CSS)};document.head.appendChild(st)})` })
    const loaded = s.once('Page.loadEventFired')
    await s.send('Page.navigate', { url })
    await loaded
    await sleep(2500)
    // défilement : déclenche le chargement différé des images et les animations d'apparition
    await s.send('Runtime.evaluate', { awaitPromise: true, expression: '(async()=>{const h=()=>document.documentElement.scrollHeight;for(let y=0;y<h();y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,120))}scrollTo(0,0)})()' })
    await sleep(1800)
    let clip
    if (kind === 'full') {
      const { result } = await s.send('Runtime.evaluate', { expression: 'document.documentElement.scrollHeight' })
      clip = { x: 0, y: 0, width: W, height: Math.min(result.value, 7000), scale: 1 }
    }
    const title = kind === 'desktop' ? (await s.send('Runtime.evaluate', { expression: 'document.title' })).result.value : ''
    const { data } = await s.send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip, captureBeyondViewport: true } : {}) })
    return { png: Buffer.from(data, 'base64'), title }
  } finally {
    s.close()
    await fetch(`http://127.0.0.1:${PORT}/json/close/${t.id}`).catch(() => {})
  }
}

/** Même traitement que l'appli (lib/client/images.ts) : pleine taille ≤ 1600 px + miniature 640 px du haut de page (4:3). */
async function compress(png) {
  const m = await sharp(png).metadata()
  const scale = Math.min(1, 1600 / m.width, 12000 / m.height)
  const w = Math.round(m.width * scale), h = Math.round(m.height * scale)
  const full = await sharp(png).resize(w, h).webp({ quality: 82 }).toBuffer()
  const srcH = Math.min(m.height, Math.round(m.width * 0.75))
  const thumb = await sharp(png).extract({ left: 0, top: 0, width: m.width, height: srcH }).resize(Math.min(640, m.width)).webp({ quality: 80 }).toBuffer()
  return { full, thumb, w, h }
}

/* ---------------------------------------------------------------- import */
const fileId = () => crypto.randomBytes(16).toString('hex')
const sql = postgres(dbUrl, { prepare: false, max: 1, onnotice: () => {} })
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(tmp, 'profile')}`, 'about:blank'], { stdio: 'ignore' })

let ok = 0
try {
  for (const { slug, url } of demos) {
    try {
      const id = `tpl-wd-${slug}`
      const images = []
      let title = ''
      for (const [shot, kind, caption] of [['desktop', 'desktop', 'Accueil'], ['full', 'desktop', 'Page complète'], ['mobile', 'mobile', 'Version mobile']]) {
        const r = await shoot(url, shot)
        if (r.title) title = r.title
        images.push({ id: `${id}-${shot}`, kind, caption, ...(await compress(r.png)), file: fileId(), thumbFile: fileId() })
      }
      const [name, cat, type, desc, tags] = KNOWN[slug] ?? guess(slug, title)
      await sql.begin(async (tx) => {
        const old = await tx`select file_id, thumb_file_id from template_images where template_id = ${id}`
        await tx`insert into website_templates (id, name, category_id, site_type, short_description, description, features, technologies, tags, demo_url, status, cover_image_id)
          values (${id}, ${name}, ${cat}, ${type}, ${desc}, ${desc + ' Thème WordPress Astra (démo gratuite websitedemos.net), entièrement personnalisable aux couleurs du client.'},
            ${['Responsive mobile', 'Design moderne', 'Personnalisable']}, ${['WordPress', 'Astra', 'Responsive']}, ${tags}, ${url}, 'active', ${`${id}-desktop`})
          on conflict (id) do update set demo_url = excluded.demo_url, cover_image_id = excluded.cover_image_id, updated_at = now()`
        await tx`delete from template_images where template_id = ${id}`
        for (const [i, im] of images.entries()) {
          await tx`insert into files (id, mime, size, data) values (${im.file}, 'image/webp', ${im.full.length}, ${im.full})`
          await tx`insert into files (id, mime, size, data) values (${im.thumbFile}, 'image/webp', ${im.thumb.length}, ${im.thumb})`
          await tx`insert into template_images (id, template_id, file_id, thumb_file_id, kind, caption, width, height, position)
            values (${im.id}, ${id}, ${im.file}, ${im.thumbFile}, ${im.kind}, ${im.caption}, ${im.w}, ${im.h}, ${i})`
        }
        const ids = old.flatMap((r) => [r.file_id, r.thumb_file_id])
        if (ids.length) await tx`delete from files where id = any(${ids})`
      })
      ok++
      console.log(`✅ ${name}  (${slug})`)
    } catch (e) {
      console.log(`❌ ${slug} : ${e.message}`)
    }
  }
} finally {
  chrome.kill()
  await sql.end()
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
}
console.log(`\n${ok}/${demos.length} démo(s) importée(s). Une maquette déjà présente garde le nom et la description que vous lui avez donnés ; seules ses captures sont mises à jour.`)
