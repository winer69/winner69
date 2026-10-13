import React, { useEffect, useMemo, useState } from 'react';
import { formatChips } from '../utils/format.js';
import { useT } from '../i18n/index.js';

const QUICK_FRACTIONS = [1 / 2, 2 / 3, 3 / 4, 1];

/**
 * BettingPanel — เปิดเมื่อกด RAISE
 * value = "raise to" (ยอด bet รวมในรอบนี้ของเรา)
 * ทุกค่าถูก clamp ไว้ระหว่าง minRaiseTo – maxRaiseTo (กัน bet เกิน chip / ติดลบ)
 */
export default function BettingPanel({ legal, pot, currentBet, playerBet, playerChips, step, onConfirm, onCancel }) {
  const t = useT();
  const { minRaiseTo, maxRaiseTo, toCall } = legal;
  const [value, setValue] = useState(minRaiseTo);

  useEffect(() => setValue(minRaiseTo), [minRaiseTo]);

  const clamp = (v) => Math.max(minRaiseTo, Math.min(maxRaiseTo, Math.round(v)));
  const snap = (v) => (v >= maxRaiseTo ? maxRaiseTo : clamp(Math.round(v / step) * step));

  // Pot-size raise มาตรฐาน: raise to = currentBet + fraction × (pot + toCall)
  const quickValues = useMemo(
    () => QUICK_FRACTIONS.map((fraction, i) => ({ key: i, fraction, value: snap(currentBet + fraction * (pot + toCall)) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pot, currentBet, toCall, minRaiseTo, maxRaiseTo]
  );

  const isAllIn = value >= maxRaiseTo;
  const remaining = playerChips - (value - playerBet);
  const fixed = minRaiseTo === maxRaiseTo;

  return (
    <div className="bet-panel" role="dialog" aria-label="Raise amount">
      <div className="bet-panel__stats">
        <div>
          <span>{t.bet.current}</span>
          <b>{formatChips(currentBet)}</b>
        </div>
        <div className="is-main">
          <span>{t.bet.total}</span>
          <b>{formatChips(value)}</b>
        </div>
        <div>
          <span>{t.bet.remaining}</span>
          <b>{formatChips(remaining)}</b>
        </div>
      </div>

      <div className="bet-panel__quick">
        {quickValues.map((q) => (
          <button key={q.key} type="button" className={`quick ${value === q.value ? 'is-on' : ''}`} disabled={fixed} onClick={() => setValue(q.value)}>
            {t.bet.quick[q.key]}
          </button>
        ))}
        <button type="button" className={`quick quick--allin ${isAllIn ? 'is-on' : ''}`} onClick={() => setValue(maxRaiseTo)}>
          {t.bet.allIn}
        </button>
      </div>

      <div className="bet-panel__slider">
        <button type="button" className="step-btn" disabled={value <= minRaiseTo} onClick={() => setValue(snap(value - step))} aria-label="Decrease">
          −
        </button>
        <input
          type="range"
          min={minRaiseTo}
          max={maxRaiseTo}
          step={step}
          value={value}
          disabled={fixed}
          onChange={(e) => setValue(snap(Number(e.target.value)))}
          aria-label="Raise amount"
          style={{ '--fill': `${fixed ? 100 : ((value - minRaiseTo) / (maxRaiseTo - minRaiseTo)) * 100}%` }}
        />
        <button type="button" className="step-btn" disabled={value >= maxRaiseTo} onClick={() => setValue(snap(value + step))} aria-label="Increase">
          +
        </button>
      </div>

      <div className="bet-panel__confirm">
        <button type="button" className="act act--ghost" onClick={onCancel}>
          <span className="act__label">{t.bet.back}</span>
        </button>
        <button type="button" className={`act ${isAllIn ? 'act--allin' : 'act--raise'} act--wide`} onClick={() => onConfirm(isAllIn ? 'allin' : 'raise', value)}>
          <span className="act__label">{isAllIn ? t.bet.confirmAllIn : t.bet.raiseTo}</span>
          <span className="act__sub">{formatChips(value)}</span>
        </button>
      </div>
    </div>
  );
}
