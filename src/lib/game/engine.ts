import { MENU_ITEMS, CHARACTER_CONFIGS, DEFAULT_EVOLUTION_DAY, DIALOGUE_LINE_COUNTS, IDLE_CHAT_MIN, IDLE_CHAT_MAX, REACTION_CHANCE, BASE_WEIGHT, WEIGHT_PER_DAY, AFFINITY_DECAY_THRESHOLD, AFFINITY_DECAY_BASE_INTERVAL } from './config'
import { CharacterAnim, CharacterImages, stageForAge, affinityTier } from './character'
import type { AnimName, DialogueCategory, GameStats, GameState, SaveData } from './types'

// 배고픔/행복은 이제 실제 경과 시간 기준으로 앱을 며칠 안 켜도 정확히 따라잡힘
// (나이 계산과 같은 방식) — 그만큼 감소 주기/사망 유예시간은 널널하게 잡음
export const HUNGER_DECAY = 4  * 60 * 60   // 칸당 4시간 (풀 4칸 → 16시간 만에 0)
export const HAP_DECAY    = 6  * 60 * 60   // 칸당 6시간 (풀 4칸 → 24시간 만에 0)
const HUNGER_DEATH  = 12 * 60 * 60   // 0인 채로 12시간
const HAP_DEATH     = 12 * 60 * 60
const SICK_DEATH    = 12 * 60 * 60
const POOP_MIN      = 15 * 60
const POOP_MAX      = 30 * 60
const WALK_MIN      = 5
const WALK_MAX      = 10
// 심야 시간대(각자 기기의 로컬 시간 기준 — 나라별로 자동으로 맞음) 새벽 1시~오전 9시
export const NIGHT_START_HOUR = 1
export const NIGHT_END_HOUR   = 9

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
  // 아직 한 tick(interval)에 못 미치는 자투리 "활성 시간"(초) — 밤을 건너뛰고 남는 나머지
  private hungerDecayAccum = 0
  private hapDecayAccum    = 0
  private lastAffinityDecayHunger    = Date.now() / 1000
  private lastAffinityDecayHappiness = Date.now() / 1000
  private poopTimers: number[] = []
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
  // 디버그 ANIM 버튼으로 미리보기 중일 땐 실제 스탯 기반 강제 애니메이션(sick/sad/idle 복귀)을
  // 건드리지 않음 — 안 그러면 바로 다음 프레임에 스탯이 정상이라 idle로 도로 튕겨나감
  private debugAnimActive = false

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
    this.hungerDecayAccum = data.hunger_decay_accum ?? 0
    this.hapDecayAccum    = data.happiness_decay_accum ?? 0
    this.lastAffinityDecayHunger    = data.last_affinity_decay_hunger ?? Date.now() / 1000
    this.lastAffinityDecayHappiness = data.last_affinity_decay_happiness ?? Date.now() / 1000
    // 구버전 세이브(poop_timer 단일값)도 마이그레이션해서 큐에 담아줌
    this.poopTimers = data.poop_timers ?? (data.poop_timer != null ? [data.poop_timer] : [])
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
      hunger_decay_accum: this.hungerDecayAccum,
      happiness_decay_accum: this.hapDecayAccum,
      last_affinity_decay_hunger: this.lastAffinityDecayHunger,
      last_affinity_decay_happiness: this.lastAffinityDecayHappiness,
      poop_timers: this.poopTimers,
      created_at: this.createdAt,
    }
  }

  update(dt: number): void {
    const now = Date.now() / 1000
    const isNight = this._isNight(now)

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

    // Stat decay — 실제 경과 시간만큼 한번에 따라잡음 (앱을 오래 안 켜도 정확히 반영).
    // 이번에 처음 0을 찍었으면 "언제부터 0이었는지"도 역산해서 사망 유예시간이
    // 오프라인이었던 동안에도 정상적으로 흘러가게 함
    const hungerTick = this._tickDecay(this.stats.hunger, this.lastHungerDecay, this.hungerDecayAccum, HUNGER_DECAY, now, this.hungerZeroSince)
    this.stats.hunger = hungerTick.value
    this.lastHungerDecay = hungerTick.lastSync
    this.hungerDecayAccum = hungerTick.accum
    this.hungerZeroSince = hungerTick.zeroSince

    const hapTick = this._tickDecay(this.stats.happiness, this.lastHapDecay, this.hapDecayAccum, HAP_DECAY, now, this.hapZeroSince)
    this.stats.happiness = hapTick.value
    this.lastHapDecay = hapTick.lastSync
    this.hapDecayAccum = hapTick.accum
    this.hapZeroSince = hapTick.zeroSince

    // 친밀도 감소 — 배고픔/행복이 THRESHOLD 밑으로 떨어져 있는 동안, 얼마나
    // 낮은지(deficit)에 비례해서 깎임. 둘 다 낮으면 양쪽에서 각각 깎여 더 빨리 감소
    const affHungerTick = this._tickAffinityDecay(this.stats.hunger, this.lastAffinityDecayHunger, now)
    this.stats.affinity = affHungerTick.affinity
    this.lastAffinityDecayHunger = affHungerTick.lastDecay

    const affHapTick = this._tickAffinityDecay(this.stats.happiness, this.lastAffinityDecayHappiness, now)
    this.stats.affinity = affHapTick.affinity
    this.lastAffinityDecayHappiness = affHapTick.lastDecay

    // Poop — 먹이줄 때마다 독립적으로 예약되므로(큐), 여러 번 먹였으면 여러 개가
    // 각자의 시간에 따로 나옴 (예전엔 변수 하나뿐이라 재먹이 시 이전 예약이 덮어써졌음)
    if (this.poopTimers.length > 0) {
      const remaining: number[] = []
      for (const t of this.poopTimers) {
        if (now >= t) {
          this.stats.poop_count++
          if (this.stats.poop_count >= 2 && !this.stats.sick) {
            this.stats.sick = true
            this.sickSince = now
            this._startDialogue('sick')
          }
        } else {
          remaining.push(t)
        }
      }
      this.poopTimers = remaining
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

    // 캐릭터가 먼저 말 거는 잡담 — 친밀도가 높을수록 더 자주 말을 검.
    // 심야(수면 중)엔 자다가 갑자기 말을 거는 게 어색해서 아예 안 뜨게 함 —
    // 타이머는 계속 쌓이다가 아침이 되면 그때 정상적으로 발생함
    if (!this.state.menuOpen && !this.state.minigameActive && !this.state.showStatus && this.state.dialogueTier === null && !isNight) {
      this.idleChatTimer += dt
      if (this.idleChatTimer >= this.idleChatInterval) {
        this.idleChatTimer = 0
        const tier = affinityTier(this.stats.affinity)
        this.idleChatInterval = rand(IDLE_CHAT_MIN, IDLE_CHAT_MAX) - tier * 20
        this._startDialogue('idle')
      }
    }

    // State-driven animations — sick/sad/sleep은 조건이 풀려도 저절로 idle로 안 돌아오므로
    // (전부 loop 애니메이션이라 계속 반복될 뿐) 명시적으로 idle로 되돌려줘야 함.
    // 단, 디버그로 미리보기 중이면 실제 스탯과 무관하게 고른 애니메이션을 그대로 유지.
    // 우선순위: 아픔 > 배고픔/행복 0(sad) > 심야 시간대(sleep) — 위급한 상태는 자는 동안에도 보이게 함
    if (!this.debugAnimActive) {
      if (this.stats.sick) this.anim.force('sick')
      else if (this.stats.hunger === 0 || this.stats.happiness === 0) this.anim.force('sad')
      else if (isNight) this.anim.force('sleep')
      else if (this.anim.currentAnim === 'sad' || this.anim.currentAnim === 'sick' || this.anim.currentAnim === 'sleep')
        this.anim.force('idle')
    }

    this.anim.update(dt, (a: AnimName) => this.images.sprites[a]?.length ?? 1)

    this.state.stats = this.stats
  }

  // 배고픔/행복 감소를 "심야 시간대를 제외한 활성 시간" 기준으로 계산 — 자는 동안(로컬
  // 새벽 1시~오전 9시)은 시계가 멈춘 것처럼 취급됨. lastSync는 매 호출마다 now로 갱신하고,
  // 아직 한 tick(interval)에 못 미치는 자투리 활성 시간은 accum에 그대로 이월해서 다음
  // 호출에 합산 — 그래서 "언제 tick이 발생했는지"를 시각으로 되짚을 필요가 없어짐.
  // 처음 0을 찍는 순간에는, 정확히 몇 번째 tick에서 0이 됐는지를 활성 시간 기준으로
  // 역산(advanceByActiveSeconds)해서 사망 유예시간이 오프라인 중에도 정상적으로 흘러가게 함.
  private _tickDecay(
    value: number, lastSync: number, accum: number, interval: number, now: number, zeroSince: number | null
  ): { value: number; lastSync: number; accum: number; zeroSince: number | null } {
    const totalActive = accum + activeSecondsBetween(lastSync, now)
    const ticks = Math.floor(totalActive / interval)
    const newAccum = totalActive - ticks * interval
    if (ticks <= 0) return { value, lastSync: now, accum: newAccum, zeroSince }

    if (value > 0 && value - ticks <= 0) {
      const neededActive = value * interval - accum
      const zeroCrossedAt = advanceByActiveSeconds(lastSync, neededActive)
      return { value: 0, lastSync: now, accum: newAccum, zeroSince: zeroCrossedAt }
    }
    const newValue = Math.max(0, value - ticks)
    return { value: newValue, lastSync: now, accum: newAccum, zeroSince: newValue === 0 ? zeroSince : null }
  }

  // 배고픔/행복 값이 AFFINITY_DECAY_THRESHOLD 이상이면 감소 없음(타이머만 리셋).
  // 그 밑이면 deficit(THRESHOLD - 값)에 비례해서 간격이 짧아짐 — 값이 낮을수록 더 자주 -1
  private _tickAffinityDecay(
    statValue: number, lastDecay: number, now: number
  ): { affinity: number; lastDecay: number } {
    if (statValue >= AFFINITY_DECAY_THRESHOLD) return { affinity: this.stats.affinity, lastDecay: now }

    const deficit = AFFINITY_DECAY_THRESHOLD - statValue
    const interval = AFFINITY_DECAY_BASE_INTERVAL / deficit
    const ticks = Math.floor((now - lastDecay) / interval)
    if (ticks <= 0) return { affinity: this.stats.affinity, lastDecay }

    return { affinity: Math.max(0, this.stats.affinity - ticks), lastDecay: lastDecay + ticks * interval }
  }

  // 각자 기기의 로컬 시간 기준 심야(수면) 시간대 여부
  private _isNight(now: number): boolean {
    const hour = new Date(now * 1000).getHours()
    return hour >= NIGHT_START_HOUR && hour < NIGHT_END_HOUR
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
    this.debugAnimActive = false
    const isNight = this._isNight(Date.now() / 1000)

    if (item === 'feed') {
      this.stats.hunger = Math.min(4, this.stats.hunger + 1)
      // 먹였으니 다음 배고픔 감소까지의 시계도 지금부터 다시 시작 —
      // 안 그러면 채워도 예전 감소 타이머가 그대로 흘러서 방금 채운 직후에 또 깎이는 버그가 있었음
      this.lastHungerDecay = Date.now() / 1000
      this.hungerDecayAccum = 0
      const maxWeight = BASE_WEIGHT + this.stats.age * WEIGHT_PER_DAY
      this.stats.weight = Math.min(maxWeight, this.stats.weight + 1)
      this._bumpAffinity(1)
      this._schedulePoop()
      this.anim.request('eat', 'happy')
      // 심야엔 자다가 반응 대사가 뜨는 게 어색해서 생략 (스탯/친밀도 반영은 그대로)
      if (!isNight && Math.random() < REACTION_CHANCE) this._startDialogue('feed')
    } else if (item === 'pet') {
      if (this.petCooldown <= 0) {
        this.stats.happiness = Math.min(4, this.stats.happiness + 1)
        this.lastHapDecay = Date.now() / 1000
        this.hapDecayAccum = 0
        this._bumpAffinity(2)
        this.petCooldown = 120
        this.anim.request('happy')
        if (!isNight && Math.random() < REACTION_CHANCE) this._startDialogue('pet')
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
      this._bumpAffinity(1)
      this.anim.request('special')
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
      this.lastHapDecay = Date.now() / 1000
      this.hapDecayAccum = 0
      this._bumpAffinity(1)
    } else if (wins[player] === pc) {
      this.state.minigameResult = 'win'
      this.stats.happiness = Math.min(4, this.stats.happiness + 2)
      this.lastHapDecay = Date.now() / 1000
      this.hapDecayAccum = 0
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
    this.poopTimers.push(Date.now() / 1000 + rand(POOP_MIN, POOP_MAX))
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
    this.debugAnimActive = true
    this.anim.set(name)
  }

  debugAffinity(value: number): void {
    this.stats.affinity = Math.max(0, Math.min(100, value))
  }

  debugWeight(value: number): void {
    // 서버 저장 검증(validateSaveData)이 나이 기준 최대치를 강제하므로, 여기서도
    // 그 상한을 넘지 않게 해야 함 — 안 그러면 이후 모든 저장이 조용히 거부되는
    // 버그가 있었음 (age를 포함한 세이브 전체가 매번 통째로 거부됨)
    const maxWeight = BASE_WEIGHT + this.stats.age * WEIGHT_PER_DAY
    this.stats.weight = Math.max(0, Math.min(maxWeight, value))
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
    // ANIM 미리보기 중이었다면 그 잠금을 풀어줘야 함 — 안 그러면 이후 실제 스탯이
    // sick/sad/sleep이어도 계속 idle로 고정된 채 안 바뀌는 버그가 있었음
    this.debugAnimActive = false
    this.anim.set('idle')
  }

  private _restart(): void {
    // 죽기 전에 성인이었으면 스프라이트를 다시 키드로 로드해야 함 — state.stage만
    // 0으로 되돌리고 onEvolve를 안 불러서, 나이/스테이지는 정확히 리셋됐는데도 화면엔
    // 계속 성인 그림이 남아있는 버그가 있었음
    const wasAdult = this.state.stage !== 0
    this.debugAnimActive = false
    this.stats = { hunger: 4, happiness: 4, affinity: 0, age: 0, weight: BASE_WEIGHT, sick: false, poop_count: 0, alive: true }
    const now = Date.now() / 1000
    this.lastHungerDecay = now
    this.lastHapDecay = now
    this.hungerDecayAccum = 0
    this.hapDecayAccum = 0
    this.lastAffinityDecayHunger = now
    this.lastAffinityDecayHappiness = now
    this.createdAt = now
    this.poopTimers = []
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
    if (wasAdult) this.onEvolve?.(0)
    this.onSave?.(this.getSaveData())
  }
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

// [fromEpoch, toEpoch) 구간에서 심야 시간대(로컬 기준 NIGHT_START_HOUR~NIGHT_END_HOUR)를
// 제외한 "활성 시간"(초). 하루 단위로 순회하며 그날의 심야 구간과 겹치는 만큼만 빼줌 —
// 오프라인으로 며칠 지나 여러 밤을 거쳤어도 정확히 반영됨
export function activeSecondsBetween(fromEpoch: number, toEpoch: number): number {
  if (toEpoch <= fromEpoch) return 0
  let total = 0
  let cursor = new Date(fromEpoch * 1000)
  let dayStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())

  while (dayStart.getTime() / 1000 < toEpoch) {
    const dayStartSec = dayStart.getTime() / 1000
    // 자정 기준 +N시간 대신 달력 시/분으로 직접 구성 — 서머타임(DST) 있는 나라에서
    // 하루가 23/25시간이 되는 날에도 시/분 표시가 어긋나지 않게 함
    const nightStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), NIGHT_START_HOUR).getTime() / 1000
    const nightEnd = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate(), NIGHT_END_HOUR).getTime() / 1000
    const nextDayStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1)
    const segStart = Math.max(dayStartSec, fromEpoch)
    const segEnd = Math.min(nextDayStart.getTime() / 1000, toEpoch)

    const nightOverlapStart = Math.max(nightStart, segStart)
    const nightOverlapEnd = Math.min(nightEnd, segEnd)
    const nightOverlap = Math.max(0, nightOverlapEnd - nightOverlapStart)

    total += Math.max(0, segEnd - segStart) - nightOverlap
    dayStart = nextDayStart
  }
  return total
}

