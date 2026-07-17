'use client'

import { useState, useEffect } from 'react'
import { getLang, setLang as _set, type Lang } from '@/lib/lang'
import { T } from '@/lib/i18n'

export function useLang() {
  const [lang, setLangState] = useState<Lang>('ko')

  useEffect(() => {
    setLangState(getLang())
    const handler = (e: Event) => setLangState((e as CustomEvent<Lang>).detail)
    window.addEventListener('langchange', handler)
    return () => window.removeEventListener('langchange', handler)
  }, [])

  return { lang, t: T[lang], setLang: _set }
}
