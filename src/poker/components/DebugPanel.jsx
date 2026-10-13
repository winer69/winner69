import React from 'react';
import { cardToString } from '../game/deck.js';
import { PHASE_LABELS } from '../game/constants.js';

/** Debug Panel — ซ่อน/แสดงได้จาก Settings ใช้ทดสอบเกม */
export default function DebugPanel({ open, game, onClose, actions }) {
  if (!open) return null;
  const name = (i) => game.players[i]?.name ?? '—';
  return (
    <aside className="debug" aria-label="Debug panel">
      <div className="debug__head">
        <strong>Debug</strong>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close debug">
          ×
        </button>
      </div>
      <dl className="debug__grid">
        <dt>Phase</dt>
        <dd>{PHASE_LABELS[game.gamePhase]}</dd>
        <dt>Hand #</dt>
        <dd>{game.handNumber}</dd>
        <dt>Pot</dt>
        <dd>{game.pot}</dd>
        <dt>Current bet</dt>
        <dd>{game.currentBet} (min raise {game.minRaise})</dd>
        <dt>Current</dt>
        <dd>{game.currentPlayerIndex >= 0 ? name(game.currentPlayerIndex) : game.awaitingStreet ? 'next street…' : '—'}</dd>
        <dt>Dealer</dt>
        <dd>{name(game.dealerIndex)}</dd>
        <dt>SB / BB</dt>
        <dd>
          {name(game.smallBlindIndex)} / {name(game.bigBlindIndex)}
        </dd>
        <dt>Board</dt>
        <dd>{game.communityCards.map(cardToString).join(' ') || '—'}</dd>
        <dt>Deck left</dt>
        <dd>{game.deck.length}</dd>
        <dt>Winner</dt>
        <dd>{game.winners.map(name).join(', ') || '—'}</dd>
      </dl>
      <ul className="debug__players">
        {game.players.map((p, i) => (
          <li key={p.id}>
            <span>
              {i}. {p.name} <em>{p.personality || 'human'}</em>
            </span>
            <span>{p.holeCards.map(cardToString).join(' ')}</span>
            <span>
              {p.chips} / bet {p.bet}
              {p.folded ? ' · F' : ''}
              {p.allIn ? ' · AI' : ''}
            </span>
          </li>
        ))}
      </ul>
      <div className="debug__buttons">
        <button type="button" onClick={actions.nextPhase}>NEXT PHASE</button>
        <button type="button" onClick={actions.newHand}>NEW HAND</button>
        <button type="button" onClick={actions.forceShowdown}>FORCE SHOWDOWN</button>
      </div>
    </aside>
  );
}
