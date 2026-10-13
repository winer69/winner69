// =====================================================
// ข้อความทั้งหมดในเกม (ไทย / English)
// เพิ่มภาษาใหม่: copy object `th` แล้วแปล จากนั้นเพิ่มลงใน STRINGS
// =====================================================

import { cardToString } from '../game/deck.js';

const n = (v) => Math.round(v || 0).toLocaleString('en-US');

const th = {
  code: 'th',
  languageName: 'ไทย',
  players: (count) => `${count} ผู้เล่น`,
  handNo: (num) => `มือที่ ${num}`,
  phases: {
    idle: 'รอเริ่มเกม',
    preflop: 'พรีฟล็อป',
    flop: 'ฟล็อป',
    turn: 'เทิร์น',
    river: 'ริเวอร์',
    showdown: 'เปิดไพ่',
    handOver: 'จบมือ',
  },
  actions: { fold: 'หมอบ', check: 'เช็ค', call: 'ตาม', raise: 'เพิ่ม', allin: 'ออลอิน', sb: 'SB', bb: 'BB', out: 'ออก' },
  minRaise: (v) => `ขั้นต่ำ ${v}`,
  you: 'คุณ',
  out: 'หมดชิป',
  pot: 'พอต',
  yourTurn: 'ตาคุณ',
  toCall: (v) => `ต้องตาม ${v}`,
  checkOrBet: 'เช็คหรือเดิมพัน',
  dealing: 'กำลังแจกไพ่…',
  thinking: (name) => `${name} กำลังคิด…`,
  nextCard: 'กำลังเปิดไพ่ใบถัดไป…',
  revealing: 'เปิดไพ่ — กำลังโชว์มือทีละคน',
  foldedWatching: 'คุณหมอบแล้ว — รอดูมือนี้จนจบ',
  nextHand: 'เล่นมือถัดไป',
  autoDeal: 'จะแจกอัตโนมัติในอีกครู่',
  tapToDeal: 'แตะเพื่อแจกไพ่',
  bet: {
    current: 'เดิมพันบนโต๊ะ',
    total: 'ยอดเดิมพันของคุณ',
    remaining: 'ชิปคงเหลือ',
    quick: ['½ พอต', '⅔ พอต', '¾ พอต', 'เต็มพอต'],
    allIn: 'ออลอิน',
    back: 'ย้อนกลับ',
    raiseTo: 'เพิ่มเป็น',
    confirmAllIn: 'ออลอิน',
  },
  result: { win: 'ชนะ', lose: 'แพ้', split: 'แบ่งพอต', wins: (name) => `${name} ชนะ` },
  hands: ['ไพ่สูง', 'หนึ่งคู่', 'สองคู่', 'ตอง', 'สเตรท', 'ฟลัช', 'ฟูลเฮาส์', 'โฟร์การ์ด', 'สเตรทฟลัช', 'รอยัลฟลัช'],
  lobby: {
    intro: (sb, bb, chips) => `บลายด์ ${sb}/${bb} เริ่มต้นด้วยชิป ${chips}`,
    playersAtTable: 'จำนวนผู้เล่นที่โต๊ะ',
    newGame: 'เริ่มเกมใหม่',
    backToTable: 'กลับไปที่โต๊ะเดิม',
    outOfChips: 'ชิปหมดแล้ว',
    outOfChipsText: 'เริ่มโต๊ะใหม่เพื่อรับชิปเสมือนชุดใหม่',
    cleared: 'คุณชนะทั้งโต๊ะ!',
    clearedText: (chips) => `คู่แข่งทุกคนหมดชิปแล้ว คุณจบด้วยชิป ${chips}`,
  },
  menu: { autoNext: 'แจกมือถัดไปอัตโนมัติ', debug: 'แผง Debug', newGame: 'เริ่มเกมใหม่…', language: 'ภาษา' },
  aria: { back: 'กลับไปล็อบบี้', history: 'ประวัติการเล่น', mute: 'ปิดเสียง', unmute: 'เปิดเสียง', settings: 'ตั้งค่า', close: 'ปิด', react: 'ส่งอีโมจิ' },
  history: { title: 'ประวัติการเล่น', empty: 'มือที่คุณเล่นจะแสดงที่นี่' },
  notices: {
    fold: 'คุณหมอบแล้ว',
    check: 'เช็ค',
    call: (v) => `ตาม ${n(v)}`,
    raise: (v) => `เพิ่มเป็น ${n(v)}`,
    allin: 'ออลอิน!',
    otherAllin: (name) => `${name} ออลอิน!`,
  },
  errors: {
    notYourTurn: 'ยังไม่ถึงตาคุณ',
    cannotCheck: 'เช็คไม่ได้ — มีเดิมพันที่ต้องตาม',
    tooMuch: 'จำนวนเกินชิปที่คุณมี',
    minRaise: (v) => `เพิ่มขั้นต่ำ ${n(v)}`,
    generic: 'ทำรายการนี้ไม่ได้ในตอนนี้',
  },
  log: {
    handStart: (d) => `— มือที่ ${d.hand} — ดีลเลอร์: ${d.dealer}`,
    blinds: (d) => `${d.sb} ลง SB ${n(d.sbAmount)}, ${d.bb} ลง BB ${n(d.bbAmount)}`,
    fold: (d) => `${d.name} หมอบ`,
    check: (d) => `${d.name} เช็ค`,
    call: (d) => `${d.name} ตาม ${n(d.amount)}${d.allIn ? ' (ออลอิน)' : ''}`,
    raise: (d) => `${d.name} เพิ่มเป็น ${n(d.to)}${d.allIn ? ' (ออลอิน)' : ''}`,
    allin: (d) => `${d.name} ออลอิน (${n(d.to)})`,
    street: (d) => `${th.phases[d.phase]}: ${d.cards.map(cardToString).join(' ')}`,
    winUncontested: (d) => `${d.name} ชนะ ${n(d.amount)} (คนอื่นหมอบหมด)`,
    winPot: (d) =>
      `${d.names.join(' และ ')} ชนะ${d.potIndex === 0 ? 'พอตหลัก' : `ไซด์พอต ${d.potIndex}`} ${n(d.amount)} ด้วย${th.hands[d.rank]}`,
  },
};

