'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'

const SCREEN = { left: 34.8, top: 37.0, width: 27.1, height: 29.4 }

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const validate = (): string => {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return '영문/숫자/_ 3~20자'
    if (!/^\d{6}$/.test(password))               return '숫자 6자리 필요'
    if (password !== confirm)                     return '비번 불일치'
    return ''
  }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setError(''); setLoading(true)

    const supabase = createBrowserClient()
    const email = `${username.trim().toLowerCase()}@reverxe.game`
    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.trim().toLowerCase() } },
    })

    if (signUpErr) {
      if (signUpErr.message.includes('already registered'))
        setError('이미 사용 중인 아이디')
      else
        setError('가입 오류')
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

        {/* 스크린 안 배경 — background.png (하늘+구름) */}
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

        {/* 어두운 오버레이 */}
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
            padding: '6px 7px 5px',
            boxSizing: 'border-box',
            gap: 3,
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
            placeholder="아이디 (영문/숫자/_)"
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
            placeholder="비밀번호 (숫자 6자리)"
            autoComplete="new-password"
            required
          />

          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            style={{ ...inputStyle, letterSpacing: 2 }}
            value={confirm}
            onChange={e => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="비밀번호 확인"
            autoComplete="new-password"
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
              letterSpacing: 1,
              boxSizing: 'border-box',
              marginTop: 1,
            }}
          >
            {loading ? '...' : '가입하기'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 'auto' }}>
            <Link
              href="/login"
              style={{
                fontSize: 8,
                fontFamily: 'Galmuri9, sans-serif',
                color: 'rgba(255,255,255,0.65)',
                textDecoration: 'none',
              }}
            >
              로그인
            </Link>
          </div>
        </form>

        {/* 타마고치 바디 */}
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

      {/* 비밀번호 안내 + 개인정보 */}
      <div style={{
        marginTop: 10,
        padding: '0 12px',
        textAlign: 'center',
        fontFamily: 'Galmuri9, sans-serif',
        fontSize: 8,
        color: 'rgba(255,255,255,0.55)',
        lineHeight: 1.9,
      }}>
        <div>⚠ 비밀번호를 잊어버리면 복구가 불가능합니다</div>
        <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
          수집 항목: 아이디, 비밀번호 · 목적: 서비스 이용 · 보관: 탈퇴 시 삭제
        </div>
      </div>
    </div>
  )
}
