// =====================================================
// Poker Engine — กติกา Texas Hold'em แบบ Pure Functions
// ทุกฟังก์ชันรับ state แล้วคืน state ใหม่ (ไม่แก้ของเดิม)
// ทำให้ทดสอบง่าย และนำไปต่อกับ Backend ภายหลังได้
// =====================================================

import { createDeck, shuffleDeck, drawCards, cardToString } from './deck.js';
import { evaluateBestHand, compareHands } from './handEvaluator.js';
import { GAME_CONFIG, PHASES } from './constants.js';

const BETTING_PHASES = [PHASES.PREFLOP, PHASES.FLOP, PHASES.TURN, PHASES.RIVER];

export function createInitialState() {
  return {
    gamePhase: PHASES.IDLE,
    players: [],
    deck: [],
    communityCards: [],
    pot: 0,
    currentBet: 0,
    minRaise: GAME_CONFIG.bigBlind,
    dealerIndex: -1,
    smallBlindIndex: -1,
    bigBlindIndex: -1,
    currentPlayerIndex: -1,
    winners: [],
    handResult: null,
    potAwarded: 0,
    isDealing: false,
    isShowdown: false,
    isGameOver: false,
    awaitingStreet: false, // รอบ bet จบแล้ว รอเปิดไพ่กองกลางชุดถัดไป
    handNumber: 0,
    log: [],
  };
}

// ---------- helpers ----------
export const isInHand = (p) => !p.sittingOut && !p.folded;
export const canAct = (p) => isInHand(p) && !p.allIn && p.chips > 0;
export const isBettingPhase = (phase) => BETTING_PHASES.includes(phase);

const sumBy = (list, fn) => list.reduce((total, item) => total + fn(item), 0);
export const computePot = (players) => sumBy(players, (p) => p.totalBet);

function clone(state) {
  return { ...state, players: state.players.map((p) => ({ ...p })), log: state.log.slice(-60) };
}

let logCounter = 0;
/** text = ข้อความ fallback (อังกฤษ), msg = ข้อมูลโครงสร้างให้ UI แปลภาษาเอง (i18n/strings.js) */
function addLog(state, text, kind = 'info', msg = null) {
  logCounter += 1;
  state.log = [...state.log, { id: `log-${logCounter}`, text, kind, msg }];
}

/** หา index ถัดไป (ตามเข็มนาฬิกา) ที่ตรงเงื่อนไข */
export function nextIndex(players, fromIndex, predicate) {
  const n = players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (((fromIndex + step) % n) + n) % n;
    if (predicate(players[idx], idx)) return idx;
  }
  return -1;
}

/** ย้าย chip จาก stack ไปเป็น bet (ไม่เกิน chip ที่มี) */
function putChips(player, amount) {
  const actual = Math.max(0, Math.min(amount, player.chips));
  player.chips -= actual;
  player.bet += actual;
  player.totalBet += actual;
  if (player.chips === 0) player.allIn = true;
  return actual;
}

/** ผู้เล่นคนนี้ยังต้องตัดสินใจในรอบ bet นี้หรือไม่ */
export function needsToAct(state, idx) {
  const p = state.players[idx];
  if (!p || !canAct(p)) return false;
  const actors = state.players.filter(canAct).length;
  if (p.bet >= state.currentBet && (p.hasActed || actors <= 1)) return false;
  return true;
}

export function findNextActor(state, fromIndex) {
  return nextIndex(state.players, fromIndex, (_, idx) => needsToAct(state, idx));
}

// =====================================================
// Players
// =====================================================
export function createPlayer({ id, name, avatar, level, chips, isHuman, personality }) {
  return {
    id,
    name,
    avatar,
    level,
    chips,
    isHuman,
    personality,
    holeCards: [],
    bet: 0,
    totalBet: 0,
    folded: false,
    allIn: false,
    hasActed: false,
    sittingOut: false,
    lastAction: null,
    handResult: null,
    showCards: false,
    isWinner: false,
    winAmount: 0,
    netResult: 0,
  };
}

