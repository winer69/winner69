// Dummy (ดัมมี่) rules, copied from DummyGame.jsx (keep both in sync). Pure functions shared by
// the server tables (dummy/hub.js) and the browser.
export const KNOCK_BONUS = 50;
export const HAND_SIZE = { 2: 11, 3: 9, 4: 7 };
const rnd = () => {
  try {
    const a = new Uint32Array(1);
    globalThis.crypto.getRandomValues(a);
    return a[0] / 4294967296;
  } catch (e) {
    return Math.random();
  }
};
const randInt = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/* =====================================================================
 * 3. DECK (deck.js)
 * ===================================================================== */
const SUITS = ["S", "H", "D", "C"];
const SUIT_SYMBOL = { S: "♠", H: "♥", D: "♦", C: "♣" };
const SUIT_ORDER = { S: 0, H: 1, D: 2, C: 3 };
const rankLabel = (r) => ({ 1: "A", 11: "J", 12: "Q", 13: "K" }[r] || String(r));
const isRed = (s) => s === "H" || s === "D";
const cardName = (c) => `${rankLabel(c.rank)}${SUIT_SYMBOL[c.suit]}`;

function createDeck() {
  const d = [];
  SUITS.forEach((s) => {
    for (let r = 1; r <= 13; r++) d.push({ id: `${r}${s}`, rank: r, suit: s });
  });
  return d;
}
function shuffleDeck(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** คะแนนไพ่แบบดัมมี่: 2–9 = 5, 10–K = 10, A = 15, 2♣ และ Q♠ = 50 */
const cardPoints = (c) =>
  (c.rank === 2 && c.suit === "C") || (c.rank === 12 && c.suit === "S") ? 50 : c.rank === 1 ? 15 : c.rank >= 10 ? 10 : 5;
const sumPoints = (cards) => cards.reduce((a, c) => a + cardPoints(c), 0);

function sortCards(cards, mode) {
  return cards.slice().sort((a, b) =>
    mode === "rank"
      ? a.rank - b.rank || SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]
      : SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || a.rank - b.rank
  );
}

/* =====================================================================
 * 4. GAME LOGIC (gameLogic.js)
 * ===================================================================== */
