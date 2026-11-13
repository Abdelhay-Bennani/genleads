import 'server-only'
import crypto from 'node:crypto'

/* Copie chiffrée (AES-256-GCM) des mots de passe, lisible uniquement par le Super Admin.
   Clé : PASSWORD_SECRET si défini, sinon dérivée de DATABASE_URL. */
const key = () => crypto.createHash('sha256').update(process.env.PASSWORD_SECRET || process.env.DATABASE_URL || 'agenceflow').digest()

export function sealPassword(pw: string) {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([c.update(pw, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.')
}

export function openPassword(sealed: unknown): string | null {
  if (typeof sealed !== 'string' || !sealed) return null
  try {
    const [iv, tag, enc] = sealed.split('.').map((x) => Buffer.from(x, 'base64'))
    const d = crypto.createDecipheriv('aes-256-gcm', key(), iv)
    d.setAuthTag(tag)
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8')
  } catch { return null }
}
