'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/hooks/useLang'
import type { FeedbackRow } from './page'

const PAGE_SIZE = 20
type Filter = 'all' | 'pending' | 'resolved'

export default function AdminClient({ items, total }: { items: FeedbackRow[]; total: number }) {
  const { t } = useLang()
  const [rows, setRows] = useState(items)
  const [total_, setTotal] = useState(total)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const load = async (nextPage: number, nextFilter: Filter) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/feedback?page=${nextPage}&filter=${nextFilter}`)
      if (res.ok) {
        const data = await res.json()
        setRows(data.items)
        setTotal(data.total)
        setPage(nextPage)
        setFilter(nextFilter)
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleResolved = async (row: FeedbackRow) => {
    setBusyId(row.id)
    const next = !row.resolved
    const res = await fetch('/api/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, resolved: next }),
    })
    if (res.ok) {
      // 처리 상태가 바뀌면 정렬 순서(대기중 위 / 처리완료 아래)나 현재 필터에 안 맞을 수 있어서
      // 목록 전체를 같은 페이지로 다시 불러옴 (행 하나만 patch하면 순서가 안 맞게 됨)
      await load(page, filter)
    }
    setBusyId(null)
  }

  const deleteRow = async (row: FeedbackRow) => {
    setBusyId(row.id)
    const res = await fetch('/api/feedback', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id }),
    })
    setConfirmDeleteId(null)
    if (res.ok) {
      // 삭제로 현재 페이지 총 개수/구성이 바뀌므로 같은 페이지를 다시 불러옴
      // (마지막 페이지의 마지막 행을 지운 경우 GET이 알아서 이전 페이지로 clamp해줌)
      await load(page, filter)
    }
    setBusyId(null)
  }

  const totalPages = Math.max(1, Math.ceil(total_ / PAGE_SIZE))

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 9,
    color: active ? '#111' : '#ccc',
    background: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 4,
    padding: '3px 8px',
    cursor: 'pointer',
  })

  const navBtnStyle: React.CSSProperties = {
    fontSize: 9,
    color: '#ccc',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 4,
    padding: '3px 8px',
    cursor: 'pointer',
  }

  return (
    <div style={{
      minHeight: '100dvh',
      padding: 24,
      fontFamily: 'Galmuri9, sans-serif',
      maxWidth: 640,
      margin: '0 auto',
      boxSizing: 'border-box',
    }}>
      <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 16 }}>
        <Link href="/select" style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>
          {t.feedbackBack}
        </Link>

        <h1 style={{ fontSize: 13, color: '#fff', margin: '10px 0 14px' }}>{t.adminTitle} ({total_})</h1>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['all', 'pending', 'resolved'] as Filter[]).map(f => (
            <button key={f} disabled={loading} onClick={() => load(1, f)} style={tabStyle(filter === f)}>
              {f === 'all' ? t.adminFilterAll : f === 'pending' ? t.adminFilterPending : t.adminFilterResolved}
            </button>
          ))}
        </div>

        {rows.length === 0 && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{t.adminEmpty}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: loading ? 0.5 : 1 }}>
          {rows.map(row => (
            <div key={row.id} style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              padding: '10px 12px',
              opacity: row.resolved ? 0.55 : 1,
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '2px 8px', marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: '#93c5fd', wordBreak: 'break-all', minWidth: 0, flex: '1 1 auto' }}>{row.username}</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {new Date(row.created_at).toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#eee', whiteSpace: 'pre-wrap', lineHeight: 1.5, marginBottom: 8 }}>
                {row.message}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 9, color: row.resolved ? '#86efac' : '#fcd34d' }}>
                  {row.resolved ? t.adminResolved : t.adminPending}
                </span>
                {confirmDeleteId === row.id ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9 }}>
                    <span style={{ color: '#fca5a5' }}>{t.adminDeleteConfirm}</span>
                    <button
                      onClick={() => deleteRow(row)}
                      disabled={busyId === row.id}
                      style={{ ...navBtnStyle, color: '#f87171', borderColor: 'rgba(248,113,113,0.4)' }}
                    >
                      {busyId === row.id ? '...' : t.confirm}
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} style={navBtnStyle}>
                      {t.cancel}
                    </button>
                  </span>
                ) : (
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => toggleResolved(row)}
                      disabled={busyId === row.id}
                      style={navBtnStyle}
                    >
                      {row.resolved ? t.adminMarkPending : t.adminMarkResolved}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(row.id)}
                      disabled={busyId === row.id}
                      style={{ ...navBtnStyle, color: '#f87171' }}
                    >
                      {t.adminDelete}
                    </button>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <button disabled={loading || page <= 1} onClick={() => load(page - 1, filter)} style={{ ...navBtnStyle, opacity: page <= 1 ? 0.4 : 1 }}>
              {t.adminPagePrev}
            </button>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{page} / {totalPages}</span>
            <button disabled={loading || page >= totalPages} onClick={() => load(page + 1, filter)} style={{ ...navBtnStyle, opacity: page >= totalPages ? 0.4 : 1 }}>
              {t.adminPageNext}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
