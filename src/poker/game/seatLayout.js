// =====================================================
// Seat layout — ตำแหน่ง (เป็น % ของพื้นที่โต๊ะ) สำหรับแต่ละจำนวนผู้เล่น
// seat = ตำแหน่ง Avatar, bet = กอง chip ที่ลง, dealer = จุดวาง Dealer Button
// index 0 = Human อยู่ล่างกลางเสมอ แล้วเรียงตามเข็มนาฬิกา
// =====================================================

const LANDSCAPE = {
  BC: { seat: [50, 85], bet: [50, 67], dealer: [62, 69] },
  BL: { seat: [14, 75], bet: [28, 64], dealer: [24, 55] },
  TL: { seat: [14, 24], bet: [28, 34], dealer: [24, 43] },
  TC: { seat: [50, 12], bet: [50, 26], dealer: [37, 25] },
  TR: { seat: [86, 24], bet: [72, 34], dealer: [76, 43] },
  BR: { seat: [86, 75], bet: [72, 64], dealer: [76, 55] },
  ML: { seat: [7, 50], bet: [21, 42], dealer: [20, 58] },
  MR: { seat: [93, 50], bet: [79, 58], dealer: [80, 42] },
};

const PORTRAIT = {
  BC: { seat: [50, 89], bet: [50, 69], dealer: [72, 76] },
  BL: { seat: [13, 69], bet: [28, 63], dealer: [25, 72] },
  TL: { seat: [13, 30], bet: [28, 37], dealer: [25, 27] },
  TC: { seat: [50, 10], bet: [50, 23], dealer: [33, 20] },
  TR: { seat: [87, 30], bet: [72, 37], dealer: [75, 27] },
  BR: { seat: [87, 69], bet: [72, 63], dealer: [75, 72] },
  ML: { seat: [12, 50], bet: [24, 40], dealer: [26, 60] },
  MR: { seat: [88, 50], bet: [76, 60], dealer: [74, 40] },
};

export const SEAT_ORDER_BY_COUNT = {
  2: ['BC', 'TC'],
  3: ['BC', 'TL', 'TR'],
  4: ['BC', 'ML', 'TC', 'MR'],
  5: ['BC', 'BL', 'TL', 'TR', 'BR'],
  6: ['BC', 'BL', 'TL', 'TC', 'TR', 'BR'],
};

export const POT_POSITION = { landscape: [50, 36], portrait: [50, 38] };
export const DECK_POSITION = { landscape: [50, 50], portrait: [50, 50] };

/** คืน layout ของทุกที่นั่งตามจำนวนผู้เล่นและแนวจอ */
export function getSeatLayout(playerCount, orientation) {
  const source = orientation === 'portrait' ? PORTRAIT : LANDSCAPE;
  const keys = SEAT_ORDER_BY_COUNT[playerCount] || SEAT_ORDER_BY_COUNT[6];
  return keys.map((key) => ({ key, ...source[key] }));
}

/** แปลงจุดอ้างอิง (seat / bet / pot / deck) เป็นพิกัด % */
export function resolvePoint(point, layout, orientation) {
  if (!point) return [50, 50];
  if (point.kind === 'pot') return POT_POSITION[orientation];
  if (point.kind === 'deck') return DECK_POSITION[orientation];
  const seat = layout[point.index];
  if (!seat) return [50, 50];
  return point.kind === 'bet' ? seat.bet : seat.seat;
}
