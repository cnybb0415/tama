import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { usernameToEmail } from '@/lib/authValidation'
import { rateLimit, clientIp } from '@/lib/rateLimit'

// 로그인을 서버에서 처리 — IP·아이디 단위로 시도 횟수를 제한해서, 짧은 비밀번호
// 조합을 무차별대입으로 뚫으려는 스크립트형 시도의 속도를 늦춘다.
export async function POST(req: NextRequest) {
  const ip = clientIp(req)

  let body: { username?: string; password?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const username = (body.username ?? '').trim().toLowerCase()
  const password = body.password ?? ''
  if (!username || !password)
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 400 })

  if (!rateLimit(`login-ip:${ip}`, 20, 5 * 60 * 1000) || !rateLimit(`login-user:${username}`, 5, 5 * 60 * 1000))
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  })

  if (error) return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
  return NextResponse.json({ ok: true })
}
