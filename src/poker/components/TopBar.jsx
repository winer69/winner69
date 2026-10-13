import React, { useState } from 'react';
import { useT, LANGUAGES } from '../i18n/index.js';

/** แถบบน: Back / ชื่อโต๊ะ / จำนวนผู้เล่น / History / Settings / Sound */
export default function TopBar({
  tableName,
  playerCount,
  phaseLabel,
  soundOn,
  onToggleSound,
  onBack,
  onOpenLog,
  settings,
}) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const close = (fn) => () => {
    setMenuOpen(false);
    fn?.();
  };
  return (
    <header className="topbar">
      <button type="button" className="icon-btn" onClick={onBack} aria-label={t.aria.back}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="topbar__title">
        <h1>{tableName}</h1>
        <p>
          <span>{playerCount}</span>
          <span className="topbar__phase">{phaseLabel}</span>
        </p>
      </div>

      <div className="topbar__right">
        <button type="button" className="icon-btn" onClick={onOpenLog} aria-label={t.aria.history}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M5 6h14M5 12h14M5 18h9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
        <button type="button" className={`icon-btn ${soundOn ? '' : 'is-off'}`} onClick={onToggleSound} aria-label={soundOn ? t.aria.mute : t.aria.unmute}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
            {soundOn ? (
              <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="m16 9 5 6m0-6-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
        <div className="menu-wrap">
          <button type="button" className="icon-btn" onClick={() => setMenuOpen((v) => !v)} aria-label={t.aria.settings} aria-expanded={menuOpen}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          {menuOpen && (
            <div className="menu" role="menu">
              <div className="menu__row">
                <span>{t.menu.language}</span>
                <div className="menu__langs" role="radiogroup" aria-label={t.menu.language}>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      role="radio"
                      aria-checked={settings.language === lang.code}
                      className={`menu__lang ${settings.language === lang.code ? 'is-on' : ''}`}
                      onClick={() => settings.setLanguage(lang.code)}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>
              {settings.setAutoNext && <label className="menu__row">
                <span>{t.menu.autoNext}</span>
                <input type="checkbox" checked={settings.autoNext} onChange={(e) => settings.setAutoNext(e.target.checked)} />
              </label>}
              {settings.setDebugOpen && <label className="menu__row">
                <span>{t.menu.debug}</span>
                <input
                  type="checkbox"
                  checked={settings.debugOpen}
                  onChange={(e) => {
                    settings.setDebugOpen(e.target.checked);
                    setMenuOpen(false);
                  }}
                />
              </label>}
              {settings.onNewGame && <button type="button" className="menu__item" onClick={close(settings.onNewGame)}>
                {settings.newGameLabel || t.menu.newGame}
              </button>}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
