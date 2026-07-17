export type AnimName = 'idle' | 'walk' | 'happy' | 'eat' | 'sleep' | 'sad' | 'sick' | 'poop' | 'angry' | 'special'

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
  last_day: number
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
}
