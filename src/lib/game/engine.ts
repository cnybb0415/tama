import { MENU_ITEMS, CHARACTER_CONFIGS, DEFAULT_EVOLUTION_DAY, DIALOGUE_LINE_COUNTS, IDLE_CHAT_MIN, IDLE_CHAT_MAX, REACTION_CHANCE, BASE_WEIGHT, WEIGHT_PER_DAY } from './config'
import { CharacterAnim, CharacterImages, stageForAge, affinityTier } from './character'
import type { AnimName, DialogueCategory, GameStats, GameState, SaveData } from './types'

const HUNGER_DECAY  = 30 * 60
const HAP_DECAY     = 45 * 60
const HUNGER_DEATH  = 3600
const HAP_DEATH     = 7200
const SICK_DEATH    = 7200
const POOP_MIN      = 15 * 60
const POOP_MAX      = 30 * 60
const WALK_MIN      = 5
const WALK_MAX      = 10

export class GameEngine {
  characterType: string
  images: CharacterImages
  anim: CharacterAnim

  stats: GameStats = {
    hunger: 4, happiness: 4, affinity: 0, age: 0, weight: BASE_WEIGHT,
    sick: false, poop_count: 0, alive: true,
  }

  state: GameState = {
    stats: this.stats,
    stage: 0,
    menuOpen: false,
    menuIndex: 0,
    showStatus: false,
    statusTimer: 0,
    minigameActive: false,
    minigamePhase: 'choosing',
    minigamePlayer: null,
    minigamePc: null,
    minigameResult: null,
    minigameResultTimer: 0,
    deathAlpha: 0,
    deathTimer: 0,
    btnFlash: { left: 0, center: 0, right: 0 },
    evolveFlash: 0,
    dialogueTier: null,
    dialogueCategory: 'talk',
    dialogueLineIndex: 0,
    dialogueTimer: 0,
  }

  private lastHungerDecay = Date.now() / 1000
  private lastHapDecay    = Date.now() / 1000
  private poopTimer: number | null = null
  private petCooldown = 0
  private hungerZeroSince: number | null = null
  private hapZeroSince: number | null = null
  private sickSince: number | null = null
  private walkTimer = 0
  private walkInterval = rand(WALK_MIN, WALK_MAX)
  // 캐릭터가 생성된 시각(epoch, 초) — 나이는 여기서부터 실제 경과 일수로 계산됨
  // (달력상 "일자"가 바뀌었는지만 보던 예전 방식은 앱을 며칠간 열지 않으면
  //  경과일을 하루로만 세는 버그가 있었음 — 실제 경과 시간 기반으로 교체)
  private createdAt = Date.now() / 1000
  private idleChatTimer = 0
  private idleChatInterval = rand(IDLE_CHAT_MIN, IDLE_CHAT_MAX)
  private greeted = false

  onSave?: (data: SaveData) => void
  onEvolve?: (stage: number) => void

  constructor(characterType: string, images: CharacterImages) {
    this.characterType = characterType
    this.images = images
    this.anim = new CharacterAnim()
  }

  loadSave(data: SaveData): void {
    this.stats = data.stats
    if (this.stats.affinity == null) this.stats.affinity = 0
    this.lastHungerDecay = data.last_hunger_decay || Date.now() / 1000
    this.lastHapDecay    = data.last_happiness_decay || Date.now() / 1000
    this.poopTimer       = data.poop_timer ?? null
    // 예전 저장 데이터(created_at 없음)는 현재 age를 유지하도록 역산해서 채워줌
    this.createdAt = data.created_at ?? (Date.now() / 1000 - this.stats.age * 86400)
    // death timers reset (no offline death)
    this.hungerZeroSince = null
    this.hapZeroSince    = null
    this.sickSince       = null

    const stage = stageForAge(this.stats.age, this.characterType)
    this.state.stage = stage
    this.state.stats = this.stats
  }

  getSaveData(): SaveData {
    return {
      stats: this.stats,
      last_hunger_decay: this.lastHungerDecay,
      last_happiness_decay: this.lastHapDecay,
      poop_timer: this.poopTimer,
      created_at: this.createdAt,
    }
  }

