import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { EVENT_END } from '@/lib/eventConfig'

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (Date.now() >= EVENT_END.getTime() && path !== '/event-ended') {
    return NextResponse.redirect(new URL('/event-ended', request.url))
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = path.startsWith('/login') || path.startsWith('/register')
  const isAdminPage = path.startsWith('/admin')
  const isGamePage = path.startsWith('/select') || path.startsWith('/play') || path.startsWith('/feedback') || isAdminPage

  if (!user && isGamePage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/select', request.url))
  }
  if (user && isAdminPage) {
    // user_metadata는 로그인한 유저 본인이 Supabase Auth API로 직접 고쳐 쓸 수 있는 값이라
    // (auth.updateUser({ data: {...} })) admin 판별에 쓰면 자기 자신을 admin으로 위장할 수
    // 있음 — profiles.username은 가입 시 트리거로만 채워지고 유저가 쓸 수 있는 update
    // 정책이 없어서(RLS 기본 거부) 위조 불가능한 값
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
    if (profile?.username !== 'admin') {
      return NextResponse.redirect(new URL('/select', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/login', '/register', '/select', '/play/:path*', '/feedback', '/admin'],
}
