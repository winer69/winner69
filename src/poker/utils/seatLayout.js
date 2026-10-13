// =====================================================
// Seat layout — ตำแหน่งผู้เล่นเป็น % ของพื้นที่โต๊ะ
// แยกค่า Landscape / Portrait เพื่อให้โต๊ะมือถือแนวตั้งเป็นวงรีแนวตั้ง
// index 0 = Human (Bottom Center) แล้ววนตามเข็มนาฬิกา
// =====================================================

const POSITIONS = {
  landscape: {
    BC: [50, 83], BL: [14, 72], TL: [14, 25], TC: [50, 14], TR: [86, 25], BR: [86, 72], ML: [7, 49], MR: [93, 49],
  },
  portrait: {
    BC: [50, 86], BL: [13, 67], TL: [13, 31], TC: [50, 10], TR: [87, 31], BR: [87, 67], ML: [11, 48], MR: [89, 48],
  },
};

const ORDER_BY_COUNT = {
  2: ['BC', 'TC'],
  3: ['BC', 'TL', 'TR'],
  4: ['BC', 'ML', 'TC', 'MR'],
  5: ['BC', 'BL', 'TL', 'TR', 'BR'],
  6: ['BC', 'BL', 'TL', 'TC', 'TR', 'BR'],
};

// ตำแหน่ง bet ที่ต้องปรับเฉพาะ (กันชนกับ Pot / ไพ่ของเรา บนจอแนวนอนที่เตี้ย)
const BET_OVERRIDES = {
  landscape: { BC: [37, 72], TC: [63, 23] },
  portrait: {},
};

// Dealer button: ระยะเลื่อนจากที่นั่ง (% ของโต๊ะ) — วางให้ไม่ทับไพ่และ bet
const DEALER_OFFSETS = {
  BC: [-12, 5], TC: [-12, 6], TL: [11, 14], TR: [-11, 14], BL: [11, 6], BR: [-11, 6], ML: [10, 10], MR: [-10, 10],
};

export const TABLE_CENTER = { x: 50, y: 47 };

const lerp = (a, b, t) => a + (b - a) * t;

export function getSeatLayout(playerCount, orientation = 'landscape') {
  const order = ORDER_BY_COUNT[playerCount] || ORDER_BY_COUNT[6];
  const coords = POSITIONS[orientation] || POSITIONS.landscape;
  return order.map((key) => {
    const [x, y] = coords[key];
    const c = TABLE_CENTER;
    // bet chips อยู่ระหว่างผู้เล่นกับกลางโต๊ะ
    const betT = key === 'BC' ? 0.4 : 0.36;
    const bet = { x: lerp(x, c.x, betT), y: lerp(y, c.y, betT) };
    const override = (BET_OVERRIDES[orientation] || {})[key];
    if (override) {
      bet.x = override[0];
      bet.y = override[1];
    }
    const [ox, oy] = DEALER_OFFSETS[key];
    const dealer = { x: x + ox, y: y + oy };
    return {
      key,
      seat: { x, y },
      bet,
      dealer,
      isTop: y < 40,
      isLeft: x < 35,
      isRight: x > 65,
    };
  });
}