// =====================================================
// Start a hand: dealer → blinds → deal hole cards
// =====================================================
export function startHand(state) {
  const { smallBlind, bigBlind } = state.blinds || GAME_CONFIG; // per-table blinds (WINNER 69 rooms)
  const s = clone(state);
  s.handNumber += 1;
  s.players = s.players.map((p) => ({
    ...p,
    holeCards: [],
    bet: 0,
    totalBet: 0,
    folded: false,
    allIn: false,
    hasActed: false,
    sittingOut: p.chips <= 0,
    lastAction: p.chips <= 0 ? { type: 'out' } : null,
    handResult: null,
    showCards: false,
    isWinner: false,
    winAmount: 0,
    netResult: 0,
  }));

  const activeCount = s.players.filter((p) => !p.sittingOut).length;
  const human = s.players.find((p) => p.isHuman);
  if (activeCount < 2 || (human && human.sittingOut)) {
    s.isGameOver = true;
    s.gamePhase = PHASES.IDLE;
    return s;
  }

  // 1) Dealer button: ครั้งแรกสุ่ม, ครั้งถัดไปเลื่อนไปคนถัดไปที่ยังมี chip
  const isActive = (p) => !p.sittingOut;
  if (s.dealerIndex < 0) {
    const activeIdx = s.players.map((p, i) => (isActive(p) ? i : -1)).filter((i) => i >= 0);
    s.dealerIndex = activeIdx[Math.floor(Math.random() * activeIdx.length)];
  } else {
    s.dealerIndex = nextIndex(s.players, s.dealerIndex, isActive);
  }

  // 2) Blinds: heads-up ให้ dealer เป็น SB ตามกติกา
  s.smallBlindIndex = activeCount === 2 ? s.dealerIndex : nextIndex(s.players, s.dealerIndex, isActive);
  s.bigBlindIndex = nextIndex(s.players, s.smallBlindIndex, isActive);

  const sb = s.players[s.smallBlindIndex];
  const bb = s.players[s.bigBlindIndex];
  const sbPaid = putChips(sb, smallBlind);
  const bbPaid = putChips(bb, bigBlind);
  sb.lastAction = { type: 'sb', amount: sbPaid };
  bb.lastAction = { type: 'bb', amount: bbPaid };

  // 3) Deck + shuffle + deal 2 ใบ เริ่มจากซ้ายของ dealer ทีละใบ
  let deck = shuffleDeck(createDeck());
  for (let round = 0; round < 2; round++) {
    let idx = s.dealerIndex;
    for (let k = 0; k < activeCount; k++) {
      idx = nextIndex(s.players, idx, isActive);
      const drawn = drawCards(deck, 1);
      deck = drawn.deck;
      s.players[idx].holeCards = [...s.players[idx].holeCards, drawn.cards[0]];
    }
  }

  s.deck = deck;
  s.communityCards = [];
  s.currentBet = Math.max(sb.bet, bb.bet, bigBlind);
  s.minRaise = bigBlind;
  s.pot = computePot(s.players);
  s.gamePhase = PHASES.PREFLOP;
  s.winners = [];
  s.handResult = null;
  s.potAwarded = 0;
  s.isShowdown = false;
  s.isGameOver = false;
  s.awaitingStreet = false;

  addLog(s, `— Hand #${s.handNumber} — Dealer: ${s.players[s.dealerIndex].name}`, 'system', {
    type: 'handStart',
    hand: s.handNumber,
    dealer: s.players[s.dealerIndex].name,
  });
  addLog(s, `${sb.name} posts SB ${sbPaid}, ${bb.name} posts BB ${bbPaid}`, 'blind', {
    type: 'blinds',
    sb: sb.name,
    sbAmount: sbPaid,
    bb: bb.name,
    bbAmount: bbPaid,
  });

  s.currentPlayerIndex = findNextActor(s, s.bigBlindIndex);
  if (s.currentPlayerIndex === -1) s.awaitingStreet = true;
  return s;
}

