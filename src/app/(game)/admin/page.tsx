import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminClient from './AdminClient'

export interface FeedbackRow {
  id: string
  username: string
  message: string
  resolved: boolean
  created_at: string
}

export const PAGE_SIZE = 20

export default async function AdminPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // user_metadata.username은 유저 본인이 고칠 수 있어 admin 사칭에 쓰일 수 있음 —
  // profiles.username(가입 트리거로만 채워짐, 유저는 수정 불가)으로 판별
  const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
  // proxy.ts에서도 막지만, 여기서도 한 번 더 확인 (defense in depth)
  if (profile?.username !== 'admin') redirect('/select')

  const admin = createAdminClient()
  const { data, count } = await admin
    .from('feedback')
    .select('id, username, message, resolved, created_at', { count: 'exact' })
    .order('resolved', { ascending: true })
    .order('created_at', { ascending: false })
    .range(0, PAGE_SIZE - 1)

  return <AdminClient items={(data ?? []) as FeedbackRow[]} total={count ?? 0} />
}
