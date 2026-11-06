// Module « Mes Maquettes » : bibliothèque de maquettes, images, présentations partageables.
//
// Collections stockées dans data/db.json (équivalent des tables demandées) :
//   templateCategories        → template_categories
//   templates                 → website_templates
//   templateImages            → template_images
//   templatePresentations     → template_presentations
//   templatePresentationItems → template_presentation_items
//   templateClientSelections  → template_client_selections
// Les fichiers images sont dans data/uploads (noms aléatoires non devinables).
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'

export const DEFAULT_CATEGORIES = [
  'Chauffage', 'Plomberie', 'Climatisation', 'Électricité', 'Paysagiste', 'BTP / Construction', 'Architecture',
  'Rénovation', 'Automobile', 'Restaurant', 'Hôtel / Tourisme', 'E-commerce', 'Site vitrine', 'Landing Page', 'Autres',
].map((name, i) => ({ id: `cat-${i + 1}`, name, builtin: true }))

export const SITE_TYPES = ['Site vitrine', 'One-page', 'Landing page', 'E-commerce', 'Blog / Magazine', 'Réservation', 'Portfolio', 'Autre']

export const templateDefaults = () => ({
  templateCategories: structuredClone(DEFAULT_CATEGORIES),
  templates: [],
  templateImages: [],
  templatePresentations: [],
  templatePresentationItems: [],
  templateClientSelections: [],
  settings: { agencyName: 'AgenceFlow', agencyTagline: 'Création de sites web pour artisans et PME', logoFile: null, publicBaseUrl: '', contactEmail: '', contactPhone: '' },
})

const MAX_UPLOAD = 6 * 1024 * 1024
const FILE_RE = /^[a-f0-9]{32}\.(webp|jpg|png)$/
const MIME = { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' }

function sniff(buf) {
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.length > 8 && buf.readUInt32BE(0) === 0x89504e47) return 'png'
  return null
}