// fromEpoch부터 "활성 시간" targetActiveSeconds만큼 지난 실제(벽시계) 시각을 찾음.
// activeSecondsBetween과 같은 심야 구간 규칙으로, 심야는 건너뛰며 전진 — 배고픔/행복이
// 정확히 몇 시에 0을 찍었는지(오프라인 구간 포함) 역산하는 데 사용
function advanceByActiveSeconds(fromEpoch: number, targetActiveSeconds: number): number {
  let remaining = targetActiveSeconds
  let cursor = fromEpoch
  if (remaining <= 0) return cursor

  while (remaining > 0) {
    const d = new Date(cursor * 1000)
    const dayDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    // 자정 기준 +N시간 대신 달력 시/분으로 직접 구성 — DST로 하루가 23/25시간이 되는
    // 날에도 시/분 표시가 어긋나지 않게 함 (activeSecondsBetween과 동일한 방식)
    const nightStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), NIGHT_START_HOUR).getTime() / 1000
    const nightEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), NIGHT_END_HOUR).getTime() / 1000
    const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate() + 1).getTime() / 1000

    if (cursor < nightStart) {
      const seg = nightStart - cursor
      if (seg >= remaining) return cursor + remaining
      remaining -= seg
      cursor = nightEnd
    } else if (cursor < nightEnd) {
      cursor = nightEnd
    } else {
      const seg = dayEnd - cursor
      if (seg >= remaining) return cursor + remaining
      remaining -= seg
      cursor = dayEnd
    }
  }
  return cursor
}
