import type { MetadataRoute } from 'next'

// 로그인 기반 개인 서비스라 검색엔진/크롤러가 색인할 이유가 없음 — 전부 차단
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  }
}
