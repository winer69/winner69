// Game configs for every cascade slot (engine: cascadeSlot.js). Shared by server and browser.
// edge = the key in DEFAULT_EDGES / admin RTP list this game uses.
import { makeCascadeGame } from "./cascadeSlot.js";

export const CASCADE_GAMES = {
  goldendragon: makeCascadeGame({
    id: "goldendragon", edge: "goldendragon", seed: 1688,
    reels: 5, rows: 4,
    mults: { base: [1, 2, 3, 5], free: [2, 4, 6, 10] },
    freeSpins: { 3: 10, 4: 12, 5: 15 },
    paytable: {
      GOLD: [0.3, 1, 4], ENVELOPE: [0.25, 0.75, 2.5], LANTERN: [0.2, 0.5, 1.5], JADE: [0.15, 0.4, 1],
      FU: [0.05, 0.15, 0.4], FA: [0.05, 0.15, 0.4], CAI: [0.04, 0.1, 0.3], JI: [0.04, 0.1, 0.3],
    },
    weights: { GOLD: 3, ENVELOPE: 4, LANTERN: 5, JADE: 6, FU: 9, FA: 9, CAI: 10, JI: 10 },
    wildReels: [1, 2, 3], wildWeight: 1.1, scatterWeight: 0.7,
    names: { GOLD: "ก้อนทอง", ENVELOPE: "อั่งเปา", LANTERN: "โคมแดง", JADE: "เหรียญหยก", FU: "福", FA: "發", CAI: "財", JI: "吉", WILD: "WILD 龍", SCATTER: "ไข่มุกมังกร" },
  }),

  // Gilt Reels -> "ขุมทรัพย์ราชันย์": royal treasure, 5x5 = 3,125 ways
  giltreels: makeCascadeGame({
    id: "giltreels", edge: "slot", seed: 7311,
    reels: 5, rows: 5,
    mults: { base: [1, 2, 3, 4, 6], free: [3, 6, 9, 12, 15] },
    freeSpins: { 3: 8, 4: 10, 5: 12 },
    paytable: {
      CROWN: [0.1, 0.3, 1.5], RING: [0.08, 0.22, 1], CHALICE: [0.06, 0.18, 0.7], COIN: [0.05, 0.12, 0.45],
      RUBY: [0.015, 0.04, 0.12], SAPPHIRE: [0.015, 0.04, 0.12], EMERALD: [0.01, 0.03, 0.1], AMETHYST: [0.01, 0.03, 0.1],
    },
    weights: { CROWN: 3, RING: 4, CHALICE: 5, COIN: 6, RUBY: 10, SAPPHIRE: 10, EMERALD: 11, AMETHYST: 11 },
    wildReels: [1, 2, 3], wildWeight: 0.8, scatterWeight: 0.49,
    names: { CROWN: "มงกุฎ", RING: "แหวนเพชร", CHALICE: "จอกทอง", COIN: "เหรียญราชา", RUBY: "ทับทิม", SAPPHIRE: "ไพลิน", EMERALD: "มรกต", AMETHYST: "อเมทิสต์", WILD: "WILD โล่ทอง", SCATTER: "หีบสมบัติ" },
  }),

  // Classic Slots -> "777 คลาสสิก": retro fruits, 5x3 = 243 ways, bigger per-way pays
  classicslots: makeCascadeGame({
    id: "classicslots", edge: "classicslots", seed: 777,
    reels: 5, rows: 3,
    mults: { base: [1, 2, 3, 5, 7], free: [2, 4, 6, 10, 14] },
    freeSpins: { 3: 10, 4: 15, 5: 20 },
    paytable: {
      SEVEN: [1, 4, 15], BAR: [0.6, 2, 8], BELL: [0.5, 1.5, 5], STAR: [0.4, 1, 3],
      CHERRY: [0.2, 0.5, 1.5], LEMON: [0.15, 0.4, 1.2], ORANGE: [0.15, 0.4, 1.2], GRAPE: [0.12, 0.3, 1],
    },
    weights: { SEVEN: 2, BAR: 3, BELL: 4, STAR: 5, CHERRY: 8, LEMON: 9, ORANGE: 9, GRAPE: 10 },
    wildReels: [1, 2, 3], wildWeight: 0.9, scatterWeight: 0.95,
    names: { SEVEN: "เจ็ดแดง", BAR: "BAR", BELL: "ระฆัง", STAR: "ดาว", CHERRY: "เชอร์รี่", LEMON: "เลมอน", ORANGE: "ส้ม", GRAPE: "องุ่น", WILD: "WILD", SCATTER: "BONUS" },
  }),

  // Jungle Riches -> "ป่ามรกต": lost temple, 6x4 = 4,096 ways
  jungle: makeCascadeGame({
    id: "jungle", edge: "jungle", seed: 4096,
    reels: 6, rows: 4,
    mults: { base: [1, 2, 4, 8], free: [4, 8, 16, 32] },
    freeSpins: { 3: 8, 4: 10, 5: 12 },
    paytable: {
      MASK: [0.2, 0.5, 1.5, 4], SUN: [0.15, 0.4, 1, 3], PYRAMID: [0.12, 0.3, 0.8, 2], FLOWER: [0.1, 0.25, 0.6, 1.5],
      A: [0.03, 0.08, 0.2, 0.5], K: [0.03, 0.08, 0.2, 0.5], Q: [0.02, 0.06, 0.15, 0.4], J: [0.02, 0.06, 0.15, 0.4],
    },
    weights: { MASK: 3, SUN: 4, PYRAMID: 5, FLOWER: 6, A: 10, K: 10, Q: 11, J: 11 },
    wildReels: [1, 2, 3, 4], wildWeight: 0.8, scatterWeight: 0.66,
    names: { MASK: "หน้ากากทองคำ", SUN: "จานสุริยะ", PYRAMID: "วิหารโบราณ", FLOWER: "ดอกไม้ป่า", A: "A", K: "K", Q: "Q", J: "J", WILD: "WILD ใบไม้", SCATTER: "เหรียญโบราณ" },
  }),
};