const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const list = (v, max = 30) => (Array.isArray(v) ? v.map((x) => str(x, 80)).filter(Boolean).slice(0, max) : [])
/** N'accepte que des URL http(s) : évite les liens javascript: sur la page publique. */
export const safeUrl = (v) => {
  const s = str(v, 1000)
  if (!s) return ''
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`)
    return ['http:', 'https:'].includes(u.protocol) ? u.toString() : ''
  } catch { return '' }
}

export function registerTemplates({ app, api, db, save, auth, superOnly, uid, now, dataDir, addInteraction }) {
  const UPLOADS = path.join(dataDir, 'uploads')
  fs.mkdirSync(UPLOADS, { recursive: true })

  /* -------------------------------------------------------- images */

  api.post('/uploads', auth, express.raw({ type: ['image/*', 'application/octet-stream'], limit: MAX_UPLOAD }), (req, res) => {
    const buf = req.body
    if (!Buffer.isBuffer(buf) || !buf.length) return res.status(400).json({ error: 'Fichier vide.' })
    const ext = sniff(buf)
    if (!ext) return res.status(415).json({ error: 'Format non pris en charge (WebP, JPEG ou PNG uniquement).' })
    const file = `${crypto.randomBytes(16).toString('hex')}.${ext}`
    fs.writeFileSync(path.join(UPLOADS, file), buf)
    res.json({ file })
  })

  app.get('/uploads/:name', (req, res) => {
    const name = req.params.name
    if (!FILE_RE.test(name)) return res.status(404).end()
    const p = path.join(UPLOADS, name)
    if (!fs.existsSync(p)) return res.status(404).end()
    res.setHeader('Content-Type', MIME[name.split('.').pop()])
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    fs.createReadStream(p).pipe(res)
  })

  /** Supprime du disque les images qui ne sont plus référencées nulle part. */
  function collectGarbage() {
    const used = new Set(db.templateImages.flatMap((i) => [i.file, i.thumb]).filter(Boolean))
    if (db.settings.logoFile) used.add(db.settings.logoFile)
    const cutoff = Date.now() - 60 * 60e3 // on garde 1 h les fichiers fraîchement envoyés (formulaire en cours)
    for (const f of fs.readdirSync(UPLOADS)) {
      if (!FILE_RE.test(f) || used.has(f)) continue
      const p = path.join(UPLOADS, f)
      if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p)
    }
  }
  setInterval(() => { try { collectGarbage() } catch { /* noop */ } }, 30 * 60e3).unref()

  /* ---------------------------------------------------- catégories */

  api.post('/template-categories', auth, (req, res) => {
    const name = str(req.body?.name, 60)
    if (!name) return res.status(400).json({ error: 'Nom de catégorie requis.' })
    if (db.templateCategories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return res.status(400).json({ error: 'Cette catégorie existe déjà.' })
    const cat = { id: uid(), name, builtin: false }
    db.templateCategories.push(cat)
    save()
    res.json(cat)
  })
  api.patch('/template-categories/:id', auth, (req, res) => {
    const c = db.templateCategories.find((x) => x.id === req.params.id)
    if (!c) return res.status(404).json({ error: 'Catégorie introuvable.' })
    const name = str(req.body?.name, 60)
    if (!name) return res.status(400).json({ error: 'Nom de catégorie requis.' })
    c.name = name
    save()
    res.json(c)
  })
  api.delete('/template-categories/:id', auth, superOnly, (req, res) => {
    const used = db.templates.filter((t) => t.categoryId === req.params.id).length
    if (used) return res.status(400).json({ error: `Catégorie utilisée par ${used} maquette(s) : changez-les de catégorie d'abord.` })
    db.templateCategories = db.templateCategories.filter((x) => x.id !== req.params.id)
    save()
    res.json({ ok: true })
  })

  /* ------------------------------------------------------ maquettes */

  function cleanTemplate(b, existing) {
    const t = existing ?? { id: uid(), createdAt: now() }
    return {
      ...t,
      name: str(b.name, 120),
      categoryId: db.templateCategories.some((c) => c.id === b.categoryId) ? b.categoryId : db.templateCategories[0]?.id ?? null,
      siteType: SITE_TYPES.includes(b.siteType) ? b.siteType : 'Site vitrine',
      description: str(b.description, 3000),
      shortDescription: str(b.shortDescription, 220),
      features: list(b.features, 20),
      technologies: list(b.technologies, 20),
      tags: list(b.tags, 30),
      demoUrl: safeUrl(b.demoUrl),
      demoUrlMobile: safeUrl(b.demoUrlMobile),
      suggestedPackIds: list(b.suggestedPackIds, 10).filter((id) => db.packs.some((p) => p.id === id)),
      status: b.status === 'archived' ? 'archived' : 'active',
      coverImageId: str(b.coverImageId, 40) || null,
      updatedAt: now(),
    }
  }
  function cleanImages(templateId, imgs) {
    if (!Array.isArray(imgs)) return []
    return imgs.filter((i) => i && FILE_RE.test(i.file) && fs.existsSync(path.join(UPLOADS, i.file))).slice(0, 40).map((i, order) => ({
      id: typeof i.id === 'string' && i.id.length <= 40 ? i.id : uid(),
      templateId,
      file: i.file,
      thumb: FILE_RE.test(i.thumb ?? '') ? i.thumb : i.file,
      kind: ['desktop', 'mobile', 'other'].includes(i.kind) ? i.kind : 'desktop',
      caption: str(i.caption, 120),
      width: Number(i.width) || null,
      height: Number(i.height) || null,
      order,
    }))
  }

  api.put('/templates/:id', auth, (req, res) => {
    const b = req.body ?? {}
    if (!str(b.name)) return res.status(400).json({ error: 'Le nom de la maquette est obligatoire.' })
    const existing = db.templates.find((t) => t.id === req.params.id)
    const t = cleanTemplate({ ...b }, existing ?? { id: req.params.id, createdAt: now() })
    t.id = req.params.id
    const imgs = cleanImages(t.id, b.images)
    if (!imgs.some((i) => i.id === t.coverImageId)) t.coverImageId = imgs[0]?.id ?? null
    db.templates = existing ? db.templates.map((x) => (x.id === t.id ? t : x)) : [t, ...db.templates]
    db.templateImages = [...db.templateImages.filter((i) => i.templateId !== t.id), ...imgs]
    save()
    res.json({ template: t, images: imgs })
  })

  api.delete('/templates/:id', auth, superOnly, (req, res) => {
    const id = req.params.id
    db.templates = db.templates.filter((t) => t.id !== id)
    db.templateImages = db.templateImages.filter((i) => i.templateId !== id)
    db.templatePresentationItems = db.templatePresentationItems.filter((i) => i.templateId !== id)
    for (const p of db.prospects) if (p.templateId === id) p.templateId = null
    save()
    res.json({ ok: true })
  })

  /* --------------------------------------------------- présentations */

  api.post('/presentations', auth, (req, res) => {
    const b = req.body ?? {}
    const ids = list(b.templateIds, 24).filter((id) => db.templates.some((t) => t.id === id))
    if (!ids.length) return res.status(400).json({ error: 'Sélectionnez au moins une maquette.' })
    const prospect = b.prospectId ? db.prospects.find((p) => p.id === b.prospectId) : null
    const pres = {
      id: uid(),
      token: crypto.randomBytes(24).toString('base64url'),
      prospectId: prospect?.id ?? null,
      title: str(b.title, 120) || 'Notre sélection de maquettes',
      message: str(b.message, 1500),
      createdBy: req.user.name,
      createdAt: now(),
      revoked: false,
      revokedAt: null,
      viewCount: 0,
      lastViewedAt: null,
    }
    db.templatePresentations.unshift(pres)
    db.templatePresentationItems.push(...ids.map((templateId, order) => ({ id: uid(), presentationId: pres.id, templateId, order })))
    if (prospect) addInteraction(prospect, { type: 'Email', author: req.user.name, text: `Lien de présentation créé (${ids.length} maquette${ids.length > 1 ? 's' : ''}) : ${ids.map((id) => db.templates.find((t) => t.id === id)?.name).join(', ')}` })
    save()
    res.json(pres)
  })

  api.patch('/presentations/:id', auth, (req, res) => {
    const p = db.templatePresentations.find((x) => x.id === req.params.id)
    if (!p) return res.status(404).json({ error: 'Présentation introuvable.' })
    if (typeof req.body?.revoked === 'boolean') {
      p.revoked = req.body.revoked
      p.revokedAt = p.revoked ? now() : null
    }
    save()
    res.json(p)
  })

  api.delete('/presentations/:id', auth, superOnly, (req, res) => {
    const id = req.params.id
    db.templatePresentations = db.templatePresentations.filter((x) => x.id !== id)
    db.templatePresentationItems = db.templatePresentationItems.filter((x) => x.presentationId !== id)
    save()
    res.json({ ok: true })
  })

  /** Choix fait en interne (mode « Présentation client » en rendez-vous). */
  api.post('/presentations/select-internal', auth, (req, res) => {
    const { templateId, prospectId, message } = req.body ?? {}
    const t = db.templates.find((x) => x.id === templateId)
    const p = db.prospects.find((x) => x.id === prospectId)
    if (!t || !p) return res.status(400).json({ error: 'Maquette ou prospect introuvable.' })
    recordSelection({ presentation: null, template: t, prospect: p, clientName: '', message: str(message, 1000), source: `en rendez-vous avec ${req.user.name}` })
    save()
    res.json({ ok: true })
  })

  function recordSelection({ presentation, template, prospect, clientName, message, source }) {
    db.templateClientSelections.unshift({
      id: uid(), presentationId: presentation?.id ?? null, templateId: template.id, prospectId: prospect?.id ?? null,
      clientName, message, createdAt: now(),
    })
    if (prospect) {
      prospect.templateId = template.id
      prospect.templateIdUpdatedAt = now()
      prospect.nextFollowUp = prospect.nextFollowUp && prospect.nextFollowUp < now().slice(0, 10) ? prospect.nextFollowUp : now().slice(0, 10)
      addInteraction(prospect, {
        type: 'Note',
        author: clientName ? `${clientName} (client)` : 'Client',
        text: `⭐ Maquette choisie : « ${template.name} » (${source}).${message ? `\nMessage du client : ${message}` : ''}`,
      })
    }
  }

  /* ------------------------------------------- pages publiques (sans connexion) */

  const pub = express.Router()
  const hits = new Map()
  const limited = (key, max) => {
    const h = hits.get(key) ?? { n: 0, reset: Date.now() + 3600e3 }
    if (Date.now() > h.reset) { h.n = 0; h.reset = Date.now() + 3600e3 }
    h.n += 1
    hits.set(key, h)
    return h.n > max
  }
  const findByToken = (token) => (typeof token === 'string' && token.length >= 20 ? db.templatePresentations.find((p) => p.token === token) : null)

  pub.get('/presentations/:token', (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Robots-Tag', 'noindex, nofollow')
    if (limited('v' + req.ip, 300)) return res.status(429).json({ error: 'Trop de requêtes.' })
    const p = findByToken(req.params.token)
    if (!p) return res.status(404).json({ error: "Ce lien de présentation n'existe pas." })
    if (p.revoked) return res.status(410).json({ error: "Ce lien de présentation n'est plus actif. Contactez l'agence pour en obtenir un nouveau." })
    p.viewCount += 1
    p.lastViewedAt = now()
    save()
    const prospect = p.prospectId ? db.prospects.find((x) => x.id === p.prospectId) : null
    const items = db.templatePresentationItems.filter((i) => i.presentationId === p.id).sort((a, b) => a.order - b.order)
    const templates = items.map((i) => db.templates.find((t) => t.id === i.templateId)).filter(Boolean).map((t) => ({
      id: t.id, name: t.name, siteType: t.siteType, description: t.description, shortDescription: t.shortDescription,
      features: t.features, technologies: t.technologies, demoUrl: t.demoUrl, demoUrlMobile: t.demoUrlMobile, coverImageId: t.coverImageId,
      category: db.templateCategories.find((c) => c.id === t.categoryId)?.name ?? '',
      images: db.templateImages.filter((im) => im.templateId === t.id).sort((a, b) => a.order - b.order)
        .map(({ id, file, thumb, kind, caption, width, height }) => ({ id, file, thumb, kind, caption, width, height })),
    }))
    const s = db.settings
    res.json({
      agency: { name: s.agencyName, tagline: s.agencyTagline, logoFile: s.logoFile, email: s.contactEmail, phone: s.contactPhone },
      title: p.title, message: p.message, company: prospect?.company ?? '', contact: prospect?.contact ?? '',
      templates,
      selectedTemplateIds: db.templateClientSelections.filter((x) => x.presentationId === p.id).map((x) => x.templateId),
    })
  })

  pub.post('/presentations/:token/select', (req, res) => {
    if (limited('s' + req.ip, 30)) return res.status(429).json({ error: 'Trop de demandes, réessayez plus tard.' })
    const p = findByToken(req.params.token)
    if (!p) return res.status(404).json({ error: "Ce lien de présentation n'existe pas." })
    if (p.revoked) return res.status(410).json({ error: "Ce lien n'est plus actif." })
    const templateId = req.body?.templateId
    const ok = db.templatePresentationItems.some((i) => i.presentationId === p.id && i.templateId === templateId)
    const t = db.templates.find((x) => x.id === templateId)
    if (!ok || !t) return res.status(400).json({ error: 'Maquette invalide.' })
    if (db.templateClientSelections.filter((x) => x.presentationId === p.id).length >= 20) return res.status(429).json({ error: 'Nombre maximal de choix atteint.' })
    const prospect = p.prospectId ? db.prospects.find((x) => x.id === p.prospectId) : null
    recordSelection({ presentation: p, template: t, prospect, clientName: str(req.body?.name, 80), message: str(req.body?.message, 1000), source: 'via le lien de présentation' })
    save()
    res.json({ ok: true })
  })

  api.use('/public', pub)

  /* ---------------------------------------------------- identité agence */

  api.put('/settings', auth, superOnly, (req, res) => {
    const b = req.body ?? {}
    db.settings = {
      ...db.settings,
      agencyName: str(b.agencyName, 80) || 'AgenceFlow',
      agencyTagline: str(b.agencyTagline, 160),
      logoFile: FILE_RE.test(b.logoFile ?? '') ? b.logoFile : null,
      publicBaseUrl: safeUrl(b.publicBaseUrl).replace(/\/+$/, ''),
      contactEmail: str(b.contactEmail, 120),
      contactPhone: str(b.contactPhone, 40),
    }
    save()
    res.json(db.settings)
  })

  return {
    dataPayload: () => ({
      templateCategories: db.templateCategories, templates: db.templates, templateImages: db.templateImages,
      templatePresentations: db.templatePresentations, templatePresentationItems: db.templatePresentationItems,
      templateClientSelections: db.templateClientSelections, settings: db.settings, siteTypes: SITE_TYPES,
    }),
  }
}
