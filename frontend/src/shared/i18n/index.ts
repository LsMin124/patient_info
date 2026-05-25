import { en } from './en'
import { ko } from './ko'
import type { Translations } from './types'

export type Locale = 'ko' | 'en'
export type { Translations }

const dictionaries: Record<Locale, Translations> = { ko, en }

// Defaulting to English so first-time visitors and operators outside the
// clinic see the UI in English. The locale toggle in Settings still flips
// to Korean and persists per-user via localStorage.
export const DEFAULT_LOCALE: Locale = 'en'

export function t(locale: Locale, key: KeyPath): string {
  const value = pickByPath(dictionaries[locale], key)
  if (typeof value === 'string') return value

  const fallback = pickByPath(dictionaries[DEFAULT_LOCALE], key)
  if (typeof fallback === 'string') {
    if (import.meta.env.DEV) {
      console.warn(
        `[i18n] missing key "${key}" for locale "${locale}", falling back to "${DEFAULT_LOCALE}"`,
      )
    }
    return fallback
  }

  if (import.meta.env.DEV) {
    console.warn(`[i18n] missing key "${key}" in all locales`)
  }
  return key
}

function pickByPath(dict: Translations, path: string): string | undefined {
  const parts = path.split('.')
  let current: unknown = dict
  for (const p of parts) {
    if (current && typeof current === 'object' && p in (current as object)) {
      current = (current as Record<string, unknown>)[p]
    } else {
      return undefined
    }
  }
  return typeof current === 'string' ? current : undefined
}

type NestedKeys<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${NestedKeys<T[K]>}`
}[keyof T & string]

export type KeyPath = NestedKeys<Translations>