/** คืนค่า "set" (ตอง), "run" (เรียง) หรือ null */
function meldType(cards) {
  if (!cards || cards.length < 3) return null;
  if (cards.every((c) => c.rank === cards[0].rank)) return cards.length <= 4 ? "set" : null;
  if (!cards.every((c) => c.suit === cards[0].suit)) return null;
  const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);
  const consecutive = (rs) => rs.every((r, i) => i === 0 || r === rs[i - 1] + 1);
  if (consecutive(ranks)) return "run";
  if (ranks[0] === 1 && consecutive([...ranks.slice(1), 14])) return "run"; // Q-K-A
  return null;
}
function orderMeld(cards) {
  if (meldType(cards) === "set") return cards.slice().sort((a, b) => SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]);
  const s = cards.slice().sort((a, b) => a.rank - b.rank);
  const lowOk = s.every((c, i) => i === 0 || c.rank === s[i - 1].rank + 1);
  return !lowOk && s[0].rank === 1 ? [...s.slice(1), s[0]] : s;
}
function candidateMelds(hand) {
  const out = [];
  const byRank = {};
  hand.forEach((c) => (byRank[c.rank] = byRank[c.rank] || []).push(c));
  Object.values(byRank).forEach((g) => {
    if (g.length >= 3) {
      out.push(g.slice());
      if (g.length === 4) for (let i = 0; i < 4; i++) out.push(g.filter((_, j) => j !== i));
    }
  });
  SUITS.forEach((s) => {
    const m = new Map();
    hand.filter((c) => c.suit === s).forEach((c) => {
      m.set(c.rank, c);
      if (c.rank === 1) m.set(14, c);
    });
    for (let start = 1; start <= 12; start++) {
      const run = [];
      for (let r = start; r <= 14 && m.has(r); r++) {
        if (run.includes(m.get(r))) break;
        run.push(m.get(r));
        if (run.length >= 3) out.push(run.slice());
      }
    }
  });
  return out;
}
/** หา partition ที่ทำให้แต้มไพ่ค้างมือ (deadwood) น้อยที่สุด */
function bestPartition(hand) {
  const cands = candidateMelds(hand);
  let best = null;
  const used = new Set();
  const chosen = [];
  const dead = [];
  let iter = 0;
  const dfs = (i) => {
    if (++iter > 80000) return;
    while (i < hand.length && used.has(hand[i].id)) i++;
    if (i >= hand.length) {
      const dp = sumPoints(dead);
      if (!best || dp < best.deadPts || (dp === best.deadPts && dead.length < best.dead.length))
        best = { melds: chosen.map((m) => m.slice()), dead: dead.slice(), deadPts: dp };
      return;
    }
    const c = hand[i];
    for (const m of cands) {
      if (!m.includes(c) || m.some((x) => used.has(x.id))) continue;
      m.forEach((x) => used.add(x.id));
      chosen.push(m);
      dfs(i + 1);
      chosen.pop();
      m.forEach((x) => used.delete(x.id));
    }
    used.add(c.id);
    dead.push(c);
    dfs(i + 1);
    dead.pop();
    used.delete(c.id);
  };
  dfs(0);
  return best || { melds: [], dead: hand.slice(), deadPts: sumPoints(hand) };
}
/** ไพ่ใบนี้ (เช่นที่เก็บจากกองทิ้ง) นำไปลงชุดได้ทันทีหรือไม่ */
function canUseCard(card, hand, tableMelds) {
  if (!card) return false;
  if (candidateMelds([...hand, card]).some((m) => m.includes(card))) return true;
  return tableMelds.some((m) => meldType([...m.cards, card]));
}
/** แผนปิดเกม: ลงชุดทั้งหมด + ฝากไพ่ + เหลือทิ้งได้ไม่เกิน 1 ใบ */
function knockPlan(hand, tableMelds, mustMeldId) {
  if (!hand.length) return null;
  const part = bestPartition(hand);
  const virtual = [...tableMelds.map((m) => ({ id: m.id, cards: m.cards.slice() })), ...part.melds.map((m, i) => ({ id: `new${i}`, cards: m.slice() }))];
  const layoffs = [];
  let dead = part.dead.slice();
  let changed = true;
  while (changed && dead.length) {
    changed = false;
    for (const c of dead) {
      const t = virtual.find((m) => meldType([...m.cards, c]));
      if (t) {
        t.cards.push(c);
        layoffs.push({ card: c, meldId: t.id });
        dead = dead.filter((x) => x !== c);
        changed = true;
        break;
      }
    }
  }
  if (dead.length > 1) return null;
  if (dead.length === 1 && dead[0].id === mustMeldId) return null;
  return { melds: part.melds, layoffs, discard: dead[0] || null };
}
function chooseDiscard(hand, difficulty, ctx) {
  const { dead } = bestPartition(hand);
  const pool = (dead.length ? dead : hand).filter((c) => c.id !== ctx.mustMeldId);
  const list = pool.length ? pool : hand;
  if (difficulty === "easy") return pick(list);
  const score = (c) => {
    let s = cardPoints(c);
    if (hand.some((o) => o !== c && o.rank === c.rank)) s -= 7;
    if (hand.some((o) => o !== c && o.suit === c.suit && Math.abs(o.rank - c.rank) <= 2)) s -= 4;
    if (difficulty === "hard") {
      s += ctx.discard.filter((d) => d.rank === c.rank).length * 4; // ไพ่ที่ออกไปแล้ว = ปลอดภัย
      if (ctx.melds.some((m) => meldType([...m.cards, c]))) s -= 10; // อย่าป้อนให้คนอื่นฝาก
      if (cardPoints(c) === 50) s += 20; // รีบทิ้งไพ่โทษหนัก
    }
    return s + rnd() * 0.5;
  };
  return list.reduce((b, c) => (score(c) > score(b) ? c : b));
}
function computeResults(players, winnerIdx, knock) {
  const rows = players.map((p, i) => {
    const handPts = sumPoints(p.hand);
    const bonus = knock && i === winnerIdx ? KNOCK_BONUS : 0;
    return { idx: i, name: p.name, avatar: p.avatar, isUser: p.isUser, meldPts: p.meldPoints, handPts, bonus, score: p.meldPoints - handPts + bonus, hand: p.hand };
  });
  let winner = winnerIdx;
  if (winner == null) winner = rows.reduce((b, r) => (r.score > b.score ? r : b), rows[0]).idx;
  rows.sort((a, b) => (a.idx === winner ? -1 : b.idx === winner ? 1 : b.score - a.score));
  return { winner, knock, rows };
}


export { rnd, randInt, pick, SUITS, SUIT_SYMBOL, SUIT_ORDER, rankLabel, isRed, cardName, createDeck, shuffleDeck, cardPoints, sumPoints, sortCards,
  meldType, orderMeld, candidateMelds, bestPartition, canUseCard, knockPlan, chooseDiscard, computeResults };