  update(dt: number): void {
    const now = Date.now() / 1000

    for (const k of Object.keys(this.state.btnFlash)) {
      this.state.btnFlash[k] = Math.max(0, this.state.btnFlash[k] - dt)
    }
    if (this.petCooldown > 0) this.petCooldown = Math.max(0, this.petCooldown - dt)

    if (!this.stats.alive) {
      this.state.deathTimer += dt
      this.state.deathAlpha = Math.min(220, Math.floor(this.state.deathTimer * 80))
      return
    }

    // 접속 시 캐릭터가 먼저 인사 (세션당 한 번)
    if (!this.greeted) {
      this.greeted = true
      this._startDialogue('greet')
    }

    // Age — 생성 시점부터 실제 경과 시간을 기준으로 계산 (앱을 며칠 안 열어도 정확히 반영됨)
    const newAge = Math.max(0, Math.floor((now - this.createdAt) / 86400))
    if (newAge !== this.stats.age) {
      this.stats.age = newAge
      const newStage = stageForAge(this.stats.age, this.characterType)
      if (newStage !== this.state.stage) {
        this.state.stage = newStage
        this.state.evolveFlash = 1.2
        this.anim.set('happy')
        this.onEvolve?.(newStage)
      }
      // 나이가 바뀐 시점에 바로 저장 — 유저가 아무 액션도 안 하고 탭을 닫으면
      // 진화(성인 전환)가 저장 안 되고 다음 접속때 되돌아가는 문제가 있었음
      this.onSave?.(this.getSaveData())
    }

    if (this.state.evolveFlash > 0)
      this.state.evolveFlash = Math.max(0, this.state.evolveFlash - dt)

    // Stat decay
    if (now - this.lastHungerDecay >= HUNGER_DECAY) {
      this.stats.hunger = Math.max(0, this.stats.hunger - 1)
      this.lastHungerDecay = now
    }
    if (now - this.lastHapDecay >= HAP_DECAY) {
      this.stats.happiness = Math.max(0, this.stats.happiness - 1)
      this.lastHapDecay = now
    }

    // Poop
    if (this.poopTimer !== null && now >= this.poopTimer) {
      this.stats.poop_count++
      this.poopTimer = null
      if (this.stats.poop_count >= 2 && !this.stats.sick) {
        this.stats.sick = true
        this.sickSince = now
        this._startDialogue('sick')
      }
    }

    // Death conditions
    if (this.stats.hunger === 0) {
      if (!this.hungerZeroSince) this.hungerZeroSince = now
      else if (now - this.hungerZeroSince >= HUNGER_DEATH) { this._die(); return }
    } else {
      this.hungerZeroSince = null
    }

    if (this.stats.happiness === 0) {
      if (!this.hapZeroSince) this.hapZeroSince = now
      else if (now - this.hapZeroSince >= HAP_DEATH) { this._die(); return }
    } else {
      this.hapZeroSince = null
    }

    if (this.stats.sick) {
      if (!this.sickSince) this.sickSince = now
      else if (now - this.sickSince >= SICK_DEATH) { this._die(); return }
    } else {
      this.sickSince = null
    }

    // UI timers
    if (this.state.showStatus) {
      this.state.statusTimer -= dt
      if (this.state.statusTimer <= 0) this.state.showStatus = false
    }
    if (this.state.minigameActive && this.state.minigamePhase === 'result') {
      this.state.minigameResultTimer -= dt
      if (this.state.minigameResultTimer <= 0) this.state.minigameActive = false
    }
    if (this.state.dialogueTier !== null) {
      this.state.dialogueTimer -= dt
      if (this.state.dialogueTimer <= 0) this.state.dialogueTier = null
    }

    // Walk
    if (!this.state.menuOpen && !this.state.minigameActive) {
      this.walkTimer += dt
      if (this.walkTimer >= this.walkInterval) {
        this.walkTimer = 0
        this.walkInterval = rand(WALK_MIN, WALK_MAX)
        this.anim.request('walk')
      }
    }

    // 캐릭터가 먼저 말 거는 잡담 — 친밀도가 높을수록 더 자주 말을 검
    if (!this.state.menuOpen && !this.state.minigameActive && !this.state.showStatus && this.state.dialogueTier === null) {
      this.idleChatTimer += dt
      if (this.idleChatTimer >= this.idleChatInterval) {
        this.idleChatTimer = 0
        const tier = affinityTier(this.stats.affinity)
        this.idleChatInterval = rand(IDLE_CHAT_MIN, IDLE_CHAT_MAX) - tier * 20
        this._startDialogue('idle')
      }
    }

    // State-driven animations
    if (this.stats.sick) this.anim.force('sick')
    else if (this.stats.hunger === 0 || this.stats.happiness === 0) this.anim.force('sad')

    this.anim.update(dt, (a: AnimName) => this.images.sprites[a]?.length ?? 1)

    this.state.stats = this.stats
  }

