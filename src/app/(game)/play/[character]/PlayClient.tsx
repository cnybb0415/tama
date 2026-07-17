'use client'

import { useCallback, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { SaveData } from '@/lib/game/types'

const GameCanvas = dynamic(() => import('@/components/game/GameCanvas'), { ssr: false })

interface Props {
  characterType: string
  initialSave: SaveData | null
}

export default function PlayClient({ characterType, initialSave }: Props) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSave = useCallback(async (data: SaveData) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      // 직접 Supabase 대신 서버 API 라우트를 통해 저장
      // → 세션 쿠키 없는 curl 요청은 401 차단
      await fetch(`/api/game/${characterType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ save: data }),
      })
    }, 1500)
  }, [characterType])

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* 상단 고정 */}
      <div style={{ position: 'absolute', top: 20, left: 0, right: 0, textAlign: 'center' }}>
        <Link href="/select" style={{ fontSize: 12, color: '#4b5563' }}>
          ← 캐릭터 선택
        </Link>
      </div>

      {/* 중앙 — 캔버스만 */}
      <GameCanvas
        characterType={characterType}
        initialSave={initialSave}
        onSave={handleSave}
      />

      {/* 하단 고정 */}
      <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#6b7280' }}>← A/D → · S 선택 · 모바일: 버튼 터치</p>
      </div>
    </div>
  )
}
