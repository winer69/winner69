// =====================================================
// Game configuration — ปรับค่าได้จากไฟล์นี้ไฟล์เดียว
// =====================================================

export const GAME_CONFIG = {
  tableName: "Texas Hold'em",
  language: 'th', // 'th' | 'en' ภาษาเริ่มต้นของเกม
  tableLogo: 'WINNER69', // ข้อความลายน้ำกลางโต๊ะ (ใส่ '' เพื่อซ่อน)
  smallBlind: 50,
  bigBlind: 100,
  humanStartingChips: 10000,
  aiChipRange: [6000, 16000], // สุ่ม chip ของ AI ในช่วงนี้
  defaultPlayerCount: 6,
  minPlayers: 2,
  maxPlayers: 6,
};

// เวลาคิดของ AI (ms) — สุ่มจากรายการนี้เพื่อให้ดูเป็นธรรมชาติ
export const AI_THINK_DELAYS = [800, 1200, 1800, 2500];

// จังหวะ animation หลัก (ms)
export const TIMING = {
  dealCardStagger: 110, // delay ระหว่างไพ่แต่ละใบตอนแจก
  streetPause: 750, // หยุดก่อนเปิดไพ่กองกลางชุดถัดไป
  showdownReveal: 650, // เปิดไพ่ AI ทีละคน
  winOverlay: 2600, // เวลาแสดงข้อความ WIN / LOSE
  chipFlight: 520,
};

// true = โหลดไฟล์จาก /public/sounds, false = ใช้เสียงสังเคราะห์ทั้งหมด
export const USE_SOUND_FILES = false;

export const PHASES = {
  IDLE: 'idle',
  PREFLOP: 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown',
  HAND_OVER: 'handOver', // ชนะโดยที่คนอื่น fold หมด
};

export const PHASE_LABELS = {
  idle: 'Waiting',
  preflop: 'Pre-Flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
  showdown: 'Showdown',
  handOver: 'Hand Over',
};
