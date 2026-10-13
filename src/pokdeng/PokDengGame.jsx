/* ==========================================================================
   PokDengGame.jsx — Premium Pok Deng (ป๊อกเด้ง) for WINNER 69
   --------------------------------------------------------------------------
   Single-file React component. Requires React >= 18. No other packages.
   Styles: ./pokdeng.css

   Sections in this file (each mirrors the suggested folder structure):
     1. CONFIG / THEME TOKENS          (แก้ Brand / Bet / Credit / Payout / เสียง ที่นี่)
     2. utils/random.js
     3. utils/deck.js                  createDeck() shuffleDeck() dealCard()
     4. utils/pokdeng.js               calculatePokDeng() determineWinner()
     5. hooks/useSound.js              Sound Manager + synth fallback
     6. hooks/useAnimatedNumber.js     Credit count up / down
     7. hooks/usePokDeng.js            Game state machine (logic only, no UI)
     8. components/*                   UI components
     9. PokDengGame                    default export
   ========================================================================== */

import React, {
  createContext,
  forwardRef,
  memo,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./pokdeng.css";
import usePokDengOnline from "./usePokDengOnline.js";

/* ==========================================================================
   1. CONFIG / THEME TOKENS
   ========================================================================== */

export const THEME = {
  BRAND_NAME: "WINNER 69", // ชื่อแบรนด์ (แสดงเล็ก ๆ บน HUD และลายน้ำบนโต๊ะ)
  BRAND_SHORT: "W69", // โลโก้หลังไพ่
  GAME_TITLE: "POK DENG",
  GAME_TITLE_TH: "ป๊อกเด้ง",
};
export const BRAND_NAME = THEME.BRAND_NAME;

export const GAME_CONFIG = {
  INITIAL_BALANCE: 100000, // เครดิตเริ่มต้น (Demo / Virtual Credit)
  DEFAULT_BET: 1000,
  BET_LEVELS: [10, 20, 50, 100, 500, 1000, 5000], // ระดับที่ปุ่ม + / − ไล่ขึ้นลง
  CHIP_VALUES: [10, 50, 100, 500, 1000, 5000], // ชิปที่กดเลือกได้
  HISTORY_SIZE: 14,
  MIN_PLAYERS: 1, // จำนวนผู้เล่นรวม "คุณ" ด้วย
  MAX_PLAYERS: 5, // คุณ + ผู้เล่นอื่นสูงสุด 4 คน (ตามที่นั่งรอบโต๊ะ)
  DEFAULT_PLAYERS: 3,
  BOT_BETS: [50, 100, 500, 1000, 5000], // เดิมพันสุ่มของผู้เล่นอื่น
};
GAME_CONFIG.MAX_BOTS = GAME_CONFIG.MAX_PLAYERS - 1;

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

/* เสียง:
   - USE_SOUND_FILES = false → ใช้เสียงสังเคราะห์ (Web Audio) ทั้งหมด ไม่โหลดไฟล์ = ไม่มี 404 ใน console
   - วางไฟล์ไว้ที่ public/sounds/ แล้วตั้ง USE_SOUND_FILES = true → ใช้ไฟล์จริง
     (ไฟล์ไหนหาย/โหลดไม่ได้ จะ fallback เป็นเสียงสังเคราะห์อัตโนมัติ ไม่ crash) */
export const USE_SOUND_FILES = false;
export const SOUND_PATHS = {
  background_music: "/sounds/background-music.mp3",
  card_deal: "/sounds/card-deal.mp3",
  card_flip: "/sounds/card-flip.mp3",
  chip_click: "/sounds/chip-click.mp3",
  button_click: "/sounds/button-click.mp3",
  pok: "/sounds/pok.mp3",
  win: "/sounds/win.mp3",
  lose: "/sounds/lose.mp3",
  coin: "/sounds/coin.mp3",
  deng: "/sounds/deng.mp3",
};

export const PHASE = {
  IDLE: "IDLE",
  BETTING: "BETTING",
  DEALING: "DEALING",
  PLAYER_TURN: "PLAYER_TURN",
  DEALER_TURN: "DEALER_TURN",
  RESULT: "RESULT",
  RESET: "RESET",
};
export const OUTCOME = { WIN: "WIN", LOSE: "LOSE", DRAW: "DRAW" };

const CHIP_STYLES = {
  10: ["#7b8285", "#3a3f41", "#ffffff"],
  50: ["#D62828", "#7a1010", "#ffffff"],
  100: ["#08713A", "#04351D", "#ffffff"],
  500: ["#262626", "#000000", "#FFD54A"],
  1000: ["#FFC107", "#8f6400", "#1a1200"],
  5000: ["#8a5a00", "#3a2600", "#FFE68A"],
};

const SEAT_NAMES = [
  "Lucky88", "Mango", "Tiger99", "Somchai", "Winner69", "GoldFish", "Ace777",
  "Bambam", "JackPot", "MaliPink", "Dragon8", "Fah_Sky", "Lotus99", "Nong_Ploy",
  "BigBoss", "Kitti_K",
];
const FLAGS = ["🇹🇭", "🇱🇦", "🇻🇳", "🇲🇾", "🇸🇬", "🇰🇭", "🇯🇵", "🇰🇷", "🇵🇭", "🇮🇩"];

/* @logic-start ============================================================
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

/* @logic-end ============================================================ */

export function formatNumber(n) {
  return Math.round(n).toLocaleString("en-US");
}
export function formatChip(v) {
  return v >= 1000 ? `${v / 1000}K` : String(v);
}
export function formatCompact(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function createSeat(excludeNames = []) {
  const pool = SEAT_NAMES.filter((n) => !excludeNames.includes(n));
  const name = pick(pool.length ? pool : SEAT_NAMES);
  return {
    id: `${name}-${randomInt(1e9)}`,
    name,
    seed: `${name}-${randomInt(1e9)}`,
    flag: pick(FLAGS),
    credit: (randomInt(180) + 5) * 2500,
  };
}

function createSeats(n) {
  const seats = [];
  for (let i = 0; i < n; i++) seats.push(createSeat(seats.map((s) => s.name)));
  return seats;
}

/* ==========================================================================
   5. hooks/useSound.js — Sound Manager
   ========================================================================== */

const SYNTH_PRESETS = {
  // [freq, start(s), duration(s), endFreq?]
  card_deal: { wave: "triangle", gain: 0.22, notes: [[1400, 0, 0.07, 380]] },
  card_flip: { wave: "triangle", gain: 0.16, notes: [[520, 0, 0.06, 1500]] },
  chip_click: { wave: "sine", gain: 0.18, notes: [[2200, 0, 0.035], [2900, 0.04, 0.04]] },
  button_click: { wave: "sine", gain: 0.14, notes: [[880, 0, 0.05, 660]] },
  pok: { wave: "triangle", gain: 0.24, notes: [[523, 0, 0.12], [659, 0.08, 0.12], [784, 0.16, 0.12], [1047, 0.24, 0.4]] },
  deng: { wave: "square", gain: 0.08, notes: [[784, 0, 0.1], [1175, 0.1, 0.22]] },
  win: { wave: "triangle", gain: 0.22, notes: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.12], [1047, 0.3, 0.16], [1319, 0.42, 0.5]] },
  lose: { wave: "sine", gain: 0.16, notes: [[440, 0, 0.18], [370, 0.18, 0.18], [294, 0.36, 0.42]] },
  coin: { wave: "square", gain: 0.06, notes: [[1319, 0, 0.05], [1760, 0.05, 0.12]] },
};

export function useSound() {
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(false); // เพลงปิดไว้ก่อน (browser ไม่ให้ autoplay)
  const [volume, setVolumeState] = useState(0.7);

  const audioRef = useRef({});
  const ctxRef = useRef(null);
  const settingsRef = useRef({ soundOn: true, volume: 0.7 });
  settingsRef.current = { soundOn, volume };

  useEffect(() => {
    if (!USE_SOUND_FILES || typeof window === "undefined" || typeof Audio === "undefined") return undefined;
    const store = {};
    Object.entries(SOUND_PATHS).forEach(([key, src]) => {
      try {
        const el = new Audio();
        const entry = { el, ok: false, failed: false };
        el.preload = key === "background_music" ? "none" : "auto";
        el.loop = key === "background_music";
        el.addEventListener("canplaythrough", () => { entry.ok = true; }, { once: true });
        el.addEventListener("error", () => { entry.failed = true; }, { once: true });
        el.src = src;
        store[key] = entry;
      } catch (e) {
        /* ignore — synth fallback will be used */
      }
    });
    audioRef.current = store;
    return () => {
      Object.values(store).forEach((e) => {
        try { e.el.pause(); } catch (err) { /* ignore */ }
      });
      if (ctxRef.current) {
        try { ctxRef.current.close(); } catch (err) { /* ignore */ }
        ctxRef.current = null;
      }
    };
  }, []);

  const synth = useCallback((key, vol) => {
    if (typeof window === "undefined") return;
    const preset = SYNTH_PRESETS[key];
    if (!preset) return;
    let ctx = ctxRef.current;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { ctx = new AC(); } catch (e) { return; }
      ctxRef.current = ctx;
    }
    if (ctx.state === "suspended" && ctx.resume) ctx.resume().catch(() => {});
    const t0 = ctx.currentTime + 0.005;
    const peak = Math.max(0.0002, vol * preset.gain);
    preset.notes.forEach(([freq, start, dur, endFreq]) => {
      try {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = preset.wave;
        osc.frequency.setValueAtTime(freq, t0 + start);
        if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + start + dur);
        g.gain.setValueAtTime(0.0001, t0 + start);
        g.gain.exponentialRampToValueAtTime(peak, t0 + start + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t0 + start);
        osc.stop(t0 + start + dur + 0.03);
      } catch (e) { /* ignore */ }
    });
  }, []);

  const play = useCallback((key) => {
    const { soundOn: on, volume: vol } = settingsRef.current;
    if (!on || vol <= 0) return;
    const entry = audioRef.current[key];
    if (entry && entry.ok && !entry.failed) {
      try {
        const node = entry.el.cloneNode();
        node.volume = vol;
        const p = node.play();
        if (p && typeof p.catch === "function") p.catch(() => synth(key, vol));
        return;
      } catch (e) { /* fall through */ }
    }
    synth(key, vol);
  }, [synth]);

  useEffect(() => {
    const entry = audioRef.current.background_music;
    if (!entry) return;
    const el = entry.el;
    el.volume = Math.min(1, volume * 0.45);
    if (musicOn && soundOn) {
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      el.pause();
    }
  }, [musicOn, soundOn, volume]);

  const toggleSound = useCallback(() => setSoundOn((v) => !v), []);
  const toggleMusic = useCallback(() => setMusicOn((v) => !v), []);
  const setVolume = useCallback((v) => setVolumeState(Math.max(0, Math.min(1, Number(v) || 0))), []);

  return { play, soundOn, musicOn, volume, toggleSound, toggleMusic, setVolume };
}

