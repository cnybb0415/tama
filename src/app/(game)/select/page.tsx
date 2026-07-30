import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { stageForAge } from '@/lib/game/character'
import SelectClient from './SelectClient'
import type { SaveData } from '@/lib/game/types'

export default async function SelectPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const username = (user.user_metadata?.username as string | undefined) ?? user.email?.split('@')[0] ?? '?'

  // 선택 화면 썸네일이 실제 진화 상태(키드/어른)를 반영하도록, 각 캐릭터의
  // 나이 기준 스테이지를 미리 계산해서 넘겨줌 — 실제로 접속해서 진화가 확정(저장)된
  // 캐릭터만 반영되고, 아직 안 열어본 캐릭터는 세이브가 없어 기본(kid)으로 표시됨
  const { data: saves } = await supabase
    .from('game_saves')
    .select('character_type, save_data')
    .eq('user_id', user.id)

  const stageByCharacter: Record<string, number> = {}
  for (const row of saves ?? []) {
    const save = row.save_data as SaveData
    stageByCharacter[row.character_type as string] = stageForAge(save.stats.age, row.character_type as string)
  }

  return <SelectClient username={username} stageByCharacter={stageByCharacter} />
}
