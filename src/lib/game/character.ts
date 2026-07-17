import { ANIM_CONFIG, ACTION_ANIMS, CHARACTER_CONFIGS } from './config'
import type { AnimName } from './types'

export class CharacterImages {
  sprites: Record<AnimName, HTMLImageElement[]> = {} as Record<AnimName, HTMLImageElement[]>
  stage = 0

  async loadStage(characterType: string, stage: number): Promise<void> {
    const cfg = CHARACTER_CONFIGS[characterType].stages[stage]
    const anims = Object.keys(ANIM_CONFIG) as AnimName[]

    await Promise.all(anims.map(async (anim) => {
      const fileAnim = (cfg.fileMap[anim] ?? anim) as string
      const nFrames = cfg.frameOverrides[anim] ?? ANIM_CONFIG[anim].frames
      const frames: HTMLImageElement[] = []
      let lastLoaded: HTMLImageElement | null = null

      for (let i = 1; i <= nFrames; i++) {
        const img = new Image()
        const src = `${cfg.folder}/${cfg.prefix}${fileAnim}_${String(i).padStart(2, '0')}.png`
        await new Promise<void>(resolve => {
          img.onload = () => { lastLoaded = img; resolve() }
          img.onerror = () => resolve()
          img.src = src
        })
        frames.push(lastLoaded ?? img)
      }
      this.sprites[anim] = frames
    }))

    this.stage = stage
  }
}

export class CharacterAnim {
  currentAnim: AnimName = 'idle'
  currentFrame = 0
  frameTimer = 0
  nextAnim: AnimName | null = null
  walkDirection = 1
  walkOffsetX = 0
  flipped = false
  walkCyclesLeft = 0

  update(dt: number, spriteCount: (anim: AnimName) => number): void {
    const cfg = ANIM_CONFIG[this.currentAnim]
    this.frameTimer += dt
    if (this.frameTimer < cfg.interval) return
    this.frameTimer -= cfg.interval

    if (this.currentAnim === 'walk') {
      this.walkOffsetX += this.walkDirection * 10
      this.walkOffsetX = Math.max(-32, Math.min(32, this.walkOffsetX))
    }

    this.currentFrame++
    const total = spriteCount(this.currentAnim)
    if (this.currentFrame >= total) {
      if (cfg.loop) {
        this.currentFrame = 0
      } else if (this.currentAnim === 'walk' && this.walkCyclesLeft > 0) {
        this.walkCyclesLeft--
        this.walkDirection = -this.walkDirection
        this.flipped = this.walkDirection < 0
        this.walkOffsetX = 0
        this.currentFrame = 0
      } else {
        this._start(this.nextAnim ?? 'idle')
        this.nextAnim = null
      }
    }
  }

  request(anim: AnimName, next?: AnimName): void {
    const np = ANIM_CONFIG[anim].priority
    const cp = ANIM_CONFIG[this.currentAnim].priority
    if (np >= cp) {
      if (this.currentAnim === anim && ANIM_CONFIG[anim].loop) return
      this._start(anim, next)
    }
  }

  force(anim: AnimName): void {
    if (ACTION_ANIMS.has(this.currentAnim)) return
    if (this.currentAnim === anim) return
    this._start(anim)
  }

  set(anim: AnimName, next?: AnimName): void {
    this._start(anim, next)
  }

  private _start(anim: AnimName, next?: AnimName): void {
    if (anim === 'walk') {
      this.walkDirection = Math.random() < 0.5 ? -1 : 1
      this.walkOffsetX = 0
      this.flipped = this.walkDirection < 0
      this.walkCyclesLeft = 2
    } else {
      this.walkOffsetX = 0
      this.flipped = false
      this.walkCyclesLeft = 0
    }
    this.currentAnim = anim
    this.currentFrame = 0
    this.frameTimer = 0
    this.nextAnim = next ?? null
  }
}

export function stageForAge(age: number, characterType: string): number {
  const ev = CHARACTER_CONFIGS[characterType].evolutionDay
  if (ev === null || age < ev) return 0
  return 1
}
