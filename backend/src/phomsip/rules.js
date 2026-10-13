// ผสมสิบ (Phom Sip) rules + pure engine + AI, extracted from PhomSipGame.jsx so the server and the
// browser share one copy. Two seats: engine side 'player' = seat 0, 'ai' = seat 1.
// ═══ data/cards.js ═══════════════════════════════════════════
// Card definitions. Values are used by scoring.js — change them here if the rules change.

const SUITS = [
  { key: 'spades', symbol: '♠', color: 'black', nameTh: 'โพดำ' },
  { key: 'hearts', symbol: '♥', color: 'red', nameTh: 'โพแดง' },
  { key: 'diamonds', symbol: '♦', color: 'red', nameTh: 'ข้าวหลามตัด' },
  { key: 'clubs', symbol: '♣', color: 'black', nameTh: 'ดอกจิก' },
];

// value = ค่าที่ใช้ "ผสม" ให้ได้ 10 และใช้เป็นแต้มติดมือตอนจบเกม
// tenGroup = ไพ่กลุ่ม 10 แต้ม (10, J, Q, K) ต้องจับคู่กับตัวเดียวกันเท่านั้น
const RANKS = [
  { rank: 'A', value: 1, tenGroup: false },
  { rank: '2', value: 2, tenGroup: false },
  { rank: '3', value: 3, tenGroup: false },
  { rank: '4', value: 4, tenGroup: false },
  { rank: '5', value: 5, tenGroup: false },
  { rank: '6', value: 6, tenGroup: false },
  { rank: '7', value: 7, tenGroup: false },
  { rank: '8', value: 8, tenGroup: false },
  { rank: '9', value: 9, tenGroup: false },
  { rank: '10', value: 10, tenGroup: true },
  { rank: 'J', value: 10, tenGroup: true, face: true },
  { rank: 'Q', value: 10, tenGroup: true, face: true },
  { rank: 'K', value: 10, tenGroup: true, face: true },
];

const SUIT_BY_KEY = Object.fromEntries(SUITS.map((s) => [s.key, s]));

// ═══ game/rules.js ═══════════════════════════════════════════
// ─────────────────────────────────────────────────────────────
//  กติกาผสมสิบ (ปรับแก้ได้ที่ไฟล์นี้ไฟล์เดียว)
// ─────────────────────────────────────────────────────────────
//  • แจกคนละ HAND_SIZE ใบ เปิดไพ่ 1 ใบเป็นกองทิ้ง
//  • ในตาของตัวเอง: (1) จั่วไพ่จากกอง หรือ ใช้ไพ่ในมือ 1 ใบ "ผสม" กับไพ่บนกองทิ้งให้ได้ 10
//                    (2) ผสมสิบไพ่ในมือเป็นคู่ได้ไม่จำกัด  (3) ทิ้งไพ่ 1 ใบเพื่อจบตา
//  • คู่ที่ผสมได้: A+9, 2+8, 3+7, 4+6, 5+5  และไพ่กลุ่ม 10 (10, J, Q, K) ต้องจับคู่ตัวเดียวกัน
//  • ใครไพ่หมดมือก่อน ได้โบนัส "ผสมสิบหมดมือ" แล้วจบรอบทันที
//  • กองจั่วหมด → จบรอบ  คะแนน = แต้มคู่ที่ผสม − แต้มไพ่ที่ค้างในมือ  ใครมากกว่าชนะ
// ─────────────────────────────────────────────────────────────

const RULES = {
  HAND_SIZE: 5,
  TARGET_SUM: 10,
  PAIR_POINTS: 10, // คู่ตัวเลข เช่น 3+7
  TEN_GROUP_PAIR_POINTS: 20, // คู่ 10-10, J-J, Q-Q, K-K
  CAPTURE_BONUS: 5, // ผสมกับไพ่บนกองทิ้ง
  KNOCK_BONUS: 30, // ไพ่หมดมือ
  DEADWOOD_PENALTY: true, // หักแต้มไพ่ค้างมือตอนจบ
  WIN_MULTIPLIER: 2, // จ่ายคืน bet × 2 เมื่อชนะ
  KNOCK_WIN_MULTIPLIER: 3, // ชนะด้วยการหมดมือ
};

