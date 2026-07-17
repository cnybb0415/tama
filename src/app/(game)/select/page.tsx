import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import SelectClient from './SelectClient'

export default async function SelectPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const username = (user.user_metadata?.username as string | undefined) ?? user.email?.split('@')[0] ?? '?'

  return <SelectClient username={username} />
}
