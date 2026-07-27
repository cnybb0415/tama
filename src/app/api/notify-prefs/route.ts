import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CHARACTER_CONFIGS } from '@/lib/game/config'

async function getAuthUser() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('muted_characters')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })
  return NextResponse.json({ muted: data?.muted_characters ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { character?: string; muted?: boolean }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { character, muted } = body
  if (!character || !CHARACTER_CONFIGS[character] || typeof muted !== 'boolean')
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profile, error: fetchError } = await admin
    .from('profiles')
    .select('muted_characters')
    .eq('id', user.id)
    .single()
  if (fetchError) return NextResponse.json({ error: 'DB error' }, { status: 500 })

  const current: string[] = profile?.muted_characters ?? []
  const next = muted
    ? [...new Set([...current, character])]
    : current.filter(c => c !== character)

  const { error } = await admin
    .from('profiles')
    .update({ muted_characters: next })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  return NextResponse.json({ muted: next })
}
