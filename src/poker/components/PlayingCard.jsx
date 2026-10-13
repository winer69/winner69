import React from 'react';
import { SUIT_SYMBOLS, SUIT_NAMES, rankLabel, isRedSuit } from '../game/deck.js';

/**
 * PlayingCard
 * - faceDown: แสดงหลังไพ่ (เปลี่ยนเป็น false → พลิกด้วย CSS transition)
 * - deal: { dx, dy, delay } → animation ลอยจากกองไพ่กลางโต๊ะมาที่ตำแหน่งจริง
 * - flipIn: เล่น animation พลิกจากหลัง→หน้าหลังแจกเสร็จ
 */
export default function PlayingCard({
  card,
  faceDown = false,
  size = 'md',
  deal = null,
  flipIn = false,
  glow = false,
  winning = false,
  dim = false,
  folded = false,
  className = '',
}) {
  const red = card && isRedSuit(card.suit);
  const showFace = card && !faceDown;
  const style = {};
  if (deal) {
    style['--dx'] = deal.dx;
    style['--dy'] = deal.dy;
    style['--delay'] = `${deal.delay || 0}ms`;
  }
  const classes = [
    'pcard',
    `pcard--${size}`,
    deal ? 'is-dealing' : '',
    flipIn && showFace ? 'is-flip-in' : '',
    glow ? 'is-glow' : '',
    winning ? 'is-winning' : '',
    dim ? 'is-dim' : '',
    folded ? 'is-folded' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      style={style}
      aria-label={showFace ? `${rankLabel(card.rank)} of ${SUIT_NAMES[card.suit]}` : 'Face-down card'}
    >
      <div className={`pcard__inner ${showFace ? 'is-up' : 'is-down'}`}>
        <div className={`pcard__face pcard__front ${red ? 'is-red' : 'is-black'}`}>
          {card && (
            <>
              <span className="pcard__corner">
                <b>{rankLabel(card.rank)}</b>
                <i>{SUIT_SYMBOLS[card.suit]}</i>
              </span>
              <span className="pcard__pip">{SUIT_SYMBOLS[card.suit]}</span>
              <span className="pcard__corner pcard__corner--br">
                <b>{rankLabel(card.rank)}</b>
                <i>{SUIT_SYMBOLS[card.suit]}</i>
              </span>
            </>
          )}
        </div>
        <div className="pcard__face pcard__back" />
      </div>
    </div>
  );
}