// ระดับคู่แข่ง: ความเก่งของ AI + ช่วงเดิมพันที่อนุญาต (bets = ชิปที่ให้เลือกในระดับนั้น)
const AI_LEVELS = {
  easy: { label: 'LV1', betLimit: 'ไม่เกิน 100', bets: [20, 50, 100], thinkMin: 1100, thinkMax: 1600 },
  normal: { label: 'LV25', betLimit: 'ไม่เกิน 500', bets: [100, 250, 500], thinkMin: 900, thinkMax: 1400 },
  hard: { label: 'LV50+', betLimit: '1,000 ขึ้นไป', bets: [1000, 2500, 5000], thinkMin: 800, thinkMax: 1200 },
};

/** เดิมพันที่ใช้ได้ในระดับนี้ — ถ้าเดิมพันปัจจุบันอยู่นอกช่วง จะเลือกชิปที่ใกล้ที่สุดที่เครดิตพอ */
function fitBet(level, bet, balance) {
  const opts = AI_LEVELS[level].bets;
  if (opts.includes(bet) && bet <= balance) return bet;
  const affordable = opts.filter((b) => b <= balance);
  if (!affordable.length) return opts[0];
  return affordable.reduce((best, b) => (Math.abs(b - bet) < Math.abs(best - bet) ? b : best), affordable[0]);
}

// ═══ game/deck.js ════════════════════════════════════════════
/** Build an ordered 52-card deck. Card ids are stable and unique (used for Framer layoutId). */
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const r of RANKS) {
      deck.push({
        id: `${r.rank}-${suit.key}`,
        rank: r.rank,
        value: r.value,
        tenGroup: r.tenGroup,
        face: Boolean(r.face),
        suit: suit.key,
        symbol: suit.symbol,
        color: suit.color,
      });
    }
  }
  return deck;
}