  // ── Input ──────────────────────────────────────────────────────────────

  btnLeft(): void {
    if (!this.stats.alive) return
    if (this.state.minigameActive && this.state.minigamePhase === 'choosing') {
      this._minigamePick('scissors'); return
    }
    if (this.state.menuOpen) this.state.menuIndex = (this.state.menuIndex - 1 + MENU_ITEMS.length) % MENU_ITEMS.length
    else this.state.menuOpen = true
    this.state.btnFlash.left = 0.15
  }

  btnCenter(): void {
    if (!this.stats.alive) { this._restart(); return }
    if (this.state.minigameActive) {
      if (this.state.minigamePhase === 'choosing') this._minigamePick('rock')
      else this.state.minigameActive = false
      this.state.btnFlash.center = 0.15; return
    }
    if (this.state.showStatus) { this.state.showStatus = false; return }
    if (this.state.dialogueTier !== null) { this.state.dialogueTier = null; return }
    if (this.state.menuOpen) this._select()
    else this.state.menuOpen = true
    this.state.btnFlash.center = 0.15
  }

  btnRight(): void {
    if (!this.stats.alive) return
    if (this.state.minigameActive && this.state.minigamePhase === 'choosing') {
      this._minigamePick('paper'); return
    }
    if (this.state.menuOpen) this.state.menuIndex = (this.state.menuIndex + 1) % MENU_ITEMS.length
    else this.state.menuOpen = true
    this.state.btnFlash.right = 0.15
  }

  private _select(): void {
    const item = MENU_ITEMS[this.state.menuIndex]
    this.state.menuOpen = false

    if (item === 'feed') {
      this.stats.hunger = Math.min(4, this.stats.hunger + 1)
      const maxWeight = BASE_WEIGHT + this.stats.age * WEIGHT_PER_DAY
      this.stats.weight = Math.min(maxWeight, this.stats.weight + 1)
      this._bumpAffinity(1)
      this._schedulePoop()
      this.anim.request('eat', 'happy')
      if (Math.random() < REACTION_CHANCE) this._startDialogue('feed')
    } else if (item === 'pet') {
      if (this.petCooldown <= 0) {
        this.stats.happiness = Math.min(4, this.stats.happiness + 1)
        this._bumpAffinity(2)
        this.petCooldown = 120
        this.anim.request('happy')
        if (Math.random() < REACTION_CHANCE) this._startDialogue('pet')
      }
    } else if (item === 'play') {
      this.state.minigameActive = true
      this.state.minigamePhase = 'choosing'
      this.state.minigamePlayer = null
      this.state.minigamePc = null
      this.state.minigameResult = null
    } else if (item === 'medicine') {
      if (this.stats.sick) {
        this.stats.sick = false
        this.sickSince = null
        this._bumpAffinity(1)
        this.anim.set('happy')
      }
    } else if (item === 'clean') {
      if (this.stats.poop_count > 0) {
        this.stats.poop_count = 0
        this._bumpAffinity(1)
        this.anim.request('poop')
      }
    } else if (item === 'status') {
      this.state.showStatus = true
      this.state.statusTimer = 4
    } else if (item === 'special') {
      this._bumpAffinity(2)
      this.anim.request('special', 'happy')
    } else if (item === 'talk') {
      this._startDialogue('talk')
    }

    this.onSave?.(this.getSaveData())
  }

