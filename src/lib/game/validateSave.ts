import { BASE_WEIGHT, WEIGHT_PER_DAY } from './config'
import { HUNGER_DECAY, HAP_DECAY } from './engine'
import type { SaveData } from './types'

const MAX_AGE_DAYS = 3650          // 10년 — 말이 안 되는 값만 걸러내는 넉넉한 상한
const MAX_POOP_COUNT = 50
const MAX_POOP_TIMERS = 20
const FUTURE_TOLERANCE = 5 * 60    // 클라이언트-서버 시계 오차 허용치(초)
const PAST_FLOOR = 1577836800      // 2020-01-01 — 이보다 과거 타임스탬프는 값 오염으로 간주

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function inRange(v: unknown, min: number, max: number): v is number {
  return isFiniteNum(v) && v >= min && v <= max
}

// 미래로 너무 멀리 설정해서 감소 타이머를 영구히 멈추는 식의 조작을 막기 위한 체크.
// (과거는 허용 — 오프라인 캐치업 로직이 알아서 정상 처리함)
function isPlausibleTimestamp(v: unknown, now: number): v is number {
  return isFiniteNum(v) && v >= PAST_FLOOR && v <= now + FUTURE_TOLERANCE
}

// 클라이언트가 보낸 세이브 데이터를 검증 — 저장 API가 스탯을 그대로 믿고 저장하면
// curl로 배고픔/친밀도/체중/생존여부 등을 마음대로 조작(치트)할 수 있었던 것을 막기 위함.
// 통과 못 하면 null을 반환하고, 호출 쪽에서 저장을 거부한다.
export function validateSaveData(input: unknown): SaveData | null {
  if (!input || typeof input !== 'object') return null
  const d = input as Record<string, unknown>
  const now = Date.now() / 1000

  const stats = d.stats
  if (!stats || typeof stats !== 'object') return null
  const s = stats as Record<string, unknown>

  if (!inRange(s.hunger, 0, 4) || !Number.isInteger(s.hunger)) return null
  if (!inRange(s.happiness, 0, 4) || !Number.isInteger(s.happiness)) return null
  if (!inRange(s.affinity, 0, 100) || !Number.isInteger(s.affinity)) return null
  if (!inRange(s.age, 0, MAX_AGE_DAYS) || !Number.isInteger(s.age)) return null
  if (!inRange(s.poop_count, 0, MAX_POOP_COUNT) || !Number.isInteger(s.poop_count)) return null
  if (typeof s.sick !== 'boolean') return null
  if (typeof s.alive !== 'boolean') return null

  // 체중은 나이 기준 최대치(BASE_WEIGHT + age*WEIGHT_PER_DAY)를 넘을 수 없음 — engine.ts의 cap과 동일한 규칙
  const maxWeight = BASE_WEIGHT + (s.age as number) * WEIGHT_PER_DAY
  if (!inRange(s.weight, 0, maxWeight)) return null

  if (!isPlausibleTimestamp(d.last_hunger_decay, now)) return null
  if (!isPlausibleTimestamp(d.last_happiness_decay, now)) return null

  const hungerAccum = d.hunger_decay_accum ?? 0
  const hapAccum = d.happiness_decay_accum ?? 0
  if (!inRange(hungerAccum, 0, HUNGER_DECAY)) return null
  if (!inRange(hapAccum, 0, HAP_DECAY)) return null

  if (d.last_affinity_decay_hunger !== null && !isPlausibleTimestamp(d.last_affinity_decay_hunger, now)) return null
  if (d.last_affinity_decay_happiness !== null && !isPlausibleTimestamp(d.last_affinity_decay_happiness, now)) return null

  if (d.created_at !== null && !isPlausibleTimestamp(d.created_at, now)) return null

  const poopTimers = d.poop_timers
  if (poopTimers !== undefined) {
    if (!Array.isArray(poopTimers) || poopTimers.length > MAX_POOP_TIMERS) return null
    if (!poopTimers.every(t => isFiniteNum(t))) return null
  }

  return d as unknown as SaveData
}