// =====================================================
// Legal actions — ใช้ทั้ง UI (ปิดปุ่ม) และ AI
// =====================================================
export function getLegalActions(state, idx) {
  const p = state.players[idx];
  const none = {
    canFold: false, canCheck: false, canCall: false, canRaise: false, canAllIn: false,
    toCall: 0, callAmount: 0, minRaiseTo: 0, maxRaiseTo: 0, allInAmount: 0,
  };
  if (!p || idx !== state.currentPlayerIndex || !isBettingPhase(state.gamePhase) || !canAct(p)) return none;

  const toCall = Math.max(0, state.currentBet - p.bet);
  const callAmount = Math.min(toCall, p.chips);
  const maxRaiseTo = p.bet + p.chips;
  const othersCanAct = state.players.some((q, i) => i !== idx && canAct(q));
  const fullMinRaiseTo = state.currentBet + state.minRaise;

  return {
    canFold: true,
    canCheck: toCall === 0,
    canCall: toCall > 0,
    canRaise: othersCanAct && maxRaiseTo > state.currentBet,
    canAllIn: othersCanAct || p.chips <= toCall,
    toCall,
    callAmount,
    minRaiseTo: Math.min(fullMinRaiseTo, maxRaiseTo),
    maxRaiseTo,
    allInAmount: p.chips,
  };
}

/** ตรวจสอบ action ก่อนทำจริง — คืนข้อความ error หรือ null */
export function validateAction(state, idx, action, amount) {
  if (idx !== state.currentPlayerIndex) return 'Not your turn';
  const legal = getLegalActions(state, idx);
  switch (action) {
    case 'fold':
      return legal.canFold ? null : 'Cannot fold now';
    case 'check':
      return legal.canCheck ? null : 'Cannot check — there is a bet to call';
    case 'call':
      return legal.canCall ? null : 'Nothing to call';
    case 'allin':
      return legal.canAllIn ? null : 'All-in not available';
    case 'raise': {
      if (!legal.canRaise) return 'Cannot raise now';
      if (!Number.isFinite(amount) || amount <= 0) return 'Invalid amount';
      if (amount > legal.maxRaiseTo) return 'Raise exceeds your chips';
      if (amount < legal.minRaiseTo) return `Minimum raise is ${legal.minRaiseTo}`;
      return null;
    }
    default:
      return 'Unknown action';
  }
}

function applyRaiseTo(state, raiser, raiseTo) {
  const raiseSize = raiseTo - state.currentBet;
  if (raiseSize >= state.minRaise) {
    // full raise → เปิดให้ทุกคนตัดสินใจใหม่
    state.minRaise = raiseSize;
    state.players.forEach((q) => {
      if (q !== raiser && canAct(q)) q.hasActed = false;
    });
  }
  state.currentBet = Math.max(state.currentBet, raiseTo);
}

// =====================================================
// Apply an action
// =====================================================
export function applyAction(state, idx, action, amount) {
  const error = validateAction(state, idx, action, amount);
  if (error) throw new Error(error);

  const s = clone(state);
  const p = s.players[idx];
  const toCall = Math.max(0, s.currentBet - p.bet);
  let actionAmount = 0;
  let type = action;

  switch (action) {
    case 'fold':
      p.folded = true;
      addLog(s, `${p.name} folds`, 'fold', { type: 'fold', name: p.name });
      break;
    case 'check':
      addLog(s, `${p.name} checks`, 'check', { type: 'check', name: p.name });
      break;
    case 'call':
      actionAmount = putChips(p, toCall);
      if (p.allIn) type = 'allin';
      addLog(s, `${p.name} calls ${actionAmount}${p.allIn ? ' (ALL IN)' : ''}`, 'call', {
        type: 'call',
        name: p.name,
        amount: actionAmount,
        allIn: p.allIn,
      });
      break;
    case 'raise': {
      const raiseTo = Math.round(amount);
      actionAmount = putChips(p, raiseTo - p.bet);
      applyRaiseTo(s, p, p.bet);
      if (p.allIn) type = 'allin';
      addLog(s, `${p.name} raises to ${p.bet}${p.allIn ? ' (ALL IN)' : ''}`, 'raise', {
        type: 'raise',
        name: p.name,
        to: p.bet,
        allIn: p.allIn,
      });
      break;
    }
    case 'allin': {
      actionAmount = putChips(p, p.chips);
      if (p.bet > s.currentBet) applyRaiseTo(s, p, p.bet);
      addLog(s, `${p.name} goes ALL IN (${p.bet})`, 'allin', { type: 'allin', name: p.name, to: p.bet });
      break;
    }
    default:
      break;
  }

  p.hasActed = true;
  p.lastAction = { type, amount: action === 'raise' || action === 'allin' ? p.bet : actionAmount };
  s.pot = computePot(s.players);
  return resolveAfterAction(s, idx);
}

