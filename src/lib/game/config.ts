import type { AnimConfig, AnimName, CharacterConfig } from './types'

export const ANIM_CONFIG: Record<AnimName, AnimConfig> = {
  idle:    { frames: 2, interval: 0.4,  loop: true,  priority: 1 },
  walk:    { frames: 4, interval: 0.2,  loop: false, priority: 2 },
  happy:   { frames: 4, interval: 0.15, loop: false, priority: 3 },
  eat:     { frames: 3, interval: 0.3,  loop: false, priority: 3 },
  sleep:   { frames: 2, interval: 1.0,  loop: true,  priority: 3 },
  sad:     { frames: 2, interval: 0.5,  loop: true,  priority: 4 },
  sick:    { frames: 2, interval: 0.5,  loop: true,  priority: 4 },
  poop:    { frames: 2, interval: 0.4,  loop: false, priority: 3 },
  angry:   { frames: 2, interval: 0.3,  loop: false, priority: 3 },
  special: { frames: 6, interval: 0.2,  loop: false, priority: 5 },
}

export const ACTION_ANIMS = new Set<AnimName>(['eat', 'happy', 'poop', 'angry', 'special'])

export const CHARACTER_CONFIGS: Record<string, CharacterConfig> = {
  kai: {
    displayName: '카이',
    evolutionDay: 7,
    stages: [
      {
        folder: '/picture/exo/kai/kid',
        prefix: 'kai_kid_',
        fileMap: { poop: 'trash', special: 'dance' },
        frameOverrides: { special: 5 },
        name: '카이 어린이',
      },
      {
        folder: '/picture/exo/kai/adult',
        prefix: '',
        fileMap: { poop: 'trash', special: 'dance' },
        frameOverrides: {},
        name: '카이 성인',
      },
    ],
  },
}

// 화면 레이아웃 (논리 531×500 기준, tamagotchi.png 기반)
export const SCREEN = { x: 185, y: 185, w: 144, h: 147 }
export const BTN = {
  left:   { x: 195, y: 362, w: 25, h: 33 },
  center: { x: 246, y: 376, w: 24, h: 19 },
  right:  { x: 296, y: 369, w: 26, h: 26 },
}
export const LOGICAL_W = 531
export const LOGICAL_H = 500

export const MENU_ITEMS = ['feed', 'play', 'pet', 'medicine', 'clean', 'status', 'special']
export const MENU_LABELS = ['밥', '놀기', '쓰다듬기', '약', '청소', '상태', '스페셜']

// 색상
export const COLOR = {
  BG:       [176, 184, 193] as const,
  SCREEN:   [26,  26,  26]  as const,
  HEART_ON: [210, 40,  40]  as const,
  HEART_OFF:[55,  55,  55]  as const,
  FACE_ON:  [210, 180, 40]  as const,
  FACE_OFF: [55,  55,  55]  as const,
}

export const toCSS = (c: readonly number[], a = 1) =>
  `rgba(${c[0]},${c[1]},${c[2]},${a})`
