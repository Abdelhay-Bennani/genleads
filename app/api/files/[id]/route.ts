import { db, run } from '@/lib/server/db'
import { FILE_ID } from '@/lib/server/templates'

/** Images (captures, logo) : publiques mais désignées par un identifiant aléatoire de 128 bits. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!FILE_ID.test(id)) return new Response(null, { status: 404 })
  try {
    const [f] = await run`select mime, data from files where id = ${id}`
    if (!f) return new Response(null, { status: 404 })
    return new Response(new Uint8Array(f.data as Buffer), {
      headers: { 'Content-Type': f.mime as string, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
  } catch { return new Response(null, { status: 503 }) }
}
