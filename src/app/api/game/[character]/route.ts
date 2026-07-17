import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CHARACTER_CONFIGS } from '@/lib/game/config'

type Params = { params: Promise<{ character: string }> }

// 인증된 유저 ID 반환, 없으면 null
async function getAuthUser() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { character } = await params
  if (!CHARACTER_CONFIGS[character])
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 읽기: 본인 데이터만 (RLS가 추가 보장)
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('game_saves')
    .select('save_data')
    .eq('user_id', user.id)
    .eq('character_type', character)
    .single()

  if (error && error.code !== 'PGRST116')
    return NextResponse.json({ error: 'DB error' }, { status: 500 })

  return NextResponse.json({ save: data?.save_data ?? null })
}

export async function POST(req: NextRequest, { params }: Params) {
  const { character } = await params
  if (!CHARACTER_CONFIGS[character])
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { save?: unknown }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body.save || typeof body.save !== 'object')
    return NextResponse.json({ error: 'Invalid save data' }, { status: 400 })

  // 쓰기: admin client (service role) 사용, user_id는 서버에서 직접 지정
  // → 클라이언트가 다른 user_id를 임의로 넣을 수 없음
  const admin = createAdminClient()
  const { error } = await admin.from('game_saves').upsert({
    user_id: user.id,          // 서버에서 확인한 user_id만 사용
    character_type: character,
    save_data: body.save,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,character_type' })

  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