/** Seeded PRNG (mulberry32) — handy for reproducible debug rounds. */
function createRng(seed = Date.now()) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle. Returns a new array. */
function shuffle(deck, rng = Math.random) {
  const out = deck.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Take the top card (end of array). */
function drawTop(deck) {
  if (deck.length === 0) return { card: null, deck };
  return { card: deck[deck.length - 1], deck: deck.slice(0, -1) };
}

// ═══ game/scoring.js ═════════════════════════════════════════
/** แต้มติดมือของไพ่ 1 ใบ (ใช้หักคะแนนตอนจบ) */
function cardPoint(card) {
  return card.value;
}

/** ไพ่ 2 ใบนี้ผสมกันได้หรือไม่ — แก้กติกาการจับคู่ที่นี่ */
function canPair(a, b, rules = RULES) {
  if (!a || !b || a.id === b.id) return false;
  if (a.tenGroup || b.tenGroup) return a.tenGroup && b.tenGroup && a.rank === b.rank;
  return a.value + b.value === rules.TARGET_SUM;
}

/** ชุดไพ่นี้เป็น "ผสมสิบ" ที่ถูกต้องหรือไม่ */
function isPhomSip(cards, rules = RULES) {
  return Array.isArray(cards) && cards.length === 2 && canPair(cards[0], cards[1], rules);
}

/** แต้มของคู่ที่ผสม */
function meldPoints(cards, { captured = false } = {}, rules = RULES) {
  const base = cards[0].tenGroup ? rules.TEN_GROUP_PAIR_POINTS : rules.PAIR_POINTS;
  return base + (captured ? rules.CAPTURE_BONUS : 0);
}

/**
 * หาคู่ที่ผสมได้
 *  - ถ้าส่ง tableCard มา → คืนไพ่ในมือที่ผสมกับไพ่บนโต๊ะได้ [{ cards:[hand, table], points }]
 *  - ถ้าไม่ส่ง → คืนทุกคู่ในมือ เรียงแต้มมาก→น้อย
 */
function findValidCombination(hand, tableCard = null, rules = RULES) {
  const combos = [];
  if (tableCard) {
    for (const c of hand) {
      if (canPair(c, tableCard, rules)) {
        combos.push({ cards: [c, tableCard], points: meldPoints([c, tableCard], { captured: true }, rules) });
      }
    }
  } else {
    for (let i = 0; i < hand.length; i++) {
      for (let j = i + 1; j < hand.length; j++) {
        if (canPair(hand[i], hand[j], rules)) {
          combos.push({ cards: [hand[i], hand[j]], points: meldPoints([hand[i], hand[j]], {}, rules) });
        }
      }
    }
  }
  return combos.sort((a, b) => b.points - a.points);
}

/** เลือกชุดคู่ที่ไม่ทับกันให้ได้แต้มรวมมากที่สุด (greedy พอสำหรับมือ ≤ 7 ใบ) */
function bestDisjointPairs(hand, rules = RULES) {
  const used = new Set();
  const picked = [];
  for (const combo of findValidCombination(hand, null, rules)) {
    const [a, b] = combo.cards;
    if (used.has(a.id) || used.has(b.id)) continue;
    used.add(a.id);
    used.add(b.id);
    picked.push(combo);
  }
  return picked;
}

/** ตรวจความถูกต้องของมือ (ใช้ใน debug / ตอนรับข้อมูลจาก server) */
function validateHand(hand) {
  const errors = [];
  if (!Array.isArray(hand)) return { valid: false, errors: ['hand is not an array'] };
  const ids = new Set();
  for (const c of hand) {
    if (!c || typeof c.id !== 'string') errors.push('invalid card object');
    else if (ids.has(c.id)) errors.push(`duplicate card ${c.id}`);
    else ids.add(c.id);
    if (c && (typeof c.value !== 'number' || c.value < 1 || c.value > 10)) errors.push(`bad value on ${c?.id}`);
  }
  return { valid: errors.length === 0, errors };
}

/** คะแนนของผู้เล่น: แต้มคู่ + โบนัส − แต้มค้างมือ (ถ้าเปิด DEADWOOD_PENALTY และ final=true) */
function calculateScore({ melds = [], hand = [], bonus = 0 }, { final = false } = {}, rules = RULES) {
  const meldTotal = melds.reduce((sum, m) => sum + m.points, 0);
  const deadwood = hand.reduce((sum, c) => sum + cardPoint(c), 0);
  const penalty = final && rules.DEADWOOD_PENALTY ? deadwood : 0;
  return { meldTotal, deadwood, bonus, penalty, total: meldTotal + bonus - penalty };
}

// ═══ game/gameLogic.js ═══════════════════════════════════════
// Pure game engine — no React, no DOM. Every function takes a state and returns a new state.

const PLAYERS = ['player', 'ai'];
const other = (who) => (who === 'player' ? 'ai' : 'player');

let meldSeq = 0;

function createInitialState(rules = RULES) {
  return {
    status: 'idle', // idle | dealing | playing | roundOver
    round: 0,
    turn: 'player',
    step: 'draw', // draw | play
    deck: [],
    discard: [],
    hands: { player: [], ai: [] },
    melds: { player: [], ai: [] },
    bonus: { player: 0, ai: 0 },
    dealt: 0,
    result: null,
    notice: null,
    lastEvent: null,
    rules,
  };
}

function withEvent(state, event) {
  return { ...state, notice: null, lastEvent: { ...event, seq: (state.lastEvent?.seq ?? 0) + 1 } };
}

function reject(state, notice) {
  return { ...state, notice };
}

function startRound(state, rng = Math.random) {
  return withEvent(
    {
      ...createInitialState(state.rules),
      status: 'dealing',
      round: state.round + 1,
      deck: shuffle(createDeck(), rng),
    },
    { type: 'start' }
  );
}

/** แจกทีละใบ สลับผู้เล่น → AI แล้วเปิดไพ่ใบแรกลงกองทิ้ง */
function dealOne(state) {
  if (state.status !== 'dealing') return state;
  const total = state.rules.HAND_SIZE * 2;
  const { card, deck } = drawTop(state.deck);
  if (!card) return state;

  if (state.dealt < total) {
    const who = state.dealt % 2 === 0 ? 'player' : 'ai';
    return withEvent(
      { ...state, deck, dealt: state.dealt + 1, hands: { ...state.hands, [who]: [...state.hands[who], card] } },
      { type: 'deal', by: who, cardIds: [card.id] }
    );
  }
  // flip the starter discard and begin
  return withEvent(
    { ...state, deck, discard: [card], status: 'playing', turn: 'player', step: 'draw' },
    { type: 'flip', cardIds: [card.id] }
  );
}

function isDealComplete(state) {
  return state.status !== 'dealing';
}

function canAct(state, who, step) {
  return state.status === 'playing' && state.turn === who && state.step === step;
}

function drawCard(state, who) {
  if (!canAct(state, who, 'draw')) return reject(state, 'ยังจั่วไม่ได้ตอนนี้');
  const { card, deck } = drawTop(state.deck);
  if (!card) return endRound(state, 'deck');
  return withEvent(
    { ...state, deck, step: 'play', hands: { ...state.hands, [who]: [...state.hands[who], card] } },
    { type: 'draw', by: who, cardIds: [card.id] }
  );
}

/** ใช้ไพ่ในมือ 1 ใบผสมกับไพ่บนกองทิ้ง (แทนการจั่ว) */
function captureDiscard(state, who, cardId) {
  if (!canAct(state, who, 'draw')) return reject(state, 'ผสมกับกองทิ้งได้เฉพาะก่อนจั่ว');
  const top = state.discard[state.discard.length - 1];
  const card = state.hands[who].find((c) => c.id === cardId);
  if (!top || !card || !canPair(card, top, state.rules)) return reject(state, 'ไพ่ใบนี้รวมกับกองทิ้งไม่ได้ 10');

  const meld = { id: `m${++meldSeq}`, cards: [card, top], captured: true, points: meldPoints([card, top], { captured: true }, state.rules) };
  const next = withEvent(
    {
      ...state,
      step: 'play',
      discard: state.discard.slice(0, -1),
      hands: { ...state.hands, [who]: state.hands[who].filter((c) => c.id !== cardId) },
      melds: { ...state.melds, [who]: [...state.melds[who], meld] },
    },
    { type: 'capture', by: who, cardIds: [card.id, top.id], points: meld.points }
  );
  return next.hands[who].length === 0 ? endRound(next, 'knock', who) : next;
}

/** ผสมสิบไพ่ 2 ใบในมือ */
function meldCards(state, who, cardIds) {
  if (!canAct(state, who, 'play')) return reject(state, 'จั่วไพ่ก่อน แล้วค่อยผสมสิบ');
  const cards = cardIds.map((id) => state.hands[who].find((c) => c.id === id)).filter(Boolean);
  if (!isPhomSip(cards, state.rules)) return reject(state, 'ไพ่คู่นี้รวมกันไม่ได้ 10');

  const meld = { id: `m${++meldSeq}`, cards, captured: false, points: meldPoints(cards, {}, state.rules) };
  const next = withEvent(
    {
      ...state,
      hands: { ...state.hands, [who]: state.hands[who].filter((c) => !cardIds.includes(c.id)) },
      melds: { ...state.melds, [who]: [...state.melds[who], meld] },
    },
    { type: 'meld', by: who, cardIds, points: meld.points }
  );
  return next.hands[who].length === 0 ? endRound(next, 'knock', who) : next;
}

/** ทิ้งไพ่ 1 ใบ = จบตา */
function discardCard(state, who, cardId) {
  if (!canAct(state, who, 'play')) return reject(state, 'ต้องจั่วไพ่ก่อนทิ้ง');
  const card = state.hands[who].find((c) => c.id === cardId);
  if (!card) return reject(state, 'เลือกไพ่ที่จะทิ้ง 1 ใบ');

  const next = withEvent(
    {
      ...state,
      hands: { ...state.hands, [who]: state.hands[who].filter((c) => c.id !== cardId) },
      discard: [...state.discard, card],
      turn: other(who),
      step: 'draw',
    },
    { type: 'discard', by: who, cardIds: [cardId] }
  );
  if (next.hands[who].length === 0) return endRound(next, 'knock', who);
  if (next.deck.length === 0) return endRound(next, 'deck');
  return next;
}

/** ข้ามไปตาถัดไป (debug) */
function nextTurn(state) {
  if (state.status !== 'playing') return state;
  return withEvent({ ...state, turn: other(state.turn), step: 'draw' }, { type: 'turn' });
}

function scoresOf(state, final = false) {
  return Object.fromEntries(
    PLAYERS.map((p) => [p, calculateScore({ melds: state.melds[p], hand: state.hands[p], bonus: state.bonus[p] }, { final }, state.rules)])
  );
}

function endRound(state, reason, knocker = null) {
  const bonus = { ...state.bonus };
  if (knocker) bonus[knocker] += state.rules.KNOCK_BONUS;
  const ended = { ...state, bonus };
  const scores = scoresOf(ended, true);
  const diff = scores.player.total - scores.ai.total;
  const winner = diff > 0 ? 'player' : diff < 0 ? 'ai' : 'tie';
  return withEvent(
    { ...ended, status: 'roundOver', result: { winner, reason, knocker, scores } },
    { type: 'end', winner }
  );
}

/** Debug: บังคับผลลัพธ์ */
function forceResult(state, winner) {
  if (state.status === 'idle') return state;
  const scores = scoresOf(state, true);
  return withEvent(
    { ...state, status: 'roundOver', result: { winner, reason: 'debug', knocker: null, scores } },
    { type: 'end', winner }
  );
}

/** Payout for a finished round. Bet is already taken at round start. */
function payoutFor(result, bet, rules = RULES) {
  if (!result) return 0;
  if (result.winner === 'tie') return bet;
  if (result.winner !== 'player') return 0;
  return bet * (result.knocker === 'player' ? rules.KNOCK_WIN_MULTIPLIER : rules.WIN_MULTIPLIER);
}

function gameReducer(state, action) {
  switch (action.type) {
    case 'START_ROUND':
      return startRound(state, action.rng);
    case 'DEAL_ONE':
      return dealOne(state);
    case 'DRAW':
      return drawCard(state, action.who);
    case 'CAPTURE':
      return captureDiscard(state, action.who, action.cardId);
    case 'MELD':
      return meldCards(state, action.who, action.cardIds);
    case 'DISCARD':
      return discardCard(state, action.who, action.cardId);
    case 'NEXT_TURN':
      return nextTurn(state);
    case 'FORCE_RESULT':
      return forceResult(state, action.winner);
    case 'RESET':
      return createInitialState(state.rules);
    default:
      return state;
  }
}

// ═══ game/ai.js ══════════════════════════════════════════════
// Demo AI. Pure decisions — the controller adds delays + highlight animation around them.

const pickRandom = (arr, rng) => arr[Math.floor(rng() * arr.length)];

/** Step 1: จั่ว หรือ ผสมกับกองทิ้ง  → { type:'capture', cardId } | { type:'draw' } */
function aiChooseDraw(state, level, rng = Math.random) {
  const hand = state.hands.ai;
  const top = state.discard[state.discard.length - 1];
  const options = top ? findValidCombination(hand, top, state.rules) : [];
  if (options.length === 0) return { type: 'draw' };
  if (level === 'easy' && rng() < 0.55) return { type: 'draw' };
  // normal/hard: keep a hand card if it is already part of an in-hand pair, capture with another one
  const pairedIds = new Set(bestDisjointPairs(hand, state.rules).flatMap((p) => p.cards.map((c) => c.id)));
  const best = options.find((o) => !pairedIds.has(o.cards[0].id)) ?? options[0];
  return { type: 'capture', cardId: best.cards[0].id };
}

/** Step 2: คู่ที่จะผสม → [[id,id], ...] */
function aiChooseMelds(state, level, rng = Math.random) {
  const pairs = bestDisjointPairs(state.hands.ai, state.rules).map((p) => p.cards.map((c) => c.id));
  if (level === 'easy') return pairs.filter(() => rng() < 0.65);
  return pairs;
}

/** การ์ดที่ฝ่าย AI "เห็นแล้ว" — กองทิ้ง + คู่ที่ผสม + มือตัวเอง */
function seenIds(state) {
  return new Set([
    ...state.discard.map((c) => c.id),
    ...state.melds.player.flatMap((m) => m.cards.map((c) => c.id)),
    ...state.melds.ai.flatMap((m) => m.cards.map((c) => c.id)),
    ...state.hands.ai.map((c) => c.id),
  ]);
}

/** Step 3: ใบที่จะทิ้ง → cardId */
function aiChooseDiscard(state, level, rng = Math.random) {
  const hand = state.hands.ai;
  if (hand.length === 0) return null;
  if (level === 'easy') return pickRandom(hand, rng).id;

  if (level === 'normal') {
    return hand.reduce((hi, c) => (c.value > hi.value ? c : hi), hand[0]).id;
  }

  // hard: ทิ้งใบที่ "คู่ของมัน" ยังไม่โผล่น้อยที่สุด (ฝ่ายตรงข้ามมีโอกาสผสมกับกองทิ้งน้อย)
  // แต่เก็บใบที่ยังมีคู่เหลือเยอะไว้ลุ้นเอง → score = unseenPartners*3 − value
  const seen = seenIds(state);
  const unseen = createDeck().filter((c) => !seen.has(c.id));
  let best = hand[0];
  let bestScore = Infinity;
  for (const c of hand) {
    const partners = unseen.filter((u) => canPair(c, u, state.rules)).length;
    const score = partners * 3 - c.value;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best.id;
}

export { SUITS, RANKS, SUIT_BY_KEY, RULES, AI_LEVELS, fitBet, createDeck, createRng, shuffle, drawTop, cardPoint, canPair, isPhomSip, meldPoints, findValidCombination, bestDisjointPairs, validateHand, calculateScore, PLAYERS, other, createInitialState, startRound, dealOne, isDealComplete, canAct, drawCard, captureDiscard, meldCards, discardCard, nextTurn, scoresOf, endRound, forceResult, payoutFor, gameReducer, aiChooseDraw, aiChooseMelds, seenIds, aiChooseDiscard };
