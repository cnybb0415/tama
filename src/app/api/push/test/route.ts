import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWebPush, toPushSubscription, type PushSubscriptionRow } from '@/lib/push'

// 실제 배고픔/아픔/미접속 조건과 무관하게, 지금 로그인한 유저의 구독으로
// 바로 테스트 알림을 보내서 푸시 파이프라인(VAPID/구독/서비스워커) 자체가
// 정상 동작하는지 즉시 확인할 수 있게 하는 엔드포인트
export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })
  if (!subs || subs.length === 0)
    return NextResponse.json({ error: 'No subscription registered' }, { status: 404 })

  const webpush = getWebPush()
  let sent = 0
  const errors: string[] = []

  for (const sub of subs as PushSubscriptionRow[]) {
    try {
      await webpush.sendNotification(
        toPushSubscription(sub),
        JSON.stringify({ title: '다마고치', body: '테스트 알림이에요 🔔', url: '/select' }),
      )
      sent++
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode
      if (statusCode === 404 || statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id)
      }
      errors.push(String((err as { message?: string })?.message ?? err))
    }
  }

  if (sent === 0) return NextResponse.json({ error: errors[0] ?? 'Send failed' }, { status: 500 })
  return NextResponse.json({ ok: true, sent })
}
