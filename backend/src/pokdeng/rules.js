// Pok Deng rules, copied from PokDengGame.jsx (keep both in sync). Shared by the server and the browser.
/* Payout multiplier — แก้อัตราจ่ายที่นี่ที่เดียว */
export const PAYOUT = {
  NORMAL: 1,
  DENG_2: 2, // 2 ใบ ดอกเดียวกัน หรือ คู่
  DENG_3: 3, // 3 ใบ ดอกเดียวกัน
  DENG_4: 4, // สำรองไว้สำหรับกติกาบ้าน (house rule) — ระบบรองรับแล้ว
  TONG: 5, // ตอง
  STRAIGHT_FLUSH: 5, // เรียงดอกเดียวกัน
  STRAIGHT: 3, // เรียง
  SAM_LUEANG: 3, // สามเหลือง (J/Q/K ทั้ง 3 ใบ)
};

/* เจ้ามือจั่วใบที่ 3 อย่างไร */
export const DEALER_RULES = {
  ALWAYS_DRAW_AT_OR_BELOW: 3, // แต้ม 0–3 จั่วเสมอ
  NEVER_DRAW_AT_OR_ABOVE: 6, // แต้ม 6–7 อยู่เสมอ
  DRAW_CHANCE_BETWEEN: 0.5, // แต้ม 4–5 สุ่มจั่ว 50%
};

export const TIMING = {
  OPEN_TABLE: 700,
  DEAL_INTERVAL: 420,
  FLIP_PAUSE: 620,
  REVEAL_PAUSE: 760,
  POK_PAUSE: 1500,
  BALANCE_DELAY_WIN: 650,
  BALANCE_DELAY_LOSE: 380,
  RESULT_OVERLAY_DELAY: 1200,
  DEMO_START: 1100,
  DEMO_ACTION: 900,
  DEMO_NEXT: 2600,
};

export const OUTCOME = { WIN: "WIN", LOSE: "LOSE", DRAW: "DRAW" };

/* ============================================================
   2. utils/random.js
   ========================================================================== */

export function randomInt(max) {
  if (max <= 1) return 0;
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / max) * max; // ตัด modulo bias
    let x;
    do {
      c.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % max;
  }
  return Math.floor(Math.random() * max);
}

export function pick(arr) {
  return arr[randomInt(arr.length)];
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededRandom(seed) {
  let a = seed >>> 0;
  return function mulberry32() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ==========================================================================
   3. utils/deck.js
   ========================================================================== */

const TEXT_VS = "\uFE0E"; // บังคับให้สัญลักษณ์ดอกแสดงเป็นตัวอักษร (ไม่กลายเป็น emoji บน iOS)

export const SUITS = [
  { key: "S", symbol: "♠" + TEXT_VS, red: false },
  { key: "H", symbol: "♥" + TEXT_VS, red: true },
  { key: "D", symbol: "♦" + TEXT_VS, red: true },
  { key: "C", symbol: "♣" + TEXT_VS, red: false },
];
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

/** สร้างสำรับ 52 ใบ (ไม่มีใบซ้ำ) */
export function createDeck() {
  const deck = [];
  for (const s of SUITS) {
    RANKS.forEach((rank, i) => {
      deck.push({
        id: rank + s.key,
        rank,
        rankValue: i + 1, // A=1 ... K=13
        suit: s.key,
        symbol: s.symbol,
        red: s.red,
      });
    });
  }
  return deck;
}

/** Fisher–Yates shuffle ด้วย crypto random — คืนสำรับใหม่ ไม่แก้ของเดิม */
export function shuffleDeck(deck) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = d[i];
    d[i] = d[j];
    d[j] = tmp;
  }
  return d;
}

/** หยิบไพ่ใบบนสุด — คืนไพ่ + สำรับที่เหลือ (immutable) */
export function dealCard(deck) {
  if (!deck || deck.length === 0) throw new Error("Deck is empty");
  return { card: deck[0], deck: deck.slice(1) };
}

/* ==========================================================================
   4. utils/pokdeng.js
   ========================================================================== */

export function cardPoint(card) {
  return card.rankValue >= 10 ? 0 : card.rankValue; // A=1, 2–9 ตามหน้า, 10/J/Q/K = 0
}

export function calculatePoints(cards) {
  return cards.reduce((sum, c) => sum + cardPoint(c), 0) % 10;
}

function checkStraight(cards) {
  if (cards.length !== 3) return { ok: false, high: 0 };
  const v = cards.map((c) => c.rankValue).sort((a, b) => a - b);
  if (v[0] + 1 === v[1] && v[1] + 1 === v[2]) return { ok: true, high: v[2] };
  if (v[0] === 1 && v[1] === 12 && v[2] === 13) return { ok: true, high: 14 }; // Q-K-A
  return { ok: false, high: 0 };
}

function dengTag(mult) {
  return mult > 1 ? `${mult} เด้ง` : "";
}

