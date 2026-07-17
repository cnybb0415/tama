'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { useLang } from '@/hooks/useLang'
import { setLang } from '@/lib/lang'
import type { Lang } from '@/lib/lang'

const SCREEN = { left: 34.8, top: 37.0, width: 27.1, height: 29.4 }

export default function RegisterPage() {
  const router = useRouter()
  const { lang, t } = useLang()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const validate = (): string => {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return 'Username: 3-20 chars (a-z, 0-9, _)'
    if (!/^\d{6}$/.test(password))               return 'Password: 6 digits required'
    if (password !== confirm)                     return 'Passwords do not match'
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
        setError('Username already taken')
      else
        setError('Sign up failed')
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

        {/* 뒤로가기 — 타마고치 왼쪽 위 */}
        <Link href="/login" style={{
          position: 'absolute', top: '4%', left: '3%', zIndex: 5,
          fontSize: 10, color: '#e5e7eb', textDecoration: 'none',
          fontFamily: 'Galmuri9, sans-serif',
          background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 3,
        }}>
          ← {lang === 'ko' ? '로그인' : 'Login'}
        </Link>

        {/* 언어 토글 — 타마고치 오른쪽 위 */}
        <div style={{ position: 'absolute', top: '4%', right: '3%', zIndex: 5, display: 'flex', gap: 2, background: 'rgba(0,0,0,0.45)', borderRadius: 3, padding: '1px 4px' }}>
          {(['ko', 'en'] as Lang[]).map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px',
              fontSize: 10, fontFamily: 'Galmuri9, sans-serif',
              color: lang === l ? '#fff' : 'rgba(255,255,255,0.4)',
              fontWeight: lang === l ? 700 : 400,
            }}>{l.toUpperCase()}</button>
          ))}
        </div>

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
            placeholder="Confirm"
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
            {loading ? '...' : 'SIGN UP'}
          </button>

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

        {/* 조건 + 개인정보 박스 — 타마고치 하단 */}
        <div style={{
          position: 'absolute',
          bottom: '2%',
          left: '5%', right: '5%',
          zIndex: 5,
          padding: '5px 8px',
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 3,
          fontFamily: 'Galmuri9, sans-serif',
          fontSize: 7,
          color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.7,
        }}>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>ID</span>{' '}{t.idRule}
          {'  '}
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>PW</span>{' '}{t.pwRule}
          <br />
          <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 6 }}>{t.pwNoRecover} · {t.privacyLine2}</span>
        </div>
      </div>
    </div>
  )
}
