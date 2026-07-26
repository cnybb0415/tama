import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'
import { USERNAME_RE, PASSWORD_RE, usernameToEmail } from '@/lib/authValidation'
import { rateLimit, clientIp } from '@/lib/rateLimit'

// 회원가입을 서버에서 처리 — Supabase의 "이미 가입된 이메일" 에러를 클라이언트에
// 그대로 노출하면 아이디 존재 여부가 그대로 드러나는 enumeration이 되므로,
// 성공/실패 이유와 무관하게 항상 같은 에러만 반환한다.
export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  if (!rateLimit(`register:${ip}`, 8, 10 * 60 * 1000))
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })

  let body: { username?: string; password?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const username = (body.username ?? '').trim().toLowerCase()
  const password = body.password ?? ''

  if (!USERNAME_RE.test(username) || !PASSWORD_RE.test(password))
    return NextResponse.json({ error: 'Invalid username or password format' }, { status: 400 })

  const admin = createAdminClient()
  const { error: createError } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { username },
  })

  // 실패 사유(이미 존재/기타 오류)를 구분해서 알려주지 않음 — 항상 동일한 메시지
  if (createError) return NextResponse.json({ error: 'Sign up failed' }, { status: 400 })

  // 가입 직후 바로 로그인 상태로 만들어줌 (세션 쿠키는 서버 클라이언트가 응답에 실어 보냄)
  const supabase = await createServerClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  })
  if (signInError) return NextResponse.json({ ok: true, needsLogin: true })

  return NextResponse.json({ ok: true })
}
