'use client'

import { useEffect, useState } from 'react'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Safe)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

interface Props {
  labelOn: string
  labelOff: string
  labelTest: string
  labelTestSent: string
  labelTestFail: string
  style: React.CSSProperties
}

export default function NotifyToggle({ labelOn, labelOff, labelTest, labelTestSent, labelTestFail, style }: Props) {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [testMsg, setTestMsg] = useState('')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setSupported(true)
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    }).catch(() => {})
  }, [])

  if (!supported) return null

  const toggle = async () => {
    if (busy) return
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      if (subscribed) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
        }
        setSubscribed(false)
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') { setBusy(false); return }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource,
        })
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        })
        setSubscribed(true)
      }
    } finally {
      setBusy(false)
    }
  }

  const sendTest = async () => {
    if (busy) return
    setBusy(true)
    setTestMsg('')
    try {
      const res = await fetch('/api/push/test', { method: 'POST' })
      setTestMsg(res.ok ? labelTestSent : labelTestFail)
    } catch {
      setTestMsg(labelTestFail)
    } finally {
      setBusy(false)
      setTimeout(() => setTestMsg(''), 3000)
    }
  }

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button onClick={toggle} disabled={busy} style={style}>
        {subscribed ? `🔔 ${labelOn}` : `🔕 ${labelOff}`}
      </button>
      {subscribed && (
        <button onClick={sendTest} disabled={busy} style={style}>
          {testMsg || labelTest}
        </button>
      )}
    </span>
  )
}
