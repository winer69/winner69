/**
 * DummyGame.jsx — Premium Dummy (ดัมมี่) card game · single-file drop-in
 * ---------------------------------------------------------------------
 * Dependencies : react (>=17). No other packages. No global CSS.
 * All styles are injected once and namespaced under `.dummy-game`.
 *
 * Usage:
 *   import DummyGame from "./games/dummy/DummyGame";
 *   <DummyGame playerName="Player" startingCoins={10000} onExit={handleExit} />
 *
 * Optional props:
 *   onCoinsChange(coins)  – notified whenever the simulated coin balance changes
 *   height                – CSS height of the game root (default "100dvh")
 *   soundFiles            – { card_draw: "/sfx/draw.mp3", music: "/sfx/bgm.mp3", ... }
 *
 * Coins are SIMULATED ONLY. This component never talks to a real wallet.
 */
import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from "react";

/* =====================================================================
 * 1. CONFIG
 * ===================================================================== */
const TURN_SECONDS = 30;
const TAP_TO_PEEK = false; // true = แตะครั้งแรกยกไพ่, แตะครั้งที่สองเลือก
const BET_OPTIONS = [10, 50, 100, 500, 1000];
const KNOCK_BONUS = 50;
const DIFF_LABEL = { easy: "LV1", normal: "LV25", hard: "LV50+" };
const HAND_SIZE = { 2: 11, 3: 9, 4: 7 };
const STORAGE_KEY = "dummy-game:v1";

/** ใส่ path ไฟล์เสียงจริงได้ที่นี่ (หรือส่งผ่าน prop soundFiles) — ถ้าเป็น null จะใช้เสียงสังเคราะห์แทน */
export const SOUND_FILES = {
  card_shuffle: null,
  card_deal: null,
  card_draw: null,
  card_select: null,
  card_drop: null,
  button_click: null,
  meld_success: null,
  win: null,
  lose: null,
  coin: null,
  music: null,
};

/* =====================================================================
 * 2. RANDOM + UTILS
 * ===================================================================== */
const rnd = () => {
  try {
    const a = new Uint32Array(1);
    window.crypto.getRandomValues(a);
    return a[0] / 4294967296;
  } catch (e) {
    return Math.random();
  }
};
const randInt = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

function loadStore() {
  try {
    const s = window.localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : {};
  } catch (e) {
    return {};
  }
}
function saveStore(d) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch (e) {
    /* storage unavailable — ignore */
  }
}

/* =====================================================================
 * 3. DECK (deck.js)
 * ===================================================================== */
const SUITS = ["S", "H", "D", "C"];
const SUIT_SYMBOL = { S: "♠", H: "♥", D: "♦", C: "♣" };
const SUIT_ORDER = { S: 0, H: 1, D: 2, C: 3 };
const rankLabel = (r) => ({ 1: "A", 11: "J", 12: "Q", 13: "K" }[r] || String(r));
const isRed = (s) => s === "H" || s === "D";
const cardName = (c) => `${rankLabel(c.rank)}${SUIT_SYMBOL[c.suit]}`;

function createDeck() {
  const d = [];
  SUITS.forEach((s) => {
    for (let r = 1; r <= 13; r++) d.push({ id: `${r}${s}`, rank: r, suit: s });
  });
  return d;
}
function shuffleDeck(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** คะแนนไพ่แบบดัมมี่: 2–9 = 5, 10–K = 10, A = 15, 2♣ และ Q♠ = 50 */
const cardPoints = (c) =>
  (c.rank === 2 && c.suit === "C") || (c.rank === 12 && c.suit === "S") ? 50 : c.rank === 1 ? 15 : c.rank >= 10 ? 10 : 5;
const sumPoints = (cards) => cards.reduce((a, c) => a + cardPoints(c), 0);

function sortCards(cards, mode) {
  return cards.slice().sort((a, b) =>
    mode === "rank"
      ? a.rank - b.rank || SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]
      : SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || a.rank - b.rank
  );
}

/* =====================================================================
 * 4. GAME LOGIC (gameLogic.js)
 * ===================================================================== */
/** คืนค่า "set" (ตอง), "run" (เรียง) หรือ null */
function meldType(cards) {
  if (!cards || cards.length < 3) return null;
  if (cards.every((c) => c.rank === cards[0].rank)) return cards.length <= 4 ? "set" : null;
  if (!cards.every((c) => c.suit === cards[0].suit)) return null;
  const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);
  const consecutive = (rs) => rs.every((r, i) => i === 0 || r === rs[i - 1] + 1);
  if (consecutive(ranks)) return "run";
  if (ranks[0] === 1 && consecutive([...ranks.slice(1), 14])) return "run"; // Q-K-A
  return null;
}
function orderMeld(cards) {
  if (meldType(cards) === "set") return cards.slice().sort((a, b) => SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]);
  const s = cards.slice().sort((a, b) => a.rank - b.rank);
  const lowOk = s.every((c, i) => i === 0 || c.rank === s[i - 1].rank + 1);
  return !lowOk && s[0].rank === 1 ? [...s.slice(1), s[0]] : s;
}
function candidateMelds(hand) {
  const out = [];
  const byRank = {};
  hand.forEach((c) => (byRank[c.rank] = byRank[c.rank] || []).push(c));
  Object.values(byRank).forEach((g) => {
    if (g.length >= 3) {
      out.push(g.slice());
      if (g.length === 4) for (let i = 0; i < 4; i++) out.push(g.filter((_, j) => j !== i));
    }
  });
  SUITS.forEach((s) => {
    const m = new Map();
    hand.filter((c) => c.suit === s).forEach((c) => {
      m.set(c.rank, c);
      if (c.rank === 1) m.set(14, c);
    });
    for (let start = 1; start <= 12; start++) {
      const run = [];
      for (let r = start; r <= 14 && m.has(r); r++) {
        if (run.includes(m.get(r))) break;
        run.push(m.get(r));
        if (run.length >= 3) out.push(run.slice());
      }
    }
  });
  return out;
}
/** หา partition ที่ทำให้แต้มไพ่ค้างมือ (deadwood) น้อยที่สุด */
function bestPartition(hand) {
  const cands = candidateMelds(hand);
  let best = null;
  const used = new Set();
  const chosen = [];
  const dead = [];
  let iter = 0;
  const dfs = (i) => {
    if (++iter > 80000) return;
    while (i < hand.length && used.has(hand[i].id)) i++;
    if (i >= hand.length) {
      const dp = sumPoints(dead);
      if (!best || dp < best.deadPts || (dp === best.deadPts && dead.length < best.dead.length))
        best = { melds: chosen.map((m) => m.slice()), dead: dead.slice(), deadPts: dp };
      return;
    }
    const c = hand[i];
    for (const m of cands) {
      if (!m.includes(c) || m.some((x) => used.has(x.id))) continue;
      m.forEach((x) => used.add(x.id));
      chosen.push(m);
      dfs(i + 1);
      chosen.pop();
      m.forEach((x) => used.delete(x.id));
    }
    used.add(c.id);
    dead.push(c);
    dfs(i + 1);
    dead.pop();
    used.delete(c.id);
  };
  dfs(0);
  return best || { melds: [], dead: hand.slice(), deadPts: sumPoints(hand) };
}
/** ไพ่ใบนี้ (เช่นที่เก็บจากกองทิ้ง) นำไปลงชุดได้ทันทีหรือไม่ */
function canUseCard(card, hand, tableMelds) {
  if (!card) return false;
  if (candidateMelds([...hand, card]).some((m) => m.includes(card))) return true;
  return tableMelds.some((m) => meldType([...m.cards, card]));
}
/** แผนปิดเกม: ลงชุดทั้งหมด + ฝากไพ่ + เหลือทิ้งได้ไม่เกิน 1 ใบ */
function knockPlan(hand, tableMelds, mustMeldId) {
  if (!hand.length) return null;
  const part = bestPartition(hand);
  const virtual = [...tableMelds.map((m) => ({ id: m.id, cards: m.cards.slice() })), ...part.melds.map((m, i) => ({ id: `new${i}`, cards: m.slice() }))];
  const layoffs = [];
  let dead = part.dead.slice();
  let changed = true;
  while (changed && dead.length) {
    changed = false;
    for (const c of dead) {
      const t = virtual.find((m) => meldType([...m.cards, c]));
      if (t) {
        t.cards.push(c);
        layoffs.push({ card: c, meldId: t.id });
        dead = dead.filter((x) => x !== c);
        changed = true;
        break;
      }
    }
  }
  if (dead.length > 1) return null;
  if (dead.length === 1 && dead[0].id === mustMeldId) return null;
  return { melds: part.melds, layoffs, discard: dead[0] || null };
}
function chooseDiscard(hand, difficulty, ctx) {
  const { dead } = bestPartition(hand);
  const pool = (dead.length ? dead : hand).filter((c) => c.id !== ctx.mustMeldId);
  const list = pool.length ? pool : hand;
  if (difficulty === "easy") return pick(list);
  const score = (c) => {
    let s = cardPoints(c);
    if (hand.some((o) => o !== c && o.rank === c.rank)) s -= 7;
    if (hand.some((o) => o !== c && o.suit === c.suit && Math.abs(o.rank - c.rank) <= 2)) s -= 4;
    if (difficulty === "hard") {
      s += ctx.discard.filter((d) => d.rank === c.rank).length * 4; // ไพ่ที่ออกไปแล้ว = ปลอดภัย
      if (ctx.melds.some((m) => meldType([...m.cards, c]))) s -= 10; // อย่าป้อนให้คนอื่นฝาก
      if (cardPoints(c) === 50) s += 20; // รีบทิ้งไพ่โทษหนัก
    }
    return s + rnd() * 0.5;
  };
  return list.reduce((b, c) => (score(c) > score(b) ? c : b));
}
function computeResults(players, winnerIdx, knock) {
  const rows = players.map((p, i) => {
    const handPts = sumPoints(p.hand);
    const bonus = knock && i === winnerIdx ? KNOCK_BONUS : 0;
    return { idx: i, name: p.name, avatar: p.avatar, isUser: p.isUser, meldPts: p.meldPoints, handPts, bonus, score: p.meldPoints - handPts + bonus, hand: p.hand };
  });
  let winner = winnerIdx;
  if (winner == null) winner = rows.reduce((b, r) => (r.score > b.score ? r : b), rows[0]).idx;
  rows.sort((a, b) => (a.idx === winner ? -1 : b.idx === winner ? 1 : b.score - a.score));
  return { winner, knock, rows };
}

/* =====================================================================
 * 5. PROFILES — random names / avatars / personality
 * ===================================================================== */
const AI_NAMES = ["Alex", "Mia", "Daniel", "Emma", "Lucas", "Sophia", "Noah", "Olivia", "James", "Liam", "Ava", "Ethan", "Chloe", "Mason", "Luna", "Leo", "Nina", "Kai", "Zoe", "Ryan"];
const SYL = ["ka", "ri", "no", "mi", "lu", "sa", "ten", "vo", "ra", "zen", "ky", "lo", "an", "el", "jo", "ta", "fin", "mar"];
const AVATAR_EMOJI = ["🦊", "🐼", "🐯", "🦁", "🐸", "🐵", "🐨", "🐰", "🤖", "🧙", "🥷", "🤠", "😎", "🐲", "🦉", "🐺", "👑", "🎩", "🦄", "🐙"];
const AVATAR_GRAD = [["#FFD76A", "#C98A22"], ["#7F5AF0", "#2C1C6B"], ["#2CB67D", "#0B5144"], ["#FF6B6B", "#8E1B1B"], ["#4CC9F0", "#1D3D8F"], ["#F72585", "#5A0F3F"], ["#F5B93F", "#7A3E06"], ["#9EF01A", "#1F5C0B"]];
const PERSONALITIES = ["cautious", "balanced", "aggressive"];

function randomName(used) {
  for (let t = 0; t < 30; t++) {
    let n;
    if (rnd() < 0.7) n = pick(AI_NAMES);
    else {
      const s = pick(SYL) + pick(SYL) + (rnd() < 0.5 ? pick(SYL) : "");
      n = s[0].toUpperCase() + s.slice(1);
    }
    if (!used.has(n)) return n;
  }
  return `Player${randInt(10, 99)}`;
}
const randomAvatar = () => {
  const g = pick(AVATAR_GRAD);
  return { emoji: pick(AVATAR_EMOJI), g1: g[0], g2: g[1] };
};

/* =====================================================================
 * 6. SOUND MANAGER (SoundManager.js)
 *    เปลี่ยนเป็นไฟล์จริงได้ด้วย SOUND_FILES หรือ soundManager.setFile(name, url)
 * ===================================================================== */
function tone(ctx, { freq, to, type = "sine", dur = 0.15, gain = 0.2, delay = 0, attack = 0.01, vol = 1, dest }) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  const peak = Math.max(0.0002, gain * vol);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest || ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}
function noise(ctx, { dur = 0.08, gain = 0.2, delay = 0, freq = 2000, to, q = 1, vol = 1 }) {
  const t = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = gain * vol;
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t);
}
const SYNTH = {
  card_shuffle: (c, v) => {
    for (let i = 0; i < 16; i++) noise(c, { dur: 0.05, gain: 0.22, delay: i * 0.045 + Math.random() * 0.01, freq: 2600 + Math.random() * 1500, q: 0.8, vol: v });
  },
  card_deal: (c, v) => noise(c, { dur: 0.06, gain: 0.25, freq: 3200, to: 1800, q: 1.2, vol: v }),
  card_draw: (c, v) => {
    noise(c, { dur: 0.18, gain: 0.25, freq: 900, to: 4200, q: 0.9, vol: v });
    tone(c, { freq: 660, to: 990, dur: 0.12, gain: 0.05, delay: 0.1, vol: v });
  },
  card_select: (c, v) => tone(c, { freq: 880, to: 1180, dur: 0.07, gain: 0.08, type: "triangle", vol: v }),
  card_drop: (c, v) => {
    tone(c, { freq: 170, to: 60, dur: 0.16, gain: 0.3, vol: v });
    noise(c, { dur: 0.07, gain: 0.25, freq: 1500, q: 0.7, vol: v });
  },
  button_click: (c, v) => tone(c, { freq: 1250, to: 900, dur: 0.05, gain: 0.07, type: "square", vol: v }),
  meld_success: (c, v) => [523, 659, 784, 1047].forEach((f, i) => tone(c, { freq: f, dur: 0.28, gain: 0.12, delay: i * 0.07, type: "triangle", vol: v })),
  win: (c, v) => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, { freq: f, dur: 0.45, gain: 0.13, delay: i * 0.1, type: "triangle", vol: v }));
    [1568, 2093, 2637].forEach((f, i) => tone(c, { freq: f, dur: 0.9, gain: 0.05, delay: 0.55 + i * 0.06, vol: v }));
  },
  lose: (c, v) => [392, 330, 262].forEach((f, i) => tone(c, { freq: f, dur: 0.4, gain: 0.09, delay: i * 0.16, type: "sine", vol: v })),
  coin: (c, v) => {
    tone(c, { freq: 1319, dur: 0.08, gain: 0.08, type: "square", vol: v });
    tone(c, { freq: 1760, dur: 0.22, gain: 0.08, delay: 0.07, type: "square", vol: v });
  },
};

class SoundManager {
  constructor(files) {
    this.files = { ...SOUND_FILES, ...(files || {}) };
    this.ctx = null;
    this.enabled = true;
    this.musicEnabled = false;
    this.volume = 0.7;
    this.musicTimer = null;
    this.musicAudio = null;
  }
  setFile(name, url) {
    this.files[name] = url;
  }
  _ctx() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }
  play(name) {
    if (!this.enabled) return;
    const url = this.files[name];
    if (url) {
      try {
        const a = new Audio(url);
        a.volume = this.volume;
        a.play().catch(() => {});
        return;
      } catch (e) {
        /* fall back to synth */
      }
    }
    const ctx = this._ctx();
    if (!ctx || !SYNTH[name]) return;
    try {
      SYNTH[name](ctx, this.volume);
    } catch (e) {
      /* ignore */
    }
  }
  setVolume(v) {
    this.volume = v;
    if (this.musicAudio) this.musicAudio.volume = v * 0.4;
  }
  startMusic() {
    if (!this.musicEnabled || this.musicTimer || this.musicAudio) return;
    if (this.files.music) {
      try {
        this.musicAudio = new Audio(this.files.music);
        this.musicAudio.loop = true;
        this.musicAudio.volume = this.volume * 0.4;
        this.musicAudio.play().catch(() => {});
      } catch (e) {
        this.musicAudio = null;
      }
      return;
    }
    const chords = [[220, 277, 330], [196, 247, 294], [175, 220, 262], [196, 247, 311]];
    let i = 0;
    const playChord = () => {
      const ctx = this._ctx();
      if (!ctx || !this.musicEnabled) return;
      chords[i++ % chords.length].forEach((f) => tone(ctx, { freq: f, dur: 3.9, attack: 1.2, gain: 0.03, vol: this.volume }));
    };
    playChord();
    this.musicTimer = setInterval(playChord, 4000);
  }
  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    if (this.musicAudio) {
      this.musicAudio.pause();
      this.musicAudio = null;
    }
  }
}

/* =====================================================================
 * 7. SMALL UI COMPONENTS
 * ===================================================================== */
