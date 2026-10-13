// =====================================================
// Hand Evaluation — ประเมินไพ่ 5–7 ใบ หา 5 ใบที่ดีที่สุด
// คืนค่า { rank, name, values, cards } โดย values ใช้เปรียบเทียบ tie-break
// =====================================================

export const HAND_RANKS = [
  'HIGH CARD',
  'ONE PAIR',
  'TWO PAIR',
  'THREE OF A KIND',
  'STRAIGHT',
  'FLUSH',
  'FULL HOUSE',
  'FOUR OF A KIND',
  'STRAIGHT FLUSH',
  'ROYAL FLUSH',
];

/** หา high card ของ straight จากชุด rank ที่ไม่ซ้ำ (รองรับ A-2-3-4-5) — คืน 0 ถ้าไม่ใช่ */
function straightHigh(sortedUniqueDesc) {
  const ranks = sortedUniqueDesc.includes(14) ? [...sortedUniqueDesc, 1] : sortedUniqueDesc;
  for (let i = 0; i + 4 < ranks.length; i++) {
    if (ranks[i] - ranks[i + 4] === 4) return ranks[i];
  }
  return 0;
}

/** ประเมินไพ่ 5 ใบพอดี */
export function evaluateFive(cards) {
  const sorted = cards.slice().sort((a, b) => b.rank - a.rank);
  const isFlush = sorted.every((c) => c.suit === sorted[0].suit);
  const unique = [...new Set(sorted.map((c) => c.rank))];
  const high = unique.length === 5 ? straightHigh(unique) : 0;

  // จัดกลุ่มตามจำนวนใบ: [rank, count] เรียงตาม count มาก→น้อย แล้ว rank มาก→น้อย
  const counts = {};
  sorted.forEach((c) => (counts[c.rank] = (counts[c.rank] || 0) + 1));
  const groups = Object.entries(counts)
    .map(([r, n]) => [Number(r), n])
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const groupRanks = groups.map((g) => g[0]);
  const pattern = groups.map((g) => g[1]).join('');

  let rank;
  let values;
  if (high && isFlush) {
    rank = high === 14 ? 9 : 8;
    values = [high];
  } else if (pattern === '41') {
    rank = 7;
    values = groupRanks;
  } else if (pattern === '32') {
    rank = 6;
    values = groupRanks;
  } else if (isFlush) {
    rank = 5;
    values = sorted.map((c) => c.rank);
  } else if (high) {
    rank = 4;
    values = [high];
  } else if (pattern === '311') {
    rank = 3;
    values = groupRanks;
  } else if (pattern === '221') {
    rank = 2;
    values = groupRanks;
  } else if (pattern === '2111') {
    rank = 1;
    values = groupRanks;
  } else {
    rank = 0;
    values = sorted.map((c) => c.rank);
  }
  return { rank, name: HAND_RANKS[rank], values, cards: sorted };
}

/** เปรียบเทียบ 2 มือ: > 0 ถ้า a ดีกว่า, < 0 ถ้า b ดีกว่า, 0 ถ้าเสมอ */
export function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.values.length, b.values.length); i++) {
    const diff = (a.values[i] || 0) - (b.values[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** หามือที่ดีที่สุดจากไพ่ 5–7 ใบ (ลองทุก combination 5 ใบ) */
export function evaluateBestHand(cards) {
  if (!cards || cards.length < 5) return null;
  let best = null;
  const n = cards.length;
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++) {
            const result = evaluateFive([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || compareHands(result, best) > 0) best = result;
          }
  return best;
}

/** ชื่อมือแบบคร่าว ๆ สำหรับไพ่ < 5 ใบ (ใช้ตอน pre-flop แสดงให้ผู้เล่นดู) */
export function describePartialHand(cards) {
  if (!cards || cards.length === 0) return null;
  if (cards.length >= 5) return evaluateBestHand(cards);
  const counts = {};
  cards.forEach((c) => (counts[c.rank] = (counts[c.rank] || 0) + 1));
  const max = Math.max(...Object.values(counts));
  const pairs = Object.values(counts).filter((n) => n === 2).length;
  let rank = 0;
  if (max === 4) rank = 7;
  else if (max === 3) rank = 3;
  else if (pairs >= 2) rank = 2;
  else if (pairs === 1) rank = 1;
  return { rank, name: HAND_RANKS[rank], values: [], cards: [] };
}
