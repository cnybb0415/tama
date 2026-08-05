import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { stageForAge } from '@/lib/game/character'
import SelectClient from './SelectClient'
import type { SaveData } from '@/lib/game/types'

export default async function SelectPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // user_metadata.username은 유저 본인이 Supabase Auth API로 직접 바꿔 admin을 사칭할 수
  // 있어서 admin 판별에 못 씀 — profiles.username은 가입 트리거로만 채워지고 유저가
  // 고칠 수 있는 update 정책이 없어 위조 불가능
  const [{ data: profile }, { data: saves }] = await Promise.all([
    supabase.from('profiles').select('username').eq('id', user.id).single(),
    // 선택 화면 썸네일이 실제 진화 상태(키드/어른)를 반영하도록, 각 캐릭터의
    // 나이 기준 스테이지를 미리 계산해서 넘겨줌 — 실제로 접속해서 진화가 확정(저장)된
    // 캐릭터만 반영되고, 아직 안 열어본 캐릭터는 세이브가 없어 기본(kid)으로 표시됨
    supabase.from('game_saves').select('character_type, save_data').eq('user_id', user.id),
  ])

  const username = profile?.username ?? user.email?.split('@')[0] ?? '?'
  const isAdmin = username === 'admin'

  const stageByCharacter: Record<string, number> = {}
  for (const row of saves ?? []) {
    const save = row.save_data as SaveData
    stageByCharacter[row.character_type as string] = stageForAge(save.stats.age, row.character_type as string)
  }

  return <SelectClient username={username} stageByCharacter={stageByCharacter} isAdmin={isAdmin} />
}
