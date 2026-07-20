export type AnimName = 'idle' | 'walk' | 'happy' | 'eat' | 'sleep' | 'sad' | 'sick' | 'poop' | 'angry' | 'special'

// 대화 상황 구분 — talk: 메뉴에서 직접 대화, idle: 캐릭터가 먼저 말 거는 잡담,
// feed/pet: 해당 행동 직후 반응, sick: 아플 때, greet: 접속 시 첫 인사
export type DialogueCategory = 'talk' | 'idle' | 'feed' | 'pet' | 'sick' | 'greet'

export interface AnimConfig {
  frames: number
  interval: number
  loop: boolean
  priority: number
}

export interface StageConfig {
  folder: string
  prefix: string
  fileMap: Partial<Record<AnimName, string>>
  frameOverrides: Partial<Record<AnimName, number>>
  name: string
}

export interface CharacterConfig {
  displayName: string
  evolutionDay: number | null
  stages: StageConfig[]
}

export interface GameStats {
  hunger: number
  happiness: number
  affinity: number
  age: number
  weight: number
  sick: boolean
  poop_count: number
  alive: boolean
}

export interface SaveData {
  stats: GameStats
  last_hunger_decay: number
  last_happiness_decay: number
  poop_timer: number | null
  created_at: number | null
}

export interface GameState {
  stats: GameStats
  stage: number
  menuOpen: boolean
  menuIndex: number
  showStatus: boolean
  statusTimer: number
  minigameActive: boolean
  minigamePhase: 'choosing' | 'result'
  minigamePlayer: string | null
  minigamePc: string | null
  minigameResult: string | null
  minigameResultTimer: number
  deathAlpha: number
  deathTimer: number
  btnFlash: Record<string, number>
  evolveFlash: number
  dialogueTier: number | null
  dialogueCategory: DialogueCategory
  dialogueLineIndex: number
  dialogueTimer: number
}
