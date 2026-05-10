import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

import { useT } from '../../hooks/useT'

import './app-shell.css'

interface AppShellProps {
  children: ReactNode
}

/**
 * Top-level layout: header (logo + nav + theme/lang), main (#main-content
 * target for skip-link), footer. Uses real semantic landmarks so screen
 * readers and keyboard users can jump between sections.
 */
export function AppShell({ children }: AppShellProps) {
  const { t } = useT()

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t('app.skipToContent')}
      </a>
      <div className="app-shell">
        <header className="app-shell__header">
          <div className="app-shell__brand">
            <span className="app-shell__brand-mark" aria-hidden="true">
              ◐
            </span>
            <span className="app-shell__brand-text">{t('app.title')}</span>
          </div>
          <nav className="app-shell__nav" aria-label="Primary">
            <NavLink to="/" end className={navLinkClass}>
              {t('nav.dashboard')}
            </NavLink>
            <NavLink to="/patients" className={navLinkClass}>
              {t('nav.patients')}
            </NavLink>
            <NavLink to="/settings" className={navLinkClass}>
              {t('nav.settings')}
            </NavLink>
          </nav>
        </header>
        <main id="main-content" className="app-shell__main" tabIndex={-1}>
          {children}
        </main>
        <footer className="app-shell__footer">
          <small>© {new Date().getFullYear()} Patient Info</small>
        </footer>
      </div>
    </>
  )
}

function navLinkClass({ isActive }: { isActive: boolean }) {
  return ['app-shell__nav-link', isActive ? 'app-shell__nav-link--active' : '']
    .filter(Boolean)
    .join(' ')
}
