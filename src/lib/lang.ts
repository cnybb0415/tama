export type Lang = 'en' | 'ko'

const KEY = 'exo_lang'

export function getLang(): Lang {
  if (typeof window === 'undefined') return 'ko'
  return (localStorage.getItem(KEY) as Lang) ?? 'ko'
}

export function setLang(lang: Lang): void {
  localStorage.setItem(KEY, lang)
  window.dispatchEvent(new CustomEvent('langchange', { detail: lang }))
}
