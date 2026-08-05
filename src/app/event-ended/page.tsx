'use client'

import { useLang } from '@/hooks/useLang'
import { setLang } from '@/lib/lang'
import type { Lang } from '@/lib/lang'

export default function EventEndedPage() {
  const { lang, t } = useLang()

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: '24px',
      textAlign: 'center',
      fontFamily: 'Galmuri9, sans-serif',
    }}>
      <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 3, padding: '1px 4px' }}>
        {(['ko', 'en'] as Lang[]).map(l => (
          <button key={l} onClick={() => setLang(l)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '1px 5px',
            fontSize: 10, fontFamily: 'Galmuri9, sans-serif',
            color: lang === l ? '#fff' : 'rgba(255,255,255,0.4)',
            fontWeight: lang === l ? 700 : 400,
          }}>{l.toUpperCase()}</button>
        ))}
      </div>

      <img src="/picture/icon.png" alt="" style={{ width: 64, height: 64, imageRendering: 'pixelated' }} />

      <div style={{ fontSize: 13, color: '#fff' }}>
        {lang === 'ko' ? 'Back Pocket 이벤트가 종료되었습니다' : 'The Back Pocket event has ended'}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 320 }}>
        {t.eventEndedBody}
      </div>
    </div>
  )
}
