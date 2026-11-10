'use client'
import { api, ApiError } from './api'
import { isSitePath, SITE_MAX_FILE, SITE_MAX_FILES, SITE_MAX_TOTAL, SITE_MIME, siteExt } from '../shared/site'

export interface SiteFile { path: string; file: File }
export interface PickedSite { files: SiteFile[]; size: number; skipped: string[]; title: string }

const junk = (p: string) => p.split('/').some((s) => s === '__MACOSX' || s === 'node_modules' || s.startsWith('.')) || /(^|\/)(Thumbs\.db|desktop\.ini)$/i.test(p)

function readEntries(reader: FileSystemDirectoryReader) {
  return new Promise<FileSystemEntry[]>((ok, ko) => reader.readEntries(ok, ko))
}
async function walk(entry: FileSystemEntry, out: SiteFile[]) {
  if (entry.isFile) {
    const file = await new Promise<File>((ok, ko) => (entry as FileSystemFileEntry).file(ok, ko))
    out.push({ path: entry.fullPath.replace(/^\/+/, ''), file })
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    // readEntries rend les fichiers par lots : il faut rappeler jusqu'à obtenir une liste vide
    for (let batch = await readEntries(reader); batch.length; batch = await readEntries(reader))
      for (const e of batch) await walk(e, out)
  }
}

/** Fichiers et dossiers glissés. Les entrées sont lues avant tout await : le navigateur les invalide ensuite. */
export async function filesFromDrop(dt: DataTransfer) {
  const entries = [...dt.items].map((i) => i.webkitGetAsEntry()).filter((e): e is FileSystemEntry => !!e)
  const out: SiteFile[] = []
  for (const e of entries) await walk(e, out)
  return out
}

export const filesFromInput = (list: FileList): SiteFile[] => [...list].map((file) => ({ path: file.webkitRelativePath || file.name, file }))

/** Retire le dossier englobant : mon-site/index.html devient index.html. */
function stripRoot(files: SiteFile[]) {
  let list = files
  for (;;) {
    const heads = new Set(list.map((f) => (f.path.includes('/') ? f.path.split('/')[0] : '')))
    if (heads.size !== 1 || heads.has('')) return list
    list = list.map((f) => ({ ...f, path: f.path.slice(f.path.indexOf('/') + 1) }))
  }
}

/** Contrôle la sélection et repère la page d'accueil. Lève une erreur en français si le site est inutilisable. */
export async function prepareSite(raw: SiteFile[]): Promise<PickedSite> {
  const skipped: string[] = []
  let files = raw.filter((f) => {
    if (junk(f.path)) return false
    if (!SITE_MIME[siteExt(f.path)]) { skipped.push(f.path); return false }
    return true
  })
  files = stripRoot(files).filter((f) => { if (isSitePath(f.path)) return true; skipped.push(f.path); return false })
  if (!files.length) throw new Error('Aucun fichier de site reconnu (HTML, CSS, JS, images, polices).')
  const heavy = files.find((f) => f.file.size > SITE_MAX_FILE)
  if (heavy) throw new Error(`${heavy.path} dépasse 4 Mo : compressez ce fichier puis réessayez.`)
  if (files.length > SITE_MAX_FILES) throw new Error(`Trop de fichiers : ${files.length} (maximum ${SITE_MAX_FILES}).`)
  const size = files.reduce((t, f) => t + f.file.size, 0)
  if (size > SITE_MAX_TOTAL) throw new Error('Le site dépasse 60 Mo.')
  const rootHtml = files.filter((f) => !f.path.includes('/') && /\.html?$/i.test(f.path))
  let index = rootHtml.find((f) => f.path.toLowerCase() === 'index.html')
  if (!index && rootHtml.length === 1) index = rootHtml[0] // une seule page : elle devient la page d'accueil
  if (!index) throw new Error(rootHtml.length ? 'Plusieurs pages HTML sans index.html : renommez la page d’accueil en index.html.' : 'Aucune page HTML à la racine : ajoutez un fichier index.html.')
  const entry = index
  files = files.map((f) => (f === entry ? { ...f, path: 'index.html' } : f))
  const html = await entry.file.text()
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1].trim() ?? ''
  return { files, size, skipped, title }
}

/** Envoie le site fichier par fichier, puis le publie : en cas d'échec, l'ancien site reste en ligne. */
export async function uploadSite(templateId: string, files: SiteFile[], onProgress: (done: number, total: number) => void) {
  const base = `/api/templates/${templateId}/site`
  const { version } = await api<{ version: string }>('POST', base, {})
  let next = 0
  let done = 0
  const worker = async () => {
    while (next < files.length) {
      const f = files[next++]
      let r: Response
      try {
        r = await fetch(`${base}?version=${version}&path=${encodeURIComponent(f.path)}`, { method: 'PUT', credentials: 'same-origin', body: f.file })
      } catch { throw new ApiError(0, `Envoi interrompu sur ${f.path}.`) }
      if (!r.ok) {
        let msg = `Erreur ${r.status} sur ${f.path}`
        try { msg = (await r.json()).error || msg } catch { /* réponse non JSON */ }
        throw new ApiError(r.status, msg)
      }
      onProgress(++done, files.length)
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
  await api('PATCH', base, { version })
}

export const removeSite = (templateId: string) => api('DELETE', `/api/templates/${templateId}/site`)
export const fmtSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`)
