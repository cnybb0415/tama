import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { CHARACTER_CONFIGS } from '@/lib/game/config'
import PlayClient from './PlayClient'
import type { SaveData } from '@/lib/game/types'

interface Props { params: Promise<{ character: string }> }

export default async function PlayPage({ params }: Props) {
  const { character } = await params

  if (!CHARACTER_CONFIGS[character]) notFound()

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data }, { data: profile }] = await Promise.all([
    supabase
      .from('game_saves')
      .select('save_data')
      .eq('user_id', user.id)
      .eq('character_type', character)
      .single(),
    supabase
      .from('profiles')
      .select('muted_characters')
      .eq('id', user.id)
      .single(),
  ])

  const save = (data?.save_data as SaveData) ?? null
  const username = (user.user_metadata?.username as string) ?? ''
  const muted = ((profile?.muted_characters as string[]) ?? []).includes(character)

  return <PlayClient characterType={character} initialSave={save} isAdmin={username === 'admin'} initialMuted={muted} />
}
