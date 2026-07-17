'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { useLang } from '@/hooks/useLang'
import { setLang } from '@/lib/lang'
import type { Lang } from '@/lib/lang'

const SCREEN = { left: 34.8, top: 37.0, width: 27.1, height: 29.4 }

export default function LoginPage() {
  const router = useRouter()
  const { lang, t } = useLang()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createBrowserClient()
    const email = `${username.trim().toLowerCase()}@reverxe.game`
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError('Invalid username or password')
      setLoading(false)
    } else {
      router.push('/select')
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 2,
    padding: '2px 5px',
    fontFamily: 'Galmuri9, sans-serif',
    fontSize: 9,
    color: '#fff',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    display: 'block',
  }

  return (
    <div style={{ width: '100%', maxWidth: 444, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* 언어 토글 */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 4, fontSize: 11 }}>
          {(['ko', 'en'] as Lang[]).map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
              color: lang === l ? '#9ca3af' : '#4b5563',
              fontWeight: lang === l ? 700 : 400,
            }}>{l.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative', width: '100%' }}>

        {/* 스크린 안 배경 — 게임과 동일한 background.png (하늘+구름) */}
        <div style={{
          position: 'absolute',
          left:   `${SCREEN.left}%`,
          top:    `${SCREEN.top}%`,
          width:  `${SCREEN.width}%`,
          height: `${SCREEN.height}%`,
          backgroundImage: "url('/picture/background.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 1,
        }} />

        {/* 폼 가독성을 위한 어두운 오버레이 */}
        <div style={{
          position: 'absolute',
          left:   `${SCREEN.left}%`,
          top:    `${SCREEN.top}%`,
          width:  `${SCREEN.width}%`,
          height: `${SCREEN.height}%`,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 2,
        }} />

        {/* 스크린 안 폼 */}
        <form
          onSubmit={handle}
          style={{
            position: 'absolute',
            left:   `${SCREEN.left}%`,
            top:    `${SCREEN.top}%`,
            width:  `${SCREEN.width}%`,
            height: `${SCREEN.height}%`,
            zIndex: 3,
            display: 'flex',
            flexDirection: 'column',
            padding: '5px 7px 4px',
            boxSizing: 'border-box',
            gap: 2,
            overflow: 'hidden',
          }}
        >
          <div style={{
            textAlign: 'center',
            fontFamily: 'Galmuri11, sans-serif',
            fontSize: 11,
            color: '#fff',
            letterSpacing: 1,
            lineHeight: 1,
          }}>
            REVERXE
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.25)', margin: '0 2px' }} />

          <input
            style={inputStyle}
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            required
          />

          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            style={{ ...inputStyle, letterSpacing: 2 }}
            value={password}
            onChange={e => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Password"
            autoComplete="current-password"
            required
          />

          {error && (
            <div style={{
              fontSize: 7,
              color: '#ff8888',
              fontFamily: 'Galmuri7, sans-serif',
              lineHeight: 1.2,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.88)',
              border: 'none',
              borderRadius: 2,
              color: '#111',
              fontFamily: 'Galmuri9, sans-serif',
              fontSize: 9,
              padding: '3px 0',
              width: '100%',
              cursor: loading ? 'default' : 'pointer',
              letterSpacing: 2,
              boxSizing: 'border-box',
              marginTop: 1,
            }}
          >
            {loading ? '...' : 'LOG IN'}
          </button>

        </form>

        {/* 타마고치 바디 — transparent screen으로 폼 노출, 클릭 통과 */}
        <img
          src="/picture/tamagotchi/tamagotchi.png"
          alt=""
          style={{
            width: '100%',
            display: 'block',
            position: 'relative',
            zIndex: 4,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* 회원가입 링크 */}
      <div style={{ marginTop: 14, fontSize: 12, color: '#4b5563' }}>
        {lang === 'ko' ? '계정이 없으신가요? ' : "Don't have an account? "}
        <Link href="/register" style={{ color: '#9ca3af', textDecoration: 'underline' }}>
          {lang === 'ko' ? '회원가입' : 'Sign up'}
        </Link>
      </div>
    </div>
  )
}
