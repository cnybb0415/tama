import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWebPush, toPushSubscription, type PushSubscriptionRow } from '@/lib/push'
import { CHARACTER_CONFIGS } from '@/lib/game/config'
import type { SaveData } from '@/lib/game/types'

export const maxDuration = 60

const HUNGER_DECAY = 4 * 60 * 60
// 알림 재발송 간격 — 이 시간 안에 이미 알렸으면 또 보내지 않음
const NOTIFY_COOLDOWN = 3 * 60 * 60
// 이만큼 접속(저장) 안 하면 "오랜만이네" 알림 대상
const INACTIVE_THRESHOLD = 8 * 60 * 60
// user_id IN (...) 청크 크기 및 동시 발송 개수 — 유저 수가 많아져도
// 쿼리 하나·타임아웃 하나에 몰리지 않도록 나눠서 처리
const QUERY_CHUNK = 200
const SEND_CONCURRENCY = 20

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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  // secret이 비어있으면(배포 시 env var 등록을 빠뜨린 경우) 무조건 거부 —
  // 안 그러면 "Bearer undefined" 문자열 그대로 보내는 요청에 뚫림
  if (!secret || auth !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // 구독자가 없으면 알릴 대상 자체가 없으므로 구독 테이블부터 조회하고,
  // game_saves는 "구독 중인 유저 것만" 가져옴 — 유저 수가 많아져도 매번
  // 전체 게임 세이브 테이블을 풀스캔하지 않도록 함
  const { data: subs, error: subsError } = await admin.from('push_subscriptions').select('*')
  if (subsError) return NextResponse.json({ error: 'DB error' }, { status: 500 })
  if (!subs || subs.length === 0) return NextResponse.json({ ok: true, checked: 0, notified: 0 })

  const subsByUser = new Map<string, PushSubscriptionRow[]>()
  for (const s of subs) {
    const list = subsByUser.get(s.user_id) ?? []
    list.push(s as PushSubscriptionRow)
    subsByUser.set(s.user_id, list)
  }
  const subUserIds = [...subsByUser.keys()]

  const saveChunks = await Promise.all(
    chunk(subUserIds, QUERY_CHUNK).map(ids =>
      admin.from('game_saves').select('user_id, character_type, save_data, updated_at').in('user_id', ids)
    )
  )
  if (saveChunks.some(r => r.error)) return NextResponse.json({ error: 'DB error' }, { status: 500 })
  const saves = saveChunks.flatMap(r => r.data ?? [])

  const needyByUser = new Map<string, { character: string; reason: string }[]>()
  for (const row of saves) {
    const reason = needsAttention(row.save_data as SaveData, row.updated_at as string)
    if (!reason) continue
    const list = needyByUser.get(row.user_id) ?? []
    list.push({ character: row.character_type, reason })
    needyByUser.set(row.user_id, list)
  }

  const now = Date.now()
  const jobs: { sub: PushSubscriptionRow; body: string; url: string }[] = []

  for (const [userId, needy] of needyByUser) {
    const freshSubs = (subsByUser.get(userId) ?? []).filter(s =>
      !s.last_notified_at || now - new Date(s.last_notified_at).getTime() > NOTIFY_COOLDOWN * 1000
    )
    if (freshSubs.length === 0) continue

    const names = needy.map(n => CHARACTER_CONFIGS[n.character]?.displayName ?? n.character)
    const reasonLabel = needy.some(n => n.reason === 'sick') ? '아파해요'
      : needy.some(n => n.reason === 'hunger') ? '배고파해요'
      : '오랫동안 못봐서 보고싶어해요'
    const body = `${names.join(', ')} — ${reasonLabel}! 만나러 가주세요 🥺`
    for (const sub of freshSubs) jobs.push({ sub, body, url: `/play/${needy[0].character}` })
  }

  // 발송을 배치(SEND_CONCURRENCY개씩 병렬)로 나눠서 처리 — 대상이 많아져도
  // 순차 대기로 60초 타임아웃에 걸리는 걸 방지
  const webpush = getWebPush()
  let sent = 0
  const notifiedIds: string[] = []
  const expiredIds: string[] = []

  for (const batch of chunk(jobs, SEND_CONCURRENCY)) {
    await Promise.allSettled(batch.map(async ({ sub, body, url }) => {
      try {
        await webpush.sendNotification(
          toPushSubscription(sub),
          JSON.stringify({ title: '다마고치', body, url }),
        )
        sent++
        notifiedIds.push(sub.id)
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) expiredIds.push(sub.id)
      }
    }))
  }

  // DB 반영도 건별이 아니라 한 번씩 배치로 처리
  if (notifiedIds.length > 0)
    await admin.from('push_subscriptions').update({ last_notified_at: new Date().toISOString() }).in('id', notifiedIds)
  if (expiredIds.length > 0)
    await admin.from('push_subscriptions').delete().in('id', expiredIds)

  return NextResponse.json({ ok: true, checked: saves.length, notified: sent })
}
