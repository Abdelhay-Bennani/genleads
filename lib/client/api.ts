export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export async function api<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
  let r: Response
  try {
    r = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Vérifiez que la fenêtre AgenceFlow (lancer.bat) est toujours ouverte.')
  }
  if (!r.ok) {
    let msg = `Erreur ${r.status}`
    try { msg = (await r.json()).error || msg } catch { /* réponse non JSON */ }
    throw new ApiError(r.status, msg)
  }
  return r.json() as Promise<T>
}
