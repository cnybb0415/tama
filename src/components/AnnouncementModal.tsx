'use client'

import { createContext, useContext, useState } from 'react'
import { useLang } from '@/hooks/useLang'

interface Announcement {
  id: string
  title: string
  content: string
  title_en: string | null
  content_en: string | null
  created_at: string
}

const AnnouncementContext = createContext<{ open: () => void } | null>(null)

// 영어 칸이 비어있으면(관리자가 번역을 안 넣었으면) 한국어로 대체 표시
function localizedTitle(a: Announcement, lang: string): string {
  return lang === 'en' && a.title_en ? a.title_en : a.title
}
function localizedContent(a: Announcement, lang: string): string {
  return lang === 'en' && a.content_en ? a.content_en : a.content
}

// "공지사항" 버튼을 눌러야 모달이 뜸 — 이 Provider는 (game) 레이아웃에 한 번만
// 마운트되어 /select ↔ /admin ↔ /feedback을 오가도 안 사라지므로, 열 때마다 매번
// 새로 불러와야 함 (처음 열었을 때만 불러오고 캐싱해두면, 관리자가 다른 탭/페이지에서
// 방금 새 공지를 올려도 예전에 비어있던 결과가 그대로 남아있는 문제가 있었음).
// BgmProvider와 같은 패턴: children을 감싸는 Provider가 모달까지 함께 렌더링해서,
// 버튼(AnnouncementButton)은 이 context를 구독해서 원하는 위치에 자유롭게 배치 가능
export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
  const { t, lang } = useLang()
  const [items, setItems] = useState<Announcement[] | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<Announcement | null>(null)

  const open = () => {
    setIsOpen(true)
    setItems(null)
    setSelected(null)
    fetch('/api/announcements')
      .then(res => res.ok ? res.json() : null)
      .then((data: { items?: Announcement[] } | null) => setItems(data?.items ?? []))
      .catch(() => setItems([]))
  }
  const close = () => { setIsOpen(false); setSelected(null) }

  return (
    <AnnouncementContext.Provider value={{ open }}>
      {children}
      {isOpen && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
              padding: 16, maxWidth: 380, width: '100%', maxHeight: '70vh', overflowY: 'auto',
              fontFamily: 'Galmuri9, sans-serif',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: '#fff' }}>
                {selected ? (
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                    {t.announcementBack}
                  </button>
                ) : t.announcementsTitle}
              </span>
              <button onClick={close} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            {items === null && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>...</div>
            )}
            {items !== null && items.length === 0 && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{t.adminAnnouncementEmpty}</div>
            )}

            {selected ? (
              <div>
                <div style={{ fontSize: 11, color: '#f9d94e', marginBottom: 8, fontWeight: 700 }}>{localizedTitle(selected, lang)}</div>
                <div style={{ fontSize: 10, color: '#ddd', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{localizedContent(selected, lang)}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items?.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelected(a)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8,
                      background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)',
                      padding: '8px 2px', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#f9d94e', fontWeight: 700 }}>{localizedTitle(a, lang)}</span>
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={close}
              style={{
                marginTop: 12, width: '100%', background: 'rgba(255,255,255,0.88)', border: 'none',
                borderRadius: 4, color: '#111', fontSize: 11, fontFamily: 'inherit', padding: '7px 0', cursor: 'pointer',
              }}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </AnnouncementContext.Provider>
  )
}

export function useAnnouncements() {
  const ctx = useContext(AnnouncementContext)
  if (!ctx) throw new Error('useAnnouncements must be used within an AnnouncementProvider')
  return ctx
}
