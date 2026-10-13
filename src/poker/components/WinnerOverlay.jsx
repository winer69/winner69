import React, { useMemo } from 'react';
import { formatChips, signed } from '../utils/format.js';
import { useT } from '../i18n/index.js';

/**
 * WinnerOverlay — WIN (ใหญ่ + rays + particles) / LOSE (เบา) / ประกาศผู้ชนะคนอื่น
 * แสดงเฉพาะ stage 'result' แล้วจางหายเอง (ไม่บังข้อมูลนาน)
 */
export default function WinnerOverlay({ visible, human, winners, players, handResult }) {
  const t = useT();
  // particles สุ่มครั้งเดียวต่อการแสดง
  const particles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        angle: (360 / 22) * i + Math.random() * 12,
        dist: 90 + Math.random() * 120,
        delay: Math.random() * 180,
        size: 8 + Math.random() * 10,
        kind: i % 3 === 0 ? 'chip' : 'coin',
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible]
  );

  if (!visible || !human) return null;

  if (human.isWinner) {
    const isSplit = winners.length > 1;
    return (
      <div className="result-overlay result-overlay--win" role="status">
        <div className="result-overlay__flash" />
        <div className="result-overlay__rays" />
        <div className="result-overlay__burst">
          {particles.map((p) => (
            <span
              key={p.id}
              className={`particle particle--${p.kind}`}
              style={{
                '--a': `${p.angle}deg`,
                '--d': `${p.dist}px`,
                '--s': `${p.size}px`,
                animationDelay: `${p.delay}ms`,
              }}
            />
          ))}
        </div>
        <div className="result-overlay__content">
          <div className="result-overlay__title">{isSplit ? t.result.split : t.result.win}</div>
          <div className="result-overlay__amount">{signed(human.winAmount)}</div>
          {human.handResult && <div className="result-overlay__hand">{t.hands[human.handResult.rank]}</div>}
        </div>
      </div>
    );
  }

  if (!human.folded && human.showCards) {
    return (
      <div className="result-overlay result-overlay--lose" role="status">
        <div className="result-overlay__content">
          <div className="result-overlay__title">{t.result.lose}</div>
          <div className="result-overlay__amount">-{human.totalBet.toLocaleString('en-US')}</div>
          {human.handResult && <div className="result-overlay__hand">{t.hands[human.handResult.rank]}</div>}
        </div>
      </div>
    );
  }

  const top = players[winners[0]];
  if (!top) return null;
  return (
    <div className="result-overlay result-overlay--info" role="status">
      <div className="result-overlay__content">
        <div className="result-overlay__who">{t.result.wins(top.name)}</div>
        <div className="result-overlay__amount">{formatChips(top.winAmount)}</div>
        {handResult && <div className="result-overlay__hand">{t.hands[handResult.rank]}</div>}
      </div>
    </div>
  );
}
