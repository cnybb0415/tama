'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/hooks/useLang'

const MAX_LEN = 1000

export default function FeedbackClient() {
  const { t } = useLang()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) { setErrorMsg(t.feedbackErrorEmpty); setStatus('error'); return }

    setSending(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })
      if (res.ok) {
        setMessage('')
        setStatus('sent')
      } else {
        setErrorMsg(res.status === 429 ? t.feedbackErrorRate : t.feedbackErrorGeneric)
        setStatus('error')
      }
    } catch {
      setErrorMsg(t.feedbackErrorGeneric)
      setStatus('error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'Galmuri9, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        background: 'rgba(0,0,0,0.6)',
        borderRadius: 8,
        padding: 16,
        boxSizing: 'border-box',
      }}>
        <Link href="/select" style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
          {t.feedbackBack}
        </Link>

        <h1 style={{ fontSize: 13, color: '#fff', margin: '10px 0 14px' }}>{t.feedbackTitle}</h1>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, MAX_LEN))}
            placeholder={t.feedbackPlaceholder}
            rows={6}
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 4,
              color: '#fff',
              fontSize: 11,
              fontFamily: 'inherit',
              padding: 8,
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', textAlign: 'right' }}>
            {message.length}/{MAX_LEN}
          </div>

          {status === 'error' && (
            <div style={{ fontSize: 10, color: '#f87171' }}>{errorMsg}</div>
          )}
          {status === 'sent' && (
            <div style={{ fontSize: 10, color: '#86efac' }}>{t.feedbackSuccess}</div>
          )}

          <button
            type="submit"
            disabled={sending}
            style={{
              background: sending ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.9)',
              border: 'none',
              borderRadius: 4,
              color: '#111',
              fontSize: 11,
              fontFamily: 'inherit',
              padding: '8px 0',
              cursor: sending ? 'default' : 'pointer',
              letterSpacing: 1,
            }}
          >
            {sending ? '...' : t.feedbackSubmit}
          </button>
        </form>
      </div>
    </div>
  )
}
