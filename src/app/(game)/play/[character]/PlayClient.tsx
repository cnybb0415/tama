'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { SaveData, AnimName } from '@/lib/game/types'
import type { GameCanvasHandle } from '@/components/game/GameCanvas'
import { useLang } from '@/hooks/useLang'
import { setLang } from '@/lib/lang'
import type { Lang } from '@/lib/lang'

const GameCanvas = dynamic(() => import('@/components/game/GameCanvas'), { ssr: false })

const ANIMS: AnimName[] = ['idle', 'walk', 'happy', 'eat', 'sleep', 'sad', 'sick', 'poop', 'angry', 'special']

interface Props {
  characterType: string
  initialSave: SaveData | null
  isAdmin: boolean
}

export default function PlayClient({ characterType, initialSave, isAdmin }: Props) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gameRef = useRef<GameCanvasHandle>(null)
  const [debug, setDebug] = useState(false)
  const { lang, t } = useLang()

  const handleSave = useCallback(async (data: SaveData) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      await fetch(`/api/game/${characterType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ save: data }),
      })
    }, 1500)
  }, [characterType])

  const btn: React.CSSProperties = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 4,
    color: '#ccc',
    fontSize: 11,
    padding: '3px 8px',
    cursor: 'pointer',
    fontFamily: 'monospace',
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

      {/* 상단 */}
      <div style={{ position: 'absolute', top: 20, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Link href="/select" style={{ fontSize: 12, color: '#4b5563' }}>
          {t.characters}
        </Link>
        <span style={{ display: 'flex', gap: 4, fontSize: 11 }}>
          {(['ko', 'en'] as Lang[]).map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
              color: lang === l ? '#9ca3af' : '#4b5563',
              fontWeight: lang === l ? 700 : 400,
            }}>{l.toUpperCase()}</button>
          ))}
        </span>
        {isAdmin && (
          <button
            onClick={() => setDebug(d => !d)}
            style={{ ...btn, color: debug ? '#f9d94e' : '#4b5563', borderColor: debug ? '#f9d94e44' : 'transparent', background: 'none' }}
          >
            DEBUG
          </button>
        )}
      </div>

      {/* 캔버스 */}
      <GameCanvas
        ref={gameRef}
        characterType={characterType}
        initialSave={initialSave}
        onSave={handleSave}
      />

      {/* 디버그 패널 */}
      {debug && (
        <div style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          background: 'rgba(0,0,0,0.7)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '10px 8px',
        }}>
          {/* 스테이지 */}
          <div style={{ color: '#888', fontSize: 9, fontFamily: 'monospace', marginBottom: 2 }}>{t.stageLabel}</div>
          <button style={btn} onClick={() => gameRef.current?.debugStage(0)}>{t.kid}</button>
          <button style={btn} onClick={() => gameRef.current?.debugStage(1)}>{t.adult}</button>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }} />

          {/* 애니메이션 */}
          <div style={{ color: '#888', fontSize: 9, fontFamily: 'monospace', marginBottom: 2 }}>{t.animLabel}</div>
          {ANIMS.map(a => (
            <button key={a} style={btn} onClick={() => gameRef.current?.debugAnim(a)}>
              {a}
            </button>
          ))}
        </div>
      )}

      {/* 하단 힌트 */}
      <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#6b7280' }}>{t.ctrlsPlay}</p>
      </div>
    </div>
  )
}
