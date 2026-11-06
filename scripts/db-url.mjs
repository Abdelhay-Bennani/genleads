// Outils communs : test d'une URL PostgreSQL et recherche du pooler Supabase (IPv4).
import postgres from 'postgres'

export async function testUrl(url, timeout = 15) {
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: timeout, onnotice: () => {} })
  try {
    const [r] = await sql`select version() as v`
    return { ok: true, version: String(r.v).split(' ').slice(0, 2).join(' ') }
  } catch (e) {
    return { ok: false, error: e.code ? `${e.code} ${e.message}` : e.message }
  } finally {
    await sql.end({ timeout: 2 }).catch(() => {})
  }
}

const REGIONS = ['eu-west-3', 'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-north-1', 'eu-central-2', 'eu-south-1', 'us-east-1', 'us-east-2',
  'us-west-1', 'us-west-2', 'ca-central-1', 'sa-east-1', 'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'me-central-1']

export const supabaseRef = (url) => {
  try {
    const u = new URL(url)
    return u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/)?.[1] ?? (u.hostname.endsWith('.pooler.supabase.com') ? u.username.split('.')[1] ?? null : null)
  } catch { return null }
}

/** Trouve l'hôte « pooler » Supabase (IPv4) de la base. port 5432 = session, 6543 = transaction (serverless). */
export async function findSupabasePooler(url, port = '5432') {
  let u
  try { u = new URL(url) } catch { return null }
  if (u.hostname.endsWith('.pooler.supabase.com')) {
    u.port = port
    u.searchParams.set('sslmode', 'require')
    const r = await testUrl(u.toString(), 10)
    return r.ok ? { url: u.toString(), version: r.version } : null
  }
  const ref = supabaseRef(url)
  if (!ref) return null
  const candidates = []
  for (const prefix of ['aws-0', 'aws-1']) for (const region of REGIONS) {
    const p = new URL(url)
    p.hostname = `${prefix}-${region}.pooler.supabase.com`
    p.port = port
    p.username = `postgres.${ref}`
    p.searchParams.set('sslmode', 'require')
    candidates.push(p.toString())
  }
  for (let i = 0; i < candidates.length; i += 8) {
    const res = await Promise.all(candidates.slice(i, i + 8).map(async (c) => ({ c, r: await testUrl(c, 8) })))
    const hit = res.find((x) => x.r.ok)
    if (hit) return { url: hit.c, version: hit.r.version }
  }
  return null
}
