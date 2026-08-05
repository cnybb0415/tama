import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'

const MAX_LEN = 1000
const PAGE_SIZE = 20

async function getAuthUser() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// user_metadata.username은 유저 본인이 Supabase Auth API로 직접 바꿔 admin을 사칭할 수
// 있어서 admin 판별엔 못 씀 — profiles.username(가입 트리거로만 채워지고 유저는 못 고침)으로 확인
async function isAdminUser(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('username').eq('id', userId).single()
  return data?.username === 'admin'
}

// 문의 제출 — 로그인한 유저 누구나
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 도배성 반복 제출을 막기 위한 계정당 제한
  if (!rateLimit(`feedback:${user.id}`, 5, 10 * 60 * 1000))
    return NextResponse.json({ error: 'Too many submissions' }, { status: 429 })

  let body: { message?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const message = (body.message ?? '').trim()
  if (!message || message.length > MAX_LEN)
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 })

  // user_metadata.username은 유저가 직접 고칠 수 있어(다른 유저 사칭 가능) 표시용으로도
  // 안 씀 — profiles.username(가입 트리거로만 채워짐)을 그대로 신뢰
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('username').eq('id', user.id).single()
  const username = profile?.username ?? user.email?.split('@')[0] ?? '?'

  // 쓰기는 admin client(service role)로만 — user_id/username은 서버가 세션에서 직접 채움
  const { error } = await admin.from('feedback').insert({
    user_id: user.id,
    username,
    message,
  })

  if (error) return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// 문의 목록 — 관리자만, 페이지당 PAGE_SIZE개
// filter=all(기본, 대기중이 위 처리완료가 아래) | pending | resolved
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || !(await isAdminUser(user.id))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pageParam = Number(req.nextUrl.searchParams.get('page') ?? '1')
  const requestedPage = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1
  const filter = req.nextUrl.searchParams.get('filter') ?? 'all'

  const admin = createAdminClient()
  const buildQuery = () => {
    let query = admin.from('feedback').select('id, username, message, resolved, created_at', { count: 'exact' })
    if (filter === 'pending') query = query.eq('resolved', false)
    else if (filter === 'resolved') query = query.eq('resolved', true)
    return query
  }

  // 총 개수를 먼저 확인해서 페이지를 범위 안으로 맞춤 — 안 그러면 마지막 페이지 너머로
  // 요청했을 때(예: 처리 상태 변경으로 총 개수가 줄어든 경우) PostgREST가 416을 던짐
  const { count: total, error: countError } = await buildQuery().range(0, 0)
  if (countError) return NextResponse.json({ error: 'DB error' }, { status: 500 })

  const totalPages = Math.max(1, Math.ceil((total ?? 0) / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // 대기중(false)이 위로, 처리완료(true)가 아래로 오도록 정렬 — 각 그룹 안에서는 최신순
  const { data, error } = await buildQuery()
    .order('resolved', { ascending: true })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })
  return NextResponse.json({ items: data ?? [], total: total ?? 0, page, pageSize: PAGE_SIZE })
}

// 처리 상태 토글 — 관리자만
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || !(await isAdminUser(user.id))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { id?: string; resolved?: boolean }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  if (!body.id || typeof body.resolved !== 'boolean')
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('feedback').update({ resolved: body.resolved }).eq('id', body.id)

  if (error) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// 문의 삭제 — 관리자만
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || !(await isAdminUser(user.id))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { id?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  if (!body.id) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('feedback').delete().eq('id', body.id)

  if (error) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
