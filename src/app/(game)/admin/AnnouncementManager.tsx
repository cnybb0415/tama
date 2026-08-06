'use client'

import { useEffect, useState } from 'react'
import { useLang } from '@/hooks/useLang'

interface Announcement {
  id: string
  title: string
  content: string
  title_en: string | null
  content_en: string | null
  created_at: string
}

export default function AnnouncementManager() {
  const { t } = useLang()
  const [items, setItems] = useState<Announcement[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [contentEn, setContentEn] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTitleEn, setEditTitleEn] = useState('')
  const [editContentEn, setEditContentEn] = useState('')

  const load = async () => {
    const res = await fetch('/api/announcements')
    if (res.ok) setItems((await res.json()).items)
  }

  useEffect(() => { load() }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const t_ = title.trim()
    const c_ = content.trim()
    if (!t_ || !c_) return
    setBusy(true)
    const res = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: t_, content: c_, title_en: titleEn.trim(), content_en: contentEn.trim() }),
    })
    if (res.ok) {
      setTitle('')
      setContent('')
      setTitleEn('')
      setContentEn('')
      await load()
    }
    setBusy(false)
  }

  const startEdit = (a: Announcement) => {
    setEditingId(a.id)
    setEditTitle(a.title)
    setEditContent(a.content)
    setEditTitleEn(a.title_en ?? '')
    setEditContentEn(a.content_en ?? '')
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = async (id: string) => {
    const t_ = editTitle.trim()
    const c_ = editContent.trim()
    if (!t_ || !c_) return
    setBusy(true)
    const res = await fetch('/api/announcements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title: t_, content: c_, title_en: editTitleEn.trim(), content_en: editContentEn.trim() }),
    })
    if (res.ok) {
      setEditingId(null)
      await load()
    }
    setBusy(false)
  }

  const remove = async (id: string) => {
    setBusy(true)
    const res = await fetch('/api/announcements', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setConfirmDeleteId(null)
    if (res.ok) await load()
    setBusy(false)
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 4,
    color: '#fff',
    fontSize: 11,
    fontFamily: 'inherit',
    padding: 8,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }

  const navBtnStyle: React.CSSProperties = {
    fontSize: 9,
    color: '#ccc',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 4,
    padding: '3px 8px',
    cursor: 'pointer',
  }

  const langLabelStyle: React.CSSProperties = {
    fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: 1,
  }

  return (
    <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <h2 style={{ fontSize: 12, color: '#fff', margin: '0 0 10px' }}>{t.adminAnnouncementsHeading}</h2>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        <span style={langLabelStyle}>KO</span>
        <input
          value={title}
          onChange={e => setTitle(e.target.value.slice(0, 100))}
          placeholder={t.adminAnnouncementTitlePlaceholder}
          style={inputStyle}
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value.slice(0, 2000))}
          placeholder={t.adminAnnouncementContentPlaceholder}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        <span style={{ ...langLabelStyle, marginTop: 4 }}>EN ({t.adminAnnouncementOptional})</span>
        <input
          value={titleEn}
          onChange={e => setTitleEn(e.target.value.slice(0, 100))}
          placeholder={t.adminAnnouncementTitlePlaceholder}
          style={inputStyle}
        />
        <textarea
          value={contentEn}
          onChange={e => setContentEn(e.target.value.slice(0, 2000))}
          placeholder={t.adminAnnouncementContentPlaceholder}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        <button
          type="submit"
          disabled={busy || !title.trim() || !content.trim()}
          style={{
            background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 4, color: '#111',
            fontSize: 11, fontFamily: 'inherit', padding: '7px 0', cursor: busy ? 'default' : 'pointer', marginTop: 4,
          }}
        >
          {t.adminAnnouncementSubmit}
        </button>
      </form>

      {items.length === 0 && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{t.adminAnnouncementEmpty}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(a => (
          <div key={a.id} style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 6, padding: '8px 10px',
          }}>
            {editingId === a.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={langLabelStyle}>KO</span>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value.slice(0, 100))}
                  placeholder={t.adminAnnouncementTitlePlaceholder}
                  style={{ ...inputStyle, fontSize: 10, padding: 6 }}
                />
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value.slice(0, 2000))}
                  placeholder={t.adminAnnouncementContentPlaceholder}
                  rows={4}
                  style={{ ...inputStyle, fontSize: 10, padding: 6, resize: 'vertical' }}
                />
                <span style={langLabelStyle}>EN ({t.adminAnnouncementOptional})</span>
                <input
                  value={editTitleEn}
                  onChange={e => setEditTitleEn(e.target.value.slice(0, 100))}
                  placeholder={t.adminAnnouncementTitlePlaceholder}
                  style={{ ...inputStyle, fontSize: 10, padding: 6 }}
                />
                <textarea
                  value={editContentEn}
                  onChange={e => setEditContentEn(e.target.value.slice(0, 2000))}
                  placeholder={t.adminAnnouncementContentPlaceholder}
                  rows={4}
                  style={{ ...inputStyle, fontSize: 10, padding: 6, resize: 'vertical' }}
                />
                <span style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => saveEdit(a.id)}
                    disabled={busy || !editTitle.trim() || !editContent.trim()}
                    style={{ ...navBtnStyle, color: '#86efac' }}
                  >
                    {t.confirm}
                  </button>
                  <button onClick={cancelEdit} disabled={busy} style={navBtnStyle}>{t.cancel}</button>
                </span>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: '#f9d94e', fontWeight: 700 }}>{a.title}</span>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#eee', whiteSpace: 'pre-wrap', lineHeight: 1.5, marginBottom: 8 }}>
                  {a.content}
                </div>
                {!a.title_en && (
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
                    {t.adminAnnouncementNoEn}
                  </div>
                )}
                {confirmDeleteId === a.id ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9 }}>
                    <span style={{ color: '#fca5a5' }}>{t.adminAnnouncementDeleteConfirm}</span>
                    <button onClick={() => remove(a.id)} disabled={busy} style={{ ...navBtnStyle, color: '#f87171' }}>{t.confirm}</button>
                    <button onClick={() => setConfirmDeleteId(null)} style={navBtnStyle}>{t.cancel}</button>
                  </span>
                ) : (
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => startEdit(a)} disabled={busy} style={navBtnStyle}>
                      {t.adminAnnouncementEdit}
                    </button>
                    <button onClick={() => setConfirmDeleteId(a.id)} disabled={busy} style={{ ...navBtnStyle, color: '#f87171' }}>
                      {t.adminDelete}
                    </button>
                  </span>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