function resolveAfterAction(s, idx) {
  const inHand = s.players.filter(isInHand);
  if (inHand.length === 1) return awardUncontested(s);

  const next = findNextActor(s, idx);
  if (next === -1) {
    s.currentPlayerIndex = -1;
    s.awaitingStreet = true; // จบรอบ bet → hook จะเรียก dealNextStreet หลัง animation
  } else {
    s.currentPlayerIndex = next;
  }
  return s;
}

// =====================================================
// Streets: Flop / Turn / River / Showdown
// =====================================================
export function dealNextStreet(state) {
  if (!isBettingPhase(state.gamePhase)) return state;
  const s = clone(state);

  // เก็บ bet เข้ากองกลาง (pot นับจาก totalBet อยู่แล้ว) แล้วเริ่มรอบใหม่
  s.players.forEach((p) => {
    p.bet = 0;
    p.hasActed = false;
    if (p.lastAction && !['fold', 'allin', 'out'].includes(p.lastAction.type)) p.lastAction = null;
  });
  s.currentBet = 0;
  s.minRaise = (s.blinds || GAME_CONFIG).bigBlind;
  s.awaitingStreet = false;

  const dealCommunity = (count) => {
    let deck = drawCards(s.deck, 1).deck; // burn card
    const drawn = drawCards(deck, count);
    s.deck = drawn.deck;
    s.communityCards = [...s.communityCards, ...drawn.cards];
    return drawn.cards;
  };

  let dealt;
  switch (s.gamePhase) {
    case PHASES.PREFLOP:
      dealt = dealCommunity(3);
      s.gamePhase = PHASES.FLOP;
      break;
    case PHASES.FLOP:
      dealt = dealCommunity(1);
      s.gamePhase = PHASES.TURN;
      break;
    case PHASES.TURN:
      dealt = dealCommunity(1);
      s.gamePhase = PHASES.RIVER;
      break;
    case PHASES.RIVER:
      return resolveShowdown(s);
    default:
      return s;
  }
  addLog(s, `${s.gamePhase.toUpperCase()}: ${dealt.map(cardToString).join(' ')}`, 'street', {
    type: 'street',
    phase: s.gamePhase,
    cards: dealt,
  });

  s.currentPlayerIndex = findNextActor(s, s.dealerIndex);
  if (s.currentPlayerIndex === -1) s.awaitingStreet = true; // ทุกคน all-in → เปิดไพ่ต่อเลย
  return s;
}

/** คืน bet ส่วนที่ไม่มีใครตามได้ (uncalled bet) ให้เจ้าของ */
function returnUncalledBet(s) {
  const sorted = s.players.slice().sort((a, b) => b.totalBet - a.totalBet);
  const [top, second] = sorted;
  if (!top || !second || top.folded) return;
  const excess = top.totalBet - second.totalBet;
  if (excess > 0) {
    top.totalBet -= excess;
    top.chips += excess;
  }
}