function PlayingCard({ card, faceDown, size = "md", className = "", ...rest }) {
  if (faceDown || !card)
    return (
      <div className={`dummy-card dummy-card--back dummy-card--${size} ${className}`} {...rest}>
        <div className="dummy-card__back-inner" />
      </div>
    );
  const sym = SUIT_SYMBOL[card.suit];
  const label = rankLabel(card.rank);
  return (
    <div
      className={`dummy-card dummy-card--${size} ${isRed(card.suit) ? "is-red" : "is-black"} ${cardPoints(card) === 50 ? "is-special" : ""} ${className}`}
      aria-label={cardName(card)}
      {...rest}
    >
      <div className="dummy-card__corner">
        <span>{label}</span>
        <span>{sym}</span>
      </div>
      <div className="dummy-card__pip">{card.rank > 10 || card.rank === 1 ? <span className="dummy-card__face">{label === "A" ? sym : label}</span> : sym}</div>
      <div className="dummy-card__corner dummy-card__corner--br">
        <span>{label}</span>
        <span>{sym}</span>
      </div>
    </div>
  );
}

function Avatar({ avatar, size = 44, active, className = "" }) {
  if (!avatar) return null;
  return (
    <div
      className={`dummy-avatar ${active ? "is-active" : ""} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.52, background: `radial-gradient(circle at 30% 25%, ${avatar.g1}, ${avatar.g2})` }}
    >
      <span>{avatar.emoji}</span>
    </div>
  );
}

function TurnTimer({ timeLeft, size = 40 }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const low = timeLeft <= 5;
  return (
    <div className={`dummy-timer ${low ? "is-low" : ""}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} className="dummy-timer__track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="dummy-timer__bar"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - timeLeft / TURN_SECONDS)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span>{timeLeft}</span>
    </div>
  );
}

