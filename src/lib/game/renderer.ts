import { SCREEN, BTN, COLOR, MENU_ITEMS, toCSS, LOGICAL_W, LOGICAL_H } from './config'
import { CHARACTER_CONFIGS } from './config'
import { getLang } from '../lang'
import { T } from '../i18n'
import type { CharacterAnim, CharacterImages } from './character'
import type { GameState } from './types'

const KO_FONT = '11px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'
const SM_FONT = 'bold 10px Courier, monospace'
const MD_FONT = 'bold 13px Courier, monospace'

export class GameRenderer {
  private bodyImg: HTMLImageElement | null = null
  private bgImg:   HTMLImageElement | null = null
  private btnImgs: Record<string, HTMLImageElement> = {}
  characterType = 'kai'
  private get _t() { return T[getLang()] }

  async loadAssets(): Promise<void> {
    this.bodyImg = await loadImg('/picture/tamagotchi/tamagotchi.png').catch(() => null)
    this.bgImg   = await loadImg('/picture/background.png').catch(() => null)
    for (const side of ['left', 'center', 'right']) {
      for (const st of ['normal', 'pressed']) {
        const key = `${side}_${st}`
        this.btnImgs[key] = await loadImg(`/picture/tamagotchi/btn_${side}_${st}.png`).catch(() => null as unknown as HTMLImageElement)
      }
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    anim: CharacterAnim,
    images: CharacterImages,
  ): void {
    const { stats } = state

    // 1. 캔버스 초기화 (투명) — 바깥 영역은 페이지 배경이 비침
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H)

    // 2. 스크린 영역에만 background.png (클리핑)
    if (this.bgImg) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h)
      ctx.clip()
      ctx.drawImage(this.bgImg, SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h)
      ctx.restore()
    } else {
      ctx.fillStyle = toCSS(COLOR.SCREEN)
      ctx.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h)
    }

    // 3. 타마고치 바디 (투명 스크린+외부 → 위 배경이 비침)
    if (this.bodyImg) ctx.drawImage(this.bodyImg, 0, 0, LOGICAL_W, LOGICAL_H)

    if (!stats.alive) {
      this._drawChar(ctx, anim, images)
      this._drawDeath(ctx, state.deathAlpha)
    } else {
      this._drawChar(ctx, anim, images)

      if (state.minigameActive) {
        this._drawMinigame(ctx, state)
      } else if (state.menuOpen) {
        this._drawMenu(ctx, state.menuIndex)
      } else if (state.showStatus) {
        this._drawStatusPanel(ctx, stats, state.stage)
      } else {
        this._drawPoopPiles(ctx, stats.poop_count)
        this._drawHud(ctx, stats)
        this._drawAlerts(ctx, stats)
      }

      if (state.evolveFlash > 0) this._drawEvolveFlash(ctx, state.evolveFlash, state.stage)
    }

    this._drawButtons(ctx, state.btnFlash)
  }

  // ── Character ───────────────────────────────────────────────────────────

  private _drawChar(ctx: CanvasRenderingContext2D, anim: CharacterAnim, images: CharacterImages): void {
    const frames = images.sprites[anim.currentAnim]
    if (!frames?.length) return
    const img = frames[Math.min(anim.currentFrame, frames.length - 1)]
    if (!img.complete || !img.naturalWidth) return

    const maxW = SCREEN.w - 4
    const maxH = SCREEN.h - 4
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight)
    const nw = img.naturalWidth * scale
    const nh = img.naturalHeight * scale

    const cx = SCREEN.x + SCREEN.w / 2
    const cy = SCREEN.y + SCREEN.h / 2
    let x = cx - nw / 2 + anim.walkOffsetX
    x = Math.max(SCREEN.x, Math.min(SCREEN.x + SCREEN.w - nw, x))
    const y = cy - nh / 2

    ctx.save()
    if (anim.flipped) {
      ctx.translate(x + nw, y)
      ctx.scale(-1, 1)
      ctx.drawImage(img, 0, 0, nw, nh)
    } else {
      ctx.drawImage(img, x, y, nw, nh)
    }
    ctx.restore()
  }

  // ── HUD ────────────────────────────────────────────────────────────────

  private _drawHud(ctx: CanvasRenderingContext2D, stats: GameState['stats']): void {
    for (let i = 0; i < 4; i++) {
      this._heart(ctx, SCREEN.x + 6 + i * 20, SCREEN.y + 6, i < stats.hunger)
    }
    for (let i = 0; i < 4; i++) {
      this._face(ctx, SCREEN.x + 6 + i * 20, SCREEN.y + SCREEN.h - 20, i < stats.happiness)
    }
  }

  private _heart(ctx: CanvasRenderingContext2D, x: number, y: number, filled: boolean): void {
    const c = toCSS(filled ? COLOR.HEART_ON : COLOR.HEART_OFF)
    ctx.fillStyle = c
    circle(ctx, x + 3, y + 4, 4)
    circle(ctx, x + 9, y + 4, 4)
    poly(ctx, [[x, y + 5], [x + 6, y + 13], [x + 12, y + 5]])
  }

  private _face(ctx: CanvasRenderingContext2D, x: number, y: number, filled: boolean): void {
    const c = toCSS(filled ? COLOR.FACE_ON : COLOR.FACE_OFF)
    ctx.fillStyle = c
    circle(ctx, x + 7, y + 7, 7)
    const sc = toCSS(COLOR.SCREEN)
    ctx.fillStyle = sc
    circle(ctx, x + 5, y + 6, 1)
    circle(ctx, x + 9, y + 6, 1)
    if (filled) {
      ctx.strokeStyle = sc; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(x + 7, y + 8, 3, 0, Math.PI); ctx.stroke()
    } else {
      ctx.strokeStyle = sc; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x + 5, y + 10); ctx.lineTo(x + 9, y + 10); ctx.stroke()
    }
  }

  // ── Status Panel ────────────────────────────────────────────────────────

  private _drawStatusPanel(ctx: CanvasRenderingContext2D, stats: GameState['stats'], stage: number): void {
    overlay(ctx, SCREEN, 0, 0, 0, 215)
    const sx = SCREEN.x; let y = SCREEN.y + 7
    const cx = SCREEN.x + SCREEN.w / 2

    const stageName = CHARACTER_CONFIGS[this.characterType]?.stages[stage]?.name ?? ''
    ctx.fillStyle = '#ddd'; ctx.font = KO_FONT; ctx.textAlign = 'center'
    ctx.fillText(`◆ ${stageName}`, cx, y + 10); y += 16
    hline(ctx, sx + 5, SCREEN.x + SCREEN.w - 5, y, '#444'); y += 6

    // Hearts
    ctx.fillStyle = '#888'; ctx.textAlign = 'left'; ctx.font = KO_FONT
    ctx.fillText(this._t.hunger, sx + 6, y + 10)
    for (let i = 0; i < 4; i++) this._heart(ctx, sx + 52 + i * 17, y, i < stats.hunger)
    y += 20

    // Faces
    ctx.fillText(this._t.happy, sx + 6, y + 10)
    for (let i = 0; i < 4; i++) this._face(ctx, sx + 52 + i * 17, y, i < stats.happiness)
    y += 22

    hline(ctx, sx + 5, SCREEN.x + SCREEN.w - 5, y, '#444'); y += 6

    const t = this._t
    const rows: [string, string, string][] = [
      [t.age,         `${stats.age}${t.ageUnit}`,       '#ccc'],
      [t.weight,      `${stats.weight}${t.weightUnit}`, '#ccc'],
      [t.statusLabel, stats.sick ? t.sick : t.healthy,  stats.sick ? '#e06464' : '#64e064'],
      [t.poop,        `${stats.poop_count}`,            stats.poop_count > 0 ? '#c8a040' : '#888'],
    ]
    for (const [label, value, vc] of rows) {
      ctx.fillStyle = '#888'; ctx.textAlign = 'left'; ctx.font = KO_FONT
      ctx.fillText(label, sx + 8, y + 10)
      ctx.fillStyle = vc; ctx.textAlign = 'right'
      ctx.fillText(value, SCREEN.x + SCREEN.w - 8, y + 10)
      y += 17
    }

    ctx.fillStyle = '#555'; ctx.textAlign = 'center'; ctx.font = SM_FONT
    ctx.fillText(this._t.sClose, cx, SCREEN.y + SCREEN.h - 5)
    ctx.textAlign = 'left'
  }

  // ── Alerts ──────────────────────────────────────────────────────────────

  private _drawAlerts(ctx: CanvasRenderingContext2D, stats: GameState['stats']): void {
    ctx.font = MD_FONT
    if (stats.sick) {
      ctx.fillStyle = 'rgba(220,220,80,1)'
      ctx.fillText('X', SCREEN.x + SCREEN.w - 14, SCREEN.y + 16)
    }
    if (stats.hunger === 0 || stats.happiness === 0) {
      ctx.fillStyle = 'rgba(220,80,80,1)'
      ctx.fillText('!', SCREEN.x + 3, SCREEN.y + 16)
    }
  }

  // ── Poop Piles ──────────────────────────────────────────────────────────

  private _drawPoopPiles(ctx: CanvasRenderingContext2D, count: number): void {
    if (count <= 0) return
    const cx = SCREEN.x + SCREEN.w / 2
    const sets = [
      [cx],
      [cx - 24, cx + 24],
      [cx - 32, cx + 4, cx + 32],
      [cx - 38, cx - 13, cx + 13, cx + 38],
    ]
    const xList = sets[Math.min(count, 4) - 1]
    const py = SCREEN.y + SCREEN.h - 38
    for (const px of xList) {
      ctx.fillStyle = 'rgba(70,40,10,1)'
      ellipse(ctx, px, py, 8, 6)
      ctx.fillStyle = 'rgba(130,75,20,1)'
      ellipse(ctx, px, py, 5.5, 4.5)
      ctx.fillStyle = 'rgba(70,40,10,1)'
      ellipse(ctx, px, py - 9, 5.5, 5)
      ctx.fillStyle = 'rgba(130,75,20,1)'
      ellipse(ctx, px, py - 9, 3.5, 3.5)
      ctx.fillStyle = 'rgba(70,40,10,1)'
      circle(ctx, px, py - 16, 4)
      ctx.fillStyle = 'rgba(130,75,20,1)'
      circle(ctx, px, py - 16, 3)
    }
  }

  // ── Menu ────────────────────────────────────────────────────────────────

  private _drawMenu(ctx: CanvasRenderingContext2D, menuIndex: number): void {
    overlay(ctx, { x: SCREEN.x, y: SCREEN.y, w: SCREEN.w, h: 27 }, 0, 0, 0, 200)

    const visible = 5
    const n = MENU_ITEMS.length
    const start = Math.max(0, Math.min(menuIndex - Math.floor(visible / 2), n - visible))
    const slotW = SCREEN.w / visible

    for (let slot = 0; slot < visible; slot++) {
      const idx = start + slot
      if (idx >= n) break
      const isSel = idx === menuIndex
      const sx = SCREEN.x + slot * slotW + slotW / 2
      const sy = SCREEN.y + 10

      if (isSel) {
        roundRect(ctx, sx - 9, sy - 9, 18, 18, 3, 'rgba(230,230,230,1)')
      }
      this._menuIcon(ctx, MENU_ITEMS[idx], sx, sy, isSel ? '#141414' : '#a0a0a0')
    }

    ctx.fillStyle = '#ddd'; ctx.font = KO_FONT; ctx.textAlign = 'center'
    ctx.fillText(this._t.menu[menuIndex], SCREEN.x + SCREEN.w / 2, SCREEN.y + 27)
    ctx.textAlign = 'left'
  }

  private _menuIcon(ctx: CanvasRenderingContext2D, kind: string, cx: number, cy: number, c: string): void {
    ctx.fillStyle = c; ctx.strokeStyle = c

    if (kind === 'feed') {
      ctx.lineWidth = 1
      arc(ctx, cx, cy + 3, 5, Math.PI, 0)
      ctx.strokeStyle = c; ctx.beginPath()
      ctx.moveTo(cx - 5, cy - 1); ctx.lineTo(cx + 5, cy - 1); ctx.stroke()
      for (const dx of [-3, 0, 3]) circle(ctx, cx + dx, cy - 4, 1)
    } else if (kind === 'pet') {
      // 하트 (쓰다듬기)
      circle(ctx, cx - 2, cy, 3)
      circle(ctx, cx + 2, cy, 3)
      poly(ctx, [[cx - 5, cy + 2], [cx, cy + 7], [cx + 5, cy + 2]])
    } else if (kind === 'play') {
      poly(ctx, [[cx - 4, cy - 5], [cx - 4, cy + 5], [cx + 5, cy]])
    } else if (kind === 'medicine') {
      ctx.fillRect(cx - 1, cy - 5, 3, 10)
      ctx.fillRect(cx - 5, cy - 1, 10, 3)
    } else if (kind === 'clean') {
      circle(ctx, cx, cy + 2, 4)
      poly(ctx, [[cx, cy - 6], [cx - 3, cy + 1], [cx + 3, cy + 1]])
    } else if (kind === 'status') {
      for (let i = 0; i < 3; i++) {
        const h = [4, 7, 5][i]
        ctx.fillRect(cx - 5 + i * 4, cy + 4 - h, 3, h)
      }
    } else if (kind === 'special') {
      circle(ctx, cx - 2, cy + 4, 3)
      ctx.lineWidth = 2; ctx.strokeStyle = c
      ctx.beginPath(); ctx.moveTo(cx + 1, cy + 4); ctx.lineTo(cx + 1, cy - 5)
      ctx.lineTo(cx + 6, cy - 3); ctx.stroke()
      circle(ctx, cx + 6, cy - 2, 2)
    }
  }

  // ── Minigame ────────────────────────────────────────────────────────────

  private _drawMinigame(ctx: CanvasRenderingContext2D, state: GameState): void {
    overlay(ctx, SCREEN, 0, 0, 0, 175)
    const cx = SCREEN.x + SCREEN.w / 2

    if (state.minigamePhase === 'choosing') {
      ctx.fillStyle = '#d2d2d2'; ctx.font = KO_FONT; ctx.textAlign = 'center'
      ctx.fillText(this._t.rps, cx, SCREEN.y + 26)

      const choices = this._t.rpsChoices
      const bw = 37; const bh = 44; const gap = 6
      const totalW = bw * 3 + gap * 2
      const bx0 = cx - totalW / 2
      const by = SCREEN.y + 40

      choices.forEach(([key, name], i) => {
        const bx = bx0 + i * (bw + gap)
        roundRect(ctx, bx, by, bw, bh, 5, '#323232', '#787878')
        ctx.fillStyle = '#d2d2d2'; ctx.textAlign = 'center'; ctx.font = SM_FONT
        ctx.fillText(key, bx + bw / 2, by + 16)
        ctx.strokeStyle = '#5a5a5a'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(bx + 4, by + 20); ctx.lineTo(bx + bw - 4, by + 20); ctx.stroke()
        ctx.fillStyle = '#aaa'; ctx.font = KO_FONT
        ctx.fillText(name, bx + bw / 2, by + 34)
      })
      ctx.textAlign = 'left'
    } else {
      const colors: Record<string, string> = { win: '#50dc50', lose: '#dc5050', draw: '#dccc50' }
      const t = this._t
      const resultLabels: Record<string, string> = { win: t.win, lose: t.lose, draw: t.draw }
      const member = CHARACTER_CONFIGS[this.characterType]?.displayName ?? 'AI'
      const you = t.choiceText[state.minigamePlayer ?? ''] ?? '?'
      const me  = t.choiceText[state.minigamePc ?? ''] ?? '?'

      ctx.fillStyle = '#aaa'; ctx.font = KO_FONT; ctx.textAlign = 'center'
      ctx.fillText(`${t.me}: ${you}  vs  ${member}: ${me}`, cx, SCREEN.y + SCREEN.h / 2 - 14)
      ctx.fillStyle = colors[state.minigameResult ?? ''] ?? '#ccc'
      ctx.fillText(resultLabels[state.minigameResult ?? ''] ?? '?', cx, SCREEN.y + SCREEN.h / 2 + 4)
      ctx.fillStyle = '#555'; ctx.font = SM_FONT
      ctx.fillText(t.sClose, cx, SCREEN.y + SCREEN.h / 2 + 24)
      ctx.textAlign = 'left'
    }
  }

  // ── Death ───────────────────────────────────────────────────────────────

  private _drawDeath(ctx: CanvasRenderingContext2D, alpha: number): void {
    overlay(ctx, SCREEN, 0, 0, 0, Math.min(alpha, 200))
    if (alpha > 60) {
      const cx = SCREEN.x + SCREEN.w / 2
      ctx.textAlign = 'center'
      ctx.fillStyle = `rgba(180,180,180,${alpha / 200})`; ctx.font = 'bold 28px Courier'
      ctx.fillText('...', cx, SCREEN.y + 45)
      ctx.fillStyle = `rgba(120,120,120,${alpha / 200})`; ctx.font = SM_FONT
      ctx.fillText(this._t.goodbye, cx, SCREEN.y + 65)
      ctx.fillStyle = `rgba(100,100,100,${alpha / 200})`
      ctx.fillText(this._t.restart, cx, SCREEN.y + 80)
      ctx.textAlign = 'left'
    }
  }

  // ── Evolve Flash ────────────────────────────────────────────────────────

  private _drawEvolveFlash(ctx: CanvasRenderingContext2D, t: number, stage: number): void {
    const alpha = t > 0.8
      ? Math.floor((1.2 - t) / 0.4 * 210)
      : Math.floor(t / 0.8 * 210)
    overlay(ctx, SCREEN, 255, 255, 255, alpha)
    if (t > 0.5) {
      const name = CHARACTER_CONFIGS[this.characterType]?.stages[stage]?.name ?? ''
      ctx.fillStyle = `rgba(40,40,40,${alpha / 210})`
      ctx.font = KO_FONT; ctx.textAlign = 'center'
      ctx.fillText(name, SCREEN.x + SCREEN.w / 2, SCREEN.y + SCREEN.h / 2 + 4)
      ctx.textAlign = 'left'
    }
  }

  // ── Buttons ─────────────────────────────────────────────────────────────

  private _drawButtons(ctx: CanvasRenderingContext2D, flash: Record<string, number>): void {
    for (const [side, pos] of [
      ['left',   BTN.left],
      ['center', BTN.center],
      ['right',  BTN.right],
    ] as const) {
      if (flash[side] > 0) {
        const img = this.btnImgs[`${side}_pressed`]
        if (!img?.complete || !img.naturalWidth) continue
        const scale = 0.4
        const iw = img.naturalWidth  * scale
        const ih = img.naturalHeight * scale
        const cx = pos.x + pos.w / 2
        const cy = pos.y + pos.h / 2
        ctx.drawImage(img, cx - iw / 2, cy - ih / 2, iw, ih)
      }
    }
  }
}

// ── Canvas helpers ──────────────────────────────────────────────────────────

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
}

function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill()
}

function poly(ctx: CanvasRenderingContext2D, pts: [number, number][]): void {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1])
  for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y)
  ctx.closePath(); ctx.fill()
}

function arc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, start: number, end: number): void {
  ctx.beginPath(); ctx.arc(cx, cy, r, start, end); ctx.stroke()
}

function hline(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, color: string): void {
  ctx.strokeStyle = color; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
  fill?: string, stroke?: string
): void {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke() }
}

function overlay(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
  r: number, g: number, b: number, alpha: number
): void {
  ctx.fillStyle = `rgba(${r},${g},${b},${alpha / 255})`
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
}

async function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
