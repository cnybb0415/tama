import { createClient } from '@supabase/supabase-js'

// service role key: RLS 우회, 서버에서만 사용
// NEXT_PUBLIC 접두사 없음 → 브라우저에 절대 노출 안됨
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
