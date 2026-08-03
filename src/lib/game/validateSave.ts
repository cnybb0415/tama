import { BASE_WEIGHT, WEIGHT_PER_DAY } from './config'
import { HUNGER_DECAY, HAP_DECAY } from './engine'
import type { SaveData } from './types'

const MAX_AGE_DAYS = 3650          // 10년 — 말이 안 되는 값만 걸러내는 넉넉한 상한
const MAX_POOP_COUNT = 50
const MAX_POOP_TIMERS = 20
const FUTURE_TOLERANCE = 30 * 60   // 클라이언트-서버 시계 오차 허용치(초) — 실제 기기
                                    // 시계 오차로 정상 저장이 거부되는 걸 막기 위해 넉넉하게 잡음.
                                    // 치트로 의미 있으려면 몇 시간~며칠 단위가 필요해서 30분 정도
                                    // 여유를 줘도 "감소 영구 정지" 같은 조작 방지 효과는 그대로임
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
//
// existingCreatedAt: 이 캐릭터의 기존 세이브가 있다면 그 created_at(서버가 이미 확정한 값).
// 없으면(첫 저장) undefined — 이번에 클라이언트가 보낸 값을 그대로 최초 확정값으로 씀.
// created_at을 이렇게 고정해도, age 필드 자체를 그거랑 무관하게 직접 조작해서 보내면
// 여전히 진화/체중 상한을 우회할 수 있으므로, age가 "실제 경과 시간으로 가능한 최대치"를
// 넘지 않는지도 같이 검증한다.
//
// skipAgeLock: 관리자 계정의 디버그 STAGE 버튼처럼, 의도적으로 나이를 앞당겨 미리보기
// 하는 기능까지 이 검증에 막히면 안 되므로, 신뢰된 admin 요청에 한해 이 잠금을 건너뜀
export function validateSaveData(input: unknown, existingCreatedAt?: number | null, skipAgeLock = false): SaveData | null {
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

  if (skipAgeLock) {
    // admin 디버그 도구는 나이/생성시각을 의도적으로 조작해 미리보기 하므로 그대로 신뢰
    d.created_at = (d.created_at as number | null) ?? existingCreatedAt ?? null
  } else {
    // created_at 확정: age가 0으로 리셋되는 경우(최초 생성 또는 재시작)엔 클라이언트가
    // 보낸 값(=지금 시각)을 그대로 신뢰함 — age=0은 어차피 최솟값이라 조작해도 득이 없음.
    // age가 0보다 큰데 기존 세이브가 있으면 그 created_at으로 강제 고정(클라이언트 값 무시) —
    // 안 그러면 created_at을 조작해서 나이를 부풀릴 수 있음.
    // (예전엔 age=0이어도 무조건 기존 값으로 고정해버려서, 재시작해도 created_at이 안 바뀌고
    //  다음 로드 때 나이가 다시 예전 값으로 튀어오르는 버그가 있었음)
    const createdAt = (s.age === 0 || existingCreatedAt === undefined)
      ? (d.created_at as number | null)
      : existingCreatedAt
    d.created_at = createdAt

    // age는 확정된 created_at 기준으로 실제 경과 가능한 최대치를 넘을 수 없음 —
    // 안 그러면 created_at을 고정해도 age만 직접 조작해서 진화를 앞당길 수 있었음
    if (createdAt != null) {
      const maxPlausibleAge = Math.floor((now - createdAt) / 86400)
      if ((s.age as number) > maxPlausibleAge) return null
    }
  }

  const poopTimers = d.poop_timers
  if (poopTimers !== undefined) {
    if (!Array.isArray(poopTimers) || poopTimers.length > MAX_POOP_TIMERS) return null
    if (!poopTimers.every(t => isFiniteNum(t))) return null
  }

  return d as unknown as SaveData
}
