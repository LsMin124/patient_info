import type { ReactNode } from 'react'

import { usePiiMask } from '../shared/hooks/PiiMaskProvider'
import { useTheme, type Theme } from '../shared/hooks/ThemeProvider'
import { useT } from '../shared/hooks/useT'
import type { Locale } from '../shared/i18n'
import { useLocaleContext } from '../shared/i18n/LocaleProvider'
import { Button } from '../shared/ui/Button'

import './settings-page.css'

/**
 * /settings — global preferences. All three controls are persisted by
 * their respective providers (Theme/Locale/PiiMask) and reachable through
 * the provider stack in app/providers.tsx. This page is a pure UI surface
 * — no local state of its own.
 */
export function SettingsPage() {
  const { t } = useT()
  return (
    <section className="settings-page" aria-label={t('settings.title')}>
      <h1>{t('settings.title')}</h1>
      <SettingsRow label={t('settings.theme')}>
        <ThemeControl />
      </SettingsRow>
      <SettingsRow label={t('settings.locale')}>
        <LocaleControl />
      </SettingsRow>
      <SettingsRow label={t('settings.piiMask')} hint={t('settings.piiMaskHint')}>
        <PiiMaskControl />
      </SettingsRow>
    </section>
  )
}

interface SettingsRowProps {
  label: string
  hint?: string
  children: ReactNode
}

function SettingsRow({ label, hint, children }: SettingsRowProps) {
  return (
    <div className="settings-row">
      <div className="settings-row__text">
        <div className="settings-row__label">{label}</div>
        {hint && <div className="settings-row__hint">{hint}</div>}
      </div>
      <div className="settings-row__control">{children}</div>
    </div>
  )
}

function ThemeControl() {
  const { t } = useT()
  const { theme, setTheme } = useTheme()
  const options: Array<{ key: Theme; label: string }> = [
    { key: 'light', label: t('settings.themeLight') },
    { key: 'dark', label: t('settings.themeDark') },
  ]
  return (
    <div role="radiogroup" aria-label={t('settings.theme')}>
      {options.map((o) => (
        <Button
          key={o.key}
          variant={theme === o.key ? 'primary' : 'secondary'}
          onClick={() => setTheme(o.key)}
          aria-pressed={theme === o.key}
          data-testid={`theme-${o.key}`}
        >
          {o.label}
        </Button>
      ))}
    </div>
  )
}

function LocaleControl() {
  const { t } = useT()
  const { locale, setLocale } = useLocaleContext()
  const options: Array<{ key: Locale; label: string }> = [
    { key: 'ko', label: t('settings.localeKo') },
    { key: 'en', label: t('settings.localeEn') },
  ]
  return (
    <div role="radiogroup" aria-label={t('settings.locale')}>
      {options.map((o) => (
        <Button
          key={o.key}
          variant={locale === o.key ? 'primary' : 'secondary'}
          onClick={() => setLocale(o.key)}
          aria-pressed={locale === o.key}
          data-testid={`locale-${o.key}`}
        >
          {o.label}
        </Button>
      ))}
    </div>
  )
}

function PiiMaskControl() {
  const { t } = useT()
  const { enabled, toggle } = usePiiMask()
  return (
    <Button
      variant={enabled ? 'primary' : 'secondary'}
      onClick={toggle}
      aria-pressed={enabled}
      data-testid="pii-mask-toggle"
    >
      {enabled ? t('settings.piiMaskOn') : t('settings.piiMaskOff')}
    </Button>
  )
}
