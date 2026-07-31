import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const sub = body.subscription
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth)
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })

  const admin = createAdminClient()

  // 이 endpoint가 이미 "다른" 계정 소유면, 그 이전 구독은 지우고 새로 등록 —
  // 소유권 이전이 upsert로 조용히 일어나지 않고 명시적으로 처리되게 함
  const { data: existing } = await admin
    .from('push_subscriptions')
    .select('user_id')
    .eq('endpoint', sub.endpoint)
    .maybeSingle()

  if (existing && existing.user_id !== user.id) {
    await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  }

  const { error } = await admin.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  }, { onConflict: 'endpoint' })

  if (error) return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
