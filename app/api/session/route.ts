import { NextResponse } from 'next/server'
import { db } from '@/lib/server/db'
import { currentUser, route } from '@/lib/server/http'

export const dynamic = 'force-dynamic'

export const GET = route(async () => {
  const sql = await db()
  const [{ n }] = await sql`select count(*)::int as n from users`
  const u = await currentUser()
  return NextResponse.json({ needsSetup: n === 0, user: u ? { ...u, passwordHash: undefined } : null })
})
