import { MENU_ITEMS } from './config'
import { CharacterAnim, CharacterImages, stageForAge } from './character'
import type { AnimName, GameStats, GameState, SaveData } from './types'

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
    hunger: 4, happiness: 4, age: 0, weight: 10,
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
  private lastDay = new Date().getDate()

  onSave?: (data: SaveData) => void
  onEvolve?: (stage: number) => void

  constructor(characterType: string, images: CharacterImages) {
    this.characterType = characterType
    this.images = images
    this.anim = new CharacterAnim()
  }

  loadSave(data: SaveData): void {
    this.stats = data.stats
    this.lastHungerDecay = data.last_hunger_decay || Date.now() / 1000
    this.lastHapDecay    = data.last_happiness_decay || Date.now() / 1000
    this.poopTimer       = data.poop_timer ?? null
    this.lastDay         = data.last_day || new Date().getDate()
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
      last_day: this.lastDay,
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

    // Age
    const today = new Date().getDate()
    if (today !== this.lastDay) {
      this.stats.age++
      this.lastDay = today
      const newStage = stageForAge(this.stats.age, this.characterType)
      if (newStage !== this.state.stage) {
        this.state.stage = newStage
        this.state.evolveFlash = 1.2
        this.anim.set('happy')
        this.onEvolve?.(newStage)
      }
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
      this.anim.request('poop')
      if (this.stats.poop_count >= 2 && !this.stats.sick) {
        this.stats.sick = true
        this.sickSince = now
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

    // Walk
    if (!this.state.menuOpen && !this.state.minigameActive) {
      this.walkTimer += dt
      if (this.walkTimer >= this.walkInterval) {
        this.walkTimer = 0
        this.walkInterval = rand(WALK_MIN, WALK_MAX)
        this.anim.request('walk')
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
      this.stats.weight++
      this._schedulePoop()
      this.anim.request('eat', 'happy')
    } else if (item === 'pet') {
      if (this.petCooldown <= 0) {
        this.stats.happiness = Math.min(4, this.stats.happiness + 1)
        this.petCooldown = 120
        this.anim.request('happy')
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
        this.anim.request('happy')
      }
    } else if (item === 'clean') {
      if (this.stats.poop_count > 0) {
        this.stats.poop_count = 0
        this.anim.request('happy')
      }
    } else if (item === 'status') {
      this.state.showStatus = true
      this.state.statusTimer = 4
    } else if (item === 'special') {
      this.anim.request('special', 'happy')
    }

    this.onSave?.(this.getSaveData())
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
    } else if (wins[player] === pc) {
      this.state.minigameResult = 'win'
      this.stats.happiness = Math.min(4, this.stats.happiness + 2)
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

  private _restart(): void {
    this.stats = { hunger: 4, happiness: 4, age: 0, weight: 10, sick: false, poop_count: 0, alive: true }
    const now = Date.now() / 1000
    this.lastHungerDecay = now
    this.lastHapDecay = now
    this.poopTimer = null
    this.hungerZeroSince = null
    this.hapZeroSince = null
    this.sickSince = null
    this.state.deathAlpha = 0
    this.state.deathTimer = 0
    this.state.menuOpen = false
    this.state.minigameActive = false
    this.state.showStatus = false
    this.state.stage = 0
    this.anim.set('idle')
    this.onSave?.(this.getSaveData())
  }
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}