  private _bumpAffinity(amount: number): void {
    this.stats.affinity = Math.min(100, this.stats.affinity + amount)
  }

  private _startDialogue(category: DialogueCategory): void {
    this.state.dialogueTier = affinityTier(this.stats.affinity)
    this.state.dialogueCategory = category
    this.state.dialogueLineIndex = Math.floor(Math.random() * DIALOGUE_LINE_COUNTS[category])
    this.state.dialogueTimer = 3
  }

  private _minigamePick(player: string): void {
    const choices = ['rock', 'scissors', 'paper']
    const pc = choices[Math.floor(Math.random() * 3)]
    const wins: Record<string, string> = { rock: 'scissors', scissors: 'paper', paper: 'rock' }

    this.state.minigamePlayer = player
    this.state.minigamePc = pc

    if (player === pc) {
      this.state.minigameResult = 'draw'
      this.stats.happiness = Math.min(4, this.stats.happiness + 1)
      this._bumpAffinity(1)
    } else if (wins[player] === pc) {
      this.state.minigameResult = 'win'
      this.stats.happiness = Math.min(4, this.stats.happiness + 2)
      this._bumpAffinity(3)
      this.anim.request('happy')
    } else {
      this.state.minigameResult = 'lose'
    }

    this.state.minigamePhase = 'result'
    this.state.minigameResultTimer = 2.5
    this.onSave?.(this.getSaveData())
  }

  private _schedulePoop(): void {
    this.poopTimer = Date.now() / 1000 + rand(POOP_MIN, POOP_MAX)
  }

  private _die(): void {
    this.stats.alive = false
    this.state.deathTimer = 0
    this.state.deathAlpha = 0
    this.anim.set('idle')
    this.onSave?.(this.getSaveData())
  }

  // ── Debug ──────────────────────────────────────────────────────────────

  debugAnim(name: AnimName): void {
    this.anim.set(name)
  }

  debugAffinity(value: number): void {
    this.stats.affinity = Math.max(0, Math.min(100, value))
  }

  debugWeight(value: number): void {
    this.stats.weight = Math.max(0, value)
  }

  async debugStage(stage: number): Promise<void> {
    const maxStage = CHARACTER_CONFIGS[this.characterType].stages.length - 1
    const s = Math.max(0, Math.min(stage, maxStage))
    await this.images.loadStage(this.characterType, s)
    this.state.stage = s
    const targetAge = s === 0 ? 0 : (CHARACTER_CONFIGS[this.characterType].evolutionDay ?? DEFAULT_EVOLUTION_DAY)
    this.stats.age = targetAge
    // createdAt도 함께 맞춰줘야 다음 update() tick에서 age가 즉시 원래대로 재계산되지 않음
    this.createdAt = Date.now() / 1000 - targetAge * 86400
    this.anim.set('idle')
  }

  private _restart(): void {
    this.stats = { hunger: 4, happiness: 4, affinity: 0, age: 0, weight: BASE_WEIGHT, sick: false, poop_count: 0, alive: true }
    const now = Date.now() / 1000
    this.lastHungerDecay = now
    this.lastHapDecay = now
    this.createdAt = now
    this.poopTimer = null
    this.hungerZeroSince = null
    this.hapZeroSince = null
    this.sickSince = null
    this.state.deathAlpha = 0
    this.state.deathTimer = 0
    this.state.menuOpen = false
    this.state.minigameActive = false
    this.state.showStatus = false
    this.state.dialogueTier = null
    this.state.dialogueCategory = 'talk'
    this.state.dialogueTimer = 0
    this.state.stage = 0
    this.idleChatTimer = 0
    this.idleChatInterval = rand(IDLE_CHAT_MIN, IDLE_CHAT_MAX)
    this.greeted = false
    this.anim.set('idle')
    this.onSave?.(this.getSaveData())
  }
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}
