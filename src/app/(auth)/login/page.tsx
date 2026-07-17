'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'

const SCREEN = { left: 34.8, top: 37.0, width: 27.1, height: 29.4 }

export default function LoginPage() {
  const router = useRouter()
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
      setError('아이디/비번 오류')
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
    <div style={{ width: '100%', maxWidth: 444 }}>
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
            padding: '8px 7px 6px',
            boxSizing: 'border-box',
            gap: 4,
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
            placeholder="아이디"
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
            placeholder="비밀번호"
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

          <div style={{ textAlign: 'center', marginTop: 'auto' }}>
            <Link
              href="/register"
              style={{
                fontSize: 8,
                fontFamily: 'Galmuri9, sans-serif',
                color: 'rgba(255,255,255,0.65)',
                textDecoration: 'none',
              }}
            >
              회원가입
            </Link>
          </div>
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
    </div>
  )
}
