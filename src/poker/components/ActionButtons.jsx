import React from 'react';
import { formatShort } from '../utils/format.js';
import { useT } from '../i18n/index.js';

/**
 * ActionButtons — FOLD / CHECK / CALL / RAISE / ALL IN
 * ปุ่มที่ทำไม่ได้จะ disabled เสมอ (เช่น CHECK เมื่อมี bet ต้องตาม)
 */
export default function ActionButtons({ legal, enabled, onAction, onOpenRaise }) {
  const t = useT();
  const can = (flag) => enabled && flag;
  return (
    <div className="actions" role="group" aria-label="Your actions">
      <button type="button" className="act act--fold" disabled={!can(legal.canFold)} onClick={() => onAction('fold')}>
        <span className="act__label">{t.actions.fold}</span>
      </button>

      <button type="button" className="act act--check" disabled={!can(legal.canCheck)} onClick={() => onAction('check')}>
        <span className="act__label">{t.actions.check}</span>
      </button>

      <button type="button" className="act act--call" disabled={!can(legal.canCall)} onClick={() => onAction('call')}>
        <span className="act__label">{t.actions.call}</span>
        {legal.canCall && <span className="act__sub">{formatShort(legal.callAmount)}</span>}
      </button>

      <button type="button" className="act act--raise" disabled={!can(legal.canRaise)} onClick={onOpenRaise}>
        <span className="act__label">{t.actions.raise}</span>
        {legal.canRaise && <span className="act__sub">{t.minRaise(formatShort(legal.minRaiseTo))}</span>}
      </button>

      <button type="button" className="act act--allin" disabled={!can(legal.canAllIn)} onClick={() => onAction('allin')}>
        <span className="act__label">{t.actions.allin}</span>
        {legal.canAllIn && <span className="act__sub">{formatShort(legal.allInAmount)}</span>}
      </button>
    </div>
  );
}
