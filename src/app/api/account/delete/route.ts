import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // admin client로 auth user 삭제 → CASCADE로 profiles, game_saves 자동 삭제
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)

  if (error) return NextResponse.json({ error: 'Failed to delete account.' }, { status: 500 })

  // 세션 쿠키 제거
  await supabase.auth.signOut()

  return NextResponse.json({ ok: true })
}
