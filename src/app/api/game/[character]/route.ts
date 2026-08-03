import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CHARACTER_CONFIGS } from '@/lib/game/config'
import { validateSaveData } from '@/lib/game/validateSave'

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

  // created_at은 최초 생성 시점에 딱 한 번만 정해져야 하는 값 — 기존 세이브가 있으면
  // 그 created_at을 검증 단계에 넘겨서 강제로 고정시킴 (age도 그 기준 최대치를 못 넘게 됨)
  const { data: existing } = await admin
    .from('game_saves')
    .select('save_data')
    .eq('user_id', user.id)
    .eq('character_type', character)
    .maybeSingle()
  const existingCreatedAt = existing ? (existing.save_data as { created_at: number | null }).created_at : undefined

  // admin 계정의 디버그 STAGE 버튼은 나이를 의도적으로 앞당겨 진화를 미리보기 하므로,
  // 그 계정만 나이 잠금 검증에서 예외로 둠 (다른 검증은 admin도 동일하게 적용)
  const isAdmin = (user.user_metadata?.username as string | undefined) === 'admin'

  // 스탯 값이 게임 로직상 나올 수 있는 범위인지 검증 — 안 그러면 로그인한 본인 계정으로
  // curl을 직접 쳐서 배고픔/친밀도/나이/체중/생존여부 등을 마음대로 조작할 수 있었음
  const validated = validateSaveData(body.save, existingCreatedAt, isAdmin)
  if (!validated)
    return NextResponse.json({ error: 'Invalid save data' }, { status: 400 })

  const { error } = await admin.from('game_saves').upsert({
    user_id: user.id,          // 서버에서 확인한 user_id만 사용
    character_type: character,
    save_data: validated,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,character_type' })

  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
