import React from 'react';
import Avatar from './Avatar.jsx';
import PlayingCard from './PlayingCard.jsx';
import { formatChips, formatShort, signed } from '../utils/format.js';
import { TABLE_CENTER } from '../utils/seatLayout.js';
import { TIMING } from '../game/constants.js';
import { useT } from '../i18n/index.js';

/**
 * PlayerSeat — Avatar, ชื่อ, Level, Chips, ไพ่, สถานะ
 * ตำแหน่งมาจาก seatLayout (% ของโต๊ะ)
 */
export default function PlayerSeat({
  player,
  index,
  layout,
  dealOrder,
  activeCount,
  isCurrent,
  isThinking,
  isRevealed,
  stage,
  winningIds,
  liveHandName,
  showResult,
  onAvatarClick,
  blindTag,
}) {
  const t = useT();
  const { seat, isLeft, isRight, isTop } = layout;
  const human = player.isHuman;
  const hasCards = player.holeCards.length > 0;
  const showFace = human || (player.showCards && isRevealed);
  const resultVisible = stage === 'result' || stage === 'done';
  const isWinner = resultVisible && player.isWinner;
  const isLoser = resultVisible && !player.isWinner && !player.folded && player.showCards;

  // ระหว่าง reveal ยังไม่โชว์เงินที่ชนะ (กันสปอยผล)
  const displayChips = resultVisible ? player.chips : player.chips - player.winAmount;

  const side = human ? 'human' : isLeft ? 'left' : isRight ? 'right' : isTop ? 'top' : 'bottom';
  const classes = [
    'seat',
    `seat--${side}`,
    human ? 'seat--me' : '',
    isCurrent ? 'is-current' : '',
    player.folded ? 'is-folded' : '',
    player.sittingOut ? 'is-out' : '',
    isWinner ? 'is-winner' : '',
    isLoser ? 'is-loser' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const action = player.lastAction;
  const actionLabel = action && !['sb', 'bb'].includes(action.type) ? t.actions[action.type] : null;
  const handName = player.handResult && (human ? resultVisible || isRevealed : isRevealed) ? t.hands[player.handResult.rank] : null;

  return (
    <div className={classes} style={{ left: `${seat.x}%`, top: `${seat.y}%` }} data-seat={index}>
      <div className="seat__avatar-wrap">
        {isCurrent && <span className="seat__pulse" aria-hidden="true" />}
        <button
          type="button"
          className="seat__avatar-btn"
          onClick={onAvatarClick}
          disabled={!onAvatarClick}
          aria-label={human ? t.aria.react : player.name}
        >
          <Avatar avatar={player.avatar} />
        </button>
        <span className="seat__level">Lv.{player.level}</span>
        {blindTag && <span className={`seat__blind seat__blind--${blindTag.toLowerCase()}`}>{blindTag}</span>}
        {isThinking && (
          <span className="seat__thinking" aria-label="Thinking">
            <i />
            <i />
            <i />
          </span>
        )}
        {actionLabel && !isWinner && (
          <span key={`${action.type}-${action.amount}`} className={`seat__action seat__action--${action.type}`}>
            {actionLabel}
          </span>
        )}
      </div>

      <div className="seat__plate">
        <span className="seat__name">{human ? t.you : player.name}</span>
        <span className="seat__chips">{player.sittingOut ? t.out : formatChips(displayChips)}</span>
      </div>

      {hasCards && (
        <div className={`seat__cards seat__cards--${side} ${showFace && !human ? 'is-revealed' : ''}`}>
          {player.holeCards.map((card, i) => {
            // ลำดับแจก: วนทีละคน 2 รอบ → delay = (รอบ * จำนวนคน + ลำดับคน) * stagger
            const dealDelay = (i * activeCount + dealOrder) * TIMING.dealCardStagger;
            return (
              <PlayingCard
                key={card.id}
                card={card}
                faceDown={!showFace}
                size={human ? 'hero' : 'mini'}
                deal={{
                  dx: `${TABLE_CENTER.x - seat.x}cqw`,
                  dy: `${TABLE_CENTER.y - seat.y}cqh`,
                  delay: dealDelay,
                }}
                flipIn={human}
                folded={player.folded}
                winning={isWinner && winningIds?.has(card.id)}
                dim={resultVisible && winningIds && !winningIds.has(card.id) && showFace}
              />
            );
          })}
        </div>
      )}

      {human && liveHandName && !player.folded && (
        <div className={`seat__hand-live ${resultVisible ? 'is-final' : ''}`}>{liveHandName}</div>
      )}
      {!human && handName && <div className={`seat__hand-rank ${isWinner ? 'is-winner' : ''}`}>{handName}</div>}

      {showResult && isWinner && <div className="seat__delta is-win">{signed(player.winAmount)}</div>}
      {showResult && isLoser && !human && <div className="seat__delta is-lose">-{formatShort(player.totalBet)}</div>}
    </div>
  );
}
