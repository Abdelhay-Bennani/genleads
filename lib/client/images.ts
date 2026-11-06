export const imgUrl = (file: string | null | undefined) => (file ? `/api/files/${file}` : '')

async function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality))
  if (webp && webp.type === 'image/webp') return webp
  const jpg = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality))
  if (!jpg) throw new Error("Impossible de compresser l'image.")
  return jpg
}

/**
 * Compresse une image dans le navigateur avant l'envoi :
 * - version pleine taille (largeur max 1600 px, hauteur max 12 000 px pour les captures pleine page)
 * - miniature 640 px recadrée sur le haut de la page (pour les cartes)
 */
export async function compressScreenshot(file: File) {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} n'est pas une image.`)
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / bmp.width, 12000 / bmp.height)
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  c.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  const full = await toBlob(c, 0.82)

  const tw = Math.min(640, bmp.width)
  const srcH = Math.min(bmp.height, bmp.width * 0.75)
  const th = Math.round(tw * (srcH / bmp.width))
  const t = document.createElement('canvas')
  t.width = tw; t.height = th
  t.getContext('2d')!.drawImage(bmp, 0, 0, bmp.width, srcH, 0, 0, tw, th)
  const thumb = await toBlob(t, 0.8)
  bmp.close()
  return { full, thumb, width: w, height: h }
}

export async function uploadBlob(blob: Blob): Promise<string> {
  let r: Response
  try {
    r = await fetch('/api/uploads', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob })
  } catch { throw new Error('Serveur injoignable pendant l’envoi de l’image.') }
  if (!r.ok) {
    let msg = `Erreur ${r.status}`
    try { msg = (await r.json()).error || msg } catch { /* noop */ }
    if (r.status === 413) msg = 'Image trop lourde (4 Mo maximum après compression).'
    throw new Error(msg)
  }
  return (await r.json()).file
}

export async function uploadScreenshot(file: File) {
  const { full, thumb, width, height } = await compressScreenshot(file)
  const [f, t] = await Promise.all([uploadBlob(full), uploadBlob(thumb)])
  return { file: f, thumb: t, width, height }
}

/** Logo : redimensionné à 400 px, PNG conservé pour la transparence. */
export async function uploadLogo(file: File) {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 400 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'))
  bmp.close()
  if (!blob) throw new Error('Logo illisible.')
  return uploadBlob(blob)
}

