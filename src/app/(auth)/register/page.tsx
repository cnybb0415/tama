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
    <div style={{ width: '100%', maxWidth: 444, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* 상단 — 뒤로가기 + 언어 토글 */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <Link href="/login" style={{ fontSize: 12, color: '#4b5563', textDecoration: 'none' }}>
          ← {lang === 'ko' ? '로그인' : 'Log in'}
        </Link>
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
              Log in
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

      {/* 조건 + 개인정보 박스 */}
      <div style={{
        marginTop: 10,
        width: '100%',
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 4,
        boxSizing: 'border-box',
        fontFamily: 'Galmuri9, sans-serif',
        fontSize: 8,
        color: 'rgba(255,255,255,0.55)',
        lineHeight: 1.9,
      }}>
        <div style={{ marginBottom: 2 }}>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>ID</span>{'  '}{t.idRule}
        </div>
        <div style={{ marginBottom: 6 }}>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>PW</span>{'  '}{t.pwRule}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6, color: 'rgba(255,255,255,0.4)' }}>
          {t.pwNoRecover}
        </div>
        <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.28)', marginTop: 3, lineHeight: 1.6 }}>
          {t.privacyLine1}<br />
          {t.privacyLine2}
        </div>
      </div>
    </div>
  )
}