/** แบ่ง Main pot / Side pots ตามระดับการลงเงิน */
export function buildPots(players) {
  const levels = [...new Set(players.filter(isInHand).map((p) => p.totalBet))]
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  const pots = [];
  let previous = 0;
  levels.forEach((level) => {
    const amount = sumBy(players, (p) => Math.max(0, Math.min(p.totalBet, level) - previous));
    const eligible = players.map((p, i) => (isInHand(p) && p.totalBet >= level ? i : -1)).filter((i) => i >= 0);
    if (amount > 0) pots.push({ amount, eligible });
    previous = level;
  });
  const leftover = sumBy(players, (p) => Math.max(0, p.totalBet - previous));
  if (leftover > 0 && pots.length) pots[pots.length - 1].amount += leftover;
  return pots;
}

function finalizeResults(s) {
  s.players.forEach((p) => {
    p.netResult = p.winAmount - p.totalBet;
    p.isWinner = p.winAmount > 0;
  });
  s.winners = s.players
    .map((p, i) => ({ i, won: p.winAmount }))
    .filter((w) => w.won > 0)
    .sort((a, b) => b.won - a.won)
    .map((w) => w.i);
  s.potAwarded = sumBy(s.players, (p) => p.winAmount);
  s.pot = 0;
  s.currentPlayerIndex = -1;
  s.awaitingStreet = false;
  s.currentBet = 0;
  s.players.forEach((p) => (p.bet = 0));
}

function awardUncontested(s) {
  const winnerIdx = s.players.findIndex(isInHand);
  const winner = s.players[winnerIdx];
  const total = computePot(s.players);
  winner.chips += total;
  winner.winAmount = total;
  s.gamePhase = PHASES.HAND_OVER;
  s.isShowdown = false;
  s.handResult = null;
  finalizeResults(s);
  addLog(s, `${winner.name} wins ${total} (everyone folded)`, 'win', { type: 'winUncontested', name: winner.name, amount: total });
  return s;
}

export function resolveShowdown(state) {
  const st = clone(state);
  st.gamePhase = PHASES.SHOWDOWN;
  st.isShowdown = true;

  // ประเมินไพ่ของทุกคนที่ยังไม่ fold
  st.players.forEach((p) => {
    if (isInHand(p)) {
      p.handResult = evaluateBestHand([...p.holeCards, ...st.communityCards]);
      p.showCards = true;
    }
  });

  returnUncalledBet(st);
  const pots = buildPots(st.players);

  pots.forEach((pot, potNumber) => {
    let best = null;
    let potWinners = [];
    pot.eligible.forEach((i) => {
      const hand = st.players[i].handResult;
      const cmp = best ? compareHands(hand, best) : 1;
      if (cmp > 0) {
        best = hand;
        potWinners = [i];
      } else if (cmp === 0) {
        potWinners.push(i);
      }
    });
    // แบ่งเท่า ๆ กัน เศษให้คนแรกทางซ้ายของ dealer
    const share = Math.floor(pot.amount / potWinners.length);
    let remainder = pot.amount - share * potWinners.length;
    const ordered = potWinners
      .slice()
      .sort(
        (a, b) =>
          ((a - st.dealerIndex + st.players.length) % st.players.length) -
          ((b - st.dealerIndex + st.players.length) % st.players.length)
      );
    ordered.forEach((i) => {
      const won = share + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      st.players[i].chips += won;
      st.players[i].winAmount += won;
    });
    const label = potNumber === 0 ? 'main pot' : `side pot ${potNumber}`;
    addLog(
      st,
      `${ordered.map((i) => st.players[i].name).join(' & ')} win${ordered.length > 1 ? '' : 's'} ${label} ${pot.amount} with ${best.name}`,
      'win',
      { type: 'winPot', names: ordered.map((i) => st.players[i].name), potIndex: potNumber, amount: pot.amount, rank: best.rank }
    );
  });

  finalizeResults(st);
  const topWinner = st.players[st.winners[0]];
  st.handResult = topWinner ? topWinner.handResult : null;
  return st;
}

// =====================================================
// Debug helpers
// =====================================================
export function forceNextPhase(state) {
  if (!isBettingPhase(state.gamePhase)) return state;
  return dealNextStreet(state);
}

export function forceShowdown(state) {
  let s = state;
  let guard = 0;
  while (isBettingPhase(s.gamePhase) && guard++ < 6) s = dealNextStreet(s);
  return s;
}
