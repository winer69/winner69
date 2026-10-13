// =====================================================
// Deck — สร้างสำรับ 52 ใบ + Fisher–Yates shuffle
// ไพ่ถูก "ดึงออก" จากสำรับเสมอ จึงไม่มีทางแจกซ้ำใน Hand เดียวกัน
// =====================================================

export const SUITS = ['s', 'h', 'd', 'c'];
export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const SUIT_NAMES = { s: 'Spades', h: 'Hearts', d: 'Diamonds', c: 'Clubs' };
export const RANK_LABELS = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export const rankLabel = (rank) => RANK_LABELS[rank] || String(rank);
export const isRedSuit = (suit) => suit === 'h' || suit === 'd';
export const cardToString = (card) => (card ? `${rankLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}` : '??');

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, id: `${rankLabel(rank)}${suit}` });
    }
  }
  return deck;
}

// สุ่มเลขแบบไม่ลำเอียง ใช้ crypto ถ้ามี
function secureRandomInt(maxExclusive) {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive; // ตัด modulo bias
    let value;
    do {
      cryptoObj.getRandomValues(buf);
      value = buf[0];
    } while (value >= limit);
    return value % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

export function shuffleDeck(deck) {
  const shuffled = deck.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** ดึงไพ่ n ใบจากด้านบนสำรับ — คืนค่า { cards, deck } ใหม่ (immutable) */
export function drawCards(deck, count) {
  if (deck.length < count) throw new Error('Deck is out of cards');
  return { cards: deck.slice(0, count), deck: deck.slice(count) };
}
