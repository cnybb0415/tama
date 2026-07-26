// 서버리스 인스턴스 메모리 기반 rate limit — 완벽한 전역 제한은 아님(인스턴스가 여러 개면
// 각자 따로 카운트되지만, 스크립트형 무차별대입/스캔 시도의 속도를 크게 늦추는 기본 방어선 역할.
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = buckets.get(key)
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