/* ==========================================================================
   6. hooks/useAnimatedNumber.js
   ========================================================================== */

export function useAnimatedNumber(value, duration = 1000) {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = displayRef.current;
    const to = value;
    if (from === to) return undefined;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (to - from) * eased);
      displayRef.current = v;
      setDisplay(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return display;
}

/* ==========================================================================
   7. hooks/usePokDeng.js — game state machine (ไม่มี UI)
   ========================================================================== */

export function usePokDeng({ initialBalance = GAME_CONFIG.INITIAL_BALANCE, fxRef, onBalanceChange, getBotCount, getBotName } = {}) {
  const firstBet = Math.min(GAME_CONFIG.DEFAULT_BET, initialBalance);

  const [gameState, setGameState] = useState(PHASE.IDLE);
  const [balance, setBalance] = useState(initialBalance);
  const [bet, setBetState] = useState(firstBet);
  const [lockedBet, setLockedBet] = useState(0);
  const [hands, setHands] = useState({ player: [], dealer: [], bots: [] });
  const [botBets, setBotBets] = useState([]);
  const [botResults, setBotResults] = useState([]);
  const [activeBot, setActiveBot] = useState(-1);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [pokFx, setPokFx] = useState(null);
  const [dealTick, setDealTick] = useState(0);
  const [deckCount, setDeckCount] = useState(52);
  const [round, setRound] = useState(0);

  const phaseRef = useRef(PHASE.IDLE);
  const deckRef = useRef([]);
  const handsRef = useRef({ player: [], dealer: [], bots: [] });
  const botBetsRef = useRef([]);
  const balanceRef = useRef(initialBalance);
  const betRef = useRef(firstBet);
  const lockedBetRef = useRef(0);
  const runRef = useRef(0);
  const mountedRef = useRef(false);
  const timersRef = useRef(new Set());
  const optsRef = useRef({});
  optsRef.current = { onBalanceChange, getBotCount, getBotName };

  const fx = (name, ...args) => {
    const target = fxRef && fxRef.current;
    const fn = target && target[name];
    if (typeof fn === "function") {
      try { fn(...args); } catch (e) { /* visual effects must never break the game */ }
    }
  };

  const setPhase = (p) => {
    phaseRef.current = p;
    setGameState(p);
  };
  const later = (ms, fn) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      if (mountedRef.current) fn();
    }, ms);
    timersRef.current.add(id);
  };
  const wait = (ms) => new Promise((resolve) => later(ms, resolve));
  const isAlive = (id) => mountedRef.current && runRef.current === id;

  const commitHands = () =>
    setHands({
      player: handsRef.current.player.slice(),
      dealer: handsRef.current.dealer.slice(),
      bots: handsRef.current.bots.map((h) => h.slice()),
    });
  const commitBalance = (v) => {
    setBalance(v);
    if (typeof optsRef.current.onBalanceChange === "function") optsRef.current.onBalanceChange(v);
  };
  const updateBet = (v) => {
    const clamped = Math.max(0, Math.min(Math.floor(v), balanceRef.current));
    betRef.current = clamped;
    setBetState(clamped);
  };
  const botCountNow = () => {
    const fn = optsRef.current.getBotCount;
    const n = typeof fn === "function" ? Number(fn()) || 0 : 0;
    return Math.max(0, Math.min(GAME_CONFIG.MAX_BOTS, n));
  };
  const botName = (i) => {
    const fn = optsRef.current.getBotName;
    return (typeof fn === "function" && fn(i)) || `ผู้เล่น ${i + 2}`;
  };

  useEffect(() => {
    mountedRef.current = true;
    const timers = timersRef.current;
    if (phaseRef.current === PHASE.IDLE) later(TIMING.OPEN_TABLE, () => setPhase(PHASE.BETTING));
    return () => {
      mountedRef.current = false;
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- hand helpers: who = "player" | "dealer" | "bot" (+ index) ---- */
  const getHand = (who, i) => (who === "bot" ? handsRef.current.bots[i] || [] : handsRef.current[who]);
  const putHand = (who, i, cards) => {
    if (who === "bot") {
      const bots = handsRef.current.bots.slice();
      bots[i] = cards;
      handsRef.current = { ...handsRef.current, bots };
    } else {
      handsRef.current = { ...handsRef.current, [who]: cards };
    }
  };

  const dealTo = (who, id, i = 0) => {
    const { card, deck } = dealCard(deckRef.current);
    deckRef.current = deck;
    putHand(who, i, [...getHand(who, i), { ...card, uid: `${id}-${card.id}`, faceUp: false }]);
    commitHands();
    setDeckCount(deck.length);
    setDealTick((t) => t + 1);
    fx("play", "card_deal");
  };

  const revealHand = (who, i = 0, silent = false) => {
    const cards = getHand(who, i);
    if (!cards.length || cards.every((c) => c.faceUp)) return false;
    putHand(who, i, cards.map((c) => ({ ...c, faceUp: true })));
    commitHands();
    if (!silent) fx("play", "card_flip");
    return true;
  };

  const revealAllBots = () => {
    let any = false;
    handsRef.current.bots.forEach((_, i) => { if (revealHand("bot", i, true)) any = true; });
    if (any) fx("play", "card_flip");
    return any;
  };

  const evaluate = (who, i = 0) => calculatePokDeng(getHand(who, i));

  const showPok = (who, ev) => {
    const key = `${runRef.current}-${who}`;
    setPokFx({ key, who, label: ev.badge, tag: ev.tag });
    fx("play", "pok");
    fx("pok", who);
    later(1700, () => setPokFx((cur) => (cur && cur.key === key ? null : cur)));
  };

  /* ผู้เล่นอื่น (bot) ตัดสินใจจั่ว/อยู่ ตามลำดับที่นั่ง */
  const botsTurn = async (id) => {
    const n = handsRef.current.bots.length;
    for (let i = 0; i < n; i++) {
      const ev = evaluate("bot", i);
      if (ev.isPok) continue;
      setActiveBot(i);
      if (shouldPlayerAutoDraw(ev)) {
        setMessage(`${botName(i)} จั่วไพ่`);
        await wait(380);
        if (!isAlive(id)) return false;
        dealTo("bot", id, i);
        await wait(TIMING.DEAL_INTERVAL);
      } else {
        setMessage(`${botName(i)} อยู่`);
        await wait(320);
      }
      if (!isAlive(id)) return false;
    }
    setActiveBot(-1);
    return true;
  };

  const finishRound = async (id) => {
    if (!isAlive(id)) return;
    setActiveBot(-1);
    if (revealAllBots()) {
      await wait(560);
      if (!isAlive(id)) return;
    }
    const playerEval = evaluate("player");
    const dealerEval = evaluate("dealer");
    const stake = lockedBetRef.current;
    const balanceBefore = balanceRef.current;
    const outcome = determineWinner(playerEval, dealerEval, stake, balanceBefore);
    const balanceAfter = balanceBefore + outcome.delta;
    balanceRef.current = balanceAfter; // logic อัปเดตทันที — ตัวเลขบนจอค่อยวิ่งตาม

    const bots = handsRef.current.bots.map((_, i) => {
      const ev = evaluate("bot", i);
      const r = determineWinner(ev, dealerEval, botBetsRef.current[i] || 0);
      return { ...r, eval: ev };
    });
    setBotResults(bots);
    fx("botsSettled", bots);

    setMessage("");
    setResult({ ...outcome, bet: stake, playerEval, dealerEval, balanceBefore, balanceAfter, round: id, bots });
    setPhase(PHASE.RESULT);
    setHistory((h) => [{ id, outcome: outcome.outcome }, ...h].slice(0, GAME_CONFIG.HISTORY_SIZE));

    if (outcome.outcome === OUTCOME.WIN) {
      fx("play", "win");
      if (outcome.multiplier > 1) later(420, () => fx("play", "deng"));
      fx("celebrate", outcome.multiplier > 1);
      fx("coins");
      later(TIMING.BALANCE_DELAY_WIN, () => commitBalance(balanceAfter));
    } else if (outcome.outcome === OUTCOME.LOSE) {
      fx("play", "lose");
      later(TIMING.BALANCE_DELAY_LOSE, () => commitBalance(balanceAfter));
    } else {
      fx("play", "chip_click");
      fx("draw");
    }

    await wait(TIMING.RESULT_OVERLAY_DELAY);
    if (isAlive(id) && phaseRef.current === PHASE.RESULT) setShowResult(true);
  };

  const dealerTurn = async (id, allowDraw) => {
    setPhase(PHASE.DEALER_TURN);
    setMessage("เจ้ามือเปิดไพ่");
    revealHand("dealer");
    await wait(TIMING.REVEAL_PAUSE);
    if (!isAlive(id)) return false;
    const de = evaluate("dealer");
    if (allowDraw && shouldDealerDraw(de)) {
      setMessage("เจ้ามือจั่วไพ่");
      await wait(480);
      if (!isAlive(id)) return false;
      dealTo("dealer", id);
      await wait(TIMING.DEAL_INTERVAL + 120);
      if (!isAlive(id)) return false;
      revealHand("dealer");
      await wait(TIMING.FLIP_PAUSE);
      if (!isAlive(id)) return false;
    }
    return true;
  };

  const startRound = async () => {
    if (phaseRef.current !== PHASE.BETTING) return false;
    const stake = betRef.current;
    if (!(stake > 0) || stake > balanceRef.current) return false;

    const id = ++runRef.current;
    const nBots = botCountNow();
    lockedBetRef.current = stake; // Lock bet
    setLockedBet(stake);
    fx("play", "button_click");
    setResult(null);
    setShowResult(false);
    setPokFx(null);
    setBotResults([]);
    setActiveBot(-1);
    botBetsRef.current = Array.from({ length: nBots }, () => pick(GAME_CONFIG.BOT_BETS));
    setBotBets(botBetsRef.current.slice());
    handsRef.current = { player: [], dealer: [], bots: Array.from({ length: nBots }, () => []) };
    commitHands();
    deckRef.current = shuffleDeck(createDeck()); // สำรับใหม่ + สับใหม่ทุกรอบ
    setDeckCount(deckRef.current.length);
    setRound((r) => r + 1);
    setPhase(PHASE.DEALING);
    setMessage("กำลังแจกไพ่");

    await wait(320);
    if (!isAlive(id)) return true;

    // แจกวนทีละใบ: คุณ → ผู้เล่นอื่น → เจ้ามือ (2 รอบ)
    const interval = nBots >= 3 ? 260 : nBots >= 1 ? 320 : TIMING.DEAL_INTERVAL;
    for (let r = 0; r < 2; r++) {
      const order = [["player", 0], ...Array.from({ length: nBots }, (_, i) => ["bot", i]), ["dealer", 0]];
      for (const [who, i] of order) {
        dealTo(who, id, i);
        await wait(interval);
        if (!isAlive(id)) return true;
      }
    }
    await wait(180);
    if (!isAlive(id)) return true;

    revealHand("player");
    // ผู้เล่นอื่นที่ได้ป๊อก เปิดไพ่ทันที
    let botPok = false;
    handsRef.current.bots.forEach((_, i) => {
      if (evaluate("bot", i).isPok) {
        revealHand("bot", i, true);
        fx("botPok", i);
        botPok = true;
      }
    });
    await wait(TIMING.FLIP_PAUSE + (botPok ? 200 : 0));
    if (!isAlive(id)) return true;

    const pe = evaluate("player");
    const de = evaluate("dealer");

    if (pe.isPok) {
      setMessage("");
      showPok("player", pe);
      await wait(TIMING.POK_PAUSE);
      if (!isAlive(id)) return true;
    }

    if (de.isPok) {
      // เจ้ามือป๊อก: จบรอบทันทีทุกคน
      setPhase(PHASE.DEALER_TURN);
      setMessage("เปิดไพ่เจ้ามือ");
      revealHand("dealer");
      await wait(TIMING.REVEAL_PAUSE);
      if (!isAlive(id)) return true;
      showPok("dealer", de);
      await wait(1150);
      if (!isAlive(id)) return true;
      await finishRound(id);
      return true;
    }

    if (pe.isPok) {
      // คุณป๊อก: ข้ามตาคุณ ผู้เล่นอื่นเล่นต่อ เจ้ามือเปิดไพ่ (ไม่จั่ว)
      setPhase(PHASE.DEALER_TURN);
      if (!(await botsTurn(id))) return true;
      if (!(await dealerTurn(id, false))) return true;
      await finishRound(id);
      return true;
    }

    setMessage("");
    setPhase(PHASE.PLAYER_TURN);
    return true;
  };

  const playerAction = async (action) => {
    if (phaseRef.current !== PHASE.PLAYER_TURN) return;
    const id = runRef.current;
    fx("play", "button_click");

    if (action === "draw") {
      setPhase(PHASE.DEALING);
      setMessage("จั่วไพ่");
      await wait(480);
      if (!isAlive(id)) return;
      dealTo("player", id);
      await wait(TIMING.DEAL_INTERVAL + 120);
      if (!isAlive(id)) return;
      revealHand("player");
      await wait(TIMING.FLIP_PAUSE);
      if (!isAlive(id)) return;
      const pe = evaluate("player");
      if (pe.multiplier > 1) {
        setMessage(`${pe.label} ${pe.tag}`);
        fx("play", "deng");
        fx("deng");
        await wait(800);
        if (!isAlive(id)) return;
      }
    } else {
      setPhase(PHASE.DEALER_TURN);
      setMessage("อยู่");
      await wait(450);
      if (!isAlive(id)) return;
    }

    setPhase(PHASE.DEALER_TURN);
    if (!(await botsTurn(id))) return;
    if (!(await dealerTurn(id, true))) return;
    await finishRound(id);
  };

  const playAgain = async () => {
    if (phaseRef.current !== PHASE.RESULT) return;
    fx("play", "button_click");
    const id = ++runRef.current;
    setShowResult(false);
    setResult(null);
    setPokFx(null);
    setMessage("");
    setBotResults([]);
    setBotBets([]);
    setActiveBot(-1);
    setPhase(PHASE.RESET);
    handsRef.current = { player: [], dealer: [], bots: [] };
    commitHands();
    setLockedBet(0);
    lockedBetRef.current = 0;
    if (betRef.current > balanceRef.current || betRef.current <= 0) {
      const affordable = GAME_CONFIG.BET_LEVELS.filter((l) => l <= balanceRef.current);
      updateBet(affordable.length ? affordable[affordable.length - 1] : balanceRef.current);
    }
    await wait(280);
    if (!isAlive(id)) return;
    setPhase(PHASE.BETTING);
  };

  const setBet = (v) => {
    if (phaseRef.current !== PHASE.BETTING) return;
    updateBet(v);
    fx("play", "chip_click");
  };

  const stepBet = (dir) => {
    if (phaseRef.current !== PHASE.BETTING) return;
    const levels = GAME_CONFIG.BET_LEVELS.filter((l) => l <= balanceRef.current);
    if (!levels.length) return;
    const cur = betRef.current;
    let next;
    if (dir > 0) next = levels.find((l) => l > cur) ?? levels[levels.length - 1];
    else next = [...levels].reverse().find((l) => l < cur) ?? levels[0];
    updateBet(next);
    fx("play", "chip_click");
  };

  const resetCredits = () => {
    const p = phaseRef.current;
    if (p === PHASE.DEALING || p === PHASE.PLAYER_TURN || p === PHASE.DEALER_TURN) return;
    balanceRef.current = initialBalance;
    commitBalance(initialBalance);
    if (betRef.current <= 0 || betRef.current > initialBalance) updateBet(Math.min(GAME_CONFIG.DEFAULT_BET, initialBalance));
    fx("play", "coin");
  };

  const canStart = gameState === PHASE.BETTING && bet > 0 && bet <= balanceRef.current;

  return {
    // state
    gameState,
    playerHand: hands.player,
    dealerHand: hands.dealer,
    botHands: hands.bots,
    botBets,
    botResults,
    activeBot,
    deckCount,
    bet,
    lockedBet,
    balance,
    result,
    multiplier: result ? result.multiplier : 1,
    showResult,
    history,
    message,
    pokFx,
    dealTick,
    round,
    canStart,
    // actions
    startRound,
    playerAction,
    playAgain,
    setBet,
    stepBet,
    resetCredits,
    getBalance: () => balanceRef.current,
  };
}

/* ==========================================================================
   8. components
   ========================================================================== */

/* ---------- Avatar (original cartoon SVG, generated from a seed) ---------- */

const SKIN = ["#F6D3B3", "#EDB98A", "#D08B5B", "#AE5D29", "#FAD9C1", "#C68642"];
const HAIR = ["#1B1B1B", "#3B2417", "#6B3E1E", "#C9A227", "#8A8A8A", "#9E2A2B"];
const SHIRT = ["#08713A", "#0B3D2E", "#7A1F1F", "#1F2A44", "#3A2A10", "#2B2B2B"];
const AV_BG = [["#2f3331", "#0b0d0c"], ["#0e5a32", "#04351D"], ["#5a4512", "#1a1205"], ["#4a1818", "#140707"], ["#1d2a48", "#0a0f1c"]];

function Avatar({ seed = "guest", dealer = false, className = "" }) {
  const rawId = useId();
  const gid = `pdav${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const f = useMemo(() => {
    const r = seededRandom(hashString(seed));
    const p = (a) => a[Math.floor(r() * a.length)];
    return {
      skin: p(SKIN), hair: p(HAIR), shirt: p(SHIRT), bg: p(AV_BG),
      hairStyle: Math.floor(r() * 5), eyes: Math.floor(r() * 3), mouth: Math.floor(r() * 3),
      acc: Math.floor(r() * 3), cheek: r() > 0.45,
    };
  }, [seed]);

  const skin = dealer ? "#EDB98A" : f.skin;
  const hairColor = dealer ? "#151515" : f.hair;
  const bg = dealer ? ["#6b5214", "#1a1205"] : f.bg;
  const ink = "#2a1a12";

  let hair = null;
  if (dealer) {
    hair = <path d="M17 31 Q16 16 33 16 Q48 17 47 30 Q43 21 30 22 Q22 23 17 31Z" fill={hairColor} />;
  } else if (f.hairStyle === 0) {
    hair = <path d="M17 32 Q16 17 32 17 Q48 17 47 32 Q44 23 32 24 Q21 24 17 32Z" fill={hairColor} />;
  } else if (f.hairStyle === 1) {
    hair = <path d="M17 31 L18 20 L23 23 L25 15 L30 21 L33 13 L37 21 L41 15 L43 22 L47 20 L47 31 Q42 24 32 24 Q22 24 17 31Z" fill={hairColor} />;
  } else if (f.hairStyle === 2) {
    hair = (
      <g fill={hairColor}>
        <circle cx="32" cy="15" r="5.5" />
        <path d="M17 32 Q16 18 32 18 Q48 18 47 32 Q44 24 32 25 Q21 25 17 32Z" />
      </g>
    );
  } else if (f.hairStyle === 3) {
    hair = (
      <g>
        <path d="M17 30 Q17 16 32 16 Q47 16 47 30Z" fill={f.shirt} />
        <path d="M30 27 H53 Q55 27 54 30 H30Z" fill={f.shirt} />
        <circle cx="32" cy="22" r="2.4" fill="#FFD54A" />
      </g>
    );
  } else {
    hair = <path d="M15 45 Q12 17 32 17 Q52 17 49 45 L45 45 Q46 26 32 25 Q18 26 19 45Z" fill={hairColor} />;
  }

  let eyes;
  if (!dealer && f.eyes === 2) {
    eyes = (
      <g>
        <rect x="21.5" y="29.5" width="9" height="5.5" rx="2" fill="#111" />
        <rect x="33.5" y="29.5" width="9" height="5.5" rx="2" fill="#111" />
        <path d="M30.5 31.5 H33.5" stroke="#111" strokeWidth="1.4" />
        <path d="M23 31 H26" stroke="rgba(255,255,255,.55)" strokeWidth="1" strokeLinecap="round" />
      </g>
    );
  } else if (!dealer && f.eyes === 1) {
    eyes = (
      <g stroke={ink} strokeWidth="1.7" fill="none" strokeLinecap="round">
        <path d="M24 33 Q26.5 30.5 29 33" />
        <path d="M35 33 Q37.5 30.5 40 33" />
      </g>
    );
  } else {
    eyes = (
      <g fill={ink}>
        <circle cx="26.5" cy="33" r="1.9" />
        <circle cx="37.5" cy="33" r="1.9" />
      </g>
    );
  }

  let mouth;
  if (!dealer && f.mouth === 1) {
    mouth = (
      <g>
        <path d="M27 38.5 Q32 45.5 37 38.5Z" fill="#6b1f1f" />
        <path d="M28.4 39.1 H35.6" stroke="#fff" strokeWidth="1.2" />
      </g>
    );
  } else if (!dealer && f.mouth === 2) {
    mouth = <path d="M28 40 Q33 42.5 37 38" stroke={ink} strokeWidth="1.6" fill="none" strokeLinecap="round" />;
  } else {
    mouth = <path d="M27.5 39 Q32 43 36.5 39" stroke={ink} strokeWidth="1.6" fill="none" strokeLinecap="round" />;
  }

  return (
    <div className={`pd-avatar ${className}`}>
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id={`${gid}bg`} cx="50%" cy="30%" r="80%">
            <stop offset="0%" stopColor={bg[0]} />
            <stop offset="100%" stopColor={bg[1]} />
          </radialGradient>
        </defs>
        <rect width="64" height="64" fill={`url(#${gid}bg)`} />
        <path d="M7 66 Q9 47 32 47 Q55 47 57 66Z" fill={dealer ? "#111" : f.shirt} />
        {dealer && (
          <g>
            <path d="M24 47.5 L32 64 L40 47.5Z" fill="#f4f1ea" />
            <path d="M25.5 51 L32 54.5 L25.5 58Z M38.5 51 L32 54.5 L38.5 58Z" fill="#FFC107" />
            <circle cx="32" cy="54.5" r="1.7" fill="#E5A900" />
          </g>
        )}
        <rect x="28" y="42" width="8" height="7" rx="3" fill={skin} />
        <circle cx="18.5" cy="34" r="3" fill={skin} />
        <circle cx="45.5" cy="34" r="3" fill={skin} />
        <circle cx="32" cy="33" r="14" fill={skin} />
        {hair}
        {eyes}
        {mouth}
        {(dealer || f.cheek) && (
          <g fill="#ff7a7a" opacity="0.32">
            <circle cx="23.5" cy="38" r="2.2" />
            <circle cx="40.5" cy="38" r="2.2" />
          </g>
        )}
        {!dealer && f.acc === 1 && <path d="M21 50 Q32 58 43 50" stroke="#FFD54A" strokeWidth="1.8" fill="none" />}
        {!dealer && f.acc === 2 && (
          <g fill="#FFD54A">
            <circle cx="18.5" cy="38" r="1.3" />
            <circle cx="45.5" cy="38" r="1.3" />
          </g>
        )}
      </svg>
    </div>
  );
}

/* ---------- Card ---------- */

const DeckContext = createContext(null);

function CardFront({ card }) {
  const isCourt = card.rankValue >= 11;
  return (
    <div className={`pd-card__face pd-card__front ${card.red ? "is-red" : ""}`}>
      <div className="pd-card__corner">
        <span className="pd-card__rank">{card.rank}</span>
        <span className="pd-card__pip">{card.symbol}</span>
      </div>
      <div className="pd-card__corner pd-card__corner--br">
        <span className="pd-card__rank">{card.rank}</span>
        <span className="pd-card__pip">{card.symbol}</span>
      </div>
      {isCourt ? (
        <div className="pd-card__court">
          <span className="pd-card__crown">{"♛\uFE0E"}</span>
          <span className="pd-card__court-letter">{card.rank}</span>
          <span className="pd-card__court-suit">{card.symbol}</span>
        </div>
      ) : (
        <div className={`pd-card__center ${card.rank === "A" ? "is-ace" : ""}`}>{card.symbol}</div>
      )}
    </div>
  );
}

function CardBack() {
  return (
    <div className="pd-card__face pd-card__back">
      <div className="pd-card__back-frame">
        <span className="pd-card__back-logo">{THEME.BRAND_SHORT}</span>
      </div>
    </div>
  );
}

const Card = memo(function Card({ card, faceUp, glow = false, dim = false }) {
  const ref = useRef(null);
  const deckRef = useContext(DeckContext);
  const [dealState, setDealState] = useState("pending");

  // วัดตำแหน่ง Deck → ตำแหน่งไพ่ แล้วให้ไพ่ "บิน" ออกจาก Deck
  useLayoutEffect(() => {
    const el = ref.current;
    const deck = deckRef && deckRef.current;
    if (el && deck) {
      const a = el.getBoundingClientRect();
      const b = deck.getBoundingClientRect();
      el.style.setProperty("--from-x", `${Math.round(b.left + b.width / 2 - (a.left + a.width / 2))}px`);
      el.style.setProperty("--from-y", `${Math.round(b.top + b.height / 2 - (a.top + a.height / 2))}px`);
      setDealState("dealing");
    } else {
      setDealState("done");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (dealState !== "dealing") return undefined;
    const t = setTimeout(() => setDealState("done"), 900); // fallback ถ้า animationend ไม่ยิง
    return () => clearTimeout(t);
  }, [dealState]);

  const onAnimationEnd = (e) => {
    if (e.target === e.currentTarget && e.animationName === "pd-deal") setDealState("done");
  };

  const cls = [
    "pd-card",
    dealState === "pending" ? "is-pending" : "",
    dealState === "dealing" ? "is-dealing" : "",
    glow ? "is-glow" : "",
    dim ? "is-dim" : "",
  ].filter(Boolean).join(" ");

  return (
    <div ref={ref} className={cls} onAnimationEnd={onAnimationEnd}>
      <div className={`pd-card__inner ${faceUp ? "is-up" : ""}`}>
        <CardBack />
        <CardFront card={card} />
      </div>
    </div>
  );
});

function Hand({ cards, size = "lg", glow = false, dim = false, handRef, children }) {
  return (
    <div className={`pd-hand pd-hand--${size}`} ref={handRef}>
      {cards.length === 0 && (
        <>
          <div className="pd-hand__ghost" />
          <div className="pd-hand__ghost" />
        </>
      )}
      {cards.map((c, i) => (
        <div key={c.uid} className="pd-hand__slot" style={{ "--i": i, "--n": cards.length }}>
          <Card card={c} faceUp={c.faceUp} glow={glow} dim={dim} />
        </div>
      ))}
      {children}
    </div>
  );
}

function ScoreBadge({ ev, outcome }) {
  if (!ev) return <div className="pd-score is-empty" aria-hidden="true" />;
  const cls = [
    "pd-score",
    ev.isPok ? "is-pok" : "",
    !ev.isPok && ev.type !== "NORMAL" ? "is-special" : "",
    outcome ? `is-${outcome.toLowerCase()}` : "",
  ].filter(Boolean).join(" ");
  return (
    <div className={cls} key={ev.badge + ev.cardCount}>
      <span className="pd-score__label">{ev.badge}</span>
      {ev.tag && <span className="pd-score__tag">{ev.tag}</span>}
    </div>
  );
}

/* ---------- Dealer / Player / Seats ---------- */

function Dealer({ hand, ev, handRef, glow, dim, active }) {
  return (
    <section className="pd-zone pd-zone--dealer" aria-label="Dealer">
      <div className={`pd-ident pd-ident--dealer ${active ? "is-active" : ""}`}>
        <Avatar seed="house-dealer" dealer className="pd-avatar--dealer" />
        <div className="pd-nameplate">
          <span className="pd-nameplate__name">Dealer</span>
          <span className="pd-nameplate__sub">เจ้ามือ</span>
        </div>
      </div>
      <Hand cards={hand} size="md" handRef={handRef} glow={glow} dim={dim}>
        <ScoreBadge ev={ev} />
      </Hand>
    </section>
  );
}

function Player({ me, hand, ev, handRef, bet, locked, glow, active, outcome }) {
  return (
    <section className="pd-zone pd-zone--player" aria-label="Player">
      <Hand cards={hand} size="lg" handRef={handRef} glow={glow}>
        <ScoreBadge ev={ev} outcome={outcome} />
      </Hand>
      <div className={`pd-ident pd-ident--player ${active ? "is-active" : ""}`}>
        <Avatar seed={me.seed} className="pd-avatar--me" />
        <div className="pd-nameplate">
          <span className="pd-nameplate__name">
            <span className="pd-flag">{me.flag}</span> {me.name}
          </span>
          <span className="pd-nameplate__sub">คุณ</span>
        </div>
        <div className={`pd-betchip ${locked ? "is-locked" : ""}`} key={locked ? "locked" : "open"}>
          <span className="pd-betchip__disc" aria-hidden="true" />
          <span className="pd-betchip__value">{formatNumber(bet)}</span>
        </div>
      </div>
    </section>
  );
}

function Seat({ seat, pos, active, hand = [], bet = 0, result = null, playing = false }) {
  const revealed = hand.length > 0 && hand.every((c) => c.faceUp);
  const ev = revealed ? calculatePokDeng(hand) : null;
  const o = result ? result.outcome : null;
  return (
    <div className={`pd-seat pd-seat--${pos} ${active ? "is-active" : ""} ${o ? `is-${o.toLowerCase()}` : ""}`} aria-label={seat.name}>
      <div className="pd-seat__avatar" key={seat.id}>
        <Avatar seed={seat.seed} />
        <span className="pd-seat__flag">{seat.flag}</span>
        {result && (
          <span className={`pd-seat__result is-${o.toLowerCase()}`}>
            {o === OUTCOME.DRAW ? "เสมอ" : `${result.delta > 0 ? "+" : "−"}${formatCompact(Math.abs(result.delta))}`}
          </span>
        )}
      </div>
      <div className="pd-seat__plate">
        <span className="pd-seat__name">{seat.name}</span>
        <span className="pd-seat__credit">{playing && bet > 0 && !result ? `เดิมพัน ${formatCompact(bet)}` : formatCompact(seat.credit)}</span>
      </div>
      {playing && (
        <Hand cards={hand} size="xs" glow={o === OUTCOME.WIN} dim={o === OUTCOME.LOSE}>
          <ScoreBadge ev={ev} />
        </Hand>
      )}
    </div>
  );
}

function PlayerCountPicker({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const opts = [];
  for (let n = GAME_CONFIG.MIN_PLAYERS; n <= GAME_CONFIG.MAX_PLAYERS; n++) opts.push(n);
  return (
    <div className="pd-pcount">
      <button
        type="button"
        className={`pd-pcount__btn ${open ? "is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        aria-label={`จำนวนผู้เล่น ${value} คน`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M16 13.6c2.9.2 5 2.1 5 5" />
        </svg>
        <span>{value} คน</span>
      </button>
      {open && !disabled && (
        <>
          <div className="pd-pcount__backdrop" onClick={() => setOpen(false)} />
          <div className="pd-pcount__menu" role="listbox" aria-label="จำนวนผู้เล่นที่โต๊ะ">
            <span className="pd-pcount__title">ผู้เล่นที่โต๊ะ (รวมคุณ)</span>
            <div className="pd-pcount__opts">
              {opts.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="option"
                  aria-selected={n === value}
                  className={`pd-pcount__opt ${n === value ? "is-selected" : ""}`}
                  onClick={() => { onChange(n); setOpen(false); }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Dealer Card Tray (deck) ---------- */

const DeckTray = forwardRef(function DeckTray({ tick, count, busy }, ref) {
  return (
    <div className={`pd-deck ${busy ? "is-busy" : ""}`} ref={ref} aria-label={`Deck ${count} cards`}>
      <div className="pd-deck__tray" />
      <div className={`pd-deck__stack ${tick > 0 ? "is-shaking" : ""}`} key={tick}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="pd-deck__card" style={{ "--i": i }} />
        ))}
      </div>
      <span className="pd-deck__count">{count}</span>
    </div>
  );
});

/* ---------- Table ---------- */

function PokerTable({ children, opening }) {
  return (
    <div className={`pd-table ${opening ? "is-opening" : ""}`}>
      <div className="pd-felt" aria-hidden="true">
        <div className="pd-felt__light" />
        <div className="pd-felt__brand">{THEME.BRAND_NAME}</div>
      </div>
      {children}
    </div>
  );
}

/* ---------- HUD ---------- */

function CreditPill({ balance, creditRef }) {
  const shown = useAnimatedNumber(balance, 1000);
  const prev = useRef(balance);
  const [dir, setDir] = useState("");
  useEffect(() => {
    if (balance === prev.current) return undefined;
    setDir(balance > prev.current ? "is-up" : "is-down");
    prev.current = balance;
    const t = setTimeout(() => setDir(""), 1300);
    return () => clearTimeout(t);
  }, [balance]);
  return (
    <div className={`pd-credit ${dir}`} ref={creditRef} aria-label={`Credit ${formatNumber(balance)}`}>
      <span className="pd-credit__coin" aria-hidden="true" />
      <span className="pd-credit__value">{formatNumber(shown)}</span>
    </div>
  );
}

function TopHUD({ balance, creditRef, onBack, soundOn, onToggleSound, onOpenSettings }) {
  return (
    <header className="pd-hud">
      <button type="button" className="pd-iconbtn" onClick={onBack} aria-label="Back">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <div className="pd-hud__title">
        <span className="pd-hud__game">{THEME.GAME_TITLE}</span>
        <span className="pd-hud__brand">{THEME.BRAND_NAME}</span>
      </div>
      <CreditPill balance={balance} creditRef={creditRef} />
      <button type="button" className={`pd-iconbtn ${soundOn ? "" : "is-off"}`} onClick={onToggleSound} aria-label={soundOn ? "Mute" : "Unmute"} aria-pressed={!soundOn}>
        {soundOn ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 9l5 6M22 9l-5 6" /></svg>
        )}
      </button>
      <button type="button" className="pd-iconbtn" onClick={onOpenSettings} aria-label="Settings">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
        </svg>
      </button>
    </header>
  );
}

/* ---------- History ---------- */

function History({ items }) {
  const wins = items.filter((h) => h.outcome === OUTCOME.WIN).length;
  return (
    <div className="pd-history">
      <span className="pd-history__label">ผลล่าสุด</span>
      <div className="pd-history__dots">
        {items.length === 0 && <span className="pd-history__empty">ยังไม่มีรอบ</span>}
        {items.map((h, i) => (
          <span key={h.id} className={`pd-dot pd-dot--${h.outcome.toLowerCase()} ${i === 0 ? "is-new" : ""}`} title={h.outcome} />
        ))}
      </div>
      {items.length > 0 && <span className="pd-history__rate">{Math.round((wins / items.length) * 100)}%</span>}
    </div>
  );
}

/* ---------- Betting ---------- */

function ChipSelector({ values, selected, max, disabled, onSelect }) {
  return (
    <div className="pd-chips" role="group" aria-label="Chips">
      {values.map((v) => {
        const [c1, c2, ink] = CHIP_STYLES[v] || ["#333", "#111", "#fff"];
        const isSel = selected === v;
        return (
          <button
            key={v}
            type="button"
            className={`pd-chip ${isSel ? "is-selected" : ""}`}
            style={{ "--c1": c1, "--c2": c2, "--ink": ink }}
            disabled={disabled || v > max}
            onClick={() => onSelect(v)}
            aria-pressed={isSel}
            aria-label={`Bet ${v}`}
          >
            <span>{formatChip(v)}</span>
          </button>
        );
      })}
    </div>
  );
}

function BetPanel({ bet, balance, open, onToggle, onSelect, onStep, onStart, canStart, onReset, levels = GAME_CONFIG.BET_LEVELS, chips = GAME_CONFIG.CHIP_VALUES, startLabel = "เริ่มเกม", startSub = "START", online = false }) {
  const broke = balance < Math.min(...levels);
  const atMin = !levels.some((l) => l < bet);
  const atMax = !levels.some((l) => l > bet && l <= balance);
  return (
    <div className={`pd-panel pd-panel--bet ${open ? "" : "is-collapsed"}`}>
      <button type="button" className="pd-sheet-handle" onClick={onToggle} aria-expanded={open} aria-label={open ? "ซ่อนชิป" : "แสดงชิป"}>
        <span />
      </button>
      <div className="pd-panel__chips">
        <ChipSelector values={chips} selected={bet} max={balance} disabled={broke} onSelect={onSelect} />
      </div>
      <div className="pd-panel__row">
        <div className="pd-stepper">
          <button type="button" className="pd-step" onClick={() => onStep(-1)} disabled={atMin || broke} aria-label="ลดเดิมพัน">−</button>
          <div className="pd-bet-value">
            <small>เดิมพัน</small>
            <strong key={bet}>{formatNumber(bet)}</strong>
          </div>
          <button type="button" className="pd-step" onClick={() => onStep(1)} disabled={atMax || broke} aria-label="เพิ่มเดิมพัน">+</button>
        </div>
        {broke && online ? (
          <button type="button" className="pd-btn pd-btn--gold pd-btn--start" disabled>
            <span className="pd-btn__label">ชิปไม่พอ</span>
            <span className="pd-btn__sub">ลุกจากโต๊ะแล้วซื้อชิปใหม่</span>
          </button>
        ) : broke ? (
          <button type="button" className="pd-btn pd-btn--gold pd-btn--start" onClick={onReset}>
            <span className="pd-btn__label">รับเครดิตทดลอง</span>
            <span className="pd-btn__sub">{formatNumber(GAME_CONFIG.INITIAL_BALANCE)}</span>
          </button>
        ) : (
          <button type="button" className="pd-btn pd-btn--gold pd-btn--start" onClick={onStart} disabled={!canStart}>
            <span className="pd-btn__label">{startLabel}</span>
            <span className="pd-btn__sub">{startSub}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function ActionPanel({ ev, onDraw, onStay }) {
  return (
    <div className="pd-panel pd-panel--action">
      <p className="pd-panel__hint">
        แต้มของคุณ <b>{ev ? ev.points : "-"}</b> จะจั่วใบที่ 3 ไหม?
      </p>
      <div className="pd-actions">
        <button type="button" className="pd-btn pd-btn--gold pd-btn--action" onClick={onDraw}>
          <span className="pd-btn__label">จั่วไพ่</span>
          <span className="pd-btn__sub">DRAW</span>
        </button>
        <button type="button" className="pd-btn pd-btn--ghost pd-btn--action" onClick={onStay}>
          <span className="pd-btn__label">อยู่</span>
          <span className="pd-btn__sub">STAY</span>
        </button>
      </div>
    </div>
  );
}

function StatusPanel({ text, bet }) {
  return (
    <div className="pd-panel pd-panel--status" aria-live="polite">
      <div className="pd-status">
        <span className="pd-status__dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="pd-status__text">{text}</span>
      </div>
      {bet > 0 && (
        <div className="pd-status__bet">
          เดิมพัน <b>{formatNumber(bet)}</b>
        </div>
      )}
    </div>
  );
}

function ResultPanel({ result, onPlayAgain, againLabel = "เล่นอีกครั้ง" }) {
  const o = result.outcome;
  return (
    <div className={`pd-panel pd-panel--result is-${o.toLowerCase()}`}>
      <div className="pd-result-line">
        <span>{o === OUTCOME.WIN ? "ชนะ" : o === OUTCOME.LOSE ? "แพ้" : "เสมอ"}</span>
        <b>{o === OUTCOME.DRAW ? "±0" : `${result.delta > 0 ? "+" : "−"}${formatNumber(Math.abs(result.delta))}`}</b>
      </div>
      <button type="button" className="pd-btn pd-btn--gold pd-btn--start" onClick={onPlayAgain}>
        <span className="pd-btn__label">{againLabel}</span>
        <span className="pd-btn__sub">PLAY AGAIN</span>
      </button>
    </div>
  );
}

/* ---------- Result overlay ---------- */

function GameResult({ result, onPlayAgain, onViewTable, againLabel = "เล่นอีกครั้ง" }) {
  const o = result.outcome;
  const title = o === OUTCOME.WIN ? "YOU WIN" : o === OUTCOME.LOSE ? "YOU LOSE" : "DRAW";
  const amount = o === OUTCOME.DRAW ? "±0" : `${result.delta > 0 ? "+" : "−"}${formatNumber(Math.abs(result.delta))}`;
  const pe = result.playerEval;
  const de = result.dealerEval;
  const winnerEval = o === OUTCOME.LOSE ? de : pe;
  return (
    <div className={`pd-result pd-result--${o.toLowerCase()}`} role="dialog" aria-modal="true" aria-label={title}>
      {o === OUTCOME.WIN && <div className="pd-result__rays" aria-hidden="true" />}
      <div className="pd-result__card">
        <h2 className="pd-result__title" data-text={title}>{title}</h2>
        <div className="pd-result__hand">
          <span className="pd-result__badge">{winnerEval.badge}</span>
          {o !== OUTCOME.DRAW && result.multiplier > 1 && (
            <span className="pd-result__mult">x{result.multiplier}</span>
          )}
        </div>
        <div className="pd-result__vs">
          <div><small>คุณ</small><b>{pe.badge}</b></div>
          <span>vs</span>
          <div><small>เจ้ามือ</small><b>{de.badge}</b></div>
        </div>
        <div className="pd-result__amount">{amount}</div>
        {result.bots && result.bots.length > 0 && (
          <div className="pd-result__others">
            ผู้เล่นอื่น ชนะ {result.bots.filter((b) => b.outcome === OUTCOME.WIN).length} · แพ้ {result.bots.filter((b) => b.outcome === OUTCOME.LOSE).length} · เสมอ {result.bots.filter((b) => b.outcome === OUTCOME.DRAW).length}
          </div>
        )}
        <button type="button" className="pd-btn pd-btn--gold pd-btn--wide" onClick={onPlayAgain} autoFocus>
          <span className="pd-btn__label">{againLabel}</span>
          <span className="pd-btn__sub">PLAY AGAIN</span>
        </button>
        <button type="button" className="pd-linkbtn" onClick={onViewTable}>ดูไพ่บนโต๊ะ</button>
      </div>
    </div>
  );
}

/* ---------- Pok effect ---------- */

function PokEffect({ fx }) {
  const dealer = fx.who === "dealer";
  return (
    <div className={`pd-pokfx ${dealer ? "is-dealer" : ""}`} aria-live="polite">
      <div className="pd-pokfx__flash" />
      <div className="pd-pokfx__ring" />
      <div className="pd-pokfx__text" data-text={fx.label}>{fx.label}</div>
      <div className="pd-pokfx__sub">{dealer ? "เจ้ามือป๊อก" : `ป๊อก!${fx.tag ? `  ${fx.tag}` : ""}`}</div>
    </div>
  );
}

/* ---------- Particles (lightweight canvas) ---------- */

function drawSparkle(ctx, x, y, r, rot, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 === 0 ? r : r * 0.28;
    const a = (Math.PI / 4) * i;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const Particles = forwardRef(function Particles(_props, ref) {
  const canvasRef = useRef(null);
  const partsRef = useRef([]);
  const rafRef = useRef(0);
  const sizeRef = useRef({ w: 1, h: 1, dpr: 1 });

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !c.parentElement) return undefined;
    const resize = () => {
      const r = c.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
      sizeRef.current = { w: r.width, h: r.height, dpr };
    };
    resize();
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(resize);
      ro.observe(c.parentElement);
    } else {
      window.addEventListener("resize", resize);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, []);

  const step = useCallback(function stepFrame() {
    const c = canvasRef.current;
    if (!c) { rafRef.current = 0; return; }
    const ctx = c.getContext("2d");
    if (!ctx) { rafRef.current = 0; return; }
    const { w, h, dpr } = sizeRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    const arr = partsRef.current;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.life -= 1;
      if (p.life <= 0) { arr.splice(i, 1); continue; }
      const t = p.life / p.max;
      if (p.kind === "ring") {
        p.r += (p.maxR - p.r) * 0.1;
        ctx.globalAlpha = t * 0.7;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1 + 7 * t;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.globalAlpha = Math.min(1, t * 1.5);
      if (p.kind === "spark") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 2.6, p.y - p.vy * 2.6);
        ctx.stroke();
      } else if (p.kind === "star") {
        drawSparkle(ctx, p.x, p.y, p.size * 2.4, p.rot, p.color);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (arr.length) rafRef.current = requestAnimationFrame(stepFrame);
    else { ctx.clearRect(0, 0, w, h); rafRef.current = 0; }
  }, []);

  useImperativeHandle(ref, () => ({
    burst(x, y, opts = {}) {
      const {
        count = 60,
        colors = ["#FFD54A", "#FFC107", "#FFFFFF", "#FFE9A3"],
        speed = 6,
        gravity = 0.12,
        ring = false,
      } = opts;
      const arr = partsRef.current;
      if (ring) {
        arr.push({ kind: "ring", x, y, r: 6, maxR: 170 + Math.random() * 60, life: 46, max: 46, color: "#FFD54A" });
      }
      for (let i = 0; i < count && arr.length < 700; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.35 + Math.random() * 0.9);
        const life = 40 + Math.floor(Math.random() * 50);
        const r = Math.random();
        arr.push({
          kind: r < 0.5 ? "spark" : r < 0.78 ? "dot" : "star",
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - speed * 0.25,
          g: gravity,
          drag: 0.965,
          size: 1.2 + Math.random() * 2.4,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          color: colors[Math.floor(Math.random() * colors.length)],
          life, max: life,
        });
      }
      if (!rafRef.current) rafRef.current = requestAnimationFrame(step);
    },
  }), [step]);

  return <canvas ref={canvasRef} className="pd-particles" aria-hidden="true" />;
});

/* ---------- Settings ---------- */

function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className={`pd-switch ${checked ? "is-on" : ""}`} onClick={onChange}>
      <span className="pd-switch__label">{label}</span>
      <span className="pd-switch__track"><span className="pd-switch__thumb" /></span>
    </button>
  );
}

function SettingsPanel({ sound, onClose, onResetCredits, canReset }) {
  return (
    <div className="pd-settings-backdrop" onClick={onClose}>
      <div className="pd-settings" role="dialog" aria-label="Settings" onClick={(e) => e.stopPropagation()}>
        <div className="pd-settings__head">
          <span>ตั้งค่า</span>
          <button type="button" className="pd-iconbtn pd-iconbtn--sm" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <Switch checked={sound.soundOn} onChange={sound.toggleSound} label="เสียงเอฟเฟกต์" />
        <Switch checked={sound.musicOn} onChange={sound.toggleMusic} label="เพลงพื้นหลัง" />
        <label className="pd-volume">
          <span>ระดับเสียง</span>
          <input type="range" min="0" max="1" step="0.05" value={sound.volume} onChange={(e) => sound.setVolume(e.target.value)} />
        </label>
        <button type="button" className="pd-btn pd-btn--ghost pd-btn--wide" onClick={onResetCredits} disabled={!canReset}>
          <span className="pd-btn__label">รีเซ็ตเครดิตทดลอง</span>
          <span className="pd-btn__sub">{formatNumber(GAME_CONFIG.INITIAL_BALANCE)}</span>
        </button>
      </div>
    </div>
  );
}

/* ==========================================================================
   9. PokDengGame — main component
   ========================================================================== */

export default function PokDengGame({
  initialBalance = GAME_CONFIG.INITIAL_BALANCE,
  playerName,
  onBack,
  onBalanceChange,
  className = "",
  api = null,      // WINNER 69: online tables ({ call, poll }); without it the original single-player game runs
  wallet = 0,      // WINNER 69: wallet balance for the buy-in
}) {
  const sound = useSound();

  const rootRef = useRef(null);
  const deckElRef = useRef(null);
  const creditRef = useRef(null);
  const playerHandRef = useRef(null);
  const dealerHandRef = useRef(null);
  const particlesRef = useRef(null);

  const [coins, setCoins] = useState([]);
  const [flash, setFlash] = useState(null);
  const [demo, setDemo] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [overlayHidden, setOverlayHidden] = useState(false);
  const [me] = useState(() => ({
    name: playerName || `VIP_${1000 + randomInt(9000)}`,
    seed: `me-${randomInt(1e9)}`,
    flag: pick(FLAGS),
  }));
  const [seats, setSeats] = useState(() => createSeats(GAME_CONFIG.MAX_BOTS));
  const [playerCount, setPlayerCount] = useState(GAME_CONFIG.DEFAULT_PLAYERS);
  const seatsRef = useRef(seats);
  seatsRef.current = seats;
  const botCountRef = useRef(playerCount - 1);
  botCountRef.current = playerCount - 1;

  const localPoint = useCallback((el) => {
    const root = rootRef.current;
    if (!root || !el) return null;
    const r = el.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    return { x: r.left - rr.left + r.width / 2, y: r.top - rr.top + r.height / 2 };
  }, []);

  const burstAt = (el, opts) => {
    const p = localPoint(el);
    if (p && particlesRef.current) particlesRef.current.burst(p.x, p.y, opts);
  };

  const spawnCoins = () => {
    const root = rootRef.current;
    if (!root) return;
    const from = localPoint(playerHandRef.current) || { x: root.clientWidth / 2, y: root.clientHeight * 0.6 };
    const to = localPoint(creditRef.current) || { x: root.clientWidth - 90, y: 28 };
    const stamp = Date.now();
    const list = Array.from({ length: 16 }, (_, i) => ({
      id: `${stamp}-${i}`,
      x: from.x + (Math.random() - 0.5) * 40,
      y: from.y + (Math.random() - 0.5) * 30,
      sx: (Math.random() - 0.5) * 170,
      sy: -50 - Math.random() * 90,
      tx: to.x - from.x,
      ty: to.y - from.y,
      delay: i * 45,
    }));
    setCoins(list);
    [720, 860, 1000, 1140].forEach((ms) => setTimeout(() => sound.play("coin"), ms));
    setTimeout(() => setCoins((cur) => (cur.length && cur[0].id === list[0].id ? [] : cur)), 1900);
  };

  // Visual-effect bridge — the game hook calls these; they never decide outcomes.
  const fxRef = useRef({});
  fxRef.current = {
    play: sound.play,
    botPok: (i) => {
      const el = rootRef.current && rootRef.current.querySelectorAll(".pd-seat")[i];
      burstAt(el, { count: 40, speed: 4.5, ring: true });
    },
    botsSettled: (results) => {
      setSeats((s) => s.map((x, i) => (results[i] ? { ...x, credit: Math.max(0, x.credit + results[i].delta) } : x)));
    },
    pok: (who) => {
      const el = who === "dealer" ? dealerHandRef.current : playerHandRef.current;
      burstAt(el, { count: who === "dealer" ? 60 : 120, ring: true, speed: 7.5 });
      setFlash({ key: Date.now(), kind: who === "dealer" ? "soft" : "gold" });
    },
    deng: () => burstAt(playerHandRef.current, { count: 50, ring: true, speed: 5.5 }),
    celebrate: (big) => {
      burstAt(playerHandRef.current, { count: big ? 150 : 100, ring: true, speed: 8 });
      setFlash({ key: Date.now(), kind: "gold" });
      const root = rootRef.current;
      if (!root) return;
      const shots = big ? 4 : 2;
      for (let i = 0; i < shots; i++) {
        setTimeout(() => {
          if (!particlesRef.current || !rootRef.current) return;
          const w = rootRef.current.clientWidth;
          const h = rootRef.current.clientHeight;
          particlesRef.current.burst(w * (0.2 + Math.random() * 0.6), h * (0.22 + Math.random() * 0.3), { count: 55, speed: 6, ring: i % 2 === 0 });
        }, 260 + i * 240);
      }
    },
    draw: () => {
      burstAt(playerHandRef.current, { count: 36, speed: 4, colors: ["#FFFFFF", "#FFE9A3", "#FFF6D6"] });
      setFlash({ key: Date.now(), kind: "soft" });
    },
    coins: spawnCoins,
  };

  // `api` never changes for a mounted game, so the same hook runs on every render
  const game = api
    ? usePokDengOnline({ api, fxRef }) // eslint-disable-line react-hooks/rules-of-hooks
    : usePokDeng({ // eslint-disable-line react-hooks/rules-of-hooks
        initialBalance,
        fxRef,
        onBalanceChange,
        getBotCount: () => botCountRef.current,
        getBotName: (i) => (seatsRef.current[i] ? seatsRef.current[i].name : ""),
      });
  const online = Boolean(api);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [pickRoom, setPickRoom] = useState(null);
  const [buyIn, setBuyIn] = useState(0);
  const tableSeats = online
    ? game.others.map((s) => ({ id: s.id, name: s.member ? `👤 ${s.name}` : s.name, seed: s.seed, flag: s.flag, credit: s.stack }))
    : seats;
  const lobbyOpen = online && game.view && !game.view.seated;
  useEffect(() => {
    if (!lobbyOpen) return undefined;
    game.loadRooms();
    const id = setInterval(() => game.loadRooms(), 5000);
    return () => clearInterval(id);
  }, [lobbyOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const gameRef = useRef(game);
  gameRef.current = game;

  const phase = game.gameState;
  const playerVisible = game.playerHand.length > 0 && game.playerHand.every((c) => c.faceUp);
  const dealerVisible = game.dealerHand.length > 0 && game.dealerHand.every((c) => c.faceUp);
  const playerEval = playerVisible ? calculatePokDeng(game.playerHand) : null;
  const dealerEval = dealerVisible ? calculatePokDeng(game.dealerHand) : null;
  const outcome = phase === PHASE.RESULT && game.result ? game.result.outcome : null;
  const busy = phase === PHASE.DEALING || phase === PHASE.DEALER_TURN;

  // reset "view table" toggle each round
  useEffect(() => {
    if (phase !== PHASE.RESULT) setOverlayHidden(false);
  }, [phase]);

  // DEMO / auto-play
  useEffect(() => {
    if (!demo) return undefined;
    let t;
    if (phase === PHASE.BETTING) {
      t = setTimeout(() => {
        const g = gameRef.current;
        const affordable = GAME_CONFIG.CHIP_VALUES.filter((v) => v <= g.getBalance());
        if (!affordable.length) { g.resetCredits(); return; }
        g.setBet(pick(affordable));
        g.startRound();
      }, TIMING.DEMO_START);
    } else if (phase === PHASE.PLAYER_TURN) {
      t = setTimeout(() => {
        const g = gameRef.current;
        const ev = calculatePokDeng(g.playerHand);
        g.playerAction(shouldPlayerAutoDraw(ev) ? "draw" : "stay");
      }, TIMING.DEMO_ACTION);
    } else if (phase === PHASE.RESULT && game.showResult) {
      t = setTimeout(() => gameRef.current.playAgain(), TIMING.DEMO_NEXT);
    }
    return () => clearTimeout(t);
  }, [demo, phase, game.showResult, game.balance]);

  // ผู้เล่นอื่นเข้า/ออกโต๊ะระหว่างรอบ (เฉพาะตอนรอเดิมพัน เพื่อไม่ให้สลับคนกลางรอบ)
  useEffect(() => {
    if (phase !== PHASE.BETTING || game.round < 1 || randomInt(10) > 2) return;
    setSeats((s) => {
      const i = randomInt(s.length);
      const next = s.slice();
      next[i] = createSeat(s.map((x) => x.name));
      return next;
    });
  }, [phase, game.round]);

  const changePlayerCount = (n) => {
    if (phase !== PHASE.BETTING && phase !== PHASE.IDLE) return;
    sound.play("chip_click");
    setPlayerCount(Math.max(GAME_CONFIG.MIN_PLAYERS, Math.min(GAME_CONFIG.MAX_PLAYERS, n)));
  };

  // keyboard shortcuts (desktop): Enter = start / play again, D = draw, S = stay
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || e.repeat) return;
      const g = gameRef.current;
      if (e.key === "Enter") {
        if (g.gameState === PHASE.BETTING) g.startRound();
        else if (g.gameState === PHASE.RESULT) g.playAgain();
      } else if (g.gameState === PHASE.PLAYER_TURN && (e.key === "d" || e.key === "D")) g.playerAction("draw");
      else if (g.gameState === PHASE.PLAYER_TURN && (e.key === "s" || e.key === "S")) g.playerAction("stay");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleBack = () => {
    sound.play("button_click");
    if (online && game.seated) { setConfirmLeave(true); return; }
    if (typeof onBack === "function") onBack();
  };

  const statusText =
    phase === PHASE.IDLE ? "กำลังเปิดโต๊ะ" :
    phase === PHASE.RESET ? "เตรียมรอบใหม่" :
    game.message || (phase === PHASE.DEALER_TURN ? "ตาเจ้ามือ" : "กำลังแจกไพ่");

  let panel;
  if (phase === PHASE.BETTING) {
    panel = (
      <BetPanel
        key="bet"
        bet={game.bet}
        balance={game.getBalance()}
        open={sheetOpen}
        onToggle={() => { sound.play("button_click"); setSheetOpen((v) => !v); }}
        onSelect={game.setBet}
        onStep={game.stepBet}
        onStart={game.startRound}
        canStart={game.canStart}
        onReset={game.resetCredits}
        online={online}
        levels={online && game.room ? game.room.chips : undefined}
        chips={online && game.room ? game.room.chips : undefined}
        startLabel={online ? "วางเดิมพัน" : undefined}
        startSub={online ? `${game.secondsLeft || 0} วินาที` : undefined}
      />
    );
  } else if (phase === PHASE.PLAYER_TURN) {
    panel = <ActionPanel key="action" ev={playerEval} onDraw={() => game.playerAction("draw")} onStay={() => game.playerAction("stay")} />;
  } else if (phase === PHASE.RESULT && game.result) {
    panel = <ResultPanel key="result" result={game.result} onPlayAgain={game.playAgain} againLabel={online ? "ดูโต๊ะ" : undefined} />;
  } else {
    panel = <StatusPanel key="status" text={statusText} bet={game.lockedBet} />;
  }

  const playerGlow = (playerEval && playerEval.isPok) || outcome === OUTCOME.WIN;
  const tableMessage = phase === PHASE.BETTING ? "เลือกเดิมพัน แล้วกดเริ่มเกม" : game.message;
  const seatPositions = ["tl", "tr", "ml", "mr"];
  // ระหว่างรอบ ใช้จำนวนตามที่แจกจริง / ตอนรอเดิมพัน ใช้ค่าที่เลือก
  const visibleBots = online ? tableSeats.length : game.botHands.length > 0 ? game.botHands.length : playerCount - 1;

  return (
    <div ref={rootRef} className={`pd-root ${demo ? "is-demo" : ""} ${visibleBots >= 3 ? "has-mid-seats" : ""} ${className}`}>
      <div className="pd-ambient" aria-hidden="true" />

      <TopHUD
        balance={game.balance}
        creditRef={creditRef}
        onBack={handleBack}
        soundOn={sound.soundOn}
        onToggleSound={() => { sound.toggleSound(); }}
        onOpenSettings={() => { sound.play("button_click"); setSettingsOpen(true); }}
      />

      <div className="pd-subbar">
        <History items={game.history} />
        {online ? (
          <span className="pdw-roominfo">{game.room ? `ห้อง${game.room.name} · เดิมพัน ${formatNumber(game.room.minBet)}–${formatNumber(game.room.maxBet)}` : "ออนไลน์"}</span>
        ) : (<>
        <PlayerCountPicker
          value={playerCount}
          onChange={changePlayerCount}
          disabled={phase !== PHASE.BETTING && phase !== PHASE.IDLE}
        />
        <button
          type="button"
          className={`pd-demo ${demo ? "is-on" : ""}`}
          onClick={() => { sound.play("button_click"); setDemo((v) => !v); }}
          aria-pressed={demo}
        >
          <span className="pd-demo__led" aria-hidden="true" />
          DEMO
        </button>
        </>)}
      </div>

      <main className="pd-stage">
        <PokerTable opening={phase === PHASE.IDLE}>
          <DeckContext.Provider value={deckElRef}>
          {tableSeats.slice(0, visibleBots).map((s, i) => (
            <Seat
              key={seatPositions[i]}
              seat={s}
              pos={seatPositions[i]}
              active={game.activeBot === i}
              playing={online ? game.botHands[i] && game.botHands[i].length > 0 : i < game.botHands.length}
              hand={game.botHands[i] || []}
              bet={game.botBets[i] || 0}
              result={game.botResults[i] || null}
            />
          ))}
            <div className="pd-layout">
              <Dealer
                hand={game.dealerHand}
                ev={dealerEval}
                handRef={dealerHandRef}
                glow={outcome === OUTCOME.LOSE}
                dim={outcome === OUTCOME.WIN}
                active={online ? Boolean(game.view && game.view.phase === "dealer") : phase === PHASE.DEALER_TURN}
              />
              <div className="pd-center">
                <div className="pd-center__side pd-center__side--left">
                  {game.round > 0 && <span className="pd-round">รอบที่ {game.round}</span>}
                </div>
                <DeckTray ref={deckElRef} tick={game.dealTick} count={game.deckCount} busy={busy} />
                <div className="pd-center__side pd-center__side--right">
                  {tableMessage && (
                    <span className={`pd-msg ${phase === PHASE.BETTING ? "is-hint" : ""}`} key={tableMessage}>
                      {tableMessage}
                    </span>
                  )}
                </div>
              </div>
              <Player
                me={me}
                hand={game.playerHand}
                ev={playerEval}
                handRef={playerHandRef}
                bet={phase === PHASE.BETTING ? game.bet : game.lockedBet || game.bet}
                locked={phase !== PHASE.BETTING && game.lockedBet > 0}
                glow={playerGlow}
                active={phase === PHASE.PLAYER_TURN}
                outcome={outcome}
              />
            </div>
          </DeckContext.Provider>
        </PokerTable>
      </main>

      <footer className="pd-footer">{panel}</footer>

      {coins.map((c) => (
        <span
          key={c.id}
          className="pd-coin"
          style={{
            left: c.x, top: c.y,
            "--sx": `${c.sx}px`, "--sy": `${c.sy}px`,
            "--tx": `${c.tx}px`, "--ty": `${c.ty}px`,
            animationDelay: `${c.delay}ms`,
          }}
          aria-hidden="true"
        />
      ))}

      {flash && <div key={flash.key} className={`pd-flash pd-flash--${flash.kind}`} onAnimationEnd={() => setFlash(null)} aria-hidden="true" />}
      {game.pokFx && <PokEffect key={game.pokFx.key} fx={game.pokFx} />}

      <Particles ref={particlesRef} />

      {game.showResult && game.result && !overlayHidden && (
        <GameResult
          result={game.result}
          onPlayAgain={game.playAgain}
          onViewTable={() => { sound.play("button_click"); setOverlayHidden(true); }}
          againLabel={online ? "ปิด · รอบใหม่เริ่มอัตโนมัติ" : undefined}
        />
      )}

      {settingsOpen && (
        <SettingsPanel
          sound={sound}
          onClose={() => setSettingsOpen(false)}
          onResetCredits={() => { game.resetCredits(); setSettingsOpen(false); }}
          canReset={!online && (phase === PHASE.BETTING || phase === PHASE.RESULT)}
        />
      )}

      {online && confirmLeave && (
        <div className="pdw-overlay">
          <div className="pdw-box">
            <h2>ลุกจากโต๊ะ?</h2>
            <p>ชิป ฿{formatNumber(game.balance)} จะคืนเข้ากระเป๋าเงิน{game.lockedBet > 0 && phase !== PHASE.RESULT ? " เมื่อรอบนี้จบ" : ""}</p>
            <button type="button" className="pd-btn pd-btn--gold pd-btn--wide" disabled={game.busy} onClick={async () => { setConfirmLeave(false); await game.leave(); }}>
              <span className="pd-btn__label">ลุกจากโต๊ะ</span><span className="pd-btn__sub">LEAVE</span>
            </button>
            <button type="button" className="pdw-link" onClick={() => setConfirmLeave(false)}>เล่นต่อ</button>
          </div>
        </div>
      )}

      {lobbyOpen && (() => {
        const rooms = game.rooms || [];
        const chosen = pickRoom ? rooms.find((r) => r.id === pickRoom) : null;
        const maxBuy = chosen ? Math.min(chosen.max, Math.floor(wallet - chosen.fee)) : 0;
        return (
          <div className="pdw-overlay">
            <div className="pdw-box">
              <h2>POK DENG</h2>
              {!chosen ? (<>
                <p>เล่นออนไลน์กับผู้เล่นจริง เจ้ามือคือ WINNER 69 · ที่นั่งว่างมีบอทเข้าแทน · เครดิตของคุณ ฿{formatNumber(wallet)}</p>
                <div className="pdw-rooms">
                  {rooms.map((r) => (
                    <button key={r.id} type="button" className="pdw-room" disabled={wallet < r.min + r.fee}
                      onClick={() => { setPickRoom(r.id); setBuyIn(Math.max(r.min, Math.min(r.max, Math.floor(wallet - r.fee), r.min * 2))); }}>
                      <b>ห้อง{r.name} <em>Lv.{r.level}</em></b>
                      <span>เดิมพัน ฿{formatNumber(r.minBet)}–{formatNumber(r.maxBet)} · ซื้อชิป ฿{formatNumber(r.min)}–{formatNumber(r.max)}</span>
                      <span>ค่าเข้าโต๊ะ ฿{formatNumber(r.fee)} · กำลังเล่น {r.players} คน</span>
                    </button>
                  ))}
                  {!rooms.length && <p>กำลังโหลดห้อง…</p>}
                </div>
                {game.error && <p className="pdw-err">{game.error}</p>}
                <button type="button" className="pdw-link" onClick={() => onBack && onBack()}>กลับหน้าหลัก</button>
              </>) : (<>
                <p>ห้อง{chosen.name} · เดิมพัน ฿{formatNumber(chosen.minBet)}–{formatNumber(chosen.maxBet)} · แพ้ป๊อก/เด้งเสียได้ถึง 5 เท่า</p>
                <div className="pdw-buy">
                  <small>ซื้อชิป</small>
                  <b>฿{formatNumber(buyIn)}</b>
                  <input type="range" min={chosen.min} max={Math.max(chosen.min, maxBuy)} step={chosen.minBet} value={buyIn} onChange={(e) => setBuyIn(Number(e.target.value))} />
                  <small>ค่าเข้าโต๊ะ ฿{formatNumber(chosen.fee)} · หักจากกระเป๋ารวม ฿{formatNumber(buyIn + chosen.fee)}</small>
                </div>
                {game.error && <p className="pdw-err">{game.error}</p>}
                <button type="button" className="pd-btn pd-btn--gold pd-btn--wide" style={{ marginTop: 12 }} disabled={game.busy || buyIn + chosen.fee > wallet}
                  onClick={async () => { if (await game.join(chosen.id, buyIn)) setPickRoom(null); }}>
                  <span className="pd-btn__label">{game.busy ? "กำลังเข้าโต๊ะ…" : "เข้าโต๊ะ"}</span><span className="pd-btn__sub">JOIN</span>
                </button>
                <button type="button" className="pdw-link" onClick={() => setPickRoom(null)}>เลือกห้องอื่น</button>
              </>)}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