const en = {
  code: 'en',
  languageName: 'English',
  players: (count) => `${count} Players`,
  handNo: (num) => `Hand ${num}`,
  phases: {
    idle: 'Waiting',
    preflop: 'Pre-Flop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
    showdown: 'Showdown',
    handOver: 'Hand Over',
  },
  actions: { fold: 'FOLD', check: 'CHECK', call: 'CALL', raise: 'RAISE', allin: 'ALL IN', sb: 'SB', bb: 'BB', out: 'OUT' },
  minRaise: (v) => `min ${v}`,
  you: 'You',
  out: 'Out',
  pot: 'POT',
  yourTurn: 'YOUR TURN',
  toCall: (v) => `${v} to call`,
  checkOrBet: 'Check or bet',
  dealing: 'Dealing cards…',
  thinking: (name) => `${name} is thinking…`,
  nextCard: 'Next card coming…',
  revealing: 'Showdown — revealing hands',
  foldedWatching: 'You folded — watching this hand',
  nextHand: 'NEXT HAND',
  autoDeal: 'auto-deals shortly',
  tapToDeal: 'tap to deal',
  bet: {
    current: 'Current bet',
    total: 'Your total bet',
    remaining: 'Remaining',
    quick: ['½ Pot', '⅔ Pot', '¾ Pot', 'Pot'],
    allIn: 'All in',
    back: 'BACK',
    raiseTo: 'RAISE TO',
    confirmAllIn: 'ALL IN',
  },
  result: { win: 'WIN', lose: 'LOSE', split: 'SPLIT POT', wins: (name) => `${name} wins` },
  hands: ['HIGH CARD', 'ONE PAIR', 'TWO PAIR', 'THREE OF A KIND', 'STRAIGHT', 'FLUSH', 'FULL HOUSE', 'FOUR OF A KIND', 'STRAIGHT FLUSH', 'ROYAL FLUSH'],
  lobby: {
    intro: (sb, bb, chips) => `Blinds ${sb}/${bb}. You start with ${chips}.`,
    playersAtTable: 'Players at the table',
    newGame: 'NEW GAME',
    backToTable: 'Back to current table',
    outOfChips: 'Out of chips',
    outOfChipsText: 'Start a new table to get a fresh stack of virtual chips.',
    cleared: 'You cleared the table',
    clearedText: (chips) => `Every opponent is busted. You finished with ${chips}.`,
  },
  menu: { autoNext: 'Auto-deal next hand', debug: 'Debug panel', newGame: 'New game…', language: 'Language' },
  aria: { back: 'Back to lobby', history: 'Hand history', mute: 'Mute sound', unmute: 'Turn sound on', settings: 'Settings', close: 'Close', react: 'Send a reaction' },
  history: { title: 'Hand history', empty: 'Hands you play will appear here.' },
  notices: {
    fold: 'You folded',
    check: 'Check',
    call: (v) => `Call ${n(v)}`,
    raise: (v) => `Raise to ${n(v)}`,
    allin: 'ALL IN!',
    otherAllin: (name) => `${name} is ALL IN!`,
  },
  errors: {
    notYourTurn: 'Not your turn',
    cannotCheck: 'Cannot check — there is a bet to call',
    tooMuch: 'Raise exceeds your chips',
    minRaise: (v) => `Minimum raise is ${n(v)}`,
    generic: 'That action is not available right now',
  },
  log: {
    handStart: (d) => `— Hand #${d.hand} — Dealer: ${d.dealer}`,
    blinds: (d) => `${d.sb} posts SB ${n(d.sbAmount)}, ${d.bb} posts BB ${n(d.bbAmount)}`,
    fold: (d) => `${d.name} folds`,
    check: (d) => `${d.name} checks`,
    call: (d) => `${d.name} calls ${n(d.amount)}${d.allIn ? ' (ALL IN)' : ''}`,
    raise: (d) => `${d.name} raises to ${n(d.to)}${d.allIn ? ' (ALL IN)' : ''}`,
    allin: (d) => `${d.name} goes ALL IN (${n(d.to)})`,
    street: (d) => `${en.phases[d.phase]}: ${d.cards.map(cardToString).join(' ')}`,
    winUncontested: (d) => `${d.name} wins ${n(d.amount)} (everyone folded)`,
    winPot: (d) =>
      `${d.names.join(' & ')} win${d.names.length > 1 ? '' : 's'} ${d.potIndex === 0 ? 'main pot' : `side pot ${d.potIndex}`} ${n(d.amount)} with ${en.hands[d.rank]}`,
  },
};

export const STRINGS = { th, en };
export const LANGUAGES = Object.values(STRINGS).map((s) => ({ code: s.code, name: s.languageName }));

/** แปลง log entry จาก engine เป็นข้อความตามภาษา */
export function formatLog(t, entry) {
  const fn = entry.msg && t.log[entry.msg.type];
  return fn ? fn(entry.msg) : entry.text;
}

/** แปลง error จาก engine (ภาษาอังกฤษ) เป็นข้อความตามภาษา */
export function translateError(t, message) {
  if (!message) return t.errors.generic;
  if (message.startsWith('Not your turn')) return t.errors.notYourTurn;
  if (message.startsWith('Cannot check')) return t.errors.cannotCheck;
  if (message.startsWith('Raise exceeds')) return t.errors.tooMuch;
  const min = message.match(/^Minimum raise is (\d+)/);
  if (min) return t.errors.minRaise(Number(min[1]));
  return t.errors.generic;
}
