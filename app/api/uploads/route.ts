import { db } from '@/lib/server/db'
import { bad, rateLimit, requireUser, route } from '@/lib/server/http'
import { collectGarbage, MAX_UPLOAD, newFileId, sniff } from '@/lib/server/templates'

export const POST = route(async (req: Request) => {
  const me = await requireUser()
  if (rateLimit('upload:' + me.id, 300, 3600e3)) throw bad('Trop d’envois, réessayez plus tard.', 429)
  const len = Number(req.headers.get('content-length') ?? 0)
  if (len > MAX_UPLOAD) throw bad('Image trop lourde (4 Mo maximum après compression).', 413)
  const buf = Buffer.from(await req.arrayBuffer())
  if (!buf.length) throw bad('Fichier vide.')
  if (buf.length > MAX_UPLOAD) throw bad('Image trop lourde (4 Mo maximum après compression).', 413)
  const mime = sniff(buf)
  if (!mime) throw bad('Format non pris en charge (WebP, JPEG ou PNG uniquement).', 415)
  const sql = await db()
  const id = newFileId()
  await sql`insert into files (id, mime, size, data) values (${id}, ${mime}, ${buf.length}, ${buf})`
  if (Math.random() < 0.05) collectGarbage(sql).catch(() => {})
  return { file: id }
})