/**
 * ประเมินมือ — คืนค่าที่ใช้ทั้งตัดสินผลและแสดงผล
 * score: ใช้เปรียบเทียบ (ป๊อก > ตอง > สเตรทฟลัช > เรียง > สามเหลือง > แต้มปกติ)
 */
export function calculatePokDeng(cards) {
  const n = cards.length;
  const points = calculatePoints(cards);
  const sameSuit = n > 1 && cards.every((c) => c.suit === cards[0].suit);
  const sameRank = n > 1 && cards.every((c) => c.rank === cards[0].rank);

  const base = {
    cardCount: n,
    points,
    isPok: false,
    type: "NORMAL",
    deng: 1,
    multiplier: PAYOUT.NORMAL,
    score: points,
    label: `${points} แต้ม`,
    badge: `${points} แต้ม`,
    tag: "",
  };

  if (n === 2) {
    const deng = sameSuit || sameRank ? 2 : 1;
    const multiplier = deng === 2 ? PAYOUT.DENG_2 : PAYOUT.NORMAL;
    if (points >= 8) {
      return {
        ...base,
        isPok: true,
        type: "POK",
        deng,
        multiplier,
        score: 1000 + points,
        label: `ป๊อก ${points}`,
        badge: `POK ${points}`,
        tag: dengTag(multiplier),
      };
    }
    return { ...base, deng, multiplier, tag: dengTag(multiplier) };
  }

  if (n === 3) {
    const straight = checkStraight(cards);
    if (sameRank) {
      const rv = cards[0].rankValue === 1 ? 14 : cards[0].rankValue;
      return { ...base, type: "TONG", deng: PAYOUT.TONG, multiplier: PAYOUT.TONG, score: 500 + rv, label: "ตอง", badge: "ตอง", tag: `x${PAYOUT.TONG}` };
    }
    if (straight.ok && sameSuit) {
      return { ...base, type: "STRAIGHT_FLUSH", deng: PAYOUT.STRAIGHT_FLUSH, multiplier: PAYOUT.STRAIGHT_FLUSH, score: 400 + straight.high, label: "สเตรทฟลัช", badge: "สเตรทฟลัช", tag: `x${PAYOUT.STRAIGHT_FLUSH}` };
    }
    if (straight.ok) {
      return { ...base, type: "STRAIGHT", deng: PAYOUT.STRAIGHT, multiplier: PAYOUT.STRAIGHT, score: 300 + straight.high, label: "เรียง", badge: "เรียง", tag: `x${PAYOUT.STRAIGHT}` };
    }
    if (cards.every((c) => c.rankValue >= 11)) {
      return { ...base, type: "SAM_LUEANG", deng: PAYOUT.SAM_LUEANG, multiplier: PAYOUT.SAM_LUEANG, score: 200, label: "สามเหลือง", badge: "สามเหลือง", tag: `x${PAYOUT.SAM_LUEANG}` };
    }
    const deng = sameSuit ? 3 : 1;
    const multiplier = deng === 3 ? PAYOUT.DENG_3 : PAYOUT.NORMAL;
    return { ...base, deng, multiplier, tag: dengTag(multiplier) };
  }

  return base;
}

/**
 * ตัดสินผล — คำนวณจาก state ล้วน ๆ (animation ไม่มีผลต่อผลลัพธ์)
 * ชนะ: ได้ bet × multiplier ของมือผู้เล่น
 * แพ้: เสีย bet × multiplier ของมือเจ้ามือ (ไม่เกินเครดิตที่มี)
 */
export function determineWinner(playerEval, dealerEval, bet, balance = Infinity) {
  if (playerEval.score > dealerEval.score) {
    const multiplier = playerEval.multiplier;
    return { outcome: OUTCOME.WIN, multiplier, delta: bet * multiplier };
  }
  if (playerEval.score < dealerEval.score) {
    const multiplier = dealerEval.multiplier;
    return { outcome: OUTCOME.LOSE, multiplier, delta: -Math.min(bet * multiplier, balance) };
  }
  return { outcome: OUTCOME.DRAW, multiplier: 1, delta: 0 };
}

export function shouldDealerDraw(dealerEval, rng = Math.random) {
  if (dealerEval.isPok || dealerEval.cardCount !== 2) return false;
  if (dealerEval.points <= DEALER_RULES.ALWAYS_DRAW_AT_OR_BELOW) return true;
  if (dealerEval.points >= DEALER_RULES.NEVER_DRAW_AT_OR_ABOVE) return false;
  return rng() < DEALER_RULES.DRAW_CHANCE_BETWEEN;
}

/** ใช้ใน Demo Mode เพื่อตัดสินใจแทนผู้เล่น */
export function shouldPlayerAutoDraw(playerEval) {
  return !playerEval.isPok && playerEval.cardCount === 2 && playerEval.points <= 4;
}

