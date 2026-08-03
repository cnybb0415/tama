'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

const BGM_KEY = 'exo_bgm_on'

const BgmContext = createContext<{ on: boolean; toggle: () => void } | null>(null)

// 오디오 엘리먼트는 (game) 레이아웃에서 한 번만 마운트되어 선택/플레이 화면을 오가도
// 끊기지 않고 계속 재생됨. 버튼(BgmToggleButton)은 이 context를 구독해서 원하는
// 위치(플레이 화면 상단바)에 자유롭게 배치할 수 있음.
export function BgmProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [on, setOn] = useState(false)

  // 브라우저 자동재생 정책 때문에 최초 재생은 유저 클릭이 필요함 — 이전에 켜져
  // 있었으면 재시도하고, 차단되면 조용히 꺼진 채로 둠
  useEffect(() => {
    if (localStorage.getItem(BGM_KEY) !== '1') return
    audioRef.current?.play().then(() => setOn(true)).catch(() => {})
  }, [])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (on) {
      audio.pause()
      setOn(false)
      localStorage.setItem(BGM_KEY, '0')
    } else {
      audio.play()
        .then(() => { setOn(true); localStorage.setItem(BGM_KEY, '1') })
        .catch(() => {})
    }
  }

  return (
    <BgmContext.Provider value={{ on, toggle }}>
      <audio ref={audioRef} src="/bgm.mp3" loop preload="none" />
      {children}
    </BgmContext.Provider>
  )
}

export function useBgm() {
  const ctx = useContext(BgmContext)
  if (!ctx) throw new Error('useBgm must be used within a BgmProvider')
  return ctx
}
