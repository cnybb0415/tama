import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_TITLE_LEN = 100
const MAX_CONTENT_LEN = 2000

async function getAuthUser() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// user_metadata.username은 유저 본인이 바꿀 수 있어 admin 판별엔 못 씀 — profiles.username 사용
async function isAdminUser(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('username').eq('id', userId).single()
  return data?.username === 'admin'
}

// 공지/QnA 목록 — 로그인한 유저 누구나 조회 (모달로 표시하기 위함)
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('announcements')
    .select('id, title, content, title_en, content_en, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

// 영어 칸은 선택 — 비워두면 null로 저장하고, 모달에서 한국어로 대체 표시됨
function parseOptional(v: unknown, maxLen: number): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  return trimmed && trimmed.length <= maxLen ? trimmed : null
}

// 작성 — 관리자만
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || !(await isAdminUser(user.id))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { title?: string; content?: string; title_en?: string; content_en?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const title = (body.title ?? '').trim()
  const content = (body.content ?? '').trim()
  if (!title || title.length > MAX_TITLE_LEN) return NextResponse.json({ error: 'Invalid title' }, { status: 400 })
  if (!content || content.length > MAX_CONTENT_LEN) return NextResponse.json({ error: 'Invalid content' }, { status: 400 })

  const titleEn = parseOptional(body.title_en, MAX_TITLE_LEN)
  const contentEn = parseOptional(body.content_en, MAX_CONTENT_LEN)

  const admin = createAdminClient()
  const { error } = await admin.from('announcements').insert({ title, content, title_en: titleEn, content_en: contentEn })

  if (error) return NextResponse.json({ error: 'Failed to post' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// 수정 — 관리자만
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || !(await isAdminUser(user.id))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { id?: string; title?: string; content?: string; title_en?: string; content_en?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const title = (body.title ?? '').trim()
  const content = (body.content ?? '').trim()
  if (!body.id) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  if (!title || title.length > MAX_TITLE_LEN) return NextResponse.json({ error: 'Invalid title' }, { status: 400 })
  if (!content || content.length > MAX_CONTENT_LEN) return NextResponse.json({ error: 'Invalid content' }, { status: 400 })

  const titleEn = parseOptional(body.title_en, MAX_TITLE_LEN)
  const contentEn = parseOptional(body.content_en, MAX_CONTENT_LEN)

  const admin = createAdminClient()
  const { error } = await admin.from('announcements')
    .update({ title, content, title_en: titleEn, content_en: contentEn })
    .eq('id', body.id)

  if (error) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// 삭제 — 관리자만
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || !(await isAdminUser(user.id))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { id?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  if (!body.id) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('announcements').delete().eq('id', body.id)

  if (error) return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
