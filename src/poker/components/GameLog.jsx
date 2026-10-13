import React from 'react';
import { useT, formatLog } from '../i18n/index.js';

/** ประวัติการเล่นของโต๊ะ (ล่าสุดอยู่บน) */
export default function GameLog({ open, log, onClose }) {
  const t = useT();
  if (!open) return null;
  return (
    <aside className="drawer" aria-label={t.history.title}>
      <div className="drawer__head">
        <h2>{t.history.title}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label={t.aria.close}>
          ×
        </button>
      </div>
      <ol className="game-log">
        {log
          .slice()
          .reverse()
          .map((entry) => (
            <li key={entry.id} className={`game-log__item game-log__item--${entry.kind}`}>
              {formatLog(t, entry)}
            </li>
          ))}
        {log.length === 0 && <li className="game-log__empty">{t.history.empty}</li>}
      </ol>
    </aside>
  );
}
