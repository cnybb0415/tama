import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import FeedbackClient from './FeedbackClient'

export default async function FeedbackPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <FeedbackClient />
}
