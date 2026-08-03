'use client'

import { useEffect, useRef, useState } from 'react'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Safe)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

type Choice = 'on' | 'off' | 'muted'

interface Props {
  characterId: string
  initialMuted: boolean
  labelOn: string     // 알림 받기
  labelOff: string    // 전체 알림 받지 않기
  labelMuted: string  // 이 멤버 뮤트
  style: React.CSSProperties
}

// 커스텀 드롭다운으로 알림 상태를 고름 (네이티브 <select>는 커스텀 픽셀 폰트+이모지
// 조합에서 옵션 텍스트가 겹쳐 보이는 렌더링 문제가 있어서 직접 그리는 방식으로 교체함).
// 버튼 자체에 지금 상태가 텍스트로 그대로 보이고, 누르면 3개 옵션이 목록으로 뜸.
export default function NotificationControl({ characterId, initialMuted, labelOn, labelOff, labelMuted, style }: Props) {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [muted, setMuted] = useState(initialMuted)
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [error, setError] = useState('')
  const rootRef = useRef<HTMLSpanElement>(null)
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showError = (msg: string) => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
    setError(msg)
    errorTimeoutRef.current = setTimeout(() => setError(''), 2000)
  }

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setSupported(true)
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('click', onClickOutside)
    return () => document.removeEventListener('click', onClickOutside)
  }, [menuOpen])

  useEffect(() => {
    return () => { if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current) }
  }, [])

  if (!supported) return null

  // iOS Safari는 홈 화면에 추가해서 연 상태(standalone)가 아니면 구독 자체가 막혀있음 —
  // 이 경우 시도해봐야 계속 실패하니 미리 이유를 알려줌
  const isIosNonStandalone = () => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true
    return isIos && !isStandalone
  }

  const ensureSubscribed = async (): Promise<boolean> => {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) return true
    if (isIosNonStandalone()) {
      showError('홈 화면에 추가한 뒤 그 아이콘으로 열어서 시도해주세요 (iOS 알림 제약)')
      return false
    }
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      showError('알림 권한이 허용되지 않았어요')
      return false
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource,
    })
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    })
    return true
  }

  const setMutedPref = async (next: boolean): Promise<boolean> => {
    const res = await fetch('/api/notify-prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character: characterId, muted: next }),
    })
    return res.ok
  }

  const unsubscribeAll = async () => {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
    }
  }

  const choose = async (choice: Choice) => {
    if (busy) return
    setMenuOpen(false)
    setBusy(true)
    setError('')
    try {
      if (choice === 'off') {
        await unsubscribeAll()
        setSubscribed(false)
      } else {
        const ok = await ensureSubscribed()
        if (!ok) return
        setSubscribed(true)
        if (await setMutedPref(choice === 'muted')) setMuted(choice === 'muted')
      }
    } catch {
      // 실패 사유를 몰라서 버튼이 그냥 "멈춘 것처럼" 보이던 문제 — 최소한 뭔가
      // 잘못됐다는 건 보이게 함 (구체적 사유는 ensureSubscribed에서 먼저 처리해서
      // 여기까지 예외가 넘어오는 건 예상 못 한 실패인 경우뿐)
      showError('알림 설정 중 문제가 발생했어요')
    } finally {
      setBusy(false)
    }
  }

  const value: Choice = !subscribed ? 'off' : muted ? 'muted' : 'on'
  const icon: Record<Choice, string> = { on: '🔔', off: '🔕', muted: '🔕' }
  const label: Record<Choice, string> = { on: labelOn, off: labelOff, muted: labelMuted }

  const optionStyle: React.CSSProperties = {
    ...style, display: 'block', width: '100%', textAlign: 'left', whiteSpace: 'nowrap',
  }

  return (
    <span ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setMenuOpen(o => !o)} disabled={busy} style={style}>
        {icon[value]} {label[value]} ▾
      </button>
      {menuOpen && (
        <div style={{
          position: 'absolute', top: '120%', left: 0, zIndex: 20,
          background: 'rgba(0,0,0,0.9)', borderRadius: 4, padding: 3,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {(['on', 'off', 'muted'] as Choice[]).map(choice => (
            <button
              key={choice}
              onClick={() => choose(choice)}
              style={{ ...optionStyle, color: value === choice ? '#f9d94e' : optionStyle.color }}
            >
              {icon[choice]} {label[choice]}
            </button>
          ))}
        </div>
      )}
      {error && (
        <div style={{
          position: 'absolute', top: '120%', left: 0, zIndex: 20,
          background: 'rgba(120,20,20,0.95)', color: '#fff', borderRadius: 4,
          padding: '4px 6px', fontSize: 9, whiteSpace: 'nowrap', maxWidth: 220,
        }}>
          {error}
        </div>
      )}
    </span>
  )
}
