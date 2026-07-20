'use client'

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { GameEngine } from '@/lib/game/engine'
import { CharacterImages } from '@/lib/game/character'
import { GameRenderer } from '@/lib/game/renderer'
import { LOGICAL_W, LOGICAL_H } from '@/lib/game/config'
import type { AnimName, SaveData } from '@/lib/game/types'

export interface GameCanvasHandle {
  debugAnim: (name: AnimName) => void
  debugStage: (stage: number) => void
  debugAffinity: (value: number) => void
}

interface Props {
  characterType: string
  initialSave: SaveData | null
  onSave: (data: SaveData) => void
}

const GameCanvas = forwardRef<GameCanvasHandle, Props>(function GameCanvas(
  { characterType, initialSave, onSave },
  ref,
) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const engineRef    = useRef<GameEngine | null>(null)
  const lastTouchRef = useRef(0)

  useImperativeHandle(ref, () => ({
    debugAnim: (name: AnimName) => engineRef.current?.debugAnim(name),
    debugStage: (stage: number) => { engineRef.current?.debugStage(stage) },
    debugAffinity: (value: number) => engineRef.current?.debugAffinity(value),
  }))

  useEffect(() => {
    let cancelled = false
    let rafId = 0

    async function run() {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const ctx2d = ctx as CanvasRenderingContext2D

      const renderer = new GameRenderer()
      renderer.characterType = characterType
      try { await renderer.loadAssets() } catch (e) { console.error('loadAssets:', e) }
      if (cancelled) return

      const images = new CharacterImages()
      try { await images.loadStage(characterType, 0) } catch (e) { console.error('loadStage:', e) }
      if (cancelled) return

      const engine = new GameEngine(characterType, images)
      engine.onSave = onSave
      engine.onEvolve = async (stage) => { await images.loadStage(characterType, stage) }
      if (initialSave) engine.loadSave(initialSave)
      engineRef.current = engine

      let lastTime = performance.now()

      function loop(time: number) {
        if (cancelled) return
        const dt = Math.min((time - lastTime) / 1000, 0.1)
        lastTime = time
        engine.update(dt)
        try { renderer.draw(ctx2d, engine.state, engine.anim, images) }
        catch (e) { console.error('draw:', e) }
        rafId = requestAnimationFrame(loop)
      }
      rafId = requestAnimationFrame(loop)
    }

    run()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      engineRef.current = null
    }
  }, [characterType, initialSave, onSave])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const eng = engineRef.current
      if (!eng) return
      if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') { eng.btnLeft();   return }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { eng.btnRight();  return }
      if (e.key === ' '          || e.key === 's' || e.key === 'S') { e.preventDefault(); eng.btnCenter() }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  const hitBtn = useCallback((lx: number, ly: number) => {
    const eng = engineRef.current
    if (!eng) return
    if (lx >= 190 && lx <= 225 && ly >= 357 && ly <= 400) { eng.btnLeft();   return }
    if (lx >= 241 && lx <= 275 && ly >= 371 && ly <= 400) { eng.btnCenter(); return }
    if (lx >= 291 && lx <= 327 && ly >= 364 && ly <= 400) { eng.btnRight();  return }
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (Date.now() - lastTouchRef.current < 500) return  // 터치 후 합성 click 무시
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    hitBtn(
      (e.clientX - rect.left) * (LOGICAL_W / rect.width),
      (e.clientY - rect.top)  * (LOGICAL_H / rect.height),
    )
  }, [hitBtn])

  const handleTouch = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    lastTouchRef.current = Date.now()
    const canvas = canvasRef.current
    if (!canvas) return
    const touch = e.changedTouches[0]
    const rect  = canvas.getBoundingClientRect()
    hitBtn(
      (touch.clientX - rect.left) * (LOGICAL_W / rect.width),
      (touch.clientY - rect.top)  * (LOGICAL_H / rect.height),
    )
  }, [hitBtn])

  return (
    <canvas
      ref={canvasRef}
      width={LOGICAL_W}
      height={LOGICAL_H}
      onClick={handleClick}
      onTouchStart={handleTouch}
      style={{ display: 'block', width: '100%', maxWidth: 444, height: 'auto', cursor: 'pointer', touchAction: 'none' }}
    />
  )
})

export default GameCanvas
