'use client'

import { useBgm } from '@/components/BgmProvider'

export default function BgmToggleButton({ style }: { style: React.CSSProperties }) {
  const { on, toggle } = useBgm()
  return (
    <button onClick={toggle} style={style}>
      BGM {on ? '🔊' : '🔇'}
    </button>
  )
}
