import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWebPush, toPushSubscription, type PushSubscriptionRow } from '@/lib/push'
import { CHARACTER_CONFIGS } from '@/lib/game/config'
import type { SaveData } from '@/lib/game/types'

export const maxDuration = 60

const HUNGER_DECAY = 30 * 60
// 알림 재발송 간격 — 이 시간 안에 이미 알렸으면 또 보내지 않음
const NOTIFY_COOLDOWN = 3 * 60 * 60
// 이만큼 접속(저장) 안 하면 "오랜만이네" 알림 대상
const INACTIVE_THRESHOLD = 8 * 60 * 60

// 알림은 배고픔/아픔/장시간 미접속, 이 세 가지 경우에만 보냄 (행복도는 제외)
function needsAttention(save: SaveData, updatedAt: string): string | null {
  const { stats } = save
  if (!stats.alive) return null

  const now = Date.now() / 1000
  const hunger = Math.max(0, stats.hunger - Math.floor((now - save.last_hunger_decay) / HUNGER_DECAY))

  if (stats.sick) return 'sick'
  if (hunger === 0) return 'hunger'
  if (now - new Date(updatedAt).getTime() / 1000 >= INACTIVE_THRESHOLD) return 'inactive'
  return null
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  // secret이 비어있으면(배포 시 env var 등록을 빠뜨린 경우) 무조건 거부 —
  // 안 그러면 "Bearer undefined" 문자열 그대로 보내는 요청에 뚫림
  if (!secret || auth !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const [{ data: saves, error: savesError }, { data: subs, error: subsError }] = await Promise.all([
    admin.from('game_saves').select('user_id, character_type, save_data, updated_at'),
    admin.from('push_subscriptions').select('*'),
  ])
  if (savesError || subsError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })

  const subsByUser = new Map<string, PushSubscriptionRow[]>()
  for (const s of subs ?? []) {
    const list = subsByUser.get(s.user_id) ?? []
    list.push(s as PushSubscriptionRow)
    subsByUser.set(s.user_id, list)
  }

  const needyByUser = new Map<string, { character: string; reason: string }[]>()
  for (const row of saves ?? []) {
    const reason = needsAttention(row.save_data as SaveData, row.updated_at as string)
    if (!reason) continue
    if (!subsByUser.has(row.user_id)) continue // 구독 안 한 유저는 계산할 필요 없음
    const list = needyByUser.get(row.user_id) ?? []
    list.push({ character: row.character_type, reason })
    needyByUser.set(row.user_id, list)
  }

  const webpush = getWebPush()
  const now = Date.now()
  let sent = 0

  for (const [userId, needy] of needyByUser) {
    const userSubs = subsByUser.get(userId) ?? []
    const freshSubs = userSubs.filter(s =>
      !s.last_notified_at || now - new Date(s.last_notified_at).getTime() > NOTIFY_COOLDOWN * 1000
    )
    if (freshSubs.length === 0) continue

    const names = needy.map(n => CHARACTER_CONFIGS[n.character]?.displayName ?? n.character)
    const reasonLabel = needy.some(n => n.reason === 'sick') ? '아파해요'
      : needy.some(n => n.reason === 'hunger') ? '배고파해요'
      : '오랫동안 못봐서 보고싶어해요'
    const body = `${names.join(', ')} — ${reasonLabel}! 만나러 가주세요 🥺`

    for (const sub of freshSubs) {
      try {
        await webpush.sendNotification(
          toPushSubscription(sub),
          JSON.stringify({ title: '다마고치', body, url: `/play/${needy[0].character}` }),
        )
        sent++
        await admin.from('push_subscriptions').update({ last_notified_at: new Date().toISOString() }).eq('id', sub.id)
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }
  }

  return NextResponse.json({ ok: true, checked: saves?.length ?? 0, notified: sent })
}
