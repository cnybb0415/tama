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
    displayName: 'KAI',
    evolutionDay: 7,
    stages: [
      { folder: '/picture/exo/kai/kid',      prefix: 'kai_kid_',      fileMap: { poop: 'trash', special: 'dance' },            frameOverrides: { special: 5 }, name: 'KAI (Kid)'      },
      { folder: '/picture/exo/kai/adult',     prefix: '',              fileMap: { poop: 'trash', special: 'dance' },            frameOverrides: {},             name: 'KAI'            },
    ],
  },
  chanyeol: {
    displayName: 'CHANYEOL',
    evolutionDay: 7,
    stages: [
      { folder: '/picture/exo/chanyeol/kid',  prefix: 'chanyeol_kid_', fileMap: { poop: 'trash', special: 'ferret' },          frameOverrides: { special: 5 }, name: 'CHANYEOL (Kid)' },
      { folder: '/picture/exo/chanyeol/adult',prefix: '',              fileMap: { poop: 'trash', special: 'basketball_detail' },frameOverrides: {},             name: 'CHANYEOL'       },
    ],
  },
  do: {
    displayName: 'D.O.',
    evolutionDay: 7,
    stages: [
      { folder: '/picture/exo/do/kid',        prefix: 'dio_kid_',      fileMap: { poop: 'trash', special: 'bedding' },         frameOverrides: { special: 5 }, name: 'D.O. (Kid)'     },
      { folder: '/picture/exo/do/adult',      prefix: '',              fileMap: { poop: 'trash', special: 'cooking' },         frameOverrides: {},             name: 'D.O.'           },
    ],
  },
  ray: {
    displayName: 'LAY',
    evolutionDay: 7,
    stages: [
      { folder: '/picture/exo/ray/kid',       prefix: 'ray_kid_',      fileMap: { poop: 'trash', special: 'dance2' },          frameOverrides: { special: 5 }, name: 'LAY (Kid)'      },
      { folder: '/picture/exo/ray/adult',     prefix: '',              fileMap: { poop: 'trash', special: 'handstand' },       frameOverrides: { special: 5 }, name: 'LAY'            },
    ],
  },
  sehun: {
    displayName: 'SEHUN',
    evolutionDay: 7,
    stages: [
      { folder: '/picture/exo/sehun/kid',     prefix: 'sehun_kid_',    fileMap: { poop: 'trash', special: 'run' },             frameOverrides: { special: 5 }, name: 'SEHUN (Kid)'    },
      { folder: '/picture/exo/sehun/adult',   prefix: '',              fileMap: { poop: 'trash', special: 'magic_walk' },      frameOverrides: {},             name: 'SEHUN'          },
    ],
  },
  suho: {
    displayName: 'SUHO',
    evolutionDay: 7,
    stages: [
      { folder: '/picture/exo/suho/kid',      prefix: 'suho_kid_',     fileMap: { poop: 'trash', special: 'study' },           frameOverrides: { special: 4 }, name: 'SUHO (Kid)'     },
      { folder: '/picture/exo/suho/adult',    prefix: '',              fileMap: { poop: 'trash', special: 'guitar' },          frameOverrides: {},             name: 'SUHO'           },
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
export const MENU_LABELS = ['Eat', 'Play', 'Hug', 'Heal', 'Shower', 'Status', 'Special']

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
