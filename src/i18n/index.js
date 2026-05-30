import React, { createContext, useContext, useState } from 'react'
import { hi, mr } from './translations.js'

const LANG_KEY = '__tm_lang__'
const maps = { hi, mr }

export const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(LANG_KEY) || 'en')

  const setLang = (l) => {
    localStorage.setItem(LANG_KEY, l)
    setLangState(l)
  }

  return React.createElement(LanguageContext.Provider, { value: { lang, setLang } }, children)
}

export function useLanguage() {
  return useContext(LanguageContext)
}

/** Main hook — use in every page: const { t } = useT() */
export function useT() {
  const ctx = useContext(LanguageContext)
  const lang = ctx?.lang || 'en'
  const t = (key) => {
    if (!key) return key
    if (lang === 'en') return key
    return maps[lang]?.[key] ?? key
  }
  return { t, lang }
}
