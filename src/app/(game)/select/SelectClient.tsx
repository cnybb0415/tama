'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import AnnouncementButton from '@/components/AnnouncementButton'
import { useLang } from '@/hooks/useLang'
import { setLang } from '@/lib/lang'
import type { Lang } from '@/lib/lang'
import { CHARACTER_CONFIGS } from '@/lib/game/config'

const CHARACTERS = [
  { id: 'suho',     name: 'SUHO',     available: true },
  { id: 'ray',      name: 'LAY',      available: true },
  { id: 'chanyeol', name: 'CHANYEOL', available: true },
  { id: 'do',       name: 'D.O.',     available: true },
  { id: 'kai',      name: 'KAI',      available: true },
  { id: 'sehun',    name: 'SEHUN',    available: true },
]

// 실제 진화 상태(stage)에 맞는 썸네일 경로 — engine.ts의 이미지 로딩과 동일한 규칙
function idleImgFor(characterId: string, stage: number): string {
  const cfg = CHARACTER_CONFIGS[characterId]
  const stageCfg = cfg.stages[stage] ?? cfg.stages[0]
  const fileAnim = stageCfg.fileMap.idle ?? 'idle'
  return `${stageCfg.folder}/${stageCfg.prefix}${fileAnim}_01.png`
}

const SCREEN = { left: 34.8, top: 37.0, width: 27.1, height: 29.4 }
const BTNS = {
  left:   { left: 35.8, top: 71.4, width: 6.6, height: 8.6 },
  center: { left: 45.4, top: 74.2, width: 6.4, height: 5.8 },
  right:  { left: 54.8, top: 72.8, width: 6.8, height: 7.2 },
} as const

type BtnSide = keyof typeof BTNS

const LAST_CHARACTER_KEY = 'exo_last_character'

interface Props { username: string; stageByCharacter: Record<string, number>; isAdmin: boolean }

export default function SelectClient({ username, stageByCharacter, isAdmin }: Props) {
  const router = useRouter()
  const { lang, t } = useLang()
  const [idx, setIdx]       = useState(0)
  const [flash, setFlash]   = useState<BtnSide | null>(null)
  const [notice, setNotice] = useState('')

  // 마지막으로 플레이한 캐릭터를 기본 선택으로 — localStorage는 클라이언트에서만
  // 읽을 수 있어서 마운트 후에 반영 (SSR과 안 맞으면 하이드레이션 에러 나서 useEffect로)
  useEffect(() => {
    const saved = localStorage.getItem(LAST_CHARACTER_KEY)
    const i = CHARACTERS.findIndex(c => c.id === saved)
    if (i >= 0) setIdx(i)
  }, [])

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
      press('center', () => showNotice(t.comingSoon))
      return
    }
    localStorage.setItem(LAST_CHARACTER_KEY, char.id)
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', width: '100%' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 444 }}>

        {/* 유저명 + 언어 토글 — 타마고치 위 */}
        <div style={{ position: 'absolute', top: '2%', left: 0, right: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#fff', fontFamily: 'Galmuri9, sans-serif', background: 'rgba(0,0,0,0.45)', padding: '1px 6px', borderRadius: 3 }}>{username}</span>
          <span style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.45)', borderRadius: 3, padding: '1px 4px' }}>
            {(['ko', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px',
                fontSize: 9, fontFamily: 'Galmuri9, sans-serif',
                color: lang === l ? '#fff' : 'rgba(255,255,255,0.4)',
                fontWeight: lang === l ? 700 : 400,
              }}>{l.toUpperCase()}</button>
            ))}
          </span>
        </div>

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
          src={idleImgFor(current.id, stageByCharacter[current.id] ?? 0)}
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
            {t.comingSoon}
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
        {/* 로그아웃/탈퇴 — 타마고치 하단 */}
        <div style={{ position: 'absolute', bottom: '0.5%', left: 0, right: 0, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <p style={{ fontSize: 9, color: '#fff', margin: 0, fontFamily: 'Galmuri9, sans-serif', background: 'rgba(0,0,0,0.45)', padding: '1px 8px', borderRadius: 3 }}>{t.controls}</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(0,0,0,0.45)', padding: '2px 10px', borderRadius: 3 }}>
            <AnnouncementButton style={{ fontSize: 10, color: '#e5e7eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Galmuri9, sans-serif' }} />
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <Link href="/feedback" style={{ fontSize: 10, color: '#e5e7eb', textDecoration: 'underline', fontFamily: 'Galmuri9, sans-serif' }}>
              {t.feedbackLink}
            </Link>
            {isAdmin && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                <Link href="/admin" style={{ fontSize: 10, color: '#e5e7eb', textDecoration: 'underline', fontFamily: 'Galmuri9, sans-serif' }}>
                  {t.adminLink}
                </Link>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(0,0,0,0.45)', padding: '2px 10px', borderRadius: 3 }}>
            <button onClick={logout} style={{ fontSize: 10, color: '#e5e7eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Galmuri9, sans-serif' }}>
              {t.logout}
            </button>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            {confirmDel ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: 'Galmuri9, sans-serif' }}>
                <span style={{ color: '#fca5a5' }}>{t.deleteConfirm}</span>
                <button onClick={deleteAccount} disabled={deleting} style={{ color: '#f87171', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}>
                  {deleting ? '...' : t.confirm}
                </button>
                <button onClick={() => setConfirmDel(false)} style={{ color: '#e5e7eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {t.cancel}
                </button>
              </span>
            ) : (
              <button onClick={() => setConfirmDel(true)} style={{ fontSize: 10, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Galmuri9, sans-serif' }}>
                {t.deleteAcct}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
