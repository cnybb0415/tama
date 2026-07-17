'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'

const CHARACTERS = [
  { id: 'suho',     name: 'SUHO',     idleImg: '/picture/exo/suho/adult/idle_01.png',     available: true },
  { id: 'ray',      name: 'LAY',      idleImg: '/picture/exo/ray/adult/idle_01.png',      available: true },
  { id: 'chanyeol', name: 'CHANYEOL', idleImg: '/picture/exo/chanyeol/adult/idle_01.png', available: true },
  { id: 'do',       name: 'D.O.',     idleImg: '/picture/exo/do/adult/idle_01.png',       available: true },
  { id: 'kai',      name: 'KAI',      idleImg: '/picture/exo/kai/adult/idle_01.png',      available: true },
  { id: 'sehun',    name: 'SEHUN',    idleImg: '/picture/exo/sehun/adult/idle_01.png',    available: true },
]

const SCREEN = { left: 34.8, top: 37.0, width: 27.1, height: 29.4 }
const BTNS = {
  left:   { left: 35.8, top: 71.4, width: 6.6, height: 8.6 },
  center: { left: 45.4, top: 74.2, width: 6.4, height: 5.8 },
  right:  { left: 54.8, top: 72.8, width: 6.8, height: 7.2 },
} as const

type BtnSide = keyof typeof BTNS

interface Props { username: string }