function FlyingCard({ f, onDone }) {
  const ref = useRef(null);
  const inner = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !el.animate) {
      onDone(f.key);
      return undefined;
    }
    const { from, to, duration = 550, flip = false, rotate = 0 } = f;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const sx = from.w / w;
    const ex = to.w / w;
    const lift = Math.min(from.y, to.y) - h * 0.55;
    const kf = [
      { transform: `translate(${from.x - w / 2}px, ${from.y - h / 2}px) scale(${sx}) rotate(0deg)`, opacity: 0.9 },
      { transform: `translate(${(from.x + to.x) / 2 - w / 2}px, ${lift - h / 2}px) scale(${Math.max(sx, ex) * 1.1}) rotate(${rotate * 0.6}deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${to.x - w / 2}px, ${to.y - h / 2}px) scale(${ex}) rotate(${rotate}deg)`, opacity: 1 },
    ];
    const a = el.animate(kf, { duration, easing: "cubic-bezier(.25,.8,.3,1)", fill: "forwards" });
    if (flip && inner.current)
      inner.current.animate([{ transform: "rotateY(180deg)" }, { transform: "rotateY(180deg)", offset: 0.2 }, { transform: "rotateY(0deg)" }], {
        duration,
        easing: "ease-in-out",
        fill: "forwards",
      });
    a.onfinish = () => onDone(f.key);
    return () => {
      a.onfinish = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const showFront = f.faceUp || f.flip;
  return (
    <div ref={ref} className={`dummy-fly ${f.glow ? "is-glow" : ""}`}>
      <div ref={inner} className="dummy-fly__inner" style={{ transform: f.flip ? "rotateY(180deg)" : "none" }}>
        {showFront && (
          <div className="dummy-fly__face">
            <PlayingCard card={f.card} />
          </div>
        )}
        {(!f.faceUp || f.flip) && (
          <div className={`dummy-fly__face ${showFront ? "dummy-fly__face--back" : ""}`}>
            <PlayingCard faceDown />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Player hand: tap, drag, FLIP re-order animation ---------- */
function PlayerHand({ cards, selected, peekId, newId, hiddenIds, disabled, onTap, onDrop, handRef }) {
  const slotRefs = useRef(new Map());
  const prevRects = useRef(new Map());
  const dragRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const order = cards.map((c) => c.id).join(",");

  useLayoutEffect(() => {
    const now = new Map();
    slotRefs.current.forEach((el, id) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      now.set(id, r);
      const prev = prevRects.current.get(id);
      if (prev && el.animate) {
        const dx = prev.left - r.left;
        if (Math.abs(dx) > 2) el.animate([{ transform: `translateX(${dx}px)` }, { transform: "translateX(0)" }], { duration: 380, easing: "cubic-bezier(.22,1,.36,1)" });
      }
    });
    prevRects.current = now;
  }, [order]);

  const ov = cards.length <= 6 ? 0.12 : cards.length <= 9 ? 0.34 : cards.length <= 12 ? 0.46 : 0.54;

  const down = (e, id) => {
    if (disabled) return;
    dragRef.current = { id, x: e.clientX, y: e.clientY, active: false, pid: e.pointerId, el: e.currentTarget };
  };
  const move = (e) => {
    const d = dragRef.current;
    if (!d || d.pid !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.active) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 0.8) {
        d.active = true;
        try {
          d.el.setPointerCapture(e.pointerId);
        } catch (err) {
          /* noop */
        }
      } else if (Math.abs(dx) > 14) {
        dragRef.current = null; // horizontal = scroll the hand
        return;
      } else return;
    }
    setDrag({ id: d.id, dx, dy });
  };
  const up = (e) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (!d.active) {
      onTap(d.id);
      return;
    }
    setDrag(null);
    d.el.style.pointerEvents = "none";
    const t = document.elementFromPoint(e.clientX, e.clientY);
    d.el.style.pointerEvents = "";
    const zone = t && t.closest ? t.closest("[data-drop]") : null;
    const meld = t && t.closest ? t.closest("[data-meld-id]") : null;
    const over = t && t.closest ? t.closest("[data-card-id]") : null;
    onDrop(d.id, {
      zone: zone ? zone.getAttribute("data-drop") : null,
      meldId: meld ? meld.getAttribute("data-meld-id") : null,
      overCard: over ? over.getAttribute("data-card-id") : null,
      dx: e.clientX - d.x,
    });
  };
  const cancel = () => {
    dragRef.current = null;
    setDrag(null);
  };

  return (
    <div className="dummy-hand" ref={handRef} data-tut="hand">
      <div className="dummy-hand__inner">
        {cards.length === 0 && <div className="dummy-hand__empty">ไพ่ในมือจะปรากฏที่นี่</div>}
        {cards.map((c, i) => {
          const sel = selected.includes(c.id);
          const dragging = drag && drag.id === c.id;
          return (
            <div
              key={c.id}
              ref={(el) => (el ? slotRefs.current.set(c.id, el) : slotRefs.current.delete(c.id))}
              className="dummy-hand__slot"
              style={{ marginLeft: i === 0 ? 0 : `calc(var(--cw) * -${ov})`, zIndex: dragging ? 50 : i + 1, visibility: hiddenIds.includes(c.id) ? "hidden" : "visible" }}
            >
              <div
                className={`dummy-hand__drag ${dragging ? "is-dragging" : ""}`}
                style={dragging ? { transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx * 0.04}deg)` } : undefined}
                data-card-id={c.id}
                role="button"
                tabIndex={0}
                aria-pressed={sel}
                onPointerDown={(e) => down(e, c.id)}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={cancel}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onTap(c.id)}
              >
                <PlayingCard card={c} className={`${sel ? "is-selected" : ""} ${peekId === c.id ? "is-peek" : ""} ${newId === c.id ? "is-new" : ""}`} />
                {sel && <span className="dummy-hand__badge">เลือกแล้ว</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OpponentSeat({ player, count, active, timeLeft, pos, seatRef, thinking }) {
  const fan = Math.min(count, 5);
  return (
    <div className={`dummy-seat dummy-seat--${pos} ${active ? "is-active" : ""}`}>
      <div className="dummy-seat__avatar" ref={seatRef}>
        <Avatar avatar={player.avatar} size={42} active={active} />
        {active && (
          <div className="dummy-seat__timer">
            <TurnTimer timeLeft={timeLeft} size={22} />
          </div>
        )}
      </div>
      <div className="dummy-seat__info">
        <div className="dummy-seat__name">{player.name}</div>
        <div className="dummy-seat__cards">
          <div className="dummy-seat__fan">
            {Array.from({ length: fan }).map((_, i) => (
              <PlayingCard key={i} faceDown size="xs" style={{ transform: `rotate(${(i - (fan - 1) / 2) * 9}deg)` }} />
            ))}
          </div>
          <span>{count}</span>
        </div>
        {thinking && (
          <div className="dummy-seat__thinking">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
    </div>
  );
}

function MeldArea({ melds, players, armed, onMeldTap }) {
  if (!melds.length)
    return <div className="dummy-melds dummy-melds--empty">ชุดที่ลงจะแสดงตรงนี้ — ตอง 7 7 7 หรือเรียง 3♠ 4♠ 5♠</div>;
  return (
    <div className="dummy-melds">
      {melds.map((m) => (
        <button
          key={m.id}
          type="button"
          data-meld-id={m.id}
          className={`dummy-meld ${m.fresh ? "is-fresh" : ""} ${armed ? "is-armed" : ""} ${players[m.owner] && players[m.owner].isUser ? "is-mine" : ""}`}
          onClick={() => onMeldTap(m.id)}
        >
          <span className="dummy-meld__owner">{players[m.owner] ? players[m.owner].name : ""}</span>
          <span className="dummy-meld__cards">
            {m.cards.map((c, i) => (
              <PlayingCard key={c.id} card={c} size="sm" style={{ marginLeft: i ? "calc(var(--cw-sm) * -0.5)" : 0 }} />
            ))}
          </span>
        </button>
      ))}
    </div>
  );
}

function GameControls({ phase, myTurn, selectedCount, onDraw, onSort, onMeld, onDiscard, onMenu, sortMode, disabled }) {
  const btn = (key, icon, label, onClick, opts = {}) => (
    <button
      key={key}
      type="button"
      data-tut={key}
      className={`dummy-ctrl ${opts.primary ? "is-primary" : ""} ${opts.dim ? "is-dim" : ""}`}
      onClick={onClick}
      disabled={disabled && key !== "menu"}
    >
      <span className="dummy-ctrl__icon">{icon}</span>
      <span className="dummy-ctrl__label">{label}</span>
    </button>
  );
  return (
    <div className="dummy-controls">
      {btn("draw", "⇩", "จั่ว", onDraw, { primary: myTurn && phase === "draw", dim: !(myTurn && phase === "draw") })}
      {btn("sort", "⇅", sortMode === "suit" ? "เรียงดอก" : "เรียงแต้ม", onSort)}
      {btn("meld", "◆", "ลงชุด", onMeld, { primary: myTurn && phase === "play" && selectedCount >= 3, dim: !(myTurn && phase === "play" && selectedCount >= 1) })}
      {btn("discard", "⤓", "ทิ้ง", onDiscard, { primary: myTurn && phase === "play" && selectedCount === 1, dim: !(myTurn && phase === "play" && selectedCount === 1) })}
      {btn("menu", "☰", "เมนู", onMenu)}
    </div>
  );
}

function Particles({ count = 18, gold = true }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }).map(() => {
        const a = rnd() * Math.PI * 2;
        const d = 60 + rnd() * 140;
        return { tx: Math.cos(a) * d, ty: Math.sin(a) * d, s: 4 + rnd() * 6, delay: rnd() * 120, hue: gold ? pick(["#FFD76A", "#F5B93F", "#FFF3C4"]) : pick(["#FFD76A", "#7CF5C8", "#FFFFFF"]) };
      }),
    [count, gold]
  );
  return (
    <div className="dummy-particles" aria-hidden="true">
      {parts.map((p, i) => (
        <i key={i} style={{ "--tx": `${p.tx}px`, "--ty": `${p.ty}px`, width: p.s, height: p.s, background: p.hue, animationDelay: `${p.delay}ms` }} />
      ))}
    </div>
  );
}

function CountUp({ value, duration = 1200 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / duration);
      setV(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{v.toLocaleString()}</>;
}

/* ---------- Win / Lose / Scoreboard (WinAnimation.jsx) ---------- */
function EndScreen({ results, reward, bet, onPlayAgain, onBack, againLabel = "เล่นอีกครั้ง", backLabel = "กลับคาสิโน", note = null }) {
  const userWon = results.rows[0] && results.rows[0].isUser;
  const userRow = results.rows.find((r) => r.isUser);
  const winnerRow = results.rows[0];
  const coins = useMemo(() => Array.from({ length: 22 }).map(() => ({ left: rnd() * 100, delay: 400 + rnd() * 1400, dur: 1400 + rnd() * 1200, size: 18 + rnd() * 14 })), []);
  return (
    <div className={`dummy-end ${userWon ? "is-win" : "is-lose"}`}>
      {userWon && (
        <>
          <div className="dummy-end__flash" />
          <div className="dummy-end__glow" />
          <div className="dummy-end__burst">
            <Particles count={42} />
          </div>
          <div className="dummy-end__coins" aria-hidden="true">
            {coins.map((c, i) => (
              <span key={i} style={{ left: `${c.left}%`, animationDelay: `${c.delay}ms`, animationDuration: `${c.dur}ms`, fontSize: c.size }}>
                🪙
              </span>
            ))}
          </div>
        </>
      )}
      <div className="dummy-end__panel">
        {userWon ? (
          <div className="dummy-end__hero">
            <div className="dummy-end__title">คุณชนะ!</div>
            <div className="dummy-end__sub">{results.knock ? "ปิดเกมสำเร็จ" : "คะแนนสูงสุดในรอบนี้"}</div>
            <div className="dummy-end__reward">
              <span>🪙</span> +<CountUp value={reward} />
            </div>
          </div>
        ) : (
          <div className="dummy-end__hero">
            <div className="dummy-end__title dummy-end__title--soft">จบรอบ</div>
            <div className="dummy-end__sub">
              {winnerRow.name} ชนะรอบนี้ · คุณได้ {userRow ? userRow.score : 0} คะแนน
            </div>
            {winnerRow.hand.length > 0 && (
              <div className="dummy-end__reveal">
                {winnerRow.hand.map((c, i) => (
                  <PlayingCard key={c.id} card={c} size="sm" style={{ animationDelay: `${i * 70}ms` }} className="is-reveal" />
                ))}
              </div>
            )}
            <div className="dummy-end__hint">เดิมพัน {bet.toLocaleString()} — ลองใหม่อีกตา โชคอาจเข้าข้างคุณ</div>
          </div>
        )}
        <div className="dummy-score">
          <div className="dummy-score__head">
            <span>ผู้เล่น</span>
            <span>คะแนน</span>
            <span>ผล</span>
          </div>
          {results.rows.map((r, i) => (
            <div key={r.idx} className={`dummy-score__row ${i === 0 ? "is-winner" : ""}`} style={{ animationDelay: `${300 + i * 120}ms` }}>
              <span className="dummy-score__name">
                <Avatar avatar={r.avatar} size={28} />
                {i === 0 && "🏆 "}
                {r.isUser ? "คุณ" : r.name}
              </span>
              <span className="dummy-score__pts">
                {r.score} <small>({r.meldPts} − {r.handPts}{r.bonus ? ` + ${r.bonus}` : ""})</small>
              </span>
              <span className="dummy-score__res">{i === 0 ? "ผู้ชนะ" : "—"}</span>
            </div>
          ))}
        </div>
        {note && <p className="dummy-lobby__note" style={{ margin: "6px 0 0" }}>{note}</p>}
        <div className="dummy-end__actions">
          <button type="button" className="dummy-btn dummy-btn--gold" onClick={onPlayAgain}>
            {againLabel}
          </button>
          <button type="button" className="dummy-btn dummy-btn--ghost" onClick={onBack}>
            {backLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Tutorial overlay (Tutorial.jsx) ---------- */
const TUTORIAL = [
  { head: "จั่วไพ่", text: "แตะกองไพ่หรือปุ่ม “จั่ว” เพื่อจั่ว 1 ใบ หรือแตะกองทิ้งเพื่อเก็บไพ่ใบบนสุด (ต้องนำไปลงชุดได้ทันที)", target: "draw", expect: "draw" },
  { head: "เลือกไพ่", text: "แตะไพ่ในมือเพื่อเลือก ไพ่จะยกขึ้นพร้อมกรอบทอง แตะซ้ำเพื่อยกเลิก ลากไพ่ซ้าย-ขวาเพื่อจัดตำแหน่งได้", target: "hand", expect: "select" },
  { head: "จัดชุด", text: "เลือกไพ่ 3 ใบขึ้นไป เช่น ตอง 7 7 7 หรือเรียงดอกเดียวกัน 3♠ 4♠ 5♠ แล้วกด “ลงชุด” — เลือกใบเดียวแล้วแตะชุดบนโต๊ะเพื่อ ‘ฝาก’", target: "meld", expect: "meld" },
  { head: "ทิ้งไพ่", text: "เลือกไพ่ 1 ใบแล้วกด “ทิ้ง” หรือลากขึ้นไปวางบนกองทิ้งเพื่อจบเทิร์น", target: "discard", expect: "discard" },
  { head: "ปิดเกมเพื่อชนะ", text: "ลงชุดจนไพ่ในมือหมด หรือกดปุ่ม “น็อก” สีทองเมื่อปรากฏ เพื่อปิดเกมและรับโบนัส +50", target: "turn", expect: null },
];

function Tutorial({ step, rootRef, onNext, onSkip }) {
  const [rect, setRect] = useState(null);
  const s = TUTORIAL[step];
  useLayoutEffect(() => {
    const measure = () => {
      const root = rootRef.current;
      if (!root) return;
      const el = root.querySelector(`[data-tut="${s.target}"]`);
      if (!el) return setRect(null);
      const r = el.getBoundingClientRect();
      const R = root.getBoundingClientRect();
      setRect({ x: r.left - R.left - 6, y: r.top - R.top - 6, w: r.width + 12, h: r.height + 12, rootH: R.height });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [step, s.target, rootRef]);
  const panelTop = rect && rect.y + rect.h / 2 > rect.rootH / 2;
  return (
    <div className="dummy-tut">
      {rect ? <div className="dummy-tut__spot" style={{ transform: `translate(${rect.x}px, ${rect.y}px)`, width: rect.w, height: rect.h }} /> : <div className="dummy-tut__dim" />}
      <div className={`dummy-tut__panel ${panelTop ? "is-top" : "is-bottom"}`} key={step}>
        <div className="dummy-tut__step">
          ขั้นตอน {step + 1} / {TUTORIAL.length}
        </div>
        <div className="dummy-tut__head">{s.head}</div>
        <p className="dummy-tut__text">{s.text}</p>
        <div className="dummy-tut__dots">
          {TUTORIAL.map((_, i) => (
            <i key={i} className={i === step ? "is-on" : ""} />
          ))}
        </div>
        <div className="dummy-tut__actions">
          <button type="button" className="dummy-btn dummy-btn--ghost dummy-btn--sm" onClick={onSkip}>
            ข้าม
          </button>
          <button type="button" className="dummy-btn dummy-btn--gold dummy-btn--sm" onClick={onNext}>
            {step === TUTORIAL.length - 1 ? "เริ่มเล่น" : "ถัดไป"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onChange, label }) {
  return (
    <button type="button" className={`dummy-toggle ${on ? "is-on" : ""}`} onClick={() => onChange(!on)} aria-pressed={on} aria-label={label}>
      <i />
    </button>
  );
}

/* =====================================================================
 * 8. MAIN COMPONENT
 * ===================================================================== */
const emptyGame = () => ({
  status: "idle", // idle | shuffling | dealing | ready | playing | ended
  players: [],
  deck: [],
  discard: [],
  melds: [],
  current: 0,
  phase: "draw", // draw | play
  mustMeldId: null,
  turnId: 0,
  results: null,
  reward: 0,
  bet: 0,
  token: 0,
  lastDrawnId: null,
});
const updPlayer = (g, i, fn) => ({ ...g, players: g.players.map((p, j) => (j === i ? { ...p, ...fn(p) } : p)) });
const SEAT_POS = { 2: ["top"], 3: ["left", "right"], 4: ["left", "top", "right"] };

export default function DummyGame({ playerName = "Player", startingCoins = 10000, onExit, onCoinsChange, height = "100dvh", soundFiles, className = "", api = null, wallet = 0 }) {
  // WINNER 69: with `api` the table is online (server: backend/src/dummy/hub.js) - every move is sent
  // to the server and the table is redrawn from its snapshots; without it the original game runs.
  const online = Boolean(api);
  useDummyStyles();
  const stored = useMemo(loadStore, []);
  const rootRef = useRef(null);
  const deckRef = useRef(null);
  const discardRef = useRef(null);
  const handRef = useRef(null);
  const seatRefs = useRef({});
  const busyRef = useRef(false);
  const flyKey = useRef(0);
  const flyResolvers = useRef({});
  const discardRot = useRef({});
  const timeoutTurn = useRef(-1);

  /* ---- profile / settings ---- */
  const [profile, setProfile] = useState(() => ({
    customName: stored.customName || null,
    wins: stored.wins || 0,
    games: stored.games || 0,
    xp: stored.xp || 0,
    avatar: stored.avatar || randomAvatar(),
    tutorialSeen: !!stored.tutorialSeen,
  }));
  const userName = profile.customName || playerName;
  const level = 1 + Math.floor(profile.xp / 120);
  const [settings, setSettings] = useState(() => ({ sound: true, music: false, volume: 0.7, difficulty: "normal", players: 4, ...(stored.settings || {}) }));
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  useEffect(() => {
    saveStore({ ...profile, settings });
  }, [profile, settings]);

  /* ---- sound ---- */
  const soundRef = useRef(null);
  if (!soundRef.current) soundRef.current = new SoundManager(soundFiles);
  const sfx = (n) => soundRef.current.play(n);
  useEffect(() => {
    const s = soundRef.current;
    s.enabled = settings.sound;
    s.setVolume(settings.volume);
    s.musicEnabled = settings.music;
    if (!settings.music) s.stopMusic();
  }, [settings.sound, settings.volume, settings.music]);
  useEffect(() => () => soundRef.current && soundRef.current.stopMusic(), []);

  /* ---- coins (simulated only) ---- */
  const [coins, setCoins] = useState(startingCoins);
  const coinsReady = useRef(false);
  useEffect(() => setCoins(startingCoins), [startingCoins]);
  useEffect(() => {
    if (!coinsReady.current) {
      coinsReady.current = true;
      return;
    }
    if (onCoinsChange) onCoinsChange(coins);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coins]);
  const [betIdx, setBetIdx] = useState(2);

  /* ---- game state (ref mirror for async flows) ---- */
  const gRef = useRef(emptyGame());
  const [game, setGame] = useState(gRef.current);
  const commit = (fn) => {
    const next = typeof fn === "function" ? fn(gRef.current) : fn;
    gRef.current = next;
    setGame(next);
    return next;
  };

  /* ---- UI state ---- */
  const [screen, setScreen] = useState("loading");
  const [selected, setSelected] = useState([]);
  const [peekId, setPeekId] = useState(null);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [flyers, setFlyers] = useState([]);
  const [dealt, setDealt] = useState([]);
  const [meldFx, setMeldFx] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tut, setTut] = useState({ open: false, step: 0 });
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS);
  const [sortMode, setSortMode] = useState("suit");
  const [editingName, setEditingName] = useState(false);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setScreen("lobby"), 1600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (screen === "table" && settings.music) soundRef.current.startMusic();
  }, [screen, settings.music]);

  const toast = (msg, type = "warn") => {
    const id = rnd();
    setToasts((t) => [...t.slice(-2), { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2100);
  };

  /* ---- flying cards ---- */
  const rectOf = (el) => {
    const root = rootRef.current;
    if (!el || !root) return null;
    const r = el.getBoundingClientRect();
    const R = root.getBoundingClientRect();
    return { x: r.left - R.left + r.width / 2, y: r.top - R.top + r.height / 2, w: Math.min(r.width, 140) };
  };
  const fly = (card, from, to, opts = {}) =>
    new Promise((resolve) => {
      const a = from && from.x !== undefined ? from : rectOf(from);
      const b = to && to.x !== undefined ? to : rectOf(to);
      if (!a || !b) return resolve();
      const key = ++flyKey.current;
      flyResolvers.current[key] = resolve;
      setFlyers((fs) => [...fs, { key, card, from: a, to: b, ...opts }]);
      setTimeout(() => onFlyDone(key), (opts.duration || 550) + 600); // safety net
    });
  const onFlyDone = (key) => {
    setFlyers((fs) => fs.filter((f) => f.key !== key));
    const r = flyResolvers.current[key];
    delete flyResolvers.current[key];
    if (r) r();
  };
  const handTarget = () => {
    const hand = handRef.current;
    if (!hand) return null;
    const slots = hand.querySelectorAll("[data-card-id]");
    const hr = rectOf(hand);
    if (!slots.length) return hr;
    const last = rectOf(slots[slots.length - 1]);
    return { x: Math.min(last.x + last.w * 0.6, hr.x + hr.w / 2 - last.w / 2), y: last.y, w: last.w };
  };
  const seatEl = (i) => (i === 0 ? handRef.current : seatRefs.current[i]);
  const alive = (turnId, token) => gRef.current.status === "playing" && gRef.current.turnId === turnId && (token === undefined || gRef.current.token === token);
  const notifyTut = (ev) => {
    setTut((t) => (t.open && TUTORIAL[t.step].expect === ev ? (t.step + 1 >= TUTORIAL.length ? { open: false, step: 0 } : { ...t, step: t.step + 1 }) : t));
  };
  const showMeldFx = (text) => {
    const key = rnd();
    setMeldFx({ key, text });
    setTimeout(() => setMeldFx((m) => (m && m.key === key ? null : m)), 1300);
  };

  /* ================= ONLINE (WINNER 69) ================= */
  const apiRef = useRef(api);
  apiRef.current = api;
  const [net, setNet] = useState(null);         // last server snapshot
  const [rooms, setRooms] = useState(null);
  const [netBusy, setNetBusy] = useState(false);
  const [netError, setNetError] = useState("");
  const netPrev = useRef(null);
  const dealtGame = useRef("");
  const youRef = useRef(0);
  const absorbRef = useRef(null);
  /** server snapshot -> the `game` shape this component draws (me at index 0) */
  const fromServer = (v) => {
    const you = v.you;
    const n = v.seats.length;
    const rot = (i) => (i == null || i < 0 ? i : (i - you + n) % n);
    const back = (k) => ({ id: `x${k}`, rank: 1, suit: "S", hidden: true });
    const g0 = gRef.current;
    if (!v.game) {
      return { ...emptyGame(), status: "waiting", bet: v.room.bet, token: v.tableId,
        players: v.seats.map((_, k) => v.seats[(k + you) % n]).map((s, k) => ({ id: k, name: s.member ? `👤 ${s.name}` : s.name, avatar: s.avatar, isUser: k === 0, hand: [], meldPoints: 0 })) };
    }
    const sg = v.game;
    const players = sg.players.map((_, k) => sg.players[(k + you) % n]).map((p, k) => {
      const seat = v.seats[(k + you) % n] || {};
      let hand = p.hand ? p.hand.slice() : Array.from({ length: p.count }, (_, j) => back(`${k}-${j}`));
      if (k === 0 && p.hand && g0.players[0] && g0.players[0].hand.length) {
        // keep the member's own arrangement (sort / drag) and add new cards at the end
        const ids = new Set(p.hand.map((c) => c.id));
        const kept = g0.players[0].hand.filter((c) => ids.has(c.id) && !c.hidden);
        const keptIds = new Set(kept.map((c) => c.id));
        hand = [...kept, ...p.hand.filter((c) => !keptIds.has(c.id))];
      }
      return { id: k, name: k === 0 ? userName : seat.member ? `👤 ${p.name}` : p.name, avatar: k === 0 ? profile.avatar : p.avatar, isUser: k === 0, hand, meldPoints: p.meldPoints, auto: seat.auto };
    });
    let results = null, reward = 0;
    if (v.results) {
      const rows = v.results.rows.map((r) => ({ ...r, idx: rot(r.idx), isUser: rot(r.idx) === 0, name: rot(r.idx) === 0 ? userName : r.name }));
      results = { ...v.results, winner: rot(v.results.winner), rows };
      reward = rot(v.results.winner) === 0 ? v.results.pot : 0;
    }
    const status = v.status === "dealing" ? "dealing" : v.status === "playing" ? "playing" : v.status === "ended" ? "ended" : "waiting";
    return {
      ...emptyGame(), status, players, results, reward, bet: sg.bet, token: v.tableId,
      deck: Array.from({ length: sg.deckCount }, (_, j) => back(`d${j}`)),
      discard: sg.discard, melds: sg.melds.map((m) => ({ ...m, owner: rot(m.owner) })),
      current: rot(sg.current), phase: sg.phase, mustMeldId: sg.mustMeldId, lastDrawnId: sg.lastDrawnId, turnId: sg.turnId,
      lastEvent: sg.lastEvent ? { ...sg.lastEvent, who: rot(sg.lastEvent.who) } : null,
    };
  };
  const absorb = (v) => {
    setNet(v);
    if (!v || !v.seated) { netPrev.current = null; if (screen === "table") setScreen("lobby"); return; }
    youRef.current = v.you;
    const prev = netPrev.current;
    const g = fromServer(v);
    netPrev.current = g;
    commit(g);
    if (screen !== "table") setScreen("table");
    if (v.game && v.game.turnMsLeft) setTimeLeft(Math.ceil(v.game.turnMsLeft / 1000));
    animateChange(prev, g, v);
  };
  absorbRef.current = absorb;
  const animateChange = (prev, g, v) => {
    const key = `${v.tableId}-${v.game ? v.game.gameNo : 0}`;
    // a new game: deal animation
    if (g.status === "dealing" && (!prev || prev.status !== "dealing")) {
      if (dealtGame.current === key) return;
      dealtGame.current = key;
      const n = g.players.length, hs = g.players[0].hand.length;
      setDealt(Array(n).fill(0));
      sfx("card_shuffle");
      (async () => {
        await sleep(500);
        await nextFrame();
        let order = 0;
        const jobs = [];
        for (let k = 0; k < hs; k++) for (let p = 0; p < n; p++) {
          const card = g.players[p].hand[k];
          const delay = order++ * 80;
          jobs.push(sleep(delay).then(() => { sfx("card_deal"); return fly(card, deckRef.current, seatEl(p), { faceUp: false, duration: 420, rotate: randInt(-10, 10) }).then(() => setDealt((d) => { const c = d.slice(); c[p] = Math.min(hs, (c[p] || 0) + 1); return c; })); }));
        }
        await Promise.all(jobs);
        const head = g.discard[0];
        if (head) { discardRot.current[head.id] = randInt(-8, 8); sfx("card_draw"); }
      })();
      return;
    }
    if (!prev || prev.token !== g.token) return;
    if (g.status === "playing" && prev.status === "dealing") setDealt(g.players.map((p) => p.hand.length));
    if (g.status === "ended" && prev.status !== "ended") {
      const won = g.results && g.results.winner === 0;
      if (g.lastEvent && g.lastEvent.type === "knock") showMeldFx(g.lastEvent.who === 0 ? "น็อก!" : `${g.players[g.lastEvent.who].name} น็อก!`);
      if (won) { sfx("win"); setTimeout(() => sfx("coin"), 900); } else sfx("lose");
      setProfile((p) => ({ ...p, games: p.games + 1, wins: p.wins + (won ? 1 : 0), xp: p.xp + (won ? 45 : 12) }));
      return;
    }
    if (g.status !== "playing" && g.status !== "ended") return;
    const who = prev.current;
    const handCount = (x, i) => (x.players[i] ? x.players[i].hand.length : 0);
    // discard pile grew: someone threw a card
    if (g.discard.length > prev.discard.length) {
      const c = g.discard[g.discard.length - 1];
      if (discardRot.current[c.id] === undefined) discardRot.current[c.id] = randInt(-16, 16);
      if (who !== 0) fly(c, seatRefs.current[who], discardRef.current, { faceUp: true, flip: true, duration: 520, rotate: discardRot.current[c.id] });
      sfx("card_drop");
    } else if (g.discard.length < prev.discard.length) {
      const c = prev.discard[prev.discard.length - 1];
      if (g.current !== 0) { fly(c, discardRef.current, seatRefs.current[g.current], { faceUp: true, duration: 560 }); toast(`${g.players[g.current].name} เก็บ ${cardName(c)} จากกองทิ้ง`, "info"); }
      else fly(c, discardRef.current, handTarget(), { faceUp: true, duration: 560, glow: true });
      sfx("card_draw");
    }
    if (g.deck.length < prev.deck.length) {
      const i = g.current;
      if (i === 0) { const c = g.players[0].hand.find((x) => x.id === g.lastDrawnId); if (c) fly(c, deckRef.current, handTarget(), { faceUp: true, flip: true, duration: 640, glow: true }); }
      else fly(g.deck[0] || { id: "x", rank: 1, suit: "S" }, deckRef.current, seatRefs.current[i], { faceUp: false, duration: 540 });
      sfx("card_draw");
    }
    const meldCards = (x) => x.melds.reduce((a, m) => a + m.cards.length, 0);
    if (meldCards(g) > meldCards(prev)) {
      const e = g.lastEvent || {};
      sfx("meld_success");
      if (e.type === "meld") showMeldFx(e.who === 0 ? "ลงชุดสำเร็จ!" : `${g.players[e.who] ? g.players[e.who].name : ""} ลงชุด!`);
      else if (e.type === "layoff") showMeldFx(e.who === 0 ? "ฝากไพ่สำเร็จ!" : `${g.players[e.who] ? g.players[e.who].name : ""} ฝากไพ่`);
    }
    if (prev.current !== g.current) setThinking(false);
    void handCount;
  };
  const poll = async () => {
    try { const v = await apiRef.current.poll("/api/cards/dummy/state"); absorbRef.current(v); setNetError(""); }
    catch (e) { setNetError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กำลังลองใหม่…"); }
  };
  useEffect(() => {
    if (!online) return undefined;
    let stop = false, t = 0;
    const loop = async () => { if (stop) return; await poll(); if (!stop) t = setTimeout(loop, document.hidden ? 2500 : 650); };
    loop();
    return () => { stop = true; clearTimeout(t); };
  }, [online]); // eslint-disable-line react-hooks/exhaustive-deps
  const loadRooms = async () => { try { const r = await apiRef.current.poll("/api/cards/dummy/rooms"); setRooms(r.rooms || []); } catch (e) { setRooms([]); } };
  useEffect(() => {
    if (!online || screen !== "lobby") return undefined;
    loadRooms();
    const id = setInterval(loadRooms, 5000);
    return () => clearInterval(id);
  }, [online, screen]); // eslint-disable-line react-hooks/exhaustive-deps
  const joinRoom = async (room) => {
    setNetBusy(true); setNetError("");
    try { await apiRef.current.call("/api/cards/dummy/join", { room }); sfx("coin"); await poll(); }
    catch (e) { setNetError(e && e.message === "insufficient_balance" ? "เครดิตไม่พอสำหรับเดิมพันและค่าเข้าโต๊ะ" : "เข้าโต๊ะไม่สำเร็จ ลองใหม่อีกครั้ง"); }
    finally { setNetBusy(false); }
  };
  const leaveTable = async () => {
    setNetBusy(true);
    try { await apiRef.current.call("/api/cards/dummy/leave", {}); } catch (e) { /* not seated */ }
    finally { setNetBusy(false); }
    await poll();
  };
  const sendMove = async (m) => {
    try { const v = await apiRef.current.call("/api/cards/dummy/act", m); absorbRef.current(v); return true; }
    catch (e) {
      const MSG = { not_your_turn: "ยังไม่ถึงตาคุณ", already_drew: "จั่วแล้ว — ต้องทิ้งไพ่ก่อนจบเทิร์น", draw_first: "จั่วไพ่ก่อน", cannot_take: "เก็บไพ่ใบนี้ไม่ได้", bad_meld: "ลงชุดนี้ไม่ได้", bad_layoff: "ฝากไพ่ชุดนี้ไม่ได้", must_meld_taken: "ต้องนำไพ่ที่เก็บจากกองทิ้งไปลงชุดก่อน", cannot_knock: "ยังปิดเกมไม่ได้" };
      toast(MSG[e && e.message] || "ส่งไม่สำเร็จ ลองใหม่");
      poll();
      return false;
    }
  };

  /* ================= NEW GAME / DEAL ================= */
  const startNewGame = async () => {
    const bet = BET_OPTIONS[betIdx];
    if (coins < bet) {
      toast("เหรียญไม่พอสำหรับเดิมพันนี้ — ลดเดิมพันก่อน");
      return;
    }
    sfx("coin");
    setCoins((c) => c - bet);
    const n = settingsRef.current.players;
    const used = new Set([userName]);
    const players = [{ id: 0, name: userName, avatar: profile.avatar, isUser: true, hand: [], meldPoints: 0 }];
    for (let i = 1; i < n; i++) {
      const name = randomName(used);
      used.add(name);
      let av = randomAvatar();
      while (av.emoji === profile.avatar.emoji || players.some((pp) => pp.avatar.emoji === av.emoji)) av = randomAvatar();
      players.push({ id: i, name, avatar: av, isUser: false, hand: [], meldPoints: 0, personality: pick(PERSONALITIES) });
    }
    const deck = shuffleDeck(createDeck());
    const hs = HAND_SIZE[n];
    const hands = players.map(() => []);
    for (let k = 0; k < hs; k++) for (let p = 0; p < n; p++) hands[p].push(deck.pop());
    const head = deck.pop(); // ไพ่หัว — เปิดลงกองทิ้ง
    const token = rnd();
    discardRot.current = {};
    commit({ ...emptyGame(), status: "shuffling", players: players.map((p, i) => ({ ...p, hand: hands[i] })), deck, bet, token });
    setSelected([]);
    setPeekId(null);
    setHiddenIds([]);
    setDealt(Array(n).fill(0));
    setMenuOpen(false);
    setScreen("table");
    sfx("card_shuffle");
    await sleep(1500);
    if (gRef.current.token !== token) return;
    commit((g) => ({ ...g, status: "dealing" }));
    await nextFrame();
    const jobs = [];
    let order = 0;
    for (let k = 0; k < hs; k++)
      for (let p = 0; p < n; p++) {
        const card = hands[p][k];
        const delay = order++ * 80;
        jobs.push(
          sleep(delay).then(() => {
            if (gRef.current.token !== token) return null;
            sfx("card_deal");
            return fly(card, deckRef.current, seatEl(p), { faceUp: false, duration: 420, rotate: randInt(-10, 10) }).then(() =>
              setDealt((d) => {
                const c = d.slice();
                c[p] = Math.min(hs, (c[p] || 0) + 1);
                return c;
              })
            );
          })
        );
      }
    await Promise.all(jobs);
    if (gRef.current.token !== token) return;
    discardRot.current[head.id] = randInt(-8, 8);
    sfx("card_draw");
    await fly(head, deckRef.current, discardRef.current, { faceUp: true, flip: true, duration: 520 });
    if (gRef.current.token !== token) return;
    commit((g) => updPlayer({ ...g, discard: [head], status: "ready" }, 0, (pl) => ({ hand: sortCards(pl.hand, "suit") })));
    setSortMode("suit");
  };

  const beginPlay = () => {
    sfx("button_click");
    commit((g) => ({ ...g, status: "playing", current: 0, phase: "draw", turnId: g.turnId + 1 }));
    if (!profile.tutorialSeen) setTut({ open: true, step: 0 });
  };

  /* ================= TURN FLOW ================= */
  const nextTurn = () => {
    const g = gRef.current;
    if (g.status !== "playing") return;
    commit({ ...g, current: (g.current + 1) % g.players.length, phase: "draw", mustMeldId: null, lastDrawnId: null, turnId: g.turnId + 1 });
  };

  const endRound = (winnerIdx, knock) => {
    const g = gRef.current;
    if (g.status !== "playing") return;
    const results = computeResults(g.players, winnerIdx, knock);
    const userWon = g.players[results.winner].isUser;
    const reward = userWon ? g.bet * g.players.length : 0;
    commit({ ...g, status: "ended", results, reward });
    setSelected([]);
    setTut({ open: false, step: 0 });
    busyRef.current = false;
    setThinking(false);
    if (userWon) {
      sfx("win");
      setTimeout(() => sfx("coin"), 900);
      setCoins((c) => c + reward);
    } else sfx("lose");
    setProfile((p) => ({ ...p, games: p.games + 1, wins: p.wins + (userWon ? 1 : 0), xp: p.xp + (userWon ? 45 : 12) }));
  };

  const createMeld = (pIdx, cards, quiet) => {
    const g = gRef.current;
    const ids = new Set(cards.map((c) => c.id));
    const meld = { id: `m${g.turnId}-${rnd().toString(36).slice(2, 8)}`, owner: pIdx, cards: orderMeld(cards), type: meldType(cards), fresh: true };
    commit(
      updPlayer({ ...g, melds: [...g.melds.map((m) => ({ ...m, fresh: false })), meld], mustMeldId: ids.has(g.mustMeldId) ? null : g.mustMeldId }, pIdx, (p) => ({
        hand: p.hand.filter((c) => !ids.has(c.id)),
        meldPoints: p.meldPoints + sumPoints(cards),
      }))
    );
    if (!quiet) {
      sfx("meld_success");
      showMeldFx(pIdx === 0 ? "ลงชุดสำเร็จ!" : `${g.players[pIdx].name} ลงชุด!`);
    }
  };
  const layoff = (pIdx, cards, meldId, quiet) => {
    const g = gRef.current;
    const ids = new Set(cards.map((c) => c.id));
    commit(
      updPlayer(
        {
          ...g,
          melds: g.melds.map((m) => (m.id === meldId ? { ...m, cards: orderMeld([...m.cards, ...cards]), fresh: true } : { ...m, fresh: false })),
          mustMeldId: ids.has(g.mustMeldId) ? null : g.mustMeldId,
        },
        pIdx,
        (p) => ({ hand: p.hand.filter((c) => !ids.has(c.id)), meldPoints: p.meldPoints + sumPoints(cards) })
      )
    );
    if (!quiet) {
      sfx("meld_success");
      showMeldFx(pIdx === 0 ? "ฝากไพ่สำเร็จ!" : `${g.players[pIdx].name} ฝากไพ่`);
    }
  };

  const executeKnock = async (pIdx, plan) => {
    const token = gRef.current.token;
    plan.melds.forEach((m) => createMeld(pIdx, m, true));
    const idMap = {};
    gRef.current.melds.forEach((m) => {
      plan.melds.forEach((pm, i) => {
        if (pm.every((c) => m.cards.some((x) => x.id === c.id))) idMap[`new${i}`] = m.id;
      });
    });
    plan.layoffs.forEach((l) => layoff(pIdx, [l.card], idMap[l.meldId] || l.meldId, true));
    sfx("meld_success");
    showMeldFx(pIdx === 0 ? "น็อก!" : `${gRef.current.players[pIdx].name} น็อก!`);
    await sleep(500);
    if (gRef.current.token !== token) return;
    if (plan.discard) {
      const c = plan.discard;
      commit((g) => updPlayer(g, pIdx, (p) => ({ hand: p.hand.filter((x) => x.id !== c.id) })));
      discardRot.current[c.id] = randInt(-14, 14);
      await fly(c, pIdx === 0 ? handTarget() : seatRefs.current[pIdx], discardRef.current, { faceUp: true, duration: 480, rotate: discardRot.current[c.id] });
      sfx("card_drop");
      commit((g) => ({ ...g, discard: [...g.discard, c] }));
    }
    await sleep(350);
    endRound(pIdx, true);
  };

  /* ================= USER ACTIONS ================= */
  const guardUser = (needPhase) => {
    const g = gRef.current;
    if (g.status === "ready") {
      toast("กด เริ่มเกม เพื่อเริ่มเล่น");
      return false;
    }
    if (g.status !== "playing" || busyRef.current) return false;
    if (g.current !== 0) {
      toast(`ยังไม่ถึงตาคุณ — กำลังเล่น: ${g.players[g.current].name}`);
      return false;
    }
    if (needPhase === "draw" && g.phase !== "draw") {
      toast("จั่วแล้ว — ต้องทิ้งไพ่ก่อนจบเทิร์น");
      return false;
    }
    if (needPhase === "play" && g.phase !== "play") {
      toast("ถึงตาคุณแล้ว — จั่วไพ่ก่อน");
      return false;
    }
    return true;
  };

  const userDraw = async () => {
    if (!guardUser("draw")) return;
    if (online) { if (await sendMove({ type: "draw" })) notifyTut("draw"); return; }
    const g = gRef.current;
    if (!g.deck.length) {
      endRound(null, false);
      return;
    }
    busyRef.current = true;
    const card = g.deck[g.deck.length - 1];
    commit({ ...g, deck: g.deck.slice(0, -1) });
    sfx("card_draw");
    await fly(card, deckRef.current, handTarget(), { faceUp: true, flip: true, duration: 640, glow: true });
    busyRef.current = false;
    if (gRef.current.turnId !== g.turnId || gRef.current.status !== "playing") return;
    commit((s) => updPlayer({ ...s, phase: "play", lastDrawnId: card.id }, 0, (p) => ({ hand: [...p.hand, card] })));
    notifyTut("draw");
  };

  const takeDiscard = async () => {
    const g = gRef.current;
    if (g.status === "playing" && g.current === 0 && g.phase === "play") {
      if (selected.length === 1) userDiscard(selected[0]);
      else toast(selected.length ? "ทิ้งได้ทีละ 1 ใบ" : "เลือกไพ่ 1 ใบเพื่อทิ้ง");
      return;
    }
    if (!guardUser("draw")) return;
    const top = g.discard[g.discard.length - 1];
    if (!top) return;
    if (!canUseCard(top, g.players[0].hand, g.melds)) {
      toast(`เก็บ ${cardName(top)} ไม่ได้ — ต้องนำไปลงชุดได้ทันที`);
      return;
    }
    if (online) {
      if (await sendMove({ type: "take" })) { setSelected([top.id]); toast(`เก็บ ${cardName(top)} แล้ว — ต้องนำไปลงชุดในเทิร์นนี้`, "info"); notifyTut("draw"); }
      return;
    }
    busyRef.current = true;
    commit({ ...g, discard: g.discard.slice(0, -1) });
    sfx("card_draw");
    await fly(top, discardRef.current, handTarget(), { faceUp: true, duration: 560, glow: true });
    busyRef.current = false;
    if (gRef.current.turnId !== g.turnId || gRef.current.status !== "playing") return;
    commit((s) => updPlayer({ ...s, phase: "play", mustMeldId: top.id, lastDrawnId: top.id }, 0, (p) => ({ hand: [...p.hand, top] })));
    setSelected([top.id]);
    toast(`เก็บ ${cardName(top)} แล้ว — ต้องนำไปลงชุดในเทิร์นนี้`, "info");
    notifyTut("draw");
  };

  const userMeld = async () => {
    if (!guardUser("play")) return;
    const g = gRef.current;
    if (!selected.length) {
      toast("เลือกไพ่ก่อน");
      return;
    }
    const cards = selected.map((id) => g.players[0].hand.find((c) => c.id === id)).filter(Boolean);
    if (online) {
      const target = !meldType(cards) && g.melds.find((m) => meldType([...m.cards, ...cards]));
      if (!meldType(cards) && !target) { toast(cards.length < 3 ? "ยังสร้างชุดนี้ไม่ได้ — ต้องมี 3 ใบขึ้นไป หรือแตะชุดบนโต๊ะเพื่อฝาก" : "ยังสร้างชุดนี้ไม่ได้ — ต้องเป็นตอง หรือเรียงดอกเดียวกัน"); return; }
      if (await sendMove(target ? { type: "layoff", ids: cards.map((c) => c.id), meldId: target.id } : { type: "meld", ids: cards.map((c) => c.id) })) { setSelected([]); notifyTut("meld"); }
      return;
    }
    if (meldType(cards)) {
      createMeld(0, cards);
      setSelected([]);
      notifyTut("meld");
      afterUserMeld();
      return;
    }
    const target = g.melds.find((m) => meldType([...m.cards, ...cards]));
    if (target) {
      layoff(0, cards, target.id);
      setSelected([]);
      notifyTut("meld");
      afterUserMeld();
      return;
    }
    toast(cards.length < 3 ? "ยังสร้างชุดนี้ไม่ได้ — ต้องมี 3 ใบขึ้นไป หรือแตะชุดบนโต๊ะเพื่อฝาก" : "ยังสร้างชุดนี้ไม่ได้ — ต้องเป็นตอง หรือเรียงดอกเดียวกัน");
  };
  const userLayoffTo = async (meldId, ids) => {
    if (!guardUser("play")) return;
    const g = gRef.current;
    const use = ids || selected;
    if (!use.length) {
      toast("เลือกไพ่ที่จะฝากก่อน แล้วแตะชุดบนโต๊ะ", "info");
      return;
    }
    const cards = use.map((id) => g.players[0].hand.find((c) => c.id === id)).filter(Boolean);
    const m = g.melds.find((x) => x.id === meldId);
    if (!m || !meldType([...m.cards, ...cards])) {
      toast("ฝากไพ่ชุดนี้ไม่ได้");
      return;
    }
    if (online) { if (await sendMove({ type: "layoff", ids: cards.map((c) => c.id), meldId })) { setSelected([]); notifyTut("meld"); } return; }
    layoff(0, cards, meldId);
    setSelected([]);
    notifyTut("meld");
    afterUserMeld();
  };
  const afterUserMeld = () => {
    const g = gRef.current;
    if (g.players[0].hand.length === 0) setTimeout(() => endRound(0, true), 500);
  };

  const userDiscard = async (cardId) => {
    if (!guardUser("play")) return;
    const g = gRef.current;
    const id = cardId || (selected.length === 1 ? selected[0] : null);
    if (!id) {
      toast(selected.length > 1 ? "ทิ้งได้ทีละ 1 ใบ" : "เลือกไพ่ก่อน");
      return;
    }
    if (g.mustMeldId) {
      toast("ต้องนำไพ่ที่เก็บจากกองทิ้งไปลงชุดก่อน");
      return;
    }
    const card = g.players[0].hand.find((c) => c.id === id);
    if (!card) return;
    if (online) {
      const el = rootRef.current && rootRef.current.querySelector(`[data-card-id="${id}"]`);
      const from = rectOf(el) || handTarget();
      discardRot.current[id] = randInt(-16, 16);
      fly(card, from, discardRef.current, { faceUp: true, duration: 470, rotate: discardRot.current[id] });
      if (await sendMove({ type: "discard", id })) { setSelected([]); setPeekId(null); notifyTut("discard"); }
      return;
    }
    busyRef.current = true;
    const el = rootRef.current && rootRef.current.querySelector(`[data-card-id="${id}"]`);
    const from = rectOf(el) || handTarget();
    setHiddenIds((h) => [...h, id]);
    discardRot.current[id] = randInt(-16, 16);
    await fly(card, from, discardRef.current, { faceUp: true, duration: 470, rotate: discardRot.current[id] });
    sfx("card_drop");
    setHiddenIds((h) => h.filter((x) => x !== id));
    busyRef.current = false;
    if (gRef.current.turnId !== g.turnId || gRef.current.status !== "playing") return;
    const s = commit((st) => updPlayer({ ...st, discard: [...st.discard, card] }, 0, (p) => ({ hand: p.hand.filter((c) => c.id !== id) })));
    setSelected([]);
    setPeekId(null);
    notifyTut("discard");
    if (s.players[0].hand.length === 0) endRound(0, true);
    else nextTurn();
  };

  const userKnock = async () => {
    if (!guardUser("play")) return;
    const g = gRef.current;
    const plan = knockPlan(g.players[0].hand, g.melds, g.mustMeldId);
    if (!plan) {
      toast("ยังปิดเกมไม่ได้");
      return;
    }
    if (online) { setSelected([]); await sendMove({ type: "knock" }); return; }
    busyRef.current = true;
    setSelected([]);
    await executeKnock(0, plan);
    busyRef.current = false;
  };

  const tapCard = (id) => {
    const st = gRef.current.status;
    if (st !== "playing" && st !== "ready") return;
    sfx("card_select");
    if (TAP_TO_PEEK && !selected.includes(id) && peekId !== id) {
      setPeekId(id);
      return;
    }
    setPeekId(null);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    notifyTut("select");
  };

  const dropCard = (id, { zone, meldId, overCard }) => {
    if (zone === "discard") {
      userDiscard(id);
      return;
    }
    if (meldId) {
      userLayoffTo(meldId, [id]);
      return;
    }
    if (overCard && overCard !== id) {
      commit((g) =>
        updPlayer(g, 0, (p) => {
          const hand = p.hand.slice();
          const from = hand.findIndex((c) => c.id === id);
          const [c] = hand.splice(from, 1);
          const to = hand.findIndex((x) => x.id === overCard);
          hand.splice(from <= to ? to + 1 : to, 0, c);
          return { hand };
        })
      );
      sfx("card_select");
    }
  };

  const userSort = () => {
    const g = gRef.current;
    if (!g.players.length || !["ready", "playing"].includes(g.status)) return;
    const mode = sortMode === "suit" ? "rank" : "suit";
    setSortMode(mode);
    sfx("card_shuffle");
    commit(updPlayer(g, 0, (p) => ({ hand: sortCards(p.hand, mode) })));
    toast(mode === "suit" ? "เรียงตามดอก → แต้ม" : "เรียงตามแต้ม → ดอก", "info");
  };

  const autoPlayUser = async () => {
    const g = gRef.current;
    if (g.status !== "playing" || g.current !== 0) return;
    toast("หมดเวลา! ระบบเล่นแทนอัตโนมัติ", "info");
    if (busyRef.current) await sleep(700);
    if (gRef.current.phase === "draw") await userDraw();
    const s = gRef.current;
    if (s.status !== "playing" || s.current !== 0) return;
    if (s.mustMeldId) {
      const hand = s.players[0].hand;
      const c = hand.find((x) => x.id === s.mustMeldId);
      const m = candidateMelds(hand).filter((mm) => mm.includes(c)).sort((a, b) => b.length - a.length)[0];
      if (m) createMeld(0, m);
      else {
        const t = s.melds.find((mm) => meldType([...mm.cards, c]));
        if (t) layoff(0, [c], t.id);
      }
    }
    const s2 = gRef.current;
    if (!s2.players[0].hand.length) {
      endRound(0, true);
      return;
    }
    const card = chooseDiscard(s2.players[0].hand, "normal", { discard: s2.discard, melds: s2.melds, mustMeldId: s2.mustMeldId });
    await userDiscard(card.id);
  };

  /* ================= AI (AIPlayer) ================= */
  const runAI = async (turnId) => {
    const g0 = gRef.current;
    const pi = g0.current;
    const me = g0.players[pi];
    const token = g0.token;
    const diff = settingsRef.current.difficulty;
    const tempo = me.personality === "aggressive" ? 0.85 : me.personality === "cautious" ? 1.15 : 1;
    setThinking(true);
    await sleep(randInt(800, 1500) * tempo);
    if (!alive(turnId, token)) return;
    let g = gRef.current;
    if (!g.deck.length) {
      setThinking(false);
      endRound(null, false);
      return;
    }
    // ---- draw or take ----
    const top = g.discard[g.discard.length - 1];
    const takeChance = diff === "easy" ? 0.35 : me.personality === "cautious" ? 0.8 : 1;
    let took = null;
    if (top && canUseCard(top, me.hand, g.melds) && rnd() < takeChance) {
      commit({ ...g, discard: g.discard.slice(0, -1) });
      sfx("card_draw");
      await fly(top, discardRef.current, seatRefs.current[pi], { faceUp: true, duration: 560 });
      if (!alive(turnId, token)) return;
      commit((s) => updPlayer({ ...s, phase: "play" }, pi, (p) => ({ hand: [...p.hand, top] })));
      took = top;
      toast(`${me.name} เก็บ ${cardName(top)} จากกองทิ้ง`, "info");
    } else {
      const card = g.deck[g.deck.length - 1];
      commit({ ...g, deck: g.deck.slice(0, -1) });
      sfx("card_draw");
      await fly(card, deckRef.current, seatRefs.current[pi], { faceUp: false, duration: 540 });
      if (!alive(turnId, token)) return;
      commit((s) => updPlayer({ ...s, phase: "play" }, pi, (p) => ({ hand: [...p.hand, card] })));
    }
    await sleep(randInt(450, 800) * tempo);
    if (!alive(turnId, token)) return;

    // ---- must meld the taken card ----
    if (took) {
      const hand = gRef.current.players[pi].hand;
      const m = candidateMelds(hand).filter((mm) => mm.includes(took)).sort((a, b) => b.length - a.length)[0];
      if (m) createMeld(pi, m);
      else {
        const t = gRef.current.melds.find((mm) => meldType([...mm.cards, took]));
        if (t) layoff(pi, [took], t.id);
      }
      await sleep(650);
      if (!alive(turnId, token)) return;
    }

    // ---- knock? ----
    g = gRef.current;
    const plan = knockPlan(g.players[pi].hand, g.melds, null);
    if (plan && (diff !== "easy" || rnd() < 0.7)) {
      setThinking(false);
      await executeKnock(pi, plan);
      return;
    }

    // ---- meld ----
    const part = bestPartition(g.players[pi].hand);
    for (const m of part.melds) {
      if (diff === "easy" && rnd() < 0.4) continue;
      if (gRef.current.players[pi].hand.length - m.length < 1 && !plan) continue; // keep one to discard
      createMeld(pi, m);
      await sleep(600);
      if (!alive(turnId, token)) return;
    }

    // ---- lay off ----
    if (diff !== "easy") {
      let guard = 0;
      while (guard++ < 6) {
        const s = gRef.current;
        const hand = s.players[pi].hand;
        if (hand.length <= 1) break;
        let found = null;
        for (const c of hand) {
          const t = s.melds.find((mm) => meldType([...mm.cards, c]));
          if (t) {
            found = { c, t };
            break;
          }
        }
        if (!found) break;
        layoff(pi, [found.c], found.t.id);
        await sleep(500);
        if (!alive(turnId, token)) return;
      }
    }

    // ---- discard ----
    g = gRef.current;
    if (!g.players[pi].hand.length) {
      setThinking(false);
      endRound(pi, true);
      return;
    }
    const card = chooseDiscard(g.players[pi].hand, diff, { discard: g.discard, melds: g.melds, mustMeldId: g.mustMeldId });
    await sleep(randInt(300, 600));
    if (!alive(turnId, token)) return;
    commit((s) => updPlayer(s, pi, (p) => ({ hand: p.hand.filter((c) => c.id !== card.id) })));
    discardRot.current[card.id] = randInt(-16, 16);
    await fly(card, seatRefs.current[pi], discardRef.current, { faceUp: true, flip: true, duration: 520, rotate: discardRot.current[card.id] });
    sfx("card_drop");
    if (!alive(turnId, token)) return;
    const s = commit((st) => ({ ...st, discard: [...st.discard, card] }));
    setThinking(false);
    if (!s.players[pi].hand.length) endRound(pi, true);
    else nextTurn();
  };

  const actions = useRef({});
  actions.current = { runAI, endRound, autoPlayUser };

  // AI / turn trigger
  useEffect(() => {
    const g = gRef.current;
    if (g.status !== "playing" || online) return;
    if (g.phase === "draw" && g.deck.length === 0) {
      actions.current.endRound(null, false);
      return;
    }
    if (g.current !== 0 && !online) actions.current.runAI(g.turnId);
  }, [game.turnId, game.status]);

  // Timer
  const paused = online ? false : tut.open || menuOpen || settingsOpen;
  useEffect(() => { if (!online) setTimeLeft(TURN_SECONDS); }, [game.turnId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (game.status !== "playing" || paused) return undefined;
    const iv = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(iv);
  }, [game.status, game.turnId, paused]);
  useEffect(() => {
    const g = gRef.current;
    if (!online && timeLeft === 0 && g.status === "playing" && g.current === 0 && timeoutTurn.current !== g.turnId) {
      timeoutTurn.current = g.turnId;
      actions.current.autoPlayUser();
    }
  }, [timeLeft]);

  /* ================= DERIVED ================= */
  const me = game.players[0];
  const myTurn = game.status === "playing" && game.current === 0;
  const myHand = me ? (game.status === "dealing" || game.status === "shuffling" ? me.hand.slice(0, dealt[0] || 0) : me.hand) : [];
  const plan = useMemo(
    () => (myTurn && game.phase === "play" && me ? knockPlan(me.hand, game.melds, game.mustMeldId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [myTurn, game.phase, me && me.hand, game.melds, game.mustMeldId]
  );
  const validSelection = useMemo(() => {
    if (!me || selected.length < 3) return false;
    const cards = selected.map((id) => me.hand.find((c) => c.id === id)).filter(Boolean);
    return !!meldType(cards);
  }, [selected, me]);
  const seats = (game.players.length && SEAT_POS[game.players.length]) || [];
  const seatFor = (pos) => {
    const i = seats.indexOf(pos);
    return i === -1 ? null : i + 1;
  };
  const renderSeat = (pos) => {
    const idx = seatFor(pos);
    if (idx == null || !game.players[idx]) return null;
    const p = game.players[idx];
    const count = game.status === "shuffling" || game.status === "dealing" ? dealt[idx] || 0 : p.hand.length;
    const active = game.status === "playing" && game.current === idx;
    return (
      <OpponentSeat
        player={p}
        count={count}
        active={active}
        thinking={active && thinking}
        timeLeft={timeLeft}
        pos={pos}
        seatRef={(el) => {
          seatRefs.current[idx] = el;
        }}
      />
    );
  };
  const topDiscards = game.discard.slice(-3);
  const discardTop = game.discard[game.discard.length - 1];
  const canTake = myTurn && game.phase === "draw" && discardTop && me && canUseCard(discardTop, me.hand, game.melds);
  const click = (fn) => () => {
    sfx("button_click");
    fn();
  };
  const goBack = () => {
    soundRef.current.stopMusic();
    if (online && net && net.seated) leaveTable();
    if (onExit) onExit();
    else setScreen("lobby");
  };

  /* ================= RENDER ================= */
  return (
    <div ref={rootRef} className={`dummy-game ${className}`} style={{ "--dg-h": height }}>
      {/* TOP BAR */}
      <header className="dummy-top">
        <button type="button" className="dummy-top__btn" onClick={click(() => (screen === "table" && game.status !== "ended" ? setMenuOpen(true) : goBack()))} aria-label="กลับ">
          ←<span className="dummy-hide-xs"> กลับ</span>
        </button>
        <div className="dummy-top__title">ดัมมี่</div>
        <div className="dummy-top__right">
          <div className="dummy-coin-pill" key={online ? wallet : coins}>
            <span>🪙</span>
            {(online ? wallet : coins).toLocaleString()}
          </div>
          <button type="button" className="dummy-top__btn dummy-top__btn--icon" onClick={click(() => setSettingsOpen(true))} aria-label="ตั้งค่า">
            ⚙
          </button>
        </div>
      </header>

      {/* LOADING */}
      {screen === "loading" && (
        <div className="dummy-loading">
          <div className="dummy-shuffle">
            {[0, 1, 2, 3, 4].map((i) => (
              <PlayingCard key={i} faceDown style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
          <div className="dummy-logo">ดัมมี่</div>
          <div className="dummy-loading__text">กำลังเตรียมโต๊ะ...</div>
        </div>
      )}

      {/* LOBBY (online rooms) */}
      {screen === "lobby" && online && (
        <div className="dummy-lobby">
          <div className="dummy-lobby__hero">
            <div className="dummy-logo">ดัมมี่</div>
            <p className="dummy-lobby__tag">เล่นออนไลน์กับผู้เล่นจริง 4 คนต่อโต๊ะ · ที่ว่างมีบอทเข้าแทน</p>
          </div>
          <div className="dummy-rooms">
            {(rooms || []).map((r) => (
              <button key={r.id} type="button" className="dummy-room" disabled={netBusy || wallet < r.bet + r.fee} onClick={click(() => joinRoom(r.id))}>
                <b>ห้อง{r.name} <em>Lv.{r.level}</em></b>
                <span>เดิมพัน 🪙 {r.bet.toLocaleString()} · ชนะรับ {r.pot.toLocaleString()}</span>
                <span>ค่าเข้าโต๊ะ {r.fee.toLocaleString()} ต่อเกม · กำลังเล่น {r.players} คน</span>
              </button>
            ))}
            {!rooms && <p className="dummy-lobby__note">กำลังโหลดห้อง…</p>}
          </div>
          {netError && <p className="dummy-lobby__note" style={{ color: "#ff8a80" }}>{netError}</p>}
          <p className="dummy-lobby__note">หักเดิมพัน + ค่าเข้าโต๊ะจากกระเป๋าเมื่อเกมเริ่ม · ผู้ชนะได้กองกลางทั้งหมด · ออกกลางเกมจะเสียเดิมพันตานั้น</p>
        </div>
      )}

      {/* LOBBY */}
      {screen === "lobby" && !online && (
        <div className="dummy-lobby">
          <div className="dummy-lobby__hero">
            <div className="dummy-lobby__fan" aria-hidden="true">
              {[
                { id: "1S", rank: 1, suit: "S" },
                { id: "13H", rank: 13, suit: "H" },
                { id: "12S", rank: 12, suit: "S" },
                { id: "2C", rank: 2, suit: "C" },
              ].map((c, i) => (
                <PlayingCard key={c.id} card={c} style={{ transform: `rotate(${(i - 1.5) * 12}deg) translateY(${Math.abs(i - 1.5) * 6}px)` }} />
              ))}
            </div>
            <div className="dummy-logo">ดัมมี่</div>
            <p className="dummy-lobby__tag">ลงชุดให้หมดมือ แล้วปิดเกมก่อนใคร</p>
          </div>

          <div className="dummy-profile">
            <Avatar avatar={profile.avatar} size={56} active />
            <div className="dummy-profile__info">
              {editingName ? (
                <input
                  className="dummy-input"
                  autoFocus
                  maxLength={16}
                  defaultValue={userName}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    setProfile((p) => ({ ...p, customName: v || null }));
                    setEditingName(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                />
              ) : (
                <button type="button" className="dummy-profile__name" onClick={() => setEditingName(true)}>
                  {userName} <small>✎</small>
                </button>
              )}
              <div className="dummy-profile__meta">
                <span className="dummy-lv">LV.{level}</span>
                <span>🪙 {coins.toLocaleString()}</span>
                <span>🏆 {profile.wins}</span>
              </div>
            </div>
            <button type="button" className="dummy-profile__reroll" onClick={click(() => setProfile((p) => ({ ...p, avatar: randomAvatar() })))} aria-label="สุ่ม Avatar">
              🎲
            </button>
          </div>

          <div className="dummy-field">
            <div className="dummy-field__label">เดิมพัน (เหรียญจำลอง)</div>
            <div className="dummy-bet">
              <button type="button" className="dummy-bet__btn" onClick={click(() => setBetIdx((i) => Math.max(0, i - 1)))} disabled={betIdx === 0}>
                −
              </button>
              <div className="dummy-bet__val" key={betIdx}>
                🪙 {BET_OPTIONS[betIdx].toLocaleString()}
              </div>
              <button type="button" className="dummy-bet__btn" onClick={click(() => setBetIdx((i) => Math.min(BET_OPTIONS.length - 1, i + 1)))} disabled={betIdx === BET_OPTIONS.length - 1}>
                +
              </button>
            </div>
          </div>
          <div className="dummy-field-row">
            <div className="dummy-field">
              <div className="dummy-field__label">ผู้เล่น</div>
              <div className="dummy-seg">
                {[2, 3, 4].map((n) => (
                  <button key={n} type="button" className={settings.players === n ? "is-on" : ""} onClick={click(() => setSettings((s) => ({ ...s, players: n })))}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="dummy-field">
              <div className="dummy-field__label">LV</div>
              <div className="dummy-seg">
                {["easy", "normal", "hard"].map((d) => (
                  <button key={d} type="button" className={settings.difficulty === d ? "is-on" : ""} onClick={click(() => setSettings((s) => ({ ...s, difficulty: d })))}>
                    {DIFF_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button type="button" className="dummy-btn dummy-btn--gold dummy-btn--xl" onClick={startNewGame}>
            เล่นเลย
          </button>
          <p className="dummy-lobby__note">ชนะได้รับ {(BET_OPTIONS[betIdx] * settings.players).toLocaleString()} เหรียญ · ใช้เหรียญจำลองเท่านั้น ไม่มีเงินจริง</p>
        </div>
      )}

      {/* TABLE */}
      {screen === "table" && (
        <div className="dummy-table">
          <div className="dummy-seats-top">{renderSeat("top")}</div>

          <div className="dummy-felt">
            <div className="dummy-felt__row">
              <div className="dummy-felt__side">{renderSeat("left")}</div>
              <div className="dummy-felt__center">
                <div className={`dummy-turn ${myTurn ? "is-mine" : ""}`} data-tut="turn">
                  {game.status === "playing" ? (
                    <>
                      <TurnTimer timeLeft={timeLeft} size={34} />
                      <span>{myTurn ? (game.phase === "draw" ? "🟢 ตาคุณ · จั่วไพ่" : "🟢 ตาคุณ · ทิ้งไพ่เพื่อจบเทิร์น") : `กำลังเล่น: ${game.players[game.current].name}`}</span>
                    </>
                  ) : (
                    <span>{game.status === "waiting" ? `รอผู้เล่น… เริ่มใน ${Math.ceil(((net && net.msLeft) || 0) / 1000)} วินาที (ไม่ครบมีบอทแทน)` : game.status === "shuffling" ? "กำลังสับไพ่..." : game.status === "dealing" ? "กำลังแจกไพ่..." : game.status === "ready" ? "พร้อมแล้ว!" : "จบรอบ"}</span>
                  )}
                </div>
                <div className="dummy-piles">
                  <button
                    type="button"
                    ref={deckRef}
                    className={`dummy-deck ${myTurn && game.phase === "draw" ? "is-ready" : ""} ${game.status === "shuffling" ? "is-shuffling" : ""}`}
                    onClick={userDraw}
                    aria-label="จั่วไพ่"
                  >
                    {game.status === "shuffling" ? (
                      <div className="dummy-shuffle dummy-shuffle--sm">
                        {[0, 1, 2, 3].map((i) => (
                          <PlayingCard key={i} faceDown style={{ animationDelay: `${i * 0.1}s` }} />
                        ))}
                      </div>
                    ) : game.deck.length ? (
                      <>
                        {[2, 1, 0].map((i) => (
                          <PlayingCard key={i} faceDown className="dummy-deck__layer" style={{ transform: `translate(${-i * 1.5}px, ${-i * 1.5}px)` }} />
                        ))}
                        <span className="dummy-deck__count">{game.deck.length}</span>
                      </>
                    ) : (
                      <div className="dummy-pile-empty">หมดกอง</div>
                    )}
                    <span className="dummy-pile-label">กองจั่ว</span>
                  </button>
                  <button
                    type="button"
                    ref={discardRef}
                    data-drop="discard"
                    className={`dummy-discard ${canTake ? "is-takeable" : ""} ${myTurn && game.phase === "play" ? "is-target" : ""}`}
                    onClick={takeDiscard}
                    aria-label="กองทิ้ง"
                  >
                    {topDiscards.length ? (
                      topDiscards.map((c, i) => <PlayingCard key={c.id} card={c} className="dummy-discard__card" style={{ transform: `rotate(${discardRot.current[c.id] || 0}deg)`, zIndex: i }} />)
                    ) : (
                      <div className="dummy-pile-empty">ทิ้งที่นี่</div>
                    )}
                    <span className="dummy-pile-label">กองทิ้ง</span>
                  </button>
                </div>
              </div>
              <div className="dummy-felt__side">{renderSeat("right")}</div>
            </div>

            <MeldArea melds={game.melds} players={game.players} armed={myTurn && game.phase === "play" && selected.length > 0} onMeldTap={(id) => userLayoffTo(id)} />

            {meldFx && (
              <div className="dummy-meldfx" key={meldFx.key}>
                <Particles count={20} gold={false} />
                <span>{meldFx.text}</span>
              </div>
            )}

            {game.status === "ready" && (
              <div className="dummy-ready">
                <button type="button" className="dummy-btn dummy-btn--gold dummy-btn--xl dummy-pulse" onClick={beginPlay}>
                  เริ่มเกม
                </button>
              </div>
            )}
          </div>

          {/* user bar */}
          <div className="dummy-userbar">
            <div className="dummy-userbar__me">
              <Avatar avatar={profile.avatar} size={40} active={myTurn} />
              <div>
                <div className="dummy-userbar__name">
                  {userName} <span className="dummy-lv">LV.{level}</span>
                </div>
                <div className="dummy-userbar__meta">
                  ไพ่ {myHand.length} ใบ · แต้มชุด {me ? me.meldPoints : 0} · เดิมพัน {game.bet}
                </div>
              </div>
            </div>
            {plan && (
              <button type="button" className="dummy-knock" onClick={userKnock}>
                👑 น็อก
              </button>
            )}
            {!plan && validSelection && myTurn && game.phase === "play" && <span className="dummy-hint">ชุดนี้ลงได้ กด “ลงชุด”</span>}
          </div>

          <PlayerHand
            cards={myHand}
            selected={selected}
            peekId={peekId}
            newId={game.lastDrawnId}
            hiddenIds={hiddenIds}
            disabled={!["playing", "ready"].includes(game.status)}
            onTap={tapCard}
            onDrop={dropCard}
            handRef={handRef}
          />

          <GameControls
            phase={game.phase}
            myTurn={myTurn}
            selectedCount={selected.length}
            sortMode={sortMode}
            disabled={!["playing", "ready"].includes(game.status)}
            onDraw={click(userDraw)}
            onSort={userSort}
            onMeld={click(userMeld)}
            onDiscard={click(() => userDiscard())}
            onMenu={click(() => setMenuOpen(true))}
          />
        </div>
      )}

      {/* flying cards layer */}
      <div className="dummy-fly-layer" aria-hidden="true">
        {flyers.map((f) => (
          <FlyingCard key={f.key} f={f} onDone={onFlyDone} />
        ))}
      </div>

      {/* toasts */}
      <div className="dummy-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`dummy-toast dummy-toast--${t.type}`}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* tutorial */}
      {tut.open && screen === "table" && (
        <Tutorial
          step={tut.step}
          rootRef={rootRef}
          onNext={() => {
            sfx("button_click");
            setTut((t) => {
              if (t.step + 1 >= TUTORIAL.length) {
                setProfile((p) => ({ ...p, tutorialSeen: true }));
                return { open: false, step: 0 };
              }
              return { ...t, step: t.step + 1 };
            });
          }}
          onSkip={() => {
            sfx("button_click");
            setTut({ open: false, step: 0 });
            setProfile((p) => ({ ...p, tutorialSeen: true }));
          }}
        />
      )}

      {/* end screen */}
      {screen === "table" && game.status === "ended" && game.results && (
        online ? (
          <EndScreen results={game.results} reward={game.reward} bet={game.bet}
            onPlayAgain={click(() => (net && net.seats[net.you] && net.seats[net.you].ready ? null : sendMove({ type: "ready" })))}
            onBack={click(goBack)}
            againLabel={net && net.seats[net.you] && net.seats[net.you].ready ? "รอผู้เล่นอื่น…" : `เล่นต่อ (เดิมพัน ${game.bet.toLocaleString()})`}
            backLabel="ลุกจากโต๊ะ"
            note={`ไม่กด “เล่นต่อ” ภายใน ${Math.ceil(((net && net.msLeft) || 0) / 1000)} วินาที จะลุกจากโต๊ะอัตโนมัติ`} />
        ) : (
          <EndScreen results={game.results} reward={game.reward} bet={game.bet} onPlayAgain={click(startNewGame)} onBack={click(goBack)} />
        )
      )}

      {/* menu */}
      {menuOpen && (
        <div className="dummy-modal" onClick={() => setMenuOpen(false)}>
          <div className="dummy-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="dummy-sheet__title">เมนู</div>
            <button type="button" className="dummy-btn dummy-btn--gold" onClick={click(() => setMenuOpen(false))}>
              เล่นต่อ
            </button>
            <button type="button" className="dummy-btn dummy-btn--ghost" onClick={click(() => { setMenuOpen(false); setTut({ open: true, step: 0 }); })}>
              วิธีเล่น
            </button>
            <button type="button" className="dummy-btn dummy-btn--ghost" onClick={click(() => { setMenuOpen(false); setSettingsOpen(true); })}>
              ตั้งค่า
            </button>
            <button type="button" className="dummy-btn dummy-btn--ghost" onClick={click(() => { if (online) { setMenuOpen(false); leaveTable(); return; } commit({ ...gRef.current, status: "idle", token: rnd() }); busyRef.current = false; setMenuOpen(false); setScreen("lobby"); })}>
              {online ? "ลุกจากโต๊ะ (เลือกห้องใหม่)" : "เกมใหม่ (กลับล็อบบี้)"}
            </button>
            <button type="button" className="dummy-btn dummy-btn--danger" onClick={click(() => { setMenuOpen(false); goBack(); })}>
              กลับคาสิโน
            </button>
            <p className="dummy-sheet__note">ออกกลางเกมจะเสียเดิมพันรอบนี้</p>
          </div>
        </div>
      )}

      {/* settings */}
      {settingsOpen && (
        <div className="dummy-modal" onClick={() => setSettingsOpen(false)}>
          <div className="dummy-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="dummy-sheet__title">ตั้งค่า</div>
            <div className="dummy-set-row">
              <span>เสียงเอฟเฟกต์</span>
              <Toggle on={settings.sound} label="เสียงเอฟเฟกต์" onChange={(v) => setSettings((s) => ({ ...s, sound: v }))} />
            </div>
            <div className="dummy-set-row">
              <span>เพลงประกอบ</span>
              <Toggle
                on={settings.music}
                label="เพลงประกอบ"
                onChange={(v) => {
                  setSettings((s) => ({ ...s, music: v }));
                  soundRef.current.musicEnabled = v;
                  if (v) soundRef.current.startMusic();
                  else soundRef.current.stopMusic();
                }}
              />
            </div>
            <div className="dummy-set-row">
              <span>ระดับเสียง</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.volume}
                className="dummy-range"
                onChange={(e) => setSettings((s) => ({ ...s, volume: Number(e.target.value) }))}
                onPointerUp={() => sfx("card_select")}
              />
            </div>
            <div className="dummy-set-row">
              <span>LV</span>
              <div className="dummy-seg dummy-seg--sm">
                {["easy", "normal", "hard"].map((d) => (
                  <button key={d} type="button" className={settings.difficulty === d ? "is-on" : ""} onClick={() => setSettings((s) => ({ ...s, difficulty: d }))}>
                    {DIFF_LABEL[d]}
                  </button>
                ))}
              </div>
            </div>
            <div className="dummy-set-row">
              <span>ชื่อผู้เล่น</span>
              <input
                className="dummy-input dummy-input--sm"
                maxLength={16}
                defaultValue={userName}
                onBlur={(e) => setProfile((p) => ({ ...p, customName: e.target.value.trim() || null }))}
              />
            </div>
            <button type="button" className="dummy-btn dummy-btn--gold" onClick={click(() => setSettingsOpen(false))}>
              เสร็จสิ้น
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================================
 * 9. STYLES — injected once, everything namespaced under .dummy-game
 * ===================================================================== */
function useDummyStyles() {
  useLayoutEffect(() => {
    if (typeof document === "undefined" || document.getElementById("dummy-game-styles")) return;
    const el = document.createElement("style");
    el.id = "dummy-game-styles";
    el.textContent = DUMMY_CSS;
    document.head.appendChild(el);
  }, []);
}

const DUMMY_CSS = `
.dummy-game{--dg-bg0:#090B12;--dg-bg1:#111522;--dg-bg2:#171B29;--dg-gold:#FFD76A;--dg-gold2:#F5B93F;--dg-gold3:#C98A22;--dg-g0:#073B32;--dg-g1:#0B5144;--dg-g2:#116454;--dg-red:#D93636;
--cw:clamp(54px,min(15.4vw,10.6vh),96px);--cw-sm:clamp(34px,min(9vw,6.4vh),56px);
--spring:cubic-bezier(.34,1.56,.64,1);--ease:cubic-bezier(.22,1,.36,1);
position:relative;width:100%;height:var(--dg-h,100dvh);min-height:560px;overflow:hidden;display:flex;flex-direction:column;
background:radial-gradient(110% 60% at 50% -5%,#22283d 0%,rgba(23,27,41,0) 60%),linear-gradient(180deg,var(--dg-bg1) 0%,var(--dg-bg0) 100%);
color:#fff;font-family:"Kanit","Prompt","Sarabun","Noto Sans Thai","Leelawadee UI","Thonburi",system-ui,-apple-system,sans-serif;line-height:1.5;
-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;isolation:isolate;touch-action:manipulation}
.dummy-game *,.dummy-game *::before,.dummy-game *::after{box-sizing:border-box}
.dummy-game button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent}
.dummy-game button:focus-visible{outline:2px solid var(--dg-gold);outline-offset:2px}
.dummy-game button:disabled{cursor:default}

/* ---------- top bar ---------- */
.dummy-game .dummy-top{flex:0 0 auto;height:52px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 10px;padding-top:env(safe-area-inset-top,0px);
background:linear-gradient(180deg,rgba(17,21,34,.96),rgba(9,11,18,.85));border-bottom:1px solid rgba(255,215,106,.14);box-shadow:0 6px 18px rgba(0,0,0,.35);z-index:20;position:relative}
.dummy-game .dummy-top__btn{justify-self:start;height:36px;min-width:44px;padding:0 12px;border-radius:12px;background:linear-gradient(180deg,#232a3f,#151a29);border:1px solid rgba(255,255,255,.08);font-size:15px;font-weight:600;transition:transform .15s}
.dummy-game .dummy-top__btn:active{transform:scale(.94)}
.dummy-game .dummy-top__btn--icon{font-size:18px;padding:0}
.dummy-game .dummy-top__title{font-weight:800;letter-spacing:0;font-size:20px;line-height:1.6;padding:0 .1em;background:linear-gradient(180deg,#FFF3C4,var(--dg-gold) 45%,var(--dg-gold3));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 10px rgba(245,185,63,.35))}
.dummy-game .dummy-top__right{justify-self:end;display:flex;align-items:center;gap:8px}
.dummy-game .dummy-coin-pill{display:flex;align-items:center;gap:5px;height:32px;padding:0 12px 0 8px;border-radius:999px;background:linear-gradient(180deg,#2a2412,#15120a);border:1px solid rgba(255,215,106,.45);color:var(--dg-gold);font-weight:700;font-size:14px;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 0 14px rgba(245,185,63,.15);animation:dg-coinbounce .5s var(--spring)}
@media (max-width:360px){.dummy-game .dummy-hide-xs{display:none}}
@media (max-width:420px){.dummy-game .dummy-turn{font-size:12px}.dummy-game .dummy-seat__name{max-width:64px}}

/* ---------- cards ---------- */
.dummy-game .dummy-card{--w:var(--cw);position:relative;flex-shrink:0;width:var(--w);height:calc(var(--w) * 1.4);border-radius:calc(var(--w) * .1);
background:linear-gradient(155deg,#ffffff 0%,#f7f4ec 55%,#e9e3d4 100%);border:1px solid rgba(0,0,0,.2);color:#161821;font-weight:700;overflow:hidden;
box-shadow:0 1px 0 rgba(255,255,255,.8) inset,0 2px 2px rgba(0,0,0,.18),0 8px 16px rgba(0,0,0,.32);
transition:transform .34s var(--spring),box-shadow .25s ease,border-color .25s ease;will-change:transform}
.dummy-game .dummy-card--sm{--w:var(--cw-sm)}
.dummy-game .dummy-card--xs{--w:14px;border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,.4)}
.dummy-game .dummy-card.is-red{color:var(--dg-red)}
.dummy-game .dummy-card__corner{position:absolute;top:calc(var(--w) * .05);left:calc(var(--w) * .07);display:flex;flex-direction:column;align-items:center;font-size:calc(var(--w) * .27);line-height:.95;letter-spacing:-.04em}
.dummy-game .dummy-card__corner span:last-child{font-size:calc(var(--w) * .22)}
.dummy-game .dummy-card__corner--br{top:auto;left:auto;bottom:calc(var(--w) * .05);right:calc(var(--w) * .07);transform:rotate(180deg)}
.dummy-game .dummy-card__pip{position:absolute;inset:0;display:grid;place-items:center;font-size:calc(var(--w) * .5);padding-left:calc(var(--w) * .12)}
.dummy-game .dummy-card__face{font-family:Georgia,"Times New Roman",serif;font-size:calc(var(--w) * .5);font-weight:700;text-shadow:0 1px 0 rgba(0,0,0,.08)}
.dummy-game .dummy-card--sm .dummy-card__corner--br,.dummy-game .dummy-card--sm .dummy-card__pip{opacity:.55}
.dummy-game .dummy-card.is-special{box-shadow:0 0 0 1.5px var(--dg-gold2) inset,0 2px 2px rgba(0,0,0,.18),0 8px 16px rgba(0,0,0,.32)}
.dummy-game .dummy-card.is-special::after{content:"50";position:absolute;right:calc(var(--w)*.06);top:calc(var(--w)*.06);font-size:calc(var(--w)*.13);color:var(--dg-gold3);font-weight:800}
.dummy-game .dummy-card--back{background:repeating-linear-gradient(45deg,rgba(255,215,106,.13) 0 1.5px,transparent 1.5px 6px),repeating-linear-gradient(-45deg,rgba(255,215,106,.13) 0 1.5px,transparent 1.5px 6px),linear-gradient(155deg,#25305a,#0e1428 70%);border:1px solid rgba(255,215,106,.55)}
.dummy-game .dummy-card__back-inner{position:absolute;inset:calc(var(--w) * .08);border:1px solid rgba(255,215,106,.55);border-radius:calc(var(--w) * .06);display:grid;place-items:center}
.dummy-game .dummy-card__back-inner::after{content:"♦";color:var(--dg-gold);font-size:calc(var(--w) * .3);text-shadow:0 0 8px rgba(255,215,106,.7)}
.dummy-game .dummy-card--xs .dummy-card__back-inner{display:none}

/* ---------- loading / lobby ---------- */
.dummy-game .dummy-loading{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
.dummy-game .dummy-logo{font-size:clamp(44px,13vw,76px);font-weight:900;letter-spacing:0;line-height:1.55;padding:.05em .12em 0 !important;background:linear-gradient(180deg,#FFF6D6 0%,var(--dg-gold) 40%,var(--dg-gold2) 60%,var(--dg-gold3) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 0 rgba(0,0,0,.4)) drop-shadow(0 0 22px rgba(245,185,63,.35));padding-left:.16em}
.dummy-game .dummy-loading__text{color:rgba(255,255,255,.7);font-size:15px;animation:dg-fade 1.4s ease-in-out infinite alternate}
.dummy-game .dummy-shuffle{position:relative;width:calc(var(--cw) * 2.2);height:calc(var(--cw) * 1.5)}
.dummy-game .dummy-shuffle .dummy-card{position:absolute;left:50%;top:0;margin-left:calc(var(--cw) * -.5);animation:dg-riffle 1.1s var(--ease) infinite}
.dummy-game .dummy-shuffle--sm{width:var(--cw);height:calc(var(--cw)*1.4)}
.dummy-game .dummy-shuffle--sm .dummy-card{left:0;margin-left:0}

.dummy-game .dummy-lobby{flex:1;overflow-y:auto;display:flex;flex-direction:column;align-items:center;gap:14px;padding:14px 16px calc(20px + env(safe-area-inset-bottom,0px));max-width:520px;width:100%;margin:0 auto}
.dummy-game .dummy-lobby__hero{display:flex;flex-direction:column;align-items:center;gap:4px;margin-top:6px}
.dummy-game .dummy-lobby__fan{display:flex;justify-content:center;height:calc(var(--cw) * 1.3);margin-bottom:6px}
.dummy-game .dummy-lobby__fan .dummy-card{--w:calc(var(--cw) * .82);margin:0 calc(var(--cw) * -.18);transform-origin:50% 120%}
.dummy-game .dummy-lobby__tag{margin:0;color:rgba(255,255,255,.66);font-size:14px}
.dummy-game .dummy-lobby__note{margin:0;font-size:12px;color:rgba(255,255,255,.5);text-align:center}
.dummy-game .dummy-profile{width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;background:linear-gradient(180deg,rgba(35,42,63,.9),rgba(17,21,34,.9));border:1px solid rgba(255,215,106,.22);box-shadow:0 10px 30px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.06)}
.dummy-game .dummy-profile__info{flex:1;min-width:0}
.dummy-game .dummy-profile__name{font-size:18px;font-weight:700;text-align:left}
.dummy-game .dummy-profile__name small{opacity:.5;font-size:13px}
.dummy-game .dummy-profile__meta{display:flex;gap:12px;font-size:13px;color:rgba(255,255,255,.75);margin-top:3px;flex-wrap:wrap}
.dummy-game .dummy-profile__reroll{width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,.06);font-size:20px}
.dummy-game .dummy-lv{display:inline-block;padding:1px 7px;border-radius:6px;background:linear-gradient(180deg,var(--dg-gold),var(--dg-gold3));color:#2a1a00;font-size:11px;font-weight:800}
.dummy-game .dummy-field{width:100%;display:flex;flex-direction:column;gap:6px}
.dummy-game .dummy-field-row{width:100%;display:grid;grid-template-columns:1fr 1.5fr;gap:10px}
.dummy-game .dummy-field__label{font-size:12px;color:rgba(255,255,255,.6)}
.dummy-game .dummy-bet{display:grid;grid-template-columns:56px 1fr 56px;gap:8px}
.dummy-game .dummy-bet__btn{height:52px;border-radius:14px;background:linear-gradient(180deg,#2a3150,#161b2c);border:1px solid rgba(255,255,255,.1);font-size:26px;font-weight:700;transition:transform .12s}
.dummy-game .dummy-bet__btn:active{transform:scale(.92)}
.dummy-game .dummy-bet__btn:disabled{opacity:.35}
.dummy-game .dummy-bet__val{height:52px;border-radius:14px;display:grid;place-items:center;background:rgba(0,0,0,.35);border:1px solid rgba(255,215,106,.4);color:var(--dg-gold);font-size:22px;font-weight:800;animation:dg-coinbounce .35s var(--spring)}
.dummy-game .dummy-seg{display:flex;background:rgba(0,0,0,.35);border-radius:12px;padding:3px;border:1px solid rgba(255,255,255,.08)}
.dummy-game .dummy-seg button{flex:1;min-height:42px;border-radius:9px;font-size:13px;font-weight:700;color:rgba(255,255,255,.6);transition:background .2s,color .2s}
.dummy-game .dummy-seg button.is-on{background:linear-gradient(180deg,var(--dg-gold),var(--dg-gold3));color:#2a1a00;box-shadow:0 2px 10px rgba(245,185,63,.35)}
.dummy-game .dummy-seg--sm button{min-height:36px;padding:0 8px;font-size:12px}
.dummy-game .dummy-input{width:100%;height:36px;border-radius:10px;border:1px solid rgba(255,215,106,.4);background:rgba(0,0,0,.4);color:#fff;padding:0 10px;font:inherit;font-size:16px;user-select:text;-webkit-user-select:text}
.dummy-game .dummy-input--sm{width:150px}

/* ---------- buttons ---------- */
.dummy-game .dummy-btn{min-height:50px;padding:0 22px;border-radius:14px;font-weight:800;font-size:16px;letter-spacing:0;transition:transform .15s var(--spring),filter .2s;position:relative;overflow:hidden}
.dummy-game .dummy-btn:active{transform:scale(.95)}
.dummy-game .dummy-btn--gold{color:#2a1a00;background:linear-gradient(180deg,#FFE9A6 0%,var(--dg-gold) 30%,var(--dg-gold2) 65%,var(--dg-gold3) 100%);box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 -3px 0 rgba(0,0,0,.18) inset,0 8px 22px rgba(245,185,63,.35)}
.dummy-game .dummy-btn--gold::after{content:"";position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);animation:dg-shine 3.2s ease-in-out infinite}
.dummy-game .dummy-btn--ghost{background:linear-gradient(180deg,#232a3f,#151a29);border:1px solid rgba(255,255,255,.12)}
.dummy-game .dummy-btn--danger{background:linear-gradient(180deg,#e04848,#9e1f1f);box-shadow:0 6px 18px rgba(217,54,54,.3)}
.dummy-game .dummy-btn--xl{width:100%;min-height:60px;font-size:20px;letter-spacing:0}
.dummy-game .dummy-btn--sm{min-height:44px;padding:0 18px;font-size:14px}
.dummy-game .dummy-pulse{animation:dg-pulse 1.6s ease-in-out infinite}

/* ---------- table ---------- */
.dummy-game .dummy-table{flex:1;min-height:0;display:flex;flex-direction:column;padding:6px 8px 0;gap:6px;width:100%;max-width:1100px;margin:0 auto}
.dummy-game .dummy-seats-top{flex:0 0 auto;display:flex;justify-content:center;min-height:0}
.dummy-game .dummy-felt{flex:1;min-height:0;position:relative;display:flex;flex-direction:column;border-radius:28px;padding:10px 8px 8px;
background:radial-gradient(90% 70% at 50% 35%,var(--dg-g2) 0%,var(--dg-g1) 45%,var(--dg-g0) 100%);
border:2px solid rgba(201,138,34,.75);box-shadow:0 0 0 5px #1a140a,0 0 0 6px rgba(255,215,106,.35),inset 0 0 50px rgba(0,0,0,.55),0 18px 40px rgba(0,0,0,.55)}
.dummy-game .dummy-felt::before{content:"";position:absolute;inset:10px;border-radius:20px;border:1px dashed rgba(255,215,106,.16);pointer-events:none}
.dummy-game .dummy-felt__row{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:start;gap:6px;position:relative;z-index:2}
.dummy-game .dummy-felt__side{display:flex;justify-content:center;min-width:0}
.dummy-game .dummy-felt__center{display:flex;flex-direction:column;align-items:center;gap:8px}
.dummy-game .dummy-turn{display:flex;align-items:center;gap:8px;height:42px;padding:0 14px 0 4px;border-radius:999px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.1);font-size:13px;font-weight:600;white-space:nowrap;max-width:min(58vw,440px);overflow:hidden;text-overflow:ellipsis}
.dummy-game .dummy-turn > span{overflow:hidden;text-overflow:ellipsis;padding-left:6px}
.dummy-game .dummy-turn.is-mine{border-color:rgba(255,215,106,.6);box-shadow:0 0 18px rgba(245,185,63,.3);color:var(--dg-gold)}
.dummy-game .dummy-piles{display:flex;gap:clamp(14px,5vw,36px);align-items:flex-start}
.dummy-game .dummy-deck,.dummy-game .dummy-discard{position:relative;width:var(--cw);height:calc(var(--cw) * 1.4 + 22px);display:block}
.dummy-game .dummy-deck .dummy-card,.dummy-game .dummy-discard .dummy-card{position:absolute;left:0;top:0}
.dummy-game .dummy-deck.is-ready .dummy-deck__layer:last-of-type{box-shadow:0 0 0 2px var(--dg-gold),0 0 22px rgba(255,215,106,.55);animation:dg-breathe 1.4s ease-in-out infinite}
.dummy-game .dummy-deck__count{position:absolute;top:-8px;right:-10px;min-width:26px;height:22px;padding:0 6px;border-radius:999px;background:var(--dg-red);font-size:12px;font-weight:800;display:grid;place-items:center;z-index:4;box-shadow:0 2px 6px rgba(0,0,0,.4)}
.dummy-game .dummy-pile-label{position:absolute;left:-10px;right:-10px;bottom:-2px;text-align:center;font-size:11px;line-height:1.6;white-space:nowrap;font-weight:700;letter-spacing:0;color:rgba(255,215,106,.7)}
.dummy-game .dummy-pile-empty{position:absolute;left:0;top:0;width:var(--cw);height:calc(var(--cw)*1.4);border-radius:calc(var(--cw)*.1);border:2px dashed rgba(255,215,106,.35);display:grid;place-items:center;font-size:11px;color:rgba(255,255,255,.55);text-align:center}
.dummy-game .dummy-discard.is-takeable .dummy-discard__card:last-child{box-shadow:0 0 0 2px #7CF5C8,0 0 20px rgba(124,245,200,.6)}
.dummy-game .dummy-discard.is-target::after{content:"";position:absolute;left:-6px;top:-6px;width:calc(var(--cw) + 12px);height:calc(var(--cw)*1.4 + 12px);border-radius:12px;border:2px dashed rgba(255,215,106,.5);animation:dg-breathe 1.6s ease-in-out infinite;pointer-events:none}

/* seats */
.dummy-game .dummy-seat{display:flex;align-items:center;gap:8px;padding:5px 10px 5px 5px;border-radius:999px;background:rgba(9,11,18,.62);border:1px solid rgba(255,255,255,.08);transition:border-color .3s,box-shadow .3s;max-width:100%;min-width:0}
.dummy-game .dummy-seat.is-active{border-color:rgba(255,215,106,.6);box-shadow:0 0 18px rgba(245,185,63,.28)}
.dummy-game .dummy-seat--left,.dummy-game .dummy-seat--right{flex-direction:column;border-radius:18px;padding:6px;gap:4px}
.dummy-game .dummy-seat__avatar{position:relative}
.dummy-game .dummy-seat__timer{position:absolute;right:-8px;bottom:-6px}
.dummy-game .dummy-seat__info{display:flex;flex-direction:column;align-items:flex-start;min-width:0}
.dummy-game .dummy-seat--left .dummy-seat__info,.dummy-game .dummy-seat--right .dummy-seat__info{align-items:center}
.dummy-game .dummy-seat__name{font-size:12px;font-weight:700;max-width:84px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dummy-game .dummy-seat__cards{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dg-gold);font-weight:700}
.dummy-game .dummy-seat__fan{display:flex;height:22px;align-items:center;padding-left:6px}
.dummy-game .dummy-seat__fan .dummy-card{margin-left:-7px;transform-origin:50% 100%}
.dummy-game .dummy-seat__thinking{display:flex;gap:3px;height:6px}
.dummy-game .dummy-seat__thinking i{width:5px;height:5px;border-radius:50%;background:var(--dg-gold);animation:dg-dot 1s ease-in-out infinite}
.dummy-game .dummy-seat__thinking i:nth-child(2){animation-delay:.15s}
.dummy-game .dummy-seat__thinking i:nth-child(3){animation-delay:.3s}

/* avatar */
.dummy-game .dummy-avatar{position:relative;border-radius:50%;display:grid;place-items:center;flex-shrink:0;box-shadow:inset 0 -4px 8px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.4);border:2px solid rgba(255,255,255,.18)}
.dummy-game .dummy-avatar > span{line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))}
.dummy-game .dummy-avatar.is-active{border-color:var(--dg-gold);box-shadow:0 0 0 2px rgba(255,215,106,.35),0 0 18px rgba(245,185,63,.6)}
.dummy-game .dummy-avatar.is-active::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(255,215,106,.7);animation:dg-ring 1.6s ease-out infinite}

/* timer */
.dummy-game .dummy-timer{position:relative;display:grid;place-items:center;flex-shrink:0}
.dummy-game .dummy-timer svg{position:absolute;inset:0}
.dummy-game .dummy-timer__track{fill:rgba(0,0,0,.55);stroke:rgba(255,255,255,.12);stroke-width:3}
.dummy-game .dummy-timer__bar{fill:none;stroke:var(--dg-gold);stroke-width:3;stroke-linecap:round;transition:stroke-dashoffset 1s linear,stroke .3s}
.dummy-game .dummy-timer > span{position:relative;font-size:12px;font-weight:800}
.dummy-game .dummy-timer.is-low .dummy-timer__bar{stroke:var(--dg-red)}
.dummy-game .dummy-timer.is-low{animation:dg-pulse .8s ease-in-out infinite;color:#ff8a8a}

/* melds */
.dummy-game .dummy-melds{flex:1;min-height:0;overflow-y:auto;display:flex;flex-wrap:wrap;align-content:flex-start;justify-content:center;gap:8px;padding:10px 4px 4px;position:relative;z-index:1;-webkit-overflow-scrolling:touch}
.dummy-game .dummy-melds--empty{align-content:center;color:rgba(255,255,255,.5);font-size:13px;line-height:1.7;text-align:center;padding:12px 24px;overflow:visible;flex:1 0 auto}
.dummy-game .dummy-meld{display:flex;flex-direction:column;align-items:flex-start;gap:3px;padding:5px 7px 7px;border-radius:12px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.07);transition:border-color .2s,box-shadow .2s,transform .2s var(--spring)}
.dummy-game .dummy-meld.is-mine{border-color:rgba(255,215,106,.3)}
.dummy-game .dummy-meld.is-armed{border-color:rgba(124,245,200,.6);box-shadow:0 0 12px rgba(124,245,200,.25)}
.dummy-game .dummy-meld.is-armed:active{transform:scale(.96)}
.dummy-game .dummy-meld.is-fresh{animation:dg-meldin .6s var(--spring);box-shadow:0 0 0 1px var(--dg-gold),0 0 24px rgba(245,185,63,.5)}
.dummy-game .dummy-meld__owner{font-size:10px;color:rgba(255,255,255,.55);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dummy-game .dummy-meld__cards{display:flex}
.dummy-game .dummy-meldfx{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);z-index:8;pointer-events:none;display:grid;place-items:center}
.dummy-game .dummy-meldfx > span{position:relative;font-size:clamp(22px,7vw,40px);font-weight:900;letter-spacing:0;white-space:nowrap;color:#FFF3C4;text-shadow:0 0 18px rgba(245,185,63,.9),0 3px 0 #7a4a06;animation:dg-pop 1.3s var(--ease) forwards}
.dummy-game .dummy-ready{position:absolute;inset:0;display:grid;place-items:center;background:radial-gradient(circle,rgba(0,0,0,.15),rgba(0,0,0,.5));border-radius:26px;z-index:6;padding:0 20%}

/* user bar */
.dummy-game .dummy-userbar{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 4px}
.dummy-game .dummy-userbar__me{display:flex;align-items:center;gap:10px;min-width:0}
.dummy-game .dummy-userbar__name{font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dummy-game .dummy-userbar__meta{font-size:11px;color:rgba(255,255,255,.6);white-space:nowrap}
.dummy-game .dummy-knock{min-height:46px;padding:0 18px;border-radius:999px;font-weight:900;letter-spacing:0;color:#2a1a00;background:linear-gradient(180deg,#FFF0B8,var(--dg-gold) 40%,var(--dg-gold3));box-shadow:0 0 0 2px rgba(255,255,255,.4) inset,0 0 26px rgba(255,215,106,.75);animation:dg-pulse 1.1s ease-in-out infinite}
.dummy-game .dummy-hint{font-size:12px;color:#7CF5C8;font-weight:600}

/* hand */
.dummy-game .dummy-hand{flex:0 0 auto;overflow-x:auto;overflow-y:visible;scrollbar-width:none;-webkit-overflow-scrolling:touch;margin:0 -8px}
.dummy-game .dummy-hand::-webkit-scrollbar{display:none}
.dummy-game .dummy-hand__inner{display:flex;width:max-content;min-width:100%;justify-content:center;padding:40px 14px 8px}
.dummy-game .dummy-hand__empty{height:calc(var(--cw)*1.4);display:grid;place-items:center;color:rgba(255,255,255,.35);font-size:13px}
.dummy-game .dummy-hand__slot{position:relative}
.dummy-game .dummy-hand__drag{position:relative;touch-action:pan-x;cursor:grab}
.dummy-game .dummy-hand__drag.is-dragging{cursor:grabbing;transition:none;z-index:60}
.dummy-game .dummy-hand__drag.is-dragging .dummy-card{transform:translateY(-10px) scale(1.08);box-shadow:0 0 0 2px var(--dg-gold),0 22px 30px rgba(0,0,0,.55)}
@media (hover:hover){.dummy-game .dummy-hand__drag:hover .dummy-card:not(.is-selected){transform:translateY(-8px) scale(1.02);box-shadow:0 2px 2px rgba(0,0,0,.18),0 14px 22px rgba(0,0,0,.45)}}
.dummy-game .dummy-card.is-peek{transform:translateY(-16px) scale(1.03);box-shadow:0 0 0 1px rgba(255,215,106,.6),0 16px 24px rgba(0,0,0,.45)}
.dummy-game .dummy-card.is-selected{transform:translateY(-22px) scale(1.04);border-color:var(--dg-gold);box-shadow:0 0 0 2px var(--dg-gold),0 0 22px rgba(255,215,106,.65),0 18px 26px rgba(0,0,0,.5)}
.dummy-game .dummy-card.is-new{animation:dg-newcard 1.6s ease-out}
.dummy-game .dummy-hand__badge{position:absolute;left:50%;top:-40px;transform:translateX(-50%);font-size:10px;line-height:1.5;font-weight:900;letter-spacing:0;padding:2px 5px;border-radius:5px;background:var(--dg-gold);color:#2a1a00;white-space:nowrap;pointer-events:none;animation:dg-badge .3s var(--spring);z-index:3}

/* controls */
.dummy-game .dummy-controls{flex:0 0 auto;display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:6px 0 calc(8px + env(safe-area-inset-bottom,0px))}
.dummy-game .dummy-ctrl{min-height:56px;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:linear-gradient(180deg,#252c43,#141927);border:1px solid rgba(255,255,255,.09);box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 4px 10px rgba(0,0,0,.35);transition:transform .14s var(--spring),opacity .2s,box-shadow .2s}
.dummy-game .dummy-ctrl:active{transform:scale(.92)}
.dummy-game .dummy-ctrl__icon{font-size:19px;line-height:1}
.dummy-game .dummy-ctrl__label{font-size:12px;font-weight:700;letter-spacing:0;line-height:1.5;white-space:nowrap}
.dummy-game .dummy-ctrl.is-primary{color:#2a1a00;background:linear-gradient(180deg,#FFE9A6,var(--dg-gold) 35%,var(--dg-gold3));box-shadow:0 0 18px rgba(245,185,63,.45),inset 0 1px 0 rgba(255,255,255,.6)}
.dummy-game .dummy-ctrl.is-dim{opacity:.5}
.dummy-game .dummy-ctrl:disabled{opacity:.3}

/* flying */
.dummy-game .dummy-fly-layer{position:absolute;inset:0;pointer-events:none;z-index:40;overflow:hidden}
.dummy-game .dummy-fly{position:absolute;left:0;top:0;width:var(--cw);height:calc(var(--cw)*1.4);perspective:700px;will-change:transform}
.dummy-game .dummy-fly__inner{position:relative;width:100%;height:100%;transform-style:preserve-3d}
.dummy-game .dummy-fly__face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.dummy-game .dummy-fly__face--back{transform:rotateY(180deg)}
.dummy-game .dummy-fly.is-glow .dummy-card{box-shadow:0 0 0 1px rgba(255,215,106,.8),0 0 26px rgba(255,215,106,.6),0 14px 24px rgba(0,0,0,.45)}

/* toast */
.dummy-game .dummy-toasts{position:absolute;top:60px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;z-index:70;pointer-events:none;width:min(92%,420px)}
.dummy-game .dummy-toast{padding:9px 16px;border-radius:999px;font-size:13px;font-weight:600;background:rgba(17,21,34,.94);border:1px solid rgba(255,215,106,.35);box-shadow:0 8px 22px rgba(0,0,0,.45);animation:dg-toast 2.1s var(--ease) forwards;text-align:center}
.dummy-game .dummy-toast--warn{border-color:rgba(217,54,54,.6)}
.dummy-game .dummy-toast--info{border-color:rgba(124,245,200,.45)}

/* particles */
.dummy-game .dummy-particles{position:absolute;left:50%;top:50%;width:0;height:0}
.dummy-game .dummy-particles i{position:absolute;left:0;top:0;border-radius:50%;opacity:0;animation:dg-burst 1s var(--ease) forwards;box-shadow:0 0 8px currentColor}

/* modal */
.dummy-game .dummy-modal{position:absolute;inset:0;z-index:80;background:rgba(5,6,10,.66);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center;animation:dg-fadein .2s ease}
@media (min-width:700px){.dummy-game .dummy-modal{align-items:center}}
.dummy-game .dummy-sheet{width:min(100%,440px);display:flex;flex-direction:column;gap:10px;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px));border-radius:22px 22px 0 0;background:linear-gradient(180deg,var(--dg-bg2),var(--dg-bg0));border:1px solid rgba(255,215,106,.25);box-shadow:0 -10px 40px rgba(0,0,0,.5);animation:dg-sheet .35s var(--ease)}
@media (min-width:700px){.dummy-game .dummy-sheet{border-radius:22px}}
.dummy-game .dummy-sheet__title{text-align:center;font-weight:900;letter-spacing:0;color:var(--dg-gold);margin-bottom:4px}
.dummy-game .dummy-sheet__note{margin:0;text-align:center;font-size:11px;color:rgba(255,255,255,.45)}
.dummy-game .dummy-set-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;padding:0 4px;border-bottom:1px solid rgba(255,255,255,.06);font-size:14px}
.dummy-game .dummy-toggle{width:52px;height:30px;border-radius:999px;background:#2a3044;position:relative;transition:background .2s}
.dummy-game .dummy-toggle i{position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:transform .25s var(--spring);box-shadow:0 2px 5px rgba(0,0,0,.4)}
.dummy-game .dummy-toggle.is-on{background:linear-gradient(180deg,var(--dg-gold),var(--dg-gold3))}
.dummy-game .dummy-toggle.is-on i{transform:translateX(22px)}
.dummy-game .dummy-range{width:150px;accent-color:var(--dg-gold2)}

/* tutorial */
.dummy-game .dummy-tut{position:absolute;inset:0;z-index:75;pointer-events:none}
.dummy-game .dummy-tut__dim{position:absolute;inset:0;background:rgba(0,0,0,.55)}
.dummy-game .dummy-tut__spot{position:absolute;left:0;top:0;border-radius:16px;box-shadow:0 0 0 9999px rgba(0,0,0,.55),0 0 0 2px var(--dg-gold),0 0 26px rgba(255,215,106,.7);transition:transform .45s var(--ease),width .45s var(--ease),height .45s var(--ease)}
.dummy-game .dummy-tut__panel{position:absolute;left:50%;width:min(92%,380px);transform:translateX(-50%);pointer-events:auto;padding:16px;border-radius:18px;background:linear-gradient(180deg,#1f2537,#111522);border:1px solid rgba(255,215,106,.45);box-shadow:0 14px 40px rgba(0,0,0,.6);animation:dg-fadein .3s ease}
.dummy-game .dummy-tut__panel.is-top{top:64px}
.dummy-game .dummy-tut__panel.is-bottom{bottom:calc(150px + env(safe-area-inset-bottom,0px))}
.dummy-game .dummy-tut__step{font-size:12px;font-weight:800;letter-spacing:0;color:var(--dg-gold2)}
.dummy-game .dummy-tut__head{font-size:22px;font-weight:800;margin:2px 0 6px}
.dummy-game .dummy-tut__text{margin:0 0 10px;font-size:14px;line-height:1.5;color:rgba(255,255,255,.82)}
.dummy-game .dummy-tut__dots{display:flex;gap:5px;margin-bottom:12px}
.dummy-game .dummy-tut__dots i{width:6px;height:6px;border-radius:3px;background:rgba(255,255,255,.2);transition:width .3s}
.dummy-game .dummy-tut__dots i.is-on{width:18px;background:var(--dg-gold)}
.dummy-game .dummy-tut__actions{display:flex;justify-content:space-between;gap:10px}

/* end screen */
.dummy-game .dummy-end{position:absolute;inset:0;z-index:85;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(5,6,10,.72);animation:dg-fadein .4s ease;overflow:hidden}
.dummy-game .dummy-end__flash{position:absolute;inset:0;background:radial-gradient(circle,rgba(255,243,196,.85),rgba(255,215,106,0) 70%);animation:dg-flash .9s ease-out forwards;pointer-events:none}
.dummy-game .dummy-end__glow{position:absolute;left:50%;top:40%;width:140vmax;height:140vmax;margin:-70vmax 0 0 -70vmax;background:conic-gradient(from 0deg,rgba(255,215,106,0),rgba(255,215,106,.16),rgba(255,215,106,0) 25%,rgba(255,215,106,.16) 50%,rgba(255,215,106,0) 75%,rgba(255,215,106,.16));animation:dg-spin 14s linear infinite;pointer-events:none}
.dummy-game .dummy-end__burst{position:absolute;left:50%;top:38%;pointer-events:none}
.dummy-game .dummy-end__burst .dummy-particles i{animation-duration:1.4s}
.dummy-game .dummy-end__coins{position:absolute;inset:0;pointer-events:none}
.dummy-game .dummy-end__coins span{position:absolute;top:-40px;animation:dg-coinfall linear forwards;opacity:0}
.dummy-game .dummy-end__panel{position:relative;width:min(100%,460px);max-height:100%;overflow-y:auto;padding:22px 18px 18px;border-radius:24px;background:linear-gradient(180deg,rgba(31,37,55,.97),rgba(13,16,26,.97));border:1px solid rgba(255,215,106,.4);box-shadow:0 20px 60px rgba(0,0,0,.6);animation:dg-panelin .7s var(--spring) .25s both}
.dummy-game .dummy-end.is-win .dummy-end__panel{box-shadow:0 0 0 1px rgba(255,215,106,.6),0 0 60px rgba(245,185,63,.35),0 20px 60px rgba(0,0,0,.6)}
.dummy-game .dummy-end__hero{text-align:center;margin-bottom:14px}
.dummy-game .dummy-end__title{font-size:clamp(40px,12vw,64px);font-weight:900;letter-spacing:0;line-height:1.55;padding:0 .1em;background:linear-gradient(180deg,#FFF6D6,var(--dg-gold) 45%,var(--dg-gold3));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 rgba(0,0,0,.5)) drop-shadow(0 0 24px rgba(245,185,63,.55));animation:dg-titlein .8s var(--spring) .35s both}
.dummy-game .dummy-end__title--soft{font-size:clamp(30px,9vw,46px);background:linear-gradient(180deg,#fff,#b9c0d6);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 3px 0 rgba(0,0,0,.5))}
.dummy-game .dummy-end__sub{font-size:15px;color:rgba(255,255,255,.8);margin-top:4px}
.dummy-game .dummy-end__reward{display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:8px 18px;border-radius:999px;background:rgba(0,0,0,.4);border:1px solid rgba(255,215,106,.5);font-size:26px;font-weight:900;color:var(--dg-gold)}
.dummy-game .dummy-end__reveal{display:flex;justify-content:center;flex-wrap:wrap;gap:4px;margin:12px 0 6px}
.dummy-game .dummy-card.is-reveal{animation:dg-reveal .5s var(--spring) both}
.dummy-game .dummy-end__hint{font-size:12px;color:rgba(255,255,255,.5);margin-top:6px}
.dummy-game .dummy-score{border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.08);margin-bottom:14px}
.dummy-game .dummy-score__head,.dummy-game .dummy-score__row{display:grid;grid-template-columns:1.6fr 1.2fr .8fr;align-items:center;gap:6px;padding:8px 10px}
.dummy-game .dummy-score__head{font-size:12px;font-weight:800;letter-spacing:0;color:rgba(255,255,255,.45);background:rgba(0,0,0,.3)}
.dummy-game .dummy-score__row{font-size:13px;border-top:1px solid rgba(255,255,255,.06);animation:dg-rowin .4s var(--ease) both}
.dummy-game .dummy-score__row.is-winner{background:linear-gradient(90deg,rgba(255,215,106,.18),rgba(255,215,106,0));color:var(--dg-gold);font-weight:700}
.dummy-game .dummy-score__name{display:flex;align-items:center;gap:6px;min-width:0;white-space:nowrap;overflow:hidden}
.dummy-game .dummy-score__pts{font-weight:800}
.dummy-game .dummy-score__pts small{font-weight:500;font-size:10px;opacity:.6}
.dummy-game .dummy-score__res{font-size:11px;font-weight:800;text-align:right}
.dummy-game .dummy-end__actions{display:grid;gap:8px}

/* ---------- responsive ---------- */
@media (min-width:768px){
  .dummy-game .dummy-table{padding:10px 16px 0;gap:8px}
  .dummy-game .dummy-felt{border-radius:120px/90px;padding:16px 40px 12px}
  .dummy-game .dummy-felt::before{border-radius:110px/80px}
  .dummy-game .dummy-ready{border-radius:120px/90px}
  .dummy-game .dummy-seat__name{max-width:130px;font-size:13px}
  .dummy-game .dummy-felt__side{padding-top:30px}
  .dummy-game .dummy-controls{max-width:640px;width:100%;margin:0 auto}
  .dummy-game .dummy-ctrl{min-height:58px}
  .dummy-game .dummy-ctrl__label{font-size:13px}
  .dummy-game .dummy-hand__badge{font-size:9px}
}
@media (max-height:700px) and (min-width:700px){
  .dummy-game{--cw:clamp(48px,9.6vh,80px)}
  .dummy-game .dummy-hand__inner{padding-top:24px}
}
@media (prefers-reduced-motion:reduce){
  .dummy-game *,.dummy-game *::before,.dummy-game *::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important}
}

/* ---------- keyframes (prefixed) ---------- */
@keyframes dg-riffle{0%{transform:translateX(0) rotate(0)}30%{transform:translateX(calc(var(--cw) * -.7)) rotate(-12deg)}55%{transform:translateX(calc(var(--cw) * .7)) rotate(12deg)}80%,100%{transform:translateX(0) rotate(0)}}
@keyframes dg-fade{from{opacity:.4}to{opacity:1}}
@keyframes dg-fadein{from{opacity:0}to{opacity:1}}
@keyframes dg-coinbounce{0%{transform:scale(.85)}60%{transform:scale(1.08)}100%{transform:scale(1)}}
@keyframes dg-shine{0%,60%{left:-60%}100%{left:130%}}
@keyframes dg-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes dg-breathe{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes dg-ring{0%{transform:scale(.9);opacity:.9}100%{transform:scale(1.35);opacity:0}}
@keyframes dg-dot{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-3px);opacity:1}}
@keyframes dg-meldin{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes dg-pop{0%{transform:scale(.4);opacity:0}20%{transform:scale(1.12);opacity:1}35%{transform:scale(1)}80%{opacity:1;transform:translateY(-6px)}100%{opacity:0;transform:translateY(-22px)}}
@keyframes dg-newcard{0%{box-shadow:0 0 0 2px var(--dg-gold),0 0 26px rgba(255,215,106,.8)}100%{box-shadow:0 2px 2px rgba(0,0,0,.18),0 8px 16px rgba(0,0,0,.32)}}
@keyframes dg-badge{from{transform:translate(-50%,6px) scale(.6);opacity:0}to{transform:translate(-50%,0) scale(1);opacity:1}}
@keyframes dg-toast{0%{transform:translateY(-12px) scale(.95);opacity:0}10%{transform:translateY(0) scale(1);opacity:1}85%{opacity:1}100%{opacity:0;transform:translateY(-6px)}}
@keyframes dg-burst{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--tx),var(--ty)) scale(.2);opacity:0}}
@keyframes dg-sheet{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes dg-flash{0%{opacity:0}15%{opacity:.75}100%{opacity:0}}
@keyframes dg-spin{to{transform:rotate(360deg)}}
@keyframes dg-coinfall{0%{transform:translateY(0) rotate(0);opacity:0}10%{opacity:1}100%{transform:translateY(calc(var(--dg-h,100dvh) + 80px)) rotate(540deg);opacity:1}}
@keyframes dg-panelin{from{transform:translateY(30px) scale(.92);opacity:0}to{transform:none;opacity:1}}
@keyframes dg-titlein{0%{transform:scale(2.2);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes dg-reveal{from{transform:rotateY(90deg) translateY(10px);opacity:0}to{transform:none;opacity:1}}
@keyframes dg-rowin{from{transform:translateX(-14px);opacity:0}to{transform:none;opacity:1}}
.dummy-game .dummy-rooms{display:flex;flex-direction:column;gap:10px;width:min(440px,100%);margin:6px auto}
.dummy-game .dummy-room{display:flex;flex-direction:column;gap:2px;text-align:left;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,215,106,.45);background:linear-gradient(180deg,#171B29,#0d1019);box-shadow:0 8px 18px rgba(0,0,0,.35)}
.dummy-game .dummy-room b{display:flex;justify-content:space-between;align-items:center;font-size:17px;color:var(--dg-gold)}
.dummy-game .dummy-room em{font-style:normal;font-size:12px;padding:1px 8px;border-radius:999px;background:rgba(255,215,106,.16)}
.dummy-game .dummy-room span{font-size:13px;color:#b8bfd6}
.dummy-game .dummy-room:disabled{opacity:.45;cursor:not-allowed}
.xg-box .dummy-game{min-height:0}
`;
