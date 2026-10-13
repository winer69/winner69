// =====================================================
// Randomization utilities — avatar / username / level / chips / personality
// (สำรับไพ่ใช้ shuffle แยกต่างหากใน game/deck.js)
// =====================================================

import { AVATARS } from './avatars.js';
import { GAME_CONFIG } from '../game/constants.js';

export const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];

/** สุ่ม n ค่าไม่ซ้ำจาก list */
export function pickUnique(list, count) {
  const pool = list.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

const NAME_PREFIXES = [
  'Lucky', 'Night', 'Blue', 'Gold', 'Crazy', 'Silent', 'Wild', 'Mango', 'Royal', 'Iron', 'Shadow', 'Neon',
  'Tiger', 'Ace', 'River', 'Ninja', 'Jade', 'Storm', 'Happy', 'Big', 'Chill', 'Spicy', 'Cosmic', 'Turbo',
];
const NAME_ROOTS = [
  'Fox', 'Wolf', 'Dragon', 'King', 'Cat', 'Boy', 'Queen', 'Shark', 'Fish', 'Master', 'Nine', 'Joker',
  'Panda', 'Bluff', 'Hunter', 'Rider', 'Monk', 'Chip', 'Flush', 'Tiger', 'Baron', 'Lady', 'Pilot', 'Duck',
];
const FIXED_NAMES = [
  'Tiger88', 'LuckyFox', 'PokerKing', 'BlueDragon', 'NightWolf', 'MangoBoy', 'CrazyCat', 'AceMaster',
  'GoldFish', 'LuckyNine', 'Mark92', 'Nong_Ploy', 'SiamShark', 'RiverQueen', 'xBluffer', 'MrAllIn',
];

/** สร้าง username ที่ดูเหมือนผู้เล่นจริง และไม่ซ้ำกับ usedNames */
export function randomUsername(usedNames = new Set()) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const style = Math.random();
    let name;
    if (style < 0.3) name = pickRandom(FIXED_NAMES);
    else if (style < 0.75) name = pickRandom(NAME_PREFIXES) + pickRandom(NAME_ROOTS);
    else name = pickRandom(NAME_PREFIXES) + pickRandom(NAME_ROOTS) + randomInt(7, 99);
    if (name.length > 12) continue;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }
  const fallback = `Player${randomInt(100, 999)}`;
  usedNames.add(fallback);
  return fallback;
}

/** สุ่ม avatar ไม่ซ้ำกับที่ใช้ไปแล้วในโต๊ะ */
export function randomAvatar(usedIds = new Set()) {
  const available = AVATARS.filter((a) => !usedIds.has(a.id));
  const avatar = pickRandom(available.length ? available : AVATARS);
  usedIds.add(avatar.id);
  return avatar;
}

export const randomLevel = () => randomInt(1, 99);

/** chip ของ AI ปัดเป็นหลักร้อย */
export function randomChip([min, max] = GAME_CONFIG.aiChipRange) {
  return Math.round(randomInt(min, max) / 100) * 100;
}

export const randomPersonality = () => pickRandom(['tight', 'normal', 'normal', 'aggressive', 'random']);