export default function SelectClient({ username }: Props) {
  const router = useRouter()
  const [idx, setIdx]       = useState(0)
  const [flash, setFlash]   = useState<BtnSide | null>(null)
  const [notice, setNotice] = useState('')

  const current = CHARACTERS[idx]

  const press = useCallback((side: BtnSide, action: () => void) => {
    setFlash(side)
    setTimeout(() => setFlash(null), 150)
    action()
  }, [])

  const showNotice = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(''), 2000)
  }

  const goPrev   = useCallback(() => press('left',  () => setIdx(i => (i - 1 + CHARACTERS.length) % CHARACTERS.length)), [press])
  const goNext   = useCallback(() => press('right', () => setIdx(i => (i + 1) % CHARACTERS.length)), [press])
  const goSelect = useCallback(() => {
    const char = CHARACTERS[idx]
    if (!char.available) {
      press('center', () => showNotice('Coming soon'))
      return
    }
    setFlash('center')
    router.push(`/play/${char.id}`)
  }, [idx, router, press])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') goPrev()
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') goNext()
      if (e.key === ' ' || e.key === 's' || e.key === 'S' || e.key === 'Enter') { e.preventDefault(); goSelect() }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [goPrev, goNext, goSelect])

  const [deleting, setDeleting] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const logout = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const deleteAccount = async () => {
    setDeleting(true)
    const res = await fetch('/api/account/delete', { method: 'POST' })
    if (res.ok) {
      router.push('/login')
    } else {
      const data = await res.json()
      showNotice(data.error ?? 'An error occurred.')
      setDeleting(false)
      setConfirmDel(false)
    }
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

      {/* 상단 고정 — 유저명 */}
      <div style={{ position: 'absolute', top: 20, left: 0, right: 0, textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#555' }}>
          Hello, <span style={{ color: '#111', fontWeight: 500 }}>{username}</span>! Choose your character
        </p>
      </div>

      {/* 중앙 — 타마고치만 (로그인 화면과 동일한 위치) */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 444 }}>

        {/* 스크린 안 배경 (게임 장면) */}
        <div style={{
          position: 'absolute',
          left:   `${SCREEN.left}%`,
          top:    `${SCREEN.top}%`,
          width:  `${SCREEN.width}%`,
          height: `${SCREEN.height}%`,
          backgroundImage: "url('/picture/background.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
        }} />

        {/* 캐릭터 이미지 */}
        <img
          src={current.idleImg}
          alt={current.name}
          style={{
            position: 'absolute',
            left:   `${SCREEN.left}%`,
            top:    `${SCREEN.top}%`,
            width:  `${SCREEN.width}%`,
            height: `${SCREEN.height}%`,
            objectFit: 'contain',
            imageRendering: 'pixelated',
            zIndex: 1,
            opacity: current.available ? 1 : 0.45,
            filter: current.available ? 'none' : 'grayscale(60%)',
          }}
        />

        {/* 선택 불가 표시 */}
        {!current.available && (
          <div style={{
            position: 'absolute',
            left:      `${SCREEN.left}%`,
            top:       `${SCREEN.top + SCREEN.height / 2 - 6}%`,
            width:     `${SCREEN.width}%`,
            textAlign: 'center',
            fontSize:  '9px',
            color:     'rgba(255,255,255,0.7)',
            fontFamily: '"Malgun Gothic","Apple SD Gothic Neo",sans-serif',
            zIndex: 1,
            pointerEvents: 'none',
            lineHeight: 1.4,
          }}>
            Coming Soon
          </div>
        )}

        {/* 캐릭터 이름 */}
        <div style={{
          position: 'absolute',
          left:      `${SCREEN.left}%`,
          top:       `${SCREEN.top + SCREEN.height - 4}%`,
          width:     `${SCREEN.width}%`,
          textAlign: 'center',
          fontSize:  '10px',
          color:     '#ddd',
          fontFamily: '"Malgun Gothic","Apple SD Gothic Neo",sans-serif',
          zIndex: 1,
          pointerEvents: 'none',
          lineHeight: 1,
        }}>
          {current.name}
        </div>

        {/* 인디케이터 */}
        {CHARACTERS.length > 1 && (
          <div style={{
            position: 'absolute',
            left:  `${SCREEN.left}%`,
            top:   `${SCREEN.top + 2}%`,
            width: `${SCREEN.width}%`,
            display: 'flex', justifyContent: 'center', gap: 4,
            zIndex: 1,
          }}>
            {CHARACTERS.map((c, i) => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: i === idx
                  ? (c.available ? '#fff' : 'rgba(255,255,255,0.5)')
                  : 'rgba(255,255,255,0.2)',
              }} />
            ))}
          </div>
        )}

        {/* 알림 */}
        {notice && (
          <div style={{
            position: 'absolute',
            left:      `${SCREEN.left}%`,
            top:       `${SCREEN.top + SCREEN.height / 2 + 4}%`,
            width:     `${SCREEN.width}%`,
            textAlign: 'center',
            fontSize:  '9px',
            color:     '#ffd700',
            fontFamily: '"Malgun Gothic","Apple SD Gothic Neo",sans-serif',
            zIndex: 5,
            pointerEvents: 'none',
          }}>
            {notice}
          </div>
        )}

        {/* 타마고치 바디 */}
        <img
          src="/picture/tamagotchi/tamagotchi.png"
          alt=""
          style={{
            width: '100%',
            display: 'block',
            position: 'relative',
            zIndex: 2,
          }}
        />

        {/* 투명 클릭 영역 + press 피드백 */}
        {(['left', 'center', 'right'] as const).map(side => (
          <button
            key={side}
            onClick={side === 'left' ? goPrev : side === 'right' ? goNext : goSelect}
            aria-label={side === 'center' ? 'Select' : side === 'left' ? 'Prev' : 'Next'}
            style={{
              position:   'absolute',
              left:       `${BTNS[side].left}%`,
              top:        `${BTNS[side].top}%`,
              width:      `${BTNS[side].width}%`,
              height:     `${BTNS[side].height}%`,
              background: flash === side ? 'rgba(255,220,50,0.35)' : 'transparent',
              border:     'none',
              borderRadius: '50%',
              cursor:     'pointer',
              zIndex:     4,
              transition: 'background 0.1s',
            }}
          />
        ))}
      </div>

      {/* 하단 고정 — 힌트 + 로그아웃/탈퇴 */}
      <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <p style={{ fontSize: 12, color: '#6b7280' }}>← A · S Select · D →</p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button
            onClick={logout}
            style={{ fontSize: 12, color: '#4b5563', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Log out
          </button>
          <span style={{ color: '#9ca3af' }}>·</span>
          {confirmDel ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ color: '#dc2626' }}>Delete account?</span>
              <button
                onClick={deleteAccount}
                disabled={deleting}
                style={{ color: '#ef4444', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}
              >
                {deleting ? '...' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                style={{ color: '#6b7280', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              style={{ fontSize: 12, color: '#6b7280', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Delete account
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
