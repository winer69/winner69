// =====================================================
// AI Player — ไม่ต้องฉลาดมาก แต่ต้องดูเป็นธรรมชาติ
// ใช้ "ความแรงของมือ" (0–1) + บุคลิก (personality) + ความสุ่มเล็กน้อย
// =====================================================

import { evaluateBestHand } from './handEvaluator.js';
import { getLegalActions, computePot } from './engine.js';
import { GAME_CONFIG } from './constants.js';

export const PERSONALITIES = {
  tight: { label: 'Tight', looseness: -0.12, raiseAt: 0.78, bluff: 0.03, sizing: [0.5, 0.75] },
  normal: { label: 'Normal', looseness: 0, raiseAt: 0.66, bluff: 0.07, sizing: [0.5, 1] },
  aggressive: { label: 'Aggressive', looseness: 0.1, raiseAt: 0.52, bluff: 0.2, sizing: [0.75, 1.4] },
  random: { label: 'Random', looseness: 0, raiseAt: 0.6, bluff: 0.15, sizing: [0.4, 1.5] },
};

/** ความแรงไพ่ก่อน Flop แบบง่าย (คล้าย Chen formula) */
function preflopStrength([a, b]) {
  const hi = Math.max(a.rank, b.rank);
  const lo = Math.min(a.rank, b.rank);
  let score = (hi + lo) / 28; // 0.18 – 1
  score *= 0.55;
  if (a.rank === b.rank) score += 0.3 + lo / 60;
  if (a.suit === b.suit) score += 0.06;
  const gap = hi - lo;
  if (gap === 1) score += 0.05;
  else if (gap === 2) score += 0.025;
  if (hi === 14) score += 0.06;
  return Math.min(1, score);
}

const MADE_HAND_STRENGTH = [0.12, 0.42, 0.62, 0.72, 0.8, 0.84, 0.9, 0.96, 0.99, 1];

/** ความแรงหลัง Flop — ลดค่าลงถ้ามือนั้นมาจากไพ่กองกลางล้วน ๆ */
function postflopStrength(holeCards, board) {
  const mine = evaluateBestHand([...holeCards, ...board]);
  let strength = MADE_HAND_STRENGTH[mine.rank];
  if (board.length >= 5) {
    const boardOnly = evaluateBestHand(board);
    if (boardOnly && boardOnly.rank === mine.rank) strength -= 0.2;
  }
  if (mine.rank === 1) {
    // คู่สูงดีกว่าคู่ต่ำ
    strength += (mine.values[0] - 8) * 0.015;
  }
  if (mine.rank === 0) {
    // draw: flush draw 4 ใบ
    const suitCounts = {};
    [...holeCards, ...board].forEach((c) => (suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1));
    if (Math.max(...Object.values(suitCounts)) === 4 && board.length < 5) strength += 0.18;
  }
  return Math.max(0, Math.min(1, strength));
}

export function handStrength(player, communityCards) {
  return communityCards.length === 0
    ? preflopStrength(player.holeCards)
    : postflopStrength(player.holeCards, communityCards);
}

const roundTo = (value, step) => Math.round(value / step) * step;

/** ตัดสินใจ action — คืน { action, amount } ที่ผ่าน validate แน่นอน */
export function decideAIAction(state, idx) {
  const player = state.players[idx];
  const legal = getLegalActions(state, idx);
  const profile = PERSONALITIES[player.personality] || PERSONALITIES.normal;
  const pot = computePot(state.players);
  const noise = (Math.random() - 0.5) * 0.18;
  const strength = Math.min(1, Math.max(0, handStrength(player, state.communityCards) + noise + profile.looseness));
  const potOdds = legal.toCall > 0 ? legal.toCall / (pot + legal.toCall) : 0;
  const commitRatio = legal.toCall / Math.max(1, player.chips + player.bet);

  const raiseAmount = () => {
    const [lo, hi] = profile.sizing;
    const fraction = lo + Math.random() * (hi - lo);
    let target = state.currentBet + Math.max(state.minRaise, pot * fraction);
    target = roundTo(target, (state.blinds || GAME_CONFIG).smallBlind);
    target = Math.max(legal.minRaiseTo, Math.min(target, legal.maxRaiseTo));
    return target;
  };
  const raise = () => {
    const amount = raiseAmount();
    return amount >= legal.maxRaiseTo ? { action: 'allin' } : { action: 'raise', amount };
  };
  const passive = () => (legal.canCheck ? { action: 'check' } : { action: 'fold' });
  const callOrCheck = () => (legal.canCheck ? { action: 'check' } : { action: 'call' });

  // Random AI: เลือกแบบสุ่มจาก action ที่ทำได้ (แต่ไม่ fold ทั้งที่ check ได้)
  if (player.personality === 'random') {
    const roll = Math.random();
    if (legal.canRaise && roll < 0.2) return raise();
    if (!legal.canCheck && roll < 0.38) return { action: 'fold' };
    if (legal.canAllIn && roll > 0.985) return { action: 'allin' };
    return callOrCheck();
  }

  // มือแรงมาก → raise / all-in
  if (strength >= profile.raiseAt && legal.canRaise) {
    if (strength > 0.95 && Math.random() < 0.3 && legal.canAllIn) return { action: 'allin' };
    if (Math.random() < 0.75) return raise();
    return callOrCheck();
  }

  // bluff เป็นครั้งคราว
  if (legal.canRaise && Math.random() < profile.bluff && commitRatio < 0.25) return raise();

  if (legal.canCheck) return { action: 'check' };

  // ต้องจ่ายเพื่อไปต่อ: เทียบความแรงกับ pot odds และสัดส่วนเงินที่ต้องเสี่ยง
  const required = potOdds + commitRatio * 0.6 + 0.08 - profile.looseness;
  if (strength >= required) return { action: 'call' };
  return passive();
}

/** ประโยคสั้น ๆ ที่ใช้ตัดสินว่า AI จะส่ง Emoji หลังจบมือไหม */
export function maybeAIReaction(player) {
  if (Math.random() > 0.35) return null;
  if (player.netResult > 0) return ['😎', '🔥', '💰', '😂'][Math.floor(Math.random() * 4)];
  if (player.netResult < -1500) return ['😱', '😡', '😭'][Math.floor(Math.random() * 3)];
  return null;
}
