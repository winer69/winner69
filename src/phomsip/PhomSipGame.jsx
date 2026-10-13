/**
 * ผสมสิบ (Phom Sip) — Premium casino card game, single-file React component.
 *
 * ต้องติดตั้ง:  npm i react react-dom framer-motion lucide-react
 * ใช้งาน:      import PhomSipGame from './PhomSipGame.jsx';
 *              <PhomSipGame initialBalance={10000} onBalanceChange={fn} onExit={fn} />
 *
 * ฟอนต์ (แนะนำ ใส่ใน <head>):
 *   https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Noto+Serif+Thai:wght@600;700;800&family=Playfair+Display:wght@700;800&display=swap
 * มือถือ: ใส่ <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
 *
 * กติกา/วงเงิน/ระดับ แก้ได้ที่ส่วน "game/rules.js" ด้านล่าง
 * ตั้ง DEV_MODE = true เพื่อเปิด Debug Panel (ห้ามเปิดใน production)
 */
import React, { forwardRef, memo, useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, LayoutGroup, MotionConfig, animate, motion } from 'framer-motion';
import { ArrowDownToLine, ArrowLeft, Bug, ChevronDown, LogOut, Music, Play, Plus, RotateCcw, Settings, Sparkles, User, UserRound, Volume2, VolumeX, X } from 'lucide-react';

const DEV_MODE = false;

// rules, engine and AI live in backend/src/phomsip/rules.js (shared with the online tables)
import { RULES, AI_LEVELS, fitBet, createDeck, canPair, isPhomSip, findValidCombination, createInitialState, scoresOf, payoutFor, gameReducer, aiChooseDraw, aiChooseMelds, aiChooseDiscard } from '../../backend/src/phomsip/rules.js';

// ═══ sound/soundManager.js ═══════════════════════════════════
// ─────────────────────────────────────────────────────────────
//  Sound Manager
//  - ใส่ไฟล์จริงใน SOUND_FILES (เช่น '/sounds/card_deal.mp3') แล้วระบบจะใช้ไฟล์นั้น
//  - ถ้ายังเป็น null จะใช้เสียงสังเคราะห์ด้วย Web Audio (placeholder) แทน
// ─────────────────────────────────────────────────────────────

// TODO: ใส่ path ไฟล์เสียงจริงจากทีม Sound Design (วางไฟล์ไว้ใน /public/sounds)
const SOUND_FILES = {
  card_deal: null,
  card_pick: null,
  card_place: null,
  card_discard: null,
  button_click: null,
  turn_start: null,
  win: null,
  lose: null,
  coin: null,
  notification: null,
  music: null, // background loop
};

// Synth recipes (placeholder). 'noise' = card swish, 'tone' = short notes
const SYNTH = {
  card_deal: { kind: 'noise', dur: 0.09, freq: 2600, gain: 0.22 },
  card_pick: { kind: 'noise', dur: 0.05, freq: 3800, gain: 0.14 },
  card_place: { kind: 'noise', dur: 0.06, freq: 1200, gain: 0.28 },
  card_discard: { kind: 'noise', dur: 0.12, freq: 1800, gain: 0.25 },
  button_click: { kind: 'tone', notes: [880], dur: 0.05, type: 'triangle', gain: 0.08 },
  turn_start: { kind: 'tone', notes: [659, 880], dur: 0.12, type: 'sine', gain: 0.1 },
  notification: { kind: 'tone', notes: [988], dur: 0.12, type: 'sine', gain: 0.08 },
  coin: { kind: 'tone', notes: [1568, 2093], dur: 0.07, type: 'square', gain: 0.035 },
  win: { kind: 'tone', notes: [523, 659, 784, 1047, 1319], dur: 0.16, type: 'triangle', gain: 0.12 },
  lose: { kind: 'tone', notes: [392, 330, 262], dur: 0.24, type: 'sine', gain: 0.1 },
};

class SoundManager {
  constructor() {
    this.ctx = null;
    this.soundOn = true;
    this.musicOn = false;
    this.buffers = {};
    this.music = null;
    this.listeners = new Set();
  }

  /** Call from a user gesture (autoplay policy). Safe to call repeatedly. */
  unlock() {
    if (typeof window === 'undefined') return;
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        this.ctx = new Ctx();
        this.preload();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this.musicOn && !this.music) this.startMusic();
    } catch {
      /* audio unavailable — stay silent */
    }
  }

  async preload() {
    for (const [name, url] of Object.entries(SOUND_FILES)) {
      if (!url || this.buffers[name]) continue;
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        this.buffers[name] = await this.ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        /* keep synth fallback */
      }
    }
  }

  play(name, { rate = 1 } = {}) {
    if (!this.soundOn || !this.ctx || this.ctx.state !== 'running') return;
    const buffer = this.buffers[name];
    if (buffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      src.connect(this.ctx.destination);
      src.start();
      return;
    }
    const recipe = SYNTH[name];
    if (recipe) this.synth(recipe, rate);
  }

  synth(r, rate) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    if (r.kind === 'noise') {
      const len = Math.floor(ctx.sampleRate * r.dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = r.freq * rate;
      filter.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.value = r.gain;
      src.connect(filter).connect(g).connect(ctx.destination);
      src.start(t0);
      return;
    }
    r.notes.forEach((f, i) => {
      const start = t0 + i * r.dur * 0.75;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = r.type;
      osc.frequency.value = f * rate;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(r.gain, start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, start + r.dur * 1.6);
      osc.connect(g).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + r.dur * 1.7);
    });
  }

  setSound(on) {
    this.soundOn = on;
    this.emit();
  }

  setMusic(on) {
    this.musicOn = on;
    if (on) this.startMusic();
    else this.stopMusic();
    this.emit();
  }

  /** Placeholder ambient pad. TODO: แทนที่ด้วย SOUND_FILES.music */
  startMusic() {
    if (!this.ctx || this.music) return;
    const ctx = this.ctx;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.connect(master).connect(ctx.destination);

    if (this.buffers.music) {
      const src = ctx.createBufferSource();
      src.buffer = this.buffers.music;
      src.loop = true;
      src.connect(lp);
      src.start();
      this.music = {
        stop: () => {
          master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
          setTimeout(() => src.stop(), 700);
        },
      };
      return;
    }

    const chords = [
      [220, 277.2, 329.6],
      [196, 246.9, 293.7],
      [174.6, 220, 261.6],
      [196, 246.9, 329.6],
    ];
    let idx = 0;
    let voices = [];
    const playChord = () => {
      const now = ctx.currentTime;
      voices.forEach((v) => {
        v.g.gain.linearRampToValueAtTime(0, now + 2);
        v.o.stop(now + 2.1);
      });
      voices = chords[idx++ % chords.length].map((f) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        o.detune.value = Math.random() * 8 - 4;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.33, now + 2);
        o.connect(g).connect(lp);
        o.start(now);
        return { o, g };
      });
    };
    playChord();
    const timer = setInterval(playChord, 6000);
    this.music = {
      stop: () => {
        clearInterval(timer);
        const now = ctx.currentTime;
        master.gain.linearRampToValueAtTime(0, now + 0.6);
        voices.forEach((v) => v.o.stop(now + 0.7));
      },
    };
  }

  stopMusic() {
    this.music?.stop();
    this.music = null;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    this.listeners.forEach((fn) => fn({ soundOn: this.soundOn, musicOn: this.musicOn }));
  }
}

const sound = new SoundManager();

// ═══ hooks/useSoundSettings.js ═══════════════════════════════
function useSoundSettings() {
  const [s, setS] = useState({ soundOn: sound.soundOn, musicOn: sound.musicOn });
  useEffect(() => sound.subscribe(setS), []);
  return {
    ...s,
    toggleSound: () => sound.setSound(!sound.soundOn),
    toggleMusic: () => {
      sound.unlock();
      sound.setMusic(!sound.musicOn);
    },
  };
}

// ═══ hooks/useCountUp.js ═════════════════════════════════════
/** Smoothly animates a displayed number toward `value`. */
function useCountUp(value, { duration = 0.9 } = {}) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const controls = animate(from.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        from.current = v;
        setDisplay(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value, duration]);
  return display;
}

const formatMoney = (n) => Math.round(n).toLocaleString('th-TH');

// ═══ hooks/useGameController.js ══════════════════════════════
// Glue between the pure engine (game/*) and the UI: timing, AI sequencing, sounds, wallet.

const DEAL_INTERVAL = 230; // ms between cards (flight itself ≈ 0.45s)
const EVENT_SOUNDS = {
  draw: 'card_deal',
  flip: 'card_place',
  capture: 'card_place',
  meld: 'card_place',
  discard: 'card_discard',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const between = (a, b) => a + Math.random() * (b - a);

function useGameController({ initialBalance = 10000, onBalanceChange } = {}) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const [balance, setBalance] = useState(initialBalance);
  const [bet, setBet] = useState(250);
  const [level, setLevelRaw] = useState('normal');
  const levelRef = useRef(level);
  levelRef.current = level;

  const [selected, setSelected] = useState([]);
  const [aiFocus, setAiFocus] = useState([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [toast, setToast] = useState(null);
  const [outcomeStage, setOutcomeStage] = useState(null); // null | 'effect' | 'result'
  const [payout, setPayout] = useState(0);
  const [creditPulse, setCreditPulse] = useState(0);
  const settledRound = useRef(0);
  const creditedRound = useRef(0);
  const betRef = useRef(bet);
  const [roundBet, setRoundBet] = useState(0);

  // ── notify host casino of balance changes ───────────────────
  useEffect(() => {
    // TODO: เชื่อมกับ Wallet API ของระบบ Casino จริง (ตอนนี้เป็น Demo Balance ในเครื่อง)
    onBalanceChange?.(balance);
  }, [balance, onBalanceChange]);

  // ระดับผูกกับช่วงเดิมพัน: เปลี่ยนระดับได้เฉพาะตอนไม่ได้อยู่กลางรอบ และปรับเดิมพันให้อยู่ในช่วงอัตโนมัติ
  const levelLocked = state.status === 'dealing' || state.status === 'playing';
  const setLevel = useCallback(
    (lv) => {
      if (stateRef.current.status === 'dealing' || stateRef.current.status === 'playing') return;
      setLevelRaw(lv);
      setBet((b) => fitBet(lv, b, balance));
    },
    [balance]
  );

  const showToast = useCallback((text) => setToast({ text, id: Date.now() }), []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (state.notice) {
      showToast(state.notice);
      sound.play('notification');
    }
  }, [state.notice, showToast]);

  // ── sounds for engine events ────────────────────────────────
  useEffect(() => {
    const ev = state.lastEvent;
    if (ev && EVENT_SOUNDS[ev.type]) sound.play(EVENT_SOUNDS[ev.type]);
  }, [state.lastEvent]);

  // ── dealing: one card at a time ─────────────────────────────
  useEffect(() => {
    if (state.status !== 'dealing') return undefined;
    const t = setTimeout(() => {
      dispatch({ type: 'DEAL_ONE' });
      sound.play('card_deal', { rate: 0.9 + Math.random() * 0.2 });
    }, state.dealt === 0 ? 650 : DEAL_INTERVAL);
    return () => clearTimeout(t);
  }, [state.status, state.dealt]);

  // ── turn start cue ──────────────────────────────────────────
  useEffect(() => {
    if (state.status === 'playing' && state.turn === 'player') sound.play('turn_start');
  }, [state.status, state.turn]);

  // ── AI turn: think → highlight → move → discard ─────────────
  useEffect(() => {
    if (state.status !== 'playing' || state.turn !== 'ai') return undefined;
    let cancelled = false;
    const wait = async (ms) => {
      await sleep(ms);
      return !cancelled && stateRef.current.status === 'playing' && stateRef.current.turn === 'ai';
    };

    (async () => {
      const lvl = levelRef.current;
      const cfg = AI_LEVELS[lvl];
      setAiThinking(true);
      if (!(await wait(between(cfg.thinkMin, cfg.thinkMax)))) return;

      let s = stateRef.current;
      const draw = aiChooseDraw(s, lvl);
      if (draw.type === 'capture') {
        setAiFocus([draw.cardId, s.discard[s.discard.length - 1]?.id]);
        if (!(await wait(700))) return;
        dispatch({ type: 'CAPTURE', who: 'ai', cardId: draw.cardId });
      } else {
        dispatch({ type: 'DRAW', who: 'ai' });
      }
      setAiFocus([]);
      if (!(await wait(800))) return;

      for (const ids of aiChooseMelds(stateRef.current, lvl)) {
        setAiFocus(ids);
        if (!(await wait(650))) return;
        dispatch({ type: 'MELD', who: 'ai', cardIds: ids });
        setAiFocus([]);
        if (!(await wait(700))) return;
      }

      s = stateRef.current;
      const discardId = aiChooseDiscard(s, lvl);
      if (!discardId) return;
      setAiFocus([discardId]);
      if (!(await wait(650))) return;
      setAiFocus([]);
      setAiThinking(false);
      dispatch({ type: 'DISCARD', who: 'ai', cardId: discardId });
    })();

    return () => {
      cancelled = true;
      setAiThinking(false);
      setAiFocus([]);
    };
  }, [state.status, state.turn, state.round]);

  // ── round over → effect → result panel ──────────────────────
  useEffect(() => {
    if (state.status !== 'roundOver' || settledRound.current === state.round) return undefined;
    settledRound.current = state.round;
    const won = state.result.winner;
    setPayout(payoutFor(state.result, betRef.current, state.rules));
    setSelected([]);
    sound.play(won === 'player' ? 'win' : won === 'ai' ? 'lose' : 'notification');
    setOutcomeStage('effect');
    const t = setTimeout(() => setOutcomeStage('result'), won === 'player' ? 2600 : 1700);
    return () => clearTimeout(t);
  }, [state.status, state.round, state.result, state.rules]);

  /** Adds the payout to the wallet exactly once per round (called when coins land). */
  const creditPayout = useCallback(() => {
    if (creditedRound.current === stateRef.current.round || stateRef.current.status !== 'roundOver') return;
    creditedRound.current = stateRef.current.round;
    if (payout > 0) {
      setBalance((b) => b + payout);
      setCreditPulse((n) => n + 1);
    }
  }, [payout]);

  // ── player commands ─────────────────────────────────────────
  const startGame = useCallback(
    ({ free = false } = {}) => {
      sound.unlock();
      if (stateRef.current.status === 'roundOver') creditPayout();
      if (!free) {
        if (!AI_LEVELS[levelRef.current].bets.includes(bet)) {
          showToast(`ระดับ ${AI_LEVELS[levelRef.current].label} เดิมพันได้${AI_LEVELS[levelRef.current].betLimit}`);
          return false;
        }
        if (balance < bet) {
          showToast('เครดิตไม่พอสำหรับเดิมพันนี้ ลดเดิมพันแล้วลองใหม่');
          return false;
        }
        setBalance((b) => b - bet);
      }
      betRef.current = free ? 0 : bet;
      setRoundBet(betRef.current);
      setSelected([]);
      setOutcomeStage(null);
      setPayout(0);
      dispatch({ type: 'START_ROUND' });
      return true;
    },
    [balance, bet, creditPayout, showToast]
  );

  const isMyTurn = state.status === 'playing' && state.turn === 'player';
  const hand = state.hands.player;
  const topDiscard = state.discard[state.discard.length - 1] ?? null;

  const combos = useMemo(() => {
    if (!isMyTurn) return [];
    return state.step === 'draw' ? findValidCombination(hand, topDiscard, state.rules) : findValidCombination(hand, null, state.rules);
  }, [isMyTurn, state.step, hand, topDiscard, state.rules]);

  const toggleSelect = useCallback(
    (id) => {
      if (stateRef.current.status !== 'playing') return;
      sound.play('card_pick');
      setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-2)));
    },
    []
  );

  const draw = useCallback(() => {
    sound.play('button_click');
    if (!isMyTurn || state.step !== 'draw') return;
    setSelected([]);
    dispatch({ type: 'DRAW', who: 'player' });
  }, [isMyTurn, state.step]);

  const capture = useCallback(
    (cardId) => {
      setSelected([]);
      dispatch({ type: 'CAPTURE', who: 'player', cardId });
    },
    []
  );

  const phomSip = useCallback(() => {
    sound.play('button_click');
    if (!isMyTurn) return;
    const pick = selected.map((id) => hand.find((c) => c.id === id)).filter(Boolean);
    if (state.step === 'draw') {
      if (pick.length === 1 && canPair(pick[0], topDiscard, state.rules)) return capture(pick[0].id);
      if (combos.length) {
        setSelected([combos[0].cards[0].id]);
        showToast('เลือกไพ่ที่ผสมกับกองทิ้งได้ให้แล้ว แตะ “ผสมสิบ” อีกครั้ง');
      } else showToast('ไม่มีไพ่ที่รวมกับกองทิ้งได้ 10 — จั่วไพ่แทน');
      return;
    }
    if (pick.length === 2 && isPhomSip(pick, state.rules)) {
      setSelected([]);
      dispatch({ type: 'MELD', who: 'player', cardIds: pick.map((c) => c.id) });
      return;
    }
    if (combos.length) {
      setSelected(combos[0].cards.map((c) => c.id));
      showToast('เลือกคู่ที่รวมได้ 10 ให้แล้ว แตะ “ผสมสิบ” อีกครั้ง');
    } else showToast('ในมือยังไม่มีคู่ที่รวมได้ 10');
  }, [isMyTurn, selected, hand, state.step, state.rules, topDiscard, combos, capture, showToast]);

  const discard = useCallback(() => {
    sound.play('button_click');
    if (!isMyTurn || state.step !== 'play') return;
    if (selected.length !== 1) {
      showToast('แตะเลือกไพ่ 1 ใบที่จะทิ้ง');
      return;
    }
    const id = selected[0];
    setSelected([]);
    dispatch({ type: 'DISCARD', who: 'player', cardId: id });
  }, [isMyTurn, state.step, selected, showToast]);

  /** Tap on the discard pile = try to capture with the selected card */
  const tapDiscardPile = useCallback(() => {
    if (!isMyTurn || state.step !== 'draw') return;
    if (selected.length === 1) {
      const card = hand.find((c) => c.id === selected[0]);
      if (card && canPair(card, topDiscard, state.rules)) return capture(card.id);
    }
    showToast(combos.length ? 'เลือกไพ่ 1 ใบที่รวมกับใบนี้ได้ 10 แล้วแตะกองทิ้ง' : 'ไม่มีไพ่ที่รวมกับกองทิ้งได้ 10');
  }, [isMyTurn, state.step, selected, hand, topDiscard, state.rules, capture, combos.length, showToast]);

  const hint = useMemo(() => {
    if (state.status === 'dealing') return 'กำลังแจกไพ่…';
    if (!isMyTurn) return '';
    if (state.step === 'draw') return combos.length ? 'ผสมกับกองทิ้งได้! หรือจั่วไพ่' : 'แตะ “จั่วไพ่” หรือแตะกองจั่ว';
    return combos.length ? 'มีคู่ผสมสิบในมือ — ผสม หรือเลือกใบที่จะทิ้ง' : 'เลือกไพ่ 1 ใบแล้วแตะ “ทิ้งไพ่”';
  }, [state.status, isMyTurn, state.step, combos.length]);

  const liveScores = useMemo(() => scoresOf(state, false), [state]);

  const debug = useMemo(
    () => ({
      forceWin: () => dispatch({ type: 'FORCE_RESULT', winner: 'player' }),
      forceLose: () => dispatch({ type: 'FORCE_RESULT', winner: 'ai' }),
      restart: () => startGame({ free: true }),
      deal: () => startGame({ free: true }),
      nextTurn: () => dispatch({ type: 'NEXT_TURN' }),
    }),
    [startGame]
  );

  const leaveRound = useCallback(() => {
    if (stateRef.current.status === 'roundOver') creditPayout();
    setOutcomeStage(null);
    setSelected([]);
    dispatch({ type: 'RESET' });
  }, [creditPayout]);

  return {
    state,
    balance,
    bet,
    roundBet,
    setBet,
    level,
    setLevel,
    levelLocked,
    selected,
    toggleSelect,
    aiFocus,
    aiThinking,
    toast,
    showToast,
    outcomeStage,
    payout,
    creditPayout,
    creditPulse,
    isMyTurn,
    combos,
    hint,
    liveScores,
    topDiscard,
    actions: { startGame, draw, phomSip, discard, tapDiscardPile, leaveRound },
    debug,
  };
}

// ═══ hooks/usePhomSipOnline.js ═══════════════════════════════
// Online tables (backend/src/phomsip/hub.js decides every move). Returns the same shape as
// useGameController, built from server snapshots, so GameTable renders both the same way.
// Card ids in snapshots are per-game tokens: the same token follows a card from the deck to a hand,
// the discard pile or a meld, so the layout animations still fly without revealing hidden cards.
const ONLINE_POLL_MS = 600;
const ONLINE_ERR = {
  insufficient_balance: 'เครดิตไม่พอสำหรับเดิมพันและค่าเข้าโต๊ะ',
  not_your_turn: 'ยังไม่ถึงตาของคุณ',
  illegal: 'เดินแบบนี้ไม่ได้',
  bad_card: 'เลือกไพ่ใหม่อีกครั้ง',
  not_logged_in: 'กรุณาเข้าสู่ระบบก่อน',
};
const EMPTY_ONLINE = { status: 'idle', round: 0, turn: 'player', step: 'draw', deck: [], discard: [], hands: { player: [], ai: [] }, melds: { player: [], ai: [] }, bonus: { player: 0, ai: 0 }, result: null, lastEvent: null, notice: null, rules: RULES };
const hiddenCard = (id) => ({ id, hidden: true, value: 0, rank: '', symbol: '', color: 'black' });
const deckOf = (n, topId) => Array.from({ length: Math.max(0, n) }, (_, i) => (i === n - 1 ? { id: topId || 'deck-top' } : null));

function usePhomSipOnline({ api, wallet = 0 }) {
  const [view, setView] = useState(null);
  const [rooms, setRooms] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dealt, setDealt] = useState(999);
  const [selected, setSelected] = useState([]);
  const [toast, setToast] = useState(null);
  const [outcomeStage, setOutcomeStage] = useState(null);
  const [creditPulse, setCreditPulse] = useState(0);
  const [, setClock] = useState(0);
  const alive = useRef(true);
  const apiRef = useRef(api);
  apiRef.current = api;
  const prev = useRef(null);
  const timers = useRef(new Set());
  const dealTimers = useRef([]);
  const credited = useRef('');
  const later = (ms, fn) => { const t = setTimeout(() => { timers.current.delete(t); if (alive.current) fn(); }, ms); timers.current.add(t); return t; };
  useEffect(() => { alive.current = true; return () => { alive.current = false; timers.current.forEach(clearTimeout); }; }, []);
  useEffect(() => { const id = setInterval(() => setClock((c) => c + 1), 500); return () => clearInterval(id); }, []);

  const showToast = useCallback((text) => setToast({ text, id: Date.now() }), []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const absorb = useCallback((v) => {
    if (!v || !alive.current) return;
    const p = prev.current;
    v._at = Date.now();
    prev.current = v;
    setView(v);
    if (!v.seated || !v.game) { setDealt(999); if (!v.seated || v.status !== 'ended') setOutcomeStage(null); return; }
    const g = v.game;
    const pg = p && p.seated && p.game && p.tableId === v.tableId ? p.game : null;
    const newRound = !pg || pg.round !== g.round;
    if (newRound) { setSelected([]); setOutcomeStage(null); }
    // deal: count the cards out one by one (the server dealt them all at once)
    if (g.status === 'dealing' && g.deal && (newRound || pg.status !== 'dealing')) {
      dealTimers.current.forEach(clearTimeout);
      setDealt(0);
      dealTimers.current = g.deal.map((d, k) => later(650 + k * DEAL_INTERVAL, () => {
        setDealt(k + 1);
        sound.play(d.to === 'discard' ? 'card_place' : 'card_deal', { rate: 0.9 + Math.random() * 0.2 });
      }));
    } else if (g.status !== 'dealing') { dealTimers.current.forEach(clearTimeout); setDealt(999); }
    if (pg && !newRound && g.lastEvent && (!pg.lastEvent || pg.lastEvent.seq !== g.lastEvent.seq) && EVENT_SOUNDS[g.lastEvent.type]) sound.play(EVENT_SOUNDS[g.lastEvent.type]);
    if (g.status === 'playing' && g.turn === 'player' && (!pg || pg.turn !== 'player' || pg.status !== 'playing')) sound.play('turn_start');
    if (pg && pg.turn === 'player' && g.turn !== 'player') setSelected([]);
    if (g.status === 'roundOver' && (!pg || pg.status !== 'roundOver')) {
      const won = g.result ? g.result.winner : 'tie';
      setSelected([]);
      sound.play(won === 'player' ? 'win' : won === 'ai' ? 'lose' : 'notification');
      setOutcomeStage('effect');
      later(won === 'player' ? 2600 : 1700, () => setOutcomeStage((s) => (s === 'effect' ? 'result' : s)));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const poll = useCallback(async () => {
    try { const v = await apiRef.current.poll('/api/cards/phomsip/state'); if (alive.current) { absorb(v); setError(''); } }
    catch (e) { if (alive.current) setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กำลังลองใหม่…'); }
  }, [absorb]);
  useEffect(() => {
    let stop = false;
    let t = 0;
    const loop = async () => { if (stop) return; await poll(); if (!stop) t = setTimeout(loop, typeof document !== 'undefined' && document.hidden ? 2500 : ONLINE_POLL_MS); };
    loop();
    return () => { stop = true; clearTimeout(t); };
  }, [poll]);

  const loadRooms = useCallback(async () => {
    try { const r = await apiRef.current.poll('/api/cards/phomsip/rooms'); if (alive.current) setRooms(r.rooms || []); }
    catch (e) { if (alive.current) setRooms([]); }
  }, []);
  const join = useCallback(async (room) => {
    sound.unlock();
    setBusy(true); setError('');
    try { await apiRef.current.call('/api/cards/phomsip/join', { room }); sound.play('coin'); await poll(); return true; }
    catch (e) { setError(ONLINE_ERR[e && e.message] || 'เข้าโต๊ะไม่สำเร็จ ลองใหม่อีกครั้ง'); return false; }
    finally { if (alive.current) setBusy(false); }
  }, [poll]);
  const leave = useCallback(async () => {
    try { await apiRef.current.call('/api/cards/phomsip/leave', {}); } catch (e) { /* not seated */ }
    setOutcomeStage(null); setSelected([]);
    await poll();
    loadRooms();
  }, [poll, loadRooms]);
  const send = useCallback(async (m) => {
    try { const v = await apiRef.current.call('/api/cards/phomsip/act', m); absorb(v); return true; }
    catch (e) { showToast(ONLINE_ERR[e && e.message] || 'เดินไม่สำเร็จ ลองใหม่'); sound.play('notification'); poll(); return false; }
  }, [absorb, poll, showToast]);

  // ── the table as GameTable expects it ───────────────────────
  const state = useMemo(() => {
    const g = view && view.seated && view.game;
    if (!g) return EMPTY_ONLINE;
    const base = { ...EMPTY_ONLINE, round: g.round, turn: g.turn, step: g.step, bonus: g.bonus, lastEvent: g.lastEvent, result: g.result };
    if (g.status === 'dealing' && g.deal && dealt < g.deal.length) {
      const shown = g.deal.slice(0, dealt);
      const mine = new Map(g.hands.player.map((c) => [c.id, c]));
      return {
        ...base,
        status: 'dealing',
        deck: deckOf(g.deckCount + g.deal.length - dealt, g.deal[dealt].id),
        hands: { player: shown.filter((d) => d.to === 'player').map((d) => mine.get(d.id) || hiddenCard(d.id)), ai: shown.filter((d) => d.to === 'ai').map((d) => hiddenCard(d.id)) },
        discard: [],
      };
    }
    return { ...base, status: g.status, deck: deckOf(g.deckCount, g.deckTop), discard: g.discard, hands: g.hands, melds: g.melds };
  }, [view, dealt]);

  const isMyTurn = state.status === 'playing' && state.turn === 'player';
  const hand = state.hands.player;
  const topDiscard = state.discard[state.discard.length - 1] ?? null;
  const combos = useMemo(() => {
    if (!isMyTurn) return [];
    return state.step === 'draw' ? findValidCombination(hand, topDiscard, RULES) : findValidCombination(hand, null, RULES);
  }, [isMyTurn, state.step, hand, topDiscard]);

  const toggleSelect = useCallback((id) => {
    if (prev.current?.game?.status !== 'playing') return;
    sound.play('card_pick');
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)));
  }, []);
  const draw = useCallback(() => {
    sound.play('button_click');
    if (!isMyTurn || state.step !== 'draw') return;
    setSelected([]);
    send({ type: 'draw' });
  }, [isMyTurn, state.step, send]);
  const capture = useCallback((id) => { setSelected([]); send({ type: 'capture', id }); }, [send]);
  const phomSip = useCallback(() => {
    sound.play('button_click');
    if (!isMyTurn) return;
    const pick = selected.map((id) => hand.find((c) => c.id === id)).filter(Boolean);
    if (state.step === 'draw') {
      if (pick.length === 1 && canPair(pick[0], topDiscard, RULES)) return capture(pick[0].id);
      if (combos.length) { setSelected([combos[0].cards[0].id]); showToast('เลือกไพ่ที่ผสมกับกองทิ้งได้ให้แล้ว แตะ “ผสมสิบ” อีกครั้ง'); }
      else showToast('ไม่มีไพ่ที่รวมกับกองทิ้งได้ 10 — จั่วไพ่แทน');
      return;
    }
    if (pick.length === 2 && isPhomSip(pick, RULES)) { setSelected([]); send({ type: 'meld', ids: pick.map((c) => c.id) }); return; }
    if (combos.length) { setSelected(combos[0].cards.map((c) => c.id)); showToast('เลือกคู่ที่รวมได้ 10 ให้แล้ว แตะ “ผสมสิบ” อีกครั้ง'); }
    else showToast('ในมือยังไม่มีคู่ที่รวมได้ 10');
  }, [isMyTurn, selected, hand, state.step, topDiscard, combos, capture, showToast, send]);
  const discard = useCallback(() => {
    sound.play('button_click');
    if (!isMyTurn || state.step !== 'play') return;
    if (selected.length !== 1) { showToast('แตะเลือกไพ่ 1 ใบที่จะทิ้ง'); return; }
    const id = selected[0];
    setSelected([]);
    send({ type: 'discard', id });
  }, [isMyTurn, state.step, selected, showToast, send]);
  const tapDiscardPile = useCallback(() => {
    if (!isMyTurn || state.step !== 'draw') return;
    if (selected.length === 1) {
      const card = hand.find((c) => c.id === selected[0]);
      if (card && canPair(card, topDiscard, RULES)) return capture(card.id);
    }
    showToast(combos.length ? 'เลือกไพ่ 1 ใบที่รวมกับใบนี้ได้ 10 แล้วแตะกองทิ้ง' : 'ไม่มีไพ่ที่รวมกับกองทิ้งได้ 10');
  }, [isMyTurn, state.step, selected, hand, topDiscard, capture, combos.length, showToast]);
  const startGame = useCallback(() => { sound.unlock(); setOutcomeStage(null); send({ type: 'ready' }); return true; }, [send]);

  const hint = useMemo(() => {
    if (state.status === 'dealing') return 'กำลังแจกไพ่…';
    if (!isMyTurn) return '';
    if (state.step === 'draw') return combos.length ? 'ผสมกับกองทิ้งได้! หรือจั่วไพ่' : 'แตะ “จั่วไพ่” หรือแตะกองจั่ว';
    return combos.length ? 'มีคู่ผสมสิบในมือ — ผสม หรือเลือกใบที่จะทิ้ง' : 'เลือกไพ่ 1 ใบแล้วแตะ “ทิ้งไพ่”';
  }, [state.status, isMyTurn, state.step, combos.length]);
  const liveScores = useMemo(() => scoresOf(state, false), [state]);

  const payout = (view && view.results && view.results.payout) || 0;
  const creditPayout = useCallback(() => {
    const key = `${view?.tableId}-${state.round}`;
    if (credited.current === key) return;
    credited.current = key;
    if (payout > 0) setCreditPulse((n) => n + 1);
  }, [view?.tableId, state.round, payout]);

  const g = view && view.game;
  const opp = view && view.opponent;
  const left = (ms) => Math.max(0, Math.ceil(((ms || 0) - (Date.now() - (view?._at || Date.now()))) / 1000));
  return {
    online: true,
    view, rooms, loadRooms, join, leave, error, busy,
    state,
    balance: wallet,
    bet: view?.room?.bet || 0,
    roundBet: view?.room?.bet || 0,
    setBet: () => {},
    level: view?.room?.ai || 'normal',
    setLevel: () => {},
    levelLocked: true,
    selected, toggleSelect,
    aiFocus: (g && g.focus) || [],
    aiThinking: !!(opp && opp.kind === 'bot' && state.status === 'playing' && state.turn === 'ai'),
    toast, showToast,
    outcomeStage, payout, creditPayout, creditPulse,
    isMyTurn, combos, hint, liveScores, topDiscard,
    oppName: opp ? `${opp.avatar || ''} ${opp.name}`.trim() : 'ผู้เล่นอื่น',
    myName: view?.me?.name || 'คุณ',
    turnLeft: g && g.turnMsLeft ? left(g.turnMsLeft) : 0,
    phaseLeft: left(view?.msLeft),
    actions: { startGame, draw, phomSip, discard, tapDiscardPile, leaveRound: leave },
    debug: {},
  };
}

// ═══ components/PlayingCard.jsx ══════════════════════════════
// Remembers which side each card showed last, so a card that changes container
// (deck → hand, AI hand → discard) flips while it flies instead of popping.
const lastFace = new Map();

const FLIGHT = { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 }; // ≈ 0.45s, slight overshoot = "snap"

function CardFront({ card }) {
  const tone = card.color === 'red' ? 'is-red' : 'is-black';
  return (
    <div className={`pcard__face pcard__front ${tone}`}>
      <div className="pcard__corner pcard__corner--tl">
        <span className="pcard__rank">{card.rank}</span>
        <span className="pcard__suit">{card.symbol}</span>
      </div>
      {card.face ? (
        <div className="pcard__court">
          <span className="pcard__court-rank">{card.rank}</span>
          <span className="pcard__court-suit">{card.symbol}</span>
        </div>
      ) : (
        <div className={`pcard__pip ${card.rank === 'A' ? 'is-ace' : ''}`}>{card.symbol}</div>
      )}
      <div className="pcard__corner pcard__corner--br">
        <span className="pcard__rank">{card.rank}</span>
        <span className="pcard__suit">{card.symbol}</span>
      </div>
      <div className="pcard__sheen" />
    </div>
  );
}

function CardBack() {
  return (
    <div className="pcard__face pcard__back">
      <div className="pcard__back-frame">
        <div className="pcard__back-emblem">
          <span>๑๐</span>
        </div>
      </div>
      <div className="pcard__sheen" />
    </div>
  );
}

/**
 * Layers: shadow (box-shadow) → border → background → content → sheen highlight.
 * Pass `layoutId={card.id}` to let Framer Motion fly the card between containers.
 */
function PlayingCardBase({
  card,
  faceUp = true,
  size = 'md',
  selected = false,
  focus = false,
  glow = false,
  dim = false,
  layoutId,
  onClick,
  style,
  animate,
  className = '',
  ariaLabel,
}) {
  const id = card?.id ?? layoutId;
  const [initialFace] = useState(() => (lastFace.has(id) ? lastFace.get(id) : faceUp));
  const [flying, setFlying] = useState(false);

  useEffect(() => {
    lastFace.set(id, faceUp);
  }, [id, faceUp]);

  const classes = [
    'pcard',
    `pcard--${size}`,
    selected && 'is-selected',
    focus && 'is-focus',
    glow && 'is-glow',
    dim && 'is-dim',
    flying && 'is-flying',
    onClick && 'is-interactive',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.div
      layoutId={layoutId}
      layout={layoutId ? true : undefined}
      className={classes}
      style={style}
      initial={false}
      animate={animate}
      transition={FLIGHT}
      onClick={onClick}
      onLayoutAnimationStart={() => setFlying(true)}
      onLayoutAnimationComplete={() => setFlying(false)}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? selected : undefined}
      aria-label={ariaLabel ?? (faceUp && card ? `${card.rank}${card.symbol}` : 'ไพ่คว่ำ')}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <motion.div
        className="pcard__inner"
        initial={{ rotateY: initialFace ? 0 : 180 }}
        animate={{ rotateY: faceUp ? 0 : 180 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* TODO(production): ไพ่คว่ำของฝ่ายตรงข้ามไม่ควรรู้หน้าไพ่ฝั่ง client — ให้ server ส่งเฉพาะใบที่เปิดแล้ว */}
        {card && <CardFront card={card} />}
        <CardBack />
      </motion.div>
    </motion.div>
  );
}

const PlayingCard = memo(PlayingCardBase);

// ═══ components/CasinoButton.jsx ═════════════════════════════
/**
 * Layered casino button: shadow → gradient body → border → inner highlight → icon + label.
 * Press = scale 1 → .96 → 1 with a ripple from the touch point.
 */
function CasinoButton({ variant = 'gold', size = 'md', icon: Icon, children, onClick, disabled, pulse, className = '', ...rest }) {
  const [ripples, setRipples] = useState([]);

  const addRipple = (e) => {
    if (disabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 1.4;
    const id = performance.now();
    setRipples((rs) => [...rs, { id, x: e.clientX - r.left - d / 2, y: e.clientY - r.top - d / 2, d }]);
    setTimeout(() => setRipples((rs) => rs.filter((x) => x.id !== id)), 600);
  };

  return (
    <motion.button
      type="button"
      className={`cbtn cbtn--${variant} cbtn--${size} ${pulse && !disabled ? 'is-pulse' : ''} ${className}`}
      onPointerDown={addRipple}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 520, damping: 22 }}
      {...rest}
    >
      <span className="cbtn__body">
        <span className="cbtn__shine" aria-hidden />
        {Icon && <Icon className="cbtn__icon" size={size === 'lg' ? 22 : 18} strokeWidth={2.2} />}
        <span className="cbtn__label">{children}</span>
        {ripples.map((r) => (
          <span key={r.id} className="cbtn__ripple" style={{ left: r.x, top: r.y, width: r.d, height: r.d }} />
        ))}
      </span>
    </motion.button>
  );
}

// ═══ components/Modal.jsx ════════════════════════════════════
/** Glass sheet: bottom sheet on phones, centered card on larger screens. Wrap in <AnimatePresence>. */
function Modal({ title, onClose, children }) {
  return (
    <motion.div className="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="modal__sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__head">
          <h3>{title}</h3>
          <button type="button" className="hud__icon" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function Toggle({ label, checked, onChange, icon: Icon }) {
  return (
    <label className="toggle">
      {Icon && <Icon size={18} />}
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <i aria-hidden />
    </label>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'is-on' : ''} onClick={() => onChange(o.value)}>
          {value === o.value && <motion.span layoutId="seg-pill" className="seg__pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

// ═══ components/PlayerHand.jsx ═══════════════════════════════
/** Measures an element's width and follows resizes. */
function useWidth(ref) {
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([entry]) => setW(entry.contentRect.width));
    ro.observe(ref.current);
    setW(ref.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/**
 * Fan / overlap layout. Spacing shrinks as the hand grows; if it would get
 * too tight, the row becomes horizontally scrollable instead.
 */
function fanLayout(n, width, cardW) {
  if (n === 0 || !width) return { positions: [], innerW: width, scroll: false };
  const maxStep = cardW * 0.74;
  const minStep = cardW * 0.4;
  let step = n > 1 ? Math.min(maxStep, (width - cardW - 8) / (n - 1)) : 0;
  const scroll = n > 1 && step < minStep;
  if (scroll) step = minStep;
  const total = cardW + step * (n - 1);
  const start = Math.max(0, (width - total) / 2);
  const mid = (n - 1) / 2;
  const tilt = Math.min(5, 24 / n);
  const positions = Array.from({ length: n }, (_, i) => ({
    left: start + i * step,
    rotate: (i - mid) * tilt,
    y: (i - mid) ** 2 * (cardW * 0.025),
  }));
  return { positions, innerW: Math.max(width, total), scroll };
}

function PlayerHand({ cards, cardW, selected, onToggle, interactive, winningIds }) {
  const ref = useRef(null);
  const width = useWidth(ref);
  const { positions, innerW, scroll } = fanLayout(cards.length, width, cardW);

  return (
    <div className={`hand ${scroll ? 'is-scroll' : ''}`} ref={ref}>
      <div className="hand__inner" style={{ width: innerW }}>
        {cards.map((card, i) => {
          const p = positions[i] ?? { left: 0, rotate: 0, y: 0 };
          const isSel = selected.includes(card.id);
          return (
            <PlayingCard
              key={card.id}
              layoutId={card.id}
              card={card}
              size="hand"
              faceUp
              selected={isSel}
              glow={winningIds?.has(card.id)}
              onClick={interactive ? () => onToggle(card.id) : undefined}
              style={{ left: p.left, zIndex: isSel ? 30 + i : 10 + i }}
              animate={{ rotate: isSel ? p.rotate * 0.4 : p.rotate, y: isSel ? -26 : p.y, scale: isSel ? 1.05 : 1 }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ═══ components/OpponentHand.jsx ═════════════════════════════
/** Face-down opponent cards in a tight reversed fan. AI "focus" lifts a card toward the table. */
function OpponentHand({ cards, focusIds = [], reveal = false }) {
  const n = cards.length;
  const mid = (n - 1) / 2;
  return (
    <div className="opp-hand" aria-label={`ไพ่ฝ่ายตรงข้าม ${n} ใบ`}>
      {cards.map((card, i) => {
        const focused = focusIds.includes(card.id);
        return (
          <PlayingCard
            key={card.id}
            layoutId={card.id}
            card={card}
            size="opp"
            faceUp={reveal}
            focus={focused}
            style={{ zIndex: 10 + i, marginLeft: i === 0 ? 0 : 'calc(var(--opp-w) * -0.55)' }}
            animate={{ rotate: -(i - mid) * 4, y: focused ? 14 : Math.abs(i - mid) * -1.5, scale: focused ? 1.12 : 1 }}
          />
        );
      })}
    </div>
  );
}

// ═══ components/CardDeck.jsx ═════════════════════════════════
/** Draw pile: static stacked layers + the real top card (which carries the layoutId). */
function CardDeck({ deck, onDraw, active }) {
  const top = deck[deck.length - 1];
  const layers = Math.min(5, Math.ceil(deck.length / 9));
  return (
    <div className="pile">
      <motion.div
        className={`deck ${active ? 'is-active' : ''}`}
        onClick={active ? onDraw : undefined}
        whileTap={active ? { scale: 0.96 } : undefined}
        role={active ? 'button' : undefined}
        aria-label={`กองจั่ว เหลือ ${deck.length} ใบ`}
      >
        <div className="slot" />
        {Array.from({ length: layers }, (_, i) => (
          <div key={i} className="deck__layer" style={{ transform: `translate(${-i * 1.2}px, ${-i * 1.6}px)` }} />
        ))}
        {top && (
          <PlayingCard
            key={top.id}
            layoutId={top.id}
            card={top}
            size="pile"
            faceUp={false}
            className="deck__top"
            style={{ left: -layers * 1.2, top: -layers * 1.6 }}
          />
        )}
        {active && <div className="deck__ring" />}
      </motion.div>
      <span className="pile__label">
        กองจั่ว <b>{deck.length}</b>
      </span>
    </div>
  );
}

// ═══ components/DiscardPile.jsx ══════════════════════════════
// deterministic tilt per card so the pile looks naturally messy but never jitters on re-render
const tiltOf = (id) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 30) - 15) * 1; // −15° … +15°
};

function DiscardPile({ cards, onTap, canCapture, focusIds = [] }) {
  const visible = cards.slice(-3);
  return (
    <div className="pile">
      <div
        className={`discard ${canCapture ? 'is-capturable' : ''}`}
        onClick={onTap}
        role="button"
        aria-label={cards.length ? `กองทิ้ง ใบบนสุด ${cards[cards.length - 1].rank}${cards[cards.length - 1].symbol}` : 'กองทิ้งว่าง'}
      >
        <div className="slot" />
        {visible.map((card, i) => {
          const isTop = i === visible.length - 1;
          return (
            <PlayingCard
              key={card.id}
              layoutId={card.id}
              card={card}
              size="pile"
              faceUp
              focus={focusIds.includes(card.id)}
              glow={isTop && canCapture}
              dim={!isTop}
              style={{ zIndex: 5 + i }}
              animate={{ rotate: tiltOf(card.id), y: 0, scale: 1 }}
            />
          );
        })}
      </div>
      <span className="pile__label">กองทิ้ง</span>
    </div>
  );
}

// ═══ components/MeldArea.jsx ═════════════════════════════════
const MAX_VISIBLE = 4;

/** Completed "ผสมสิบ" pairs. Shows the latest pairs; older ones collapse into a counter. */
function MeldArea({ melds, highlight = false, align = 'start' }) {
  const hidden = Math.max(0, melds.length - MAX_VISIBLE);
  const visible = melds.slice(-MAX_VISIBLE);
  return (
    <div className={`melds melds--${align} ${highlight ? 'is-highlight' : ''}`} aria-label={`ผสมสิบแล้ว ${melds.length} คู่`}>
      {melds.length === 0 && <span className="melds__empty">ยังไม่มีคู่ผสม</span>}
      {hidden > 0 && <span className="melds__more">+{hidden}</span>}
      {visible.map((m) => (
        <div key={m.id} className="meld">
          {m.cards.map((c, i) => (
            <PlayingCard
              key={c.id}
              layoutId={c.id}
              card={c}
              size="mini"
              faceUp
              glow={highlight}
              style={{ zIndex: i + 1 }}
              animate={{ rotate: i === 0 ? -6 : 6, y: 0, scale: 1 }}
            />
          ))}
          <span className="meld__pts">+{m.points}</span>
        </div>
      ))}
    </div>
  );
}

// ═══ components/PlayerSeat.jsx ═══════════════════════════════
/** Avatar + name + status + card count + score. Gold ring/pulse when it's this seat's turn. */
function PlayerSeat({ who, name, status, cardCount, score, active, compact = false }) {
  const Icon = who === 'ai' ? UserRound : User;
  return (
    <div className={`seat ${active ? 'is-active' : ''} ${compact ? 'seat--compact' : ''}`}>
      <div className="seat__avatar-wrap">
        {active && <span className="seat__ring" aria-hidden />}
        {active && <span className="seat__pulse" aria-hidden />}
        <div className={`seat__avatar seat__avatar--${who}`}>
          <Icon size={compact ? 18 : 22} strokeWidth={1.8} />
        </div>
        <span className="seat__count" aria-label={`${cardCount} ใบ`}>
          {cardCount}
        </span>
      </div>
      <div className="seat__info">
        <span className="seat__name">{name}</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={status}
            className="seat__status"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {status}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="seat__score" aria-label={`คะแนน ${score}`}>
        <motion.b key={score} initial={{ scale: 1.4, color: '#fff3c4' }} animate={{ scale: 1, color: 'var(--gold-200)' }} transition={{ duration: 0.45 }}>
          {score}
        </motion.b>
        <small>แต้ม</small>
      </div>
    </div>
  );
}

// ═══ components/TurnIndicator.jsx ════════════════════════════
function TurnIndicator({ mode, hint }) {
  // mode: 'player' | 'ai' | 'deal' | 'idle'
  const label = mode === 'player' ? 'ตาของคุณ' : mode === 'ai' ? 'ผู้เล่นอื่นกำลังเล่น' : mode === 'deal' ? 'กำลังแจกไพ่' : '';
  return (
    <div className="turn" aria-live="polite">
      <AnimatePresence mode="wait">
        {label && (
          <motion.div
            key={mode}
            className={`turn__pill turn__pill--${mode}`}
            initial={{ opacity: 0, scale: 0.85, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          >
            {label}
            {mode !== 'player' && (
              <span className="turn__dots" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {hint && mode === 'player' && (
          <motion.p key={hint} className="turn__hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══ components/ActionButtons.jsx ════════════════════════════
function ActionButtons({ canDraw, canDiscard, canPhomSip, onDraw, onDiscard, onPhomSip }) {
  return (
    <div className="actions">
      <CasinoButton variant="burgundy" icon={ArrowDownToLine} onClick={onDiscard} disabled={!canDiscard}>
        ทิ้งไพ่
      </CasinoButton>
      <CasinoButton variant="gold" size="lg" icon={Plus} onClick={onDraw} disabled={!canDraw}>
        จั่วไพ่
      </CasinoButton>
      <CasinoButton variant="special" icon={Sparkles} onClick={onPhomSip} disabled={!canPhomSip} pulse={canPhomSip}>
        ผสมสิบ
      </CasinoButton>
    </div>
  );
}

// ═══ components/GameHeader.jsx ═══════════════════════════════
const IconBtn = ({ label, onClick, children, off }) => (
  <motion.button type="button" className={`hud__icon ${off ? 'is-off' : ''}`} aria-label={label} onClick={onClick} whileTap={{ scale: 0.9 }}>
    {children}
  </motion.button>
);

const GameHeader = forwardRef(function GameHeader({ balance, bet, creditPulse, soundOn, onToggleSound, onBack, onSettings }, walletRef) {
  const shown = useCountUp(balance, { duration: 1.1 });
  return (
    <header className="hud">
      <IconBtn label="กลับ" onClick={onBack}>
        <ArrowLeft size={20} />
      </IconBtn>

      <div className="hud__title">
        <h1>ผสมสิบ</h1>
        {bet > 0 && <span className="hud__bet">เดิมพัน {formatMoney(bet)}</span>}
      </div>

      <motion.div
        ref={walletRef}
        key={creditPulse}
        className="hud__wallet"
        initial={creditPulse ? { scale: 1.12, boxShadow: '0 0 28px rgba(246,214,138,.8)' } : false}
        animate={{ scale: 1, boxShadow: '0 0 0 rgba(246,214,138,0)' }}
        transition={{ duration: 0.8 }}
        aria-label={`เครดิต ${formatMoney(balance)} บาท`}
      >
        <span className="hud__coin" aria-hidden>
          ฿
        </span>
        <b>{formatMoney(shown)}</b>
      </motion.div>

      <IconBtn label={soundOn ? 'ปิดเสียง' : 'เปิดเสียง'} onClick={onToggleSound} off={!soundOn}>
        {soundOn ? <Volume2 size={19} /> : <VolumeX size={19} />}
      </IconBtn>
      <IconBtn label="ตั้งค่า" onClick={onSettings}>
        <Settings size={19} />
      </IconBtn>
    </header>
  );
});

// ═══ components/WinEffect.jsx ════════════════════════════════
const OUTCOME_FX = {
  win: { title: 'ชนะ!', tone: 'win' },
  lose: { title: 'จบเกม', tone: 'lose' },
  tie: { title: 'เสมอ', tone: 'tie' },
};

// Particle sets are generated once per mount, so they never reshuffle mid-animation.
function useParticles(count, make) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => Array.from({ length: count }, (_, i) => make(i)), []);
}

function Coins() {
  const coins = useParticles(22, (i) => {
    const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.3;
    const dist = 120 + Math.random() * 170;
    return { id: i, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist * 0.7 - 40, rot: Math.random() * 720 - 360, delay: 0.55 + Math.random() * 0.2, s: 0.7 + Math.random() * 0.6 };
  });
  return coins.map((c) => (
    <motion.span
      key={c.id}
      className="fx-coin"
      initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotateY: 0 }}
      animate={{ x: [0, c.x, c.x * 1.1], y: [0, c.y, c.y + 260], scale: [0, c.s, c.s * 0.9], opacity: [0, 1, 0], rotateY: c.rot }}
      transition={{ duration: 1.9, delay: c.delay, times: [0, 0.35, 1], ease: 'easeOut' }}
    />
  ));
}

function Confetti() {
  const bits = useParticles(36, (i) => ({
    id: i,
    left: Math.random() * 100,
    delay: 0.8 + Math.random() * 0.9,
    dur: 2.4 + Math.random() * 1.6,
    drift: Math.random() * 80 - 40,
    rot: Math.random() * 900,
    hue: ['#f6d68a', '#fff4d6', '#c9973f', '#e9e2cf', '#2f8f6b'][i % 5],
  }));
  return bits.map((b) => (
    <motion.span
      key={b.id}
      className="fx-confetti"
      style={{ left: `${b.left}%`, background: b.hue }}
      initial={{ y: '-10vh', x: 0, rotate: 0, opacity: 0 }}
      animate={{ y: '110vh', x: b.drift, rotate: b.rot, opacity: [0, 1, 1, 0] }}
      transition={{ duration: b.dur, delay: b.delay, ease: 'linear' }}
    />
  ));
}

/** Outcome overlay. Win: darken → gold burst → coins → confetti → big text. Lose/tie: calmer glows. */
function WinEffect({ outcome, subtitle, compact }) {
  const o = OUTCOME_FX[outcome] ?? OUTCOME_FX.lose;
  const isWin = outcome === 'win';
  return (
    <motion.div className={`fx fx--${o.tone}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <div className="fx__dim" />
      <motion.div className="fx__glow" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} />
      {isWin && (
        <>
          <motion.div className="fx__rays" initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 0.85 }} transition={{ duration: 1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            <div className="fx__rays-spin" />
          </motion.div>
          <div className="fx__particles">
            <Coins />
          </div>
          <Confetti />
        </>
      )}
      <motion.div className={`fx__text ${compact ? 'is-compact' : ''}`} animate={compact ? { y: '-35vh', scale: 0.5, opacity: 0.9 } : { y: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 22 }}>
        <motion.h2
          initial={{ scale: isWin ? 2.2 : 1.3, opacity: 0, letterSpacing: '0.2em' }}
          animate={{ scale: 1, opacity: 1, letterSpacing: '0.02em' }}
          transition={{ duration: 0.7, delay: isWin ? 0.45 : 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {o.title}
        </motion.h2>
        {subtitle && (
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: isWin ? 1.1 : 0.6, duration: 0.5 }}>
            {subtitle}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ═══ components/ChipAnimation.jsx ════════════════════════════
/** Coins arc from `fromRef` (reward) into `toRef` (wallet), then calls onDone once. */
function ChipAnimation({ fromRef, toRef, count = 12, onDone }) {
  const [path, setPath] = useState(null);
  const landed = useRef(0);
  const finished = useRef(false);

  useLayoutEffect(() => {
    const a = fromRef.current?.getBoundingClientRect();
    const b = toRef.current?.getBoundingClientRect();
    if (!a || !b) {
      onDone?.();
      return;
    }
    setPath({
      x0: a.left + a.width / 2,
      y0: a.top + a.height / 2,
      dx: b.left + 18 - (a.left + a.width / 2),
      dy: b.top + b.height / 2 - (a.top + a.height / 2),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!path) return null;

  const handleLand = () => {
    landed.current += 1;
    if (landed.current % 2) sound.play('coin', { rate: 0.9 + Math.random() * 0.25 });
    if (landed.current >= count && !finished.current) {
      finished.current = true;
      onDone?.();
    }
  };

  return createPortal(
    <div className="chips" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const spread = (i - count / 2) * 7;
        return (
          <motion.span
            key={i}
            className="fx-coin fx-coin--chip"
            style={{ left: path.x0, top: path.y0 }}
            initial={{ x: spread, y: 0, scale: 0.4, opacity: 0 }}
            animate={{
              x: [spread, spread + path.dx * 0.35, path.dx],
              y: [0, Math.min(path.dy * 0.4, -60) - 60, path.dy],
              scale: [0.4, 1.1, 0.55],
              opacity: [0, 1, 1],
            }}
            transition={{ duration: 0.9, delay: i * 0.06, ease: [0.45, 0, 0.2, 1], times: [0, 0.45, 1] }}
            onAnimationComplete={handleLand}
          />
        );
      })}
    </div>,
    (typeof document !== 'undefined' && document.querySelector('.phomsip-app')) || document.body
  );
}

// ═══ components/ResultPanel.jsx ══════════════════════════════
const REASON = {
  knock: (who) => (who === 'player' ? 'คุณผสมสิบจนหมดมือ' : 'ผู้เล่นอื่นผสมสิบจนหมดมือ'),
  deck: () => 'กองจั่วหมด นับแต้ม',
  debug: () => 'ผลจากโหมดทดสอบ',
};

function Row({ label, p, a, negative }) {
  return (
    <div className="rp__row">
      <span>{label}</span>
      <b>{negative && p ? `−${p}` : p}</b>
      <b>{negative && a ? `−${a}` : a}</b>
    </div>
  );
}

function ResultPanel({ result, payout, bet, walletRef, onCredit, onPlayAgain, onExit, playAgainLabel }) {
  const rewardRef = useRef(null);
  const [target, setTarget] = useState(0);
  const [flying, setFlying] = useState(false);
  const shown = useCountUp(target, { duration: 1 });
  const { scores, winner, reason, knocker } = result;

  useEffect(() => {
    const t1 = setTimeout(() => setTarget(payout), 350);
    const t2 = setTimeout(() => (payout > 0 ? setFlying(true) : onCredit()), 1250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [payout, onCredit]);

  const title = winner === 'player' ? 'ผสมสิบสำเร็จ' : winner === 'tie' ? 'คะแนนเท่ากัน' : 'ผู้เล่นอื่นทำแต้มได้มากกว่า';

  return (
    <motion.div className="rp-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section
        className={`rp rp--${winner}`}
        initial={{ y: 60, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        role="dialog"
        aria-label="ผลการเล่น"
      >
        <header className="rp__head">
          <h3>{title}</h3>
          <p>{(REASON[reason] ?? REASON.deck)(knocker)}</p>
        </header>

        <div className="rp__table">
          <div className="rp__row rp__row--head">
            <span />
            <b>คุณ</b>
            <b>ผู้เล่นอื่น</b>
          </div>
          <Row label="แต้มคู่ผสม" p={scores.player.meldTotal} a={scores.ai.meldTotal} />
          <Row label="โบนัสหมดมือ" p={scores.player.bonus} a={scores.ai.bonus} />
          <Row label="แต้มค้างมือ" p={scores.player.penalty} a={scores.ai.penalty} negative />
          <div className="rp__row rp__row--total">
            <span>รวม</span>
            <b className={winner === 'player' ? 'is-win' : ''}>{scores.player.total}</b>
            <b className={winner === 'ai' ? 'is-win' : ''}>{scores.ai.total}</b>
          </div>
        </div>

        <div className="rp__reward" ref={rewardRef}>
          <span>{winner === 'tie' ? 'คืนเดิมพัน' : payout > 0 ? 'รางวัล' : 'เสียเดิมพัน'}</span>
          <b className={payout > 0 ? 'is-plus' : ''}>
            {payout > 0 ? `+${formatMoney(shown)}` : bet > 0 ? `−${formatMoney(bet)}` : '0'}
          </b>
          {bet > 0 && payout > 0 && <small>เดิมพัน {formatMoney(bet)}</small>}
        </div>

        <div className="rp__actions">
          <CasinoButton variant="ghost" icon={LogOut} onClick={onExit}>
            ออก
          </CasinoButton>
          <CasinoButton variant="gold" size="lg" icon={RotateCcw} onClick={onPlayAgain}>
            {playAgainLabel || 'เล่นอีกครั้ง'}
          </CasinoButton>
        </div>
      </motion.section>
      {flying && <ChipAnimation fromRef={rewardRef} toRef={walletRef} count={12} onDone={onCredit} />}
    </motion.div>
  );
}

// ═══ components/SettingsModal.jsx ════════════════════════════
const settingsLevelOptions = Object.entries(AI_LEVELS).map(([value, v]) => ({ value, label: v.label }));

function SettingsModal({ onClose, soundOn, musicOn, onToggleSound, onToggleMusic, level, onLevel, levelLocked, debugAvailable, debugOn, onToggleDebug }) {
  return (
    <Modal title="ตั้งค่า" onClose={onClose}>
      <Toggle label="เสียงเอฟเฟกต์" icon={Volume2} checked={soundOn} onChange={onToggleSound} />
      <Toggle label="เพลงประกอบ" icon={Music} checked={musicOn} onChange={onToggleMusic} />

      <div className="field">
        <span className="field__label">ระดับคู่แข่ง</span>
        {levelLocked ? (
          <p className="field__note">
            {AI_LEVELS[level].label} (เดิมพัน{AI_LEVELS[level].betLimit}) — เปลี่ยนระดับได้หลังจบรอบนี้
          </p>
        ) : (
          <>
            <Segmented options={settingsLevelOptions} value={level} onChange={onLevel} />
            <p className="field__note">เดิมพัน{AI_LEVELS[level].betLimit}</p>
          </>
        )}
      </div>

      <div className="rules">
        <h4>วิธีเล่น</h4>
        <p>ในแต่ละตา จั่วไพ่ 1 ใบ หรือใช้ไพ่ในมือ 1 ใบรวมกับไพ่บนกองทิ้งให้ได้ 10 จากนั้นผสมสิบคู่ในมือได้ไม่จำกัด แล้วทิ้งไพ่ 1 ใบเพื่อจบตา</p>
        <p>คู่ที่รวมได้ 10: A+9, 2+8, 3+7, 4+6, 5+5 ส่วน 10, J, Q, K ต้องจับคู่ตัวเดียวกัน</p>
        <ul>
          <li>คู่ตัวเลข {RULES.PAIR_POINTS} แต้ม · คู่ 10/J/Q/K {RULES.TEN_GROUP_PAIR_POINTS} แต้ม</li>
          <li>ผสมกับกองทิ้ง โบนัส +{RULES.CAPTURE_BONUS}</li>
          <li>ไพ่หมดมือก่อน โบนัส +{RULES.KNOCK_BONUS} และจบรอบทันที</li>
          <li>จบรอบ หักแต้มไพ่ที่ค้างในมือ ใครแต้มรวมมากกว่าชนะ</li>
        </ul>
      </div>

      {debugAvailable && <Toggle label="Debug panel (dev only)" icon={Bug} checked={debugOn} onChange={onToggleDebug} />}
    </Modal>
  );
}

// ═══ components/DebugPanel.jsx ═══════════════════════════════
const fmt = (cards) => cards.map((c) => `${c.rank}${c.symbol}`).join(' ') || '—';

/** Development-only state inspector. App.jsx renders it only when DEV_MODE is true. */
function DebugPanel({ state, scores, debug, onClose }) {
  const [open, setOpen] = useState(false);
  const top = state.discard[state.discard.length - 1];
  return (
    <motion.aside className={`debug ${open ? '' : 'is-collapsed'}`} drag dragMomentum={false} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <header>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-label="ย่อ/ขยาย">
          <ChevronDown size={14} style={{ transform: open ? 'none' : 'rotate(-90deg)' }} />
        </button>
        <b>DEBUG</b>
        <button type="button" onClick={onClose} aria-label="ปิด debug">
          <X size={14} />
        </button>
      </header>
      {open && (
        <>
          <dl>
            <dt>State</dt>
            <dd>
              {state.status} / {state.step}
            </dd>
            <dt>Turn</dt>
            <dd>{state.turn}</dd>
            <dt>Deck</dt>
            <dd>{state.deck.length}</dd>
            <dt>Discard</dt>
            <dd>{top ? `${top.rank}${top.symbol}` : '—'}</dd>
            <dt>Player</dt>
            <dd>{fmt(state.hands.player)}</dd>
            <dt>AI</dt>
            <dd>{fmt(state.hands.ai)}</dd>
            <dt>Score</dt>
            <dd>
              {scores.player.total} : {scores.ai.total}
            </dd>
          </dl>
          <div className="debug__btns">
            <button type="button" onClick={debug.forceWin}>Force Win</button>
            <button type="button" onClick={debug.forceLose}>Force Lose</button>
            <button type="button" onClick={debug.restart}>Restart</button>
            <button type="button" onClick={debug.deal}>Deal Cards</button>
            <button type="button" onClick={debug.nextTurn}>Next Turn</button>
          </div>
        </>
      )}
    </motion.aside>
  );
}

// ═══ components/Toast.jsx ════════════════════════════════════
function Toast({ toast }) {
  return (
    <div className="toast-zone" aria-live="assertive">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="toast"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══ components/LoadingScreen.jsx ════════════════════════════
/** Short branded loader. TODO: แทนด้วยการ preload asset จริง (รูป/เสียง) เมื่อมีไฟล์ */
function LoadingScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div className="screen loading" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <motion.div className="emblem" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
        <span>๑๐</span>
      </motion.div>
      <div className="loading__bar">
        <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.3, ease: [0.65, 0, 0.35, 1] }} />
      </div>
      <p>กำลังจัดโต๊ะ…</p>
    </motion.div>
  );
}

// ═══ components/IntroScreen.jsx ══════════════════════════════
const demoA = { id: 'intro-4h', rank: '4', symbol: '♥', color: 'red', value: 4 };
const demoB = { id: 'intro-6s', rank: '6', symbol: '♠', color: 'black', value: 6 };
const introLevelOptions = Object.entries(AI_LEVELS).map(([value, v]) => ({ value, label: v.label }));

/** Game intro: the hero *is* the rule — two cards slide together into ten. */
function IntroScreen({ balance, bet, onBet, level, onLevel, onStart }) {
  const bets = AI_LEVELS[level].bets;
  const minBet = bets[0];
  return (
    <motion.div className="screen intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: 0.5 }}>
      <div className="intro__hero" aria-hidden>
        <motion.div initial={{ x: -70, rotate: -18, opacity: 0 }} animate={{ x: -18, rotate: -8, opacity: 1 }} transition={{ delay: 0.25, type: 'spring', stiffness: 120, damping: 16 }}>
          <PlayingCard card={demoA} size="hero" />
        </motion.div>
        <motion.div initial={{ x: 70, rotate: 18, opacity: 0 }} animate={{ x: 18, rotate: 8, opacity: 1 }} transition={{ delay: 0.4, type: 'spring', stiffness: 120, damping: 16 }}>
          <PlayingCard card={demoB} size="hero" />
        </motion.div>
        <motion.div className="intro__ten" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.05, type: 'spring', stiffness: 260, damping: 14 }}>
          10
        </motion.div>
      </div>

      <motion.h1 className="intro__title" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7, duration: 0.6 }}>
        ผสมสิบ
      </motion.h1>
      <p className="intro__lead">จับคู่ไพ่ให้รวมได้ 10 ก่อนคู่แข่ง ไพ่หมดมือเมื่อไหร่ ชนะทันที</p>

      <div className="intro__panel">
        <div className="intro__balance">
          <span>Demo Balance</span>
          <b>฿ {formatMoney(balance)}</b>
        </div>

        <div className="field">
          <span className="field__label">ระดับคู่แข่ง</span>
          <Segmented options={introLevelOptions} value={level} onChange={onLevel} />
        </div>

        <div className="field">
          <span className="field__label">
            เดิมพัน ({AI_LEVELS[level].label} {AI_LEVELS[level].betLimit})
          </span>
          <div className="chips-row" role="radiogroup" aria-label="เลือกเดิมพัน">
            {bets.map((b) => (
              <motion.button
                key={b}
                type="button"
                role="radio"
                aria-checked={bet === b}
                className={`chip chip--${b} ${bet === b ? 'is-on' : ''}`}
                onClick={() => onBet(b)}
                whileTap={{ scale: 0.92 }}
                disabled={b > balance}
              >
                {b >= 1000 ? `${b / 1000}K` : b}
              </motion.button>
            ))}
          </div>
        </div>

        <CasinoButton variant="gold" size="xl" icon={Play} onClick={onStart} disabled={balance < minBet}>
          เริ่มเกม
        </CasinoButton>
        {balance < minBet && <p className="intro__note">เครดิตไม่พอสำหรับ {AI_LEVELS[level].label} ลองระดับที่ต่ำกว่า หรือรีเฟรชหน้าเพื่อเริ่มใหม่ที่ 10,000</p>}
      </div>
    </motion.div>
  );
}

// ═══ components/GameTable.jsx ════════════════════════════════
const IS_DEV = DEV_MODE;

/** Card size follows the smaller of width/height so the table never needs vertical scroll. */
function useCardWidth() {
  const calc = () => {
    if (typeof window === 'undefined') return 70;
    const { innerWidth: w, innerHeight: h } = window;
    return Math.round(Math.min(118, Math.max(56, Math.min(w * 0.185, h * 0.112))));
  };
  const [cw, setCw] = useState(calc);
  useEffect(() => {
    const onResize = () => setCw(calc());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return cw;
}

const OUTCOME_OF = { player: 'win', ai: 'lose', tie: 'tie' };

function GameTable({ game, onExit }) {
  const { state, balance, selected, aiFocus, aiThinking, isMyTurn, combos, hint, liveScores, topDiscard, actions, outcomeStage } = game;
  const snd = useSoundSettings();
  const cardW = useCardWidth();
  const walletRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [debugOn, setDebugOn] = useState(IS_DEV);

  const dealing = state.status === 'dealing';
  const over = state.status === 'roundOver';
  const turnMode = dealing ? 'deal' : state.status !== 'playing' ? 'idle' : state.turn === 'player' ? 'player' : 'ai';

  const winningIds = useMemo(() => {
    if (!over || state.result?.winner === 'tie') return null;
    const w = state.result?.winner;
    return new Set(state.melds[w]?.flatMap((m) => m.cards.map((c) => c.id)));
  }, [over, state.result, state.melds]);

  const aiStatus = dealing
    ? 'รอรับไพ่'
    : over
      ? 'จบรอบ'
      : state.turn === 'ai'
        ? aiThinking
          ? 'กำลังคิด…'
          : 'เล่นอยู่'
        : game.online ? (game.view?.opponent?.kind === 'bot' ? `บอท ${AI_LEVELS[game.level].label}` : 'สมาชิก') : AI_LEVELS[game.level].label;
  const playerStatus = dealing ? 'รอรับไพ่' : over ? 'จบรอบ' : isMyTurn ? `${state.step === 'draw' ? 'จั่ว หรือ ผสมกองทิ้ง' : 'ผสม หรือ ทิ้งไพ่'}${game.turnLeft ? ` · ${game.turnLeft}s` : ''}` : 'รอตา';
  const waiting = game.online && (state.status === 'idle' || (game.view?.status === 'ended' && game.view?.me?.ready));

  const handleBack = () => {
    if ((state.status === 'playing' || dealing) && !(game.online && game.view?.status === 'ended')) setConfirmExit(true);
    else {
      actions.leaveRound();
      onExit();
    }
  };

  const subtitle =
    state.result?.winner === 'player' ? 'ผสมสิบสำเร็จ' : state.result?.winner === 'tie' ? 'แบ่งแต้มเท่ากัน' : 'ลองใหม่อีกครั้ง';

  return (
    <div className="table" style={{ '--card-w': `${cardW}px` }}>
      <div className="felt" aria-hidden>
        <div className="felt__rail" />
        <div className="felt__light" />
        <div className="felt__texture" />
        <div className="felt__vignette" />
      </div>

      <GameHeader
        ref={walletRef}
        balance={balance}
        bet={game.roundBet}
        creditPulse={game.creditPulse}
        soundOn={snd.soundOn}
        onToggleSound={snd.toggleSound}
        onBack={handleBack}
        onSettings={() => setSettingsOpen(true)}
      />

      <LayoutGroup>
        <section className="zone zone--opp">
          <PlayerSeat
            who="ai"
            name={game.oppName || 'ผู้เล่นอื่น'}
            status={waiting ? 'รอผู้เล่น' : aiStatus}
            cardCount={state.hands.ai.length}
            score={liveScores.ai.total}
            active={state.status === 'playing' && state.turn === 'ai'}
            compact
          />
          <OpponentHand cards={state.hands.ai} focusIds={aiFocus} reveal={over} />
          <MeldArea melds={state.melds.ai} highlight={over && state.result?.winner === 'ai'} align="end" />
        </section>

        <section className="zone zone--center">
          <CardDeck deck={state.deck} onDraw={actions.draw} active={isMyTurn && state.step === 'draw'} />
          <TurnIndicator mode={turnMode} hint={hint} />
          <DiscardPile
            cards={state.discard}
            onTap={actions.tapDiscardPile}
            canCapture={isMyTurn && state.step === 'draw' && combos.length > 0}
            focusIds={aiFocus}
          />
        </section>

        <section className="zone zone--me">
          <div className="me-bar">
            <PlayerSeat
              who="player"
              name={game.myName || 'คุณ'}
              status={waiting ? 'รอเริ่มเกม' : playerStatus}
              cardCount={state.hands.player.length}
              score={liveScores.player.total}
              active={isMyTurn}
            />
            <MeldArea melds={state.melds.player} highlight={over && state.result?.winner === 'player'} align="end" />
          </div>
          <PlayerHand
            cards={state.hands.player}
            cardW={cardW}
            selected={selected}
            onToggle={game.toggleSelect}
            interactive={state.status === 'playing'}
            winningIds={winningIds}
          />
        </section>
      </LayoutGroup>

      <ActionButtons
        canDraw={isMyTurn && state.step === 'draw'}
        canDiscard={isMyTurn && state.step === 'play'}
        canPhomSip={isMyTurn && combos.length > 0}
        onDraw={actions.draw}
        onDiscard={actions.discard}
        onPhomSip={actions.phomSip}
      />

      <Toast toast={game.toast} />

      {waiting && (
        <div className="ps-wait">
          <div className="ps-wait__box">
            <b>{game.view?.status === 'waiting' ? 'กำลังหาผู้เล่น…' : 'รอเริ่มเกมถัดไป…'}</b>
            <span>{game.view?.status === 'waiting' ? `ถ้าไม่มีสมาชิกเข้ามา บอทจะนั่งแทนใน ${game.phaseLeft} วินาที` : `เกมใหม่เริ่มใน ${game.phaseLeft} วินาที`}</span>
            <small>โต๊ะ {game.view?.room?.name} · เดิมพัน {formatMoney(game.roundBet)} · ค่าเข้า {formatMoney(game.view?.room?.fee || 0)}</small>
          </div>
        </div>
      )}
      {game.online && game.error && <div className="ps-net">{game.error}</div>}

      <AnimatePresence>
        {over && outcomeStage && <WinEffect key={`fx-${state.round}`} outcome={OUTCOME_OF[state.result.winner]} subtitle={subtitle} compact={outcomeStage === 'result'} />}
      </AnimatePresence>
      <AnimatePresence>
        {over && outcomeStage === 'result' && (
          <ResultPanel
            key={`rp-${state.round}`}
            result={state.result}
            payout={game.payout}
            bet={game.roundBet}
            walletRef={walletRef}
            onCredit={game.creditPayout}
            playAgainLabel={game.online ? `เล่นอีกครั้ง (${game.phaseLeft})` : undefined}
            onPlayAgain={() => actions.startGame()}
            onExit={() => {
              actions.leaveRound();
              onExit();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsModal
            onClose={() => setSettingsOpen(false)}
            soundOn={snd.soundOn}
            musicOn={snd.musicOn}
            onToggleSound={snd.toggleSound}
            onToggleMusic={snd.toggleMusic}
            level={game.level}
            onLevel={game.setLevel}
            levelLocked={game.levelLocked}
            debugAvailable={IS_DEV}
            debugOn={debugOn}
            onToggleDebug={() => setDebugOn((d) => !d)}
          />
        )}
        {confirmExit && (
          <Modal title="ออกจากโต๊ะ?" onClose={() => setConfirmExit(false)}>
            <p className="modal__text">{game.online ? `รอบนี้ยังไม่จบ ถ้าลุกจากโต๊ะตอนนี้ บอทจะเล่นแทนจนจบรอบ (เดิมพัน ${game.roundBet.toLocaleString('th-TH')} เครดิต จะได้คืนเฉพาะถ้าบอทชนะ)` : `รอบนี้ยังไม่จบ ถ้าออกตอนนี้จะเสียเดิมพัน ${game.roundBet.toLocaleString('th-TH')} เครดิต`}</p>
            <div className="modal__actions">
              <CasinoButton variant="ghost" onClick={() => setConfirmExit(false)}>
                เล่นต่อ
              </CasinoButton>
              <CasinoButton
                variant="burgundy"
                onClick={() => {
                  setConfirmExit(false);
                  actions.leaveRound();
                  onExit();
                }}
              >
                ออกจากโต๊ะ
              </CasinoButton>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {IS_DEV && debugOn && <DebugPanel state={state} scores={liveScores} debug={game.debug} onClose={() => setDebugOn(false)} />}
    </div>
  );
}

// ═══ App.jsx ═════════════════════════════════════════════════
/**
 * Embeddable entry point.
 *  - initialBalance: wallet from the host casino (demo = 10,000)
 *  - onBalanceChange(balance): host sync hook
 *  - onExit(): host navigation (e.g. back to lobby). Without it, Back returns to the intro screen.
 */
// ═══ components/OnlineLobby.jsx ══════════════════════════════
/** Room picker for the online tables: one row per level, bet + entry fee charged when each game starts. */
function OnlineLobby({ game, balance }) {
  const { rooms, loadRooms, join, busy, error } = game;
  useEffect(() => {
    loadRooms();
    const t = setInterval(loadRooms, 5000);
    return () => clearInterval(t);
  }, [loadRooms]);
  return (
    <motion.div className="screen intro ps-lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: 0.5 }}>
      <div className="intro__hero" aria-hidden>
        <motion.div initial={{ x: -70, rotate: -18, opacity: 0 }} animate={{ x: -18, rotate: -8, opacity: 1 }} transition={{ delay: 0.25, type: 'spring', stiffness: 120, damping: 16 }}>
          <PlayingCard card={demoA} size="hero" />
        </motion.div>
        <motion.div initial={{ x: 70, rotate: 18, opacity: 0 }} animate={{ x: 18, rotate: 8, opacity: 1 }} transition={{ delay: 0.4, type: 'spring', stiffness: 120, damping: 16 }}>
          <PlayingCard card={demoB} size="hero" />
        </motion.div>
        <motion.div className="intro__ten" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.05, type: 'spring', stiffness: 260, damping: 14 }}>
          10
        </motion.div>
      </div>
      <h1 className="intro__title">ผสมสิบ ออนไลน์</h1>
      <p className="intro__lead">ดวลตัวต่อตัวกับสมาชิก ถ้าไม่มีคู่แข่ง บอทจะนั่งแทน · ชนะรับเงินกองกลาง 2 เท่าของเดิมพัน</p>
      <div className="intro__panel">
        <div className="intro__balance">
          <span>เครดิต</span>
          <b>฿ {formatMoney(balance)}</b>
        </div>
        <div className="ps-rooms">
          {(rooms || []).map((r) => {
            const poor = balance < r.bet + r.fee;
            return (
              <motion.button key={r.id} type="button" className="ps-room" disabled={busy || poor} onClick={() => join(r.id)} whileTap={{ scale: 0.97 }}>
                <span className="ps-room__lv">LV{r.level}</span>
                <span className="ps-room__name">
                  <b>{r.name}</b>
                  <small>เดิมพัน {formatMoney(r.bet)} · ค่าเข้า {formatMoney(r.fee)}</small>
                </span>
                <span className="ps-room__pot">
                  <b>฿{formatMoney(r.pot)}</b>
                  <small>{poor ? 'เครดิตไม่พอ' : `${r.players} คนเล่นอยู่`}</small>
                </span>
              </motion.button>
            );
          })}
          {!rooms && <p className="intro__note">กำลังโหลดห้อง…</p>}
        </div>
        {error && <p className="intro__note">{error}</p>}
      </div>
    </motion.div>
  );
}

/** Online wrapper: lobby until seated, then the same table UI driven by the server. */
function PhomSipOnline({ api, wallet, onExit }) {
  const [loaded, setLoaded] = useState(false);
  const game = usePhomSipOnline({ api, wallet });
  const seated = !!(game.view && game.view.seated);
  const handleLoaded = useCallback(() => setLoaded(true), []);
  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <GlobalStyles />
        <AnimatePresence mode="wait">
          {!loaded && <LoadingScreen key="loading" onDone={handleLoaded} />}
          {loaded && !seated && <OnlineLobby key="lobby" game={game} balance={wallet} />}
          {loaded && seated && <GameTable key={`game-${game.view.tableId}`} game={game} onExit={() => {}} />}
        </AnimatePresence>
        {loaded && !seated && <Toast toast={game.toast} />}
        <div className="rotate-hint">หมุนโทรศัพท์เป็นแนวตั้งเพื่อเล่นต่อ</div>
      </div>
    </MotionConfig>
  );
}

/**
 * With `api` ({ call, poll } - the WINNER 69 server or the in-browser local hub) the game is online;
 * without it, the original single-player demo against the AI.
 */
export default function PhomSipGame({ api, wallet = 0, initialBalance = 10000, onBalanceChange, onExit }) {
  return (
    <div className="phomsip-app" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {api ? <PhomSipOnline api={api} wallet={wallet} onExit={onExit} /> : <PhomSipSolo initialBalance={initialBalance} onBalanceChange={onBalanceChange} onExit={onExit} />}
    </div>
  );
}

function PhomSipSolo({ initialBalance = 10000, onBalanceChange, onExit }) {
  const [screen, setScreen] = useState('loading'); // loading | intro | game
  const game = useGameController({ initialBalance, onBalanceChange });
  const { balance, bet, setBet } = game;

  // keep the chosen bet affordable
  useEffect(() => {
    const fit = fitBet(game.level, bet, balance);
    if (fit !== bet) setBet(fit);
  }, [balance, bet, setBet, game.level]);

  const handleLoaded = useCallback(() => setScreen('intro'), []);

  const handleStart = () => {
    if (game.actions.startGame()) setScreen('game');
  };

  const handleExit = () => {
    if (onExit) onExit();
    else setScreen('intro');
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <GlobalStyles />
        <AnimatePresence mode="wait">
          {screen === 'loading' && <LoadingScreen key="loading" onDone={handleLoaded} />}
          {screen === 'intro' && (
            <IntroScreen key="intro" balance={balance} bet={bet} onBet={setBet} level={game.level} onLevel={game.setLevel} onStart={handleStart} />
          )}
          {screen === 'game' && <GameTable key="game" game={game} onExit={handleExit} />}
        </AnimatePresence>
        {screen === 'intro' && <Toast toast={game.toast} />}
        <div className="rotate-hint">หมุนโทรศัพท์เป็นแนวตั้งเพื่อเล่นต่อ</div>
      </div>
    </MotionConfig>
  );
}

// ═══ styles.css (inject once) ════════════════════════════
const PHOM_SIP_CSS = `


.phomsip-app{
  --gold-50: #fff9e8;
  --gold-100: #fff1cc;
  --gold-200: #f6d68a;
  --gold-400: #d9b25f;
  --gold-600: #a87b2c;
  --gold-800: #5e4214;

  --felt-400: #1d7457;
  --felt-600: #0f4535;
  --felt-800: #072a20;
  --ink: #030605;

  --burgundy-400: #a3273d;
  --burgundy-600: #6e1423;
  --burgundy-900: #2a060d;

  --cream: #fbf6ea;
  --card-red: #b3182b;
  --card-black: #17191c;

  --text: #efe6cf;
  --text-muted: rgba(239, 230, 207, 0.62);
  --line: rgba(217, 178, 95, 0.22);

  --font-ui: 'IBM Plex Sans Thai', 'Noto Sans Thai', system-ui, sans-serif;
  --font-display: 'Noto Serif Thai', 'IBM Plex Sans Thai', Georgia, serif;
  --font-card: 'Playfair Display', Georgia, 'Times New Roman', serif;

  --card-w: 68px;

  --safe-t: env(safe-area-inset-top, 0px);
  --safe-b: env(safe-area-inset-bottom, 0px);

  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}

.phomsip-app *,.phomsip-app *::before,.phomsip-app *::after{
  box-sizing: border-box;
}

.phomsip-app,.phomsip-app,.phomsip-app #root{
  height: 100%;
  margin: 0;
}

.phomsip-app{
  background: var(--ink);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: 15px;
  line-height: 1.5;
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
}

.phomsip-app button{
  font: inherit;
  color: inherit;
}

.phomsip-app :focus-visible{
  outline: 2px solid var(--gold-200);
  outline-offset: 3px;
}

.phomsip-app h1,.phomsip-app h2,.phomsip-app h3,.phomsip-app h4,.phomsip-app p{
  margin: 0;
}

.phomsip-app .app{
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: radial-gradient(ellipse 90% 70% at 50% 40%, #0d3a2c, var(--ink) 80%);
}


.phomsip-app .gold-text,.phomsip-app .hud__title h1,.phomsip-app .intro__title,.phomsip-app .fx--win .fx__text h2,.phomsip-app .fx--tie .fx__text h2,.phomsip-app .emblem span,.phomsip-app .pcard__back-emblem span{
  background: linear-gradient(180deg, #fff6d8 0%, #f6d68a 38%, #c9973f 62%, #f3d58d 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}



.phomsip-app .screen{
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: calc(20px + var(--safe-t)) 18px calc(20px + var(--safe-b));
}

.phomsip-app .loading{
  gap: 22px;
}

.phomsip-app .emblem{
  width: 104px;
  height: 104px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle, #33091a 0 60%, transparent 61%),
    conic-gradient(from 210deg, #7a5212, #f6d68a, #fff6d8, #c9973f, #7a5212, #f6d68a, #7a5212);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.7),
    0 0 50px rgba(246, 214, 138, 0.25),
    inset 0 0 18px rgba(0, 0, 0, 0.6);
}

.phomsip-app .emblem span{
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 44px;
  line-height: 1;
}

.phomsip-app .loading__bar{
  width: 180px;
  height: 3px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.phomsip-app .loading__bar i{
  display: block;
  height: 100%;
  transform-origin: left;
  background: linear-gradient(90deg, var(--gold-600), var(--gold-200), var(--gold-50));
}

.phomsip-app .loading p{
  color: var(--text-muted);
  font-size: 14px;
}

.phomsip-app .intro{
  justify-content: flex-start;
  overflow-y: auto;
  gap: 12px;
  padding-top: calc(28px + var(--safe-t));
}

.phomsip-app .intro::before{
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 35% at 50% 18%, rgba(255, 210, 140, 0.16), transparent 70%),
    radial-gradient(ellipse 100% 80% at 50% 50%, transparent 40%, rgba(0, 0, 0, 0.7));
  pointer-events: none;
}

.phomsip-app .intro > *{
  position: relative;
  flex-shrink: 0;
}

.phomsip-app .intro__hero{
  position: relative;
  width: 240px;
  height: clamp(132px, 22vh, 190px);
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: auto;
}

.phomsip-app .intro__hero > div{
  position: absolute;
}

.phomsip-app .intro__ten{
  bottom: -4px;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  z-index: 5;
  font-family: var(--font-card);
  font-weight: 800;
  font-size: 26px;
  color: #2b1a04;
  background: radial-gradient(circle at 35% 30%, #fff6d8, #f1c75c 45%, #a87b2c 90%);
  box-shadow:
    0 0 0 3px rgba(43, 26, 4, 0.75),
    0 0 0 4px rgba(246, 214, 138, 0.8),
    0 10px 30px rgba(0, 0, 0, 0.5),
    0 0 40px rgba(246, 214, 138, 0.5);
}

.phomsip-app .intro__title{
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(42px, min(12vw, 8vh), 76px);
  line-height: 1.3;
  margin-top: 4px;
  filter: drop-shadow(0 4px 18px rgba(0, 0, 0, 0.6));
}

.phomsip-app .intro__lead{
  text-align: center;
  color: var(--text-muted);
  max-width: 30ch;
  font-size: 15px;
  line-height: 1.6;
}

.phomsip-app .intro__panel,.phomsip-app .glass{
  background: linear-gradient(180deg, rgba(30, 40, 34, 0.78), rgba(10, 14, 12, 0.86));
  border: 1px solid var(--line);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 20px 50px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.phomsip-app .intro__panel{
  width: min(400px, 100%);
  border-radius: 24px;
  padding: 18px;
  display: grid;
  gap: 16px;
  margin: 10px 0 auto;
}

.phomsip-app .intro__balance{
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
  font-size: 14px;
}

.phomsip-app .intro__balance b{
  font-size: 22px;
  color: var(--gold-200);
  font-variant-numeric: tabular-nums;
}

.phomsip-app .intro__note{
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
}

.phomsip-app .field{
  display: grid;
  gap: 8px;
}

.phomsip-app .field__label{
  font-size: 13px;
  color: var(--text-muted);
}

.phomsip-app .field__note{
  font-size: 13px;
  color: var(--text-muted);
}


.phomsip-app .chips-row{
  display: flex;
  justify-content: space-around;
  gap: 8px;
}

.phomsip-app .chip{
  --c: #2f6f9e;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  border: 0;
  cursor: pointer;
  font-weight: 700;
  font-size: 15px;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  background:
    radial-gradient(circle, var(--c) 0 54%, rgba(255, 255, 255, 0.85) 55% 57%, transparent 58%),
    repeating-conic-gradient(from 8deg, rgba(255, 255, 255, 0.92) 0 11deg, var(--c) 11deg 45deg);
  box-shadow:
    inset 0 0 0 3px rgba(0, 0, 0, 0.25),
    inset 0 2px 6px rgba(255, 255, 255, 0.35),
    0 6px 14px rgba(0, 0, 0, 0.5);
  transition: box-shadow 0.25s var(--ease-out), opacity 0.2s;
}

.phomsip-app .chip--20{
  --c: #5b6470;
}
.phomsip-app .chip--50{
  --c: #b5651d;
}
.phomsip-app .chip--250{
  --c: #2b7d55;
}
.phomsip-app .chip--2500{
  --c: #4b2a7a;
}
.phomsip-app .chip--5000{
  --c: #8a6a1c;
}
.phomsip-app .chip--500{
  --c: #8c1d2f;
}
.phomsip-app .chip--1000{
  --c: #22201c;
}

.phomsip-app .chip.is-on{
  box-shadow:
    inset 0 0 0 3px rgba(0, 0, 0, 0.25),
    inset 0 2px 6px rgba(255, 255, 255, 0.35),
    0 0 0 2px var(--ink),
    0 0 0 4px var(--gold-200),
    0 0 24px rgba(246, 214, 138, 0.55);
}

.phomsip-app .chip:disabled{
  opacity: 0.3;
  cursor: not-allowed;
}



.phomsip-app .table{
  
  --card-h: calc(var(--card-w) * 1.4);
  --pile-w: calc(var(--card-w) * 0.92);
  --opp-w: calc(var(--card-w) * 0.52);
  --mini-w: calc(var(--card-w) * 0.38);
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto auto;
  padding: var(--safe-t) max(10px, calc((100% - 1040px) / 2)) 0;
}

.phomsip-app .felt{
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(ellipse 85% 68% at 50% 46%, var(--felt-400) 0%, var(--felt-600) 42%, var(--felt-800) 72%, #020806 100%);
}

.phomsip-app .felt > div{
  position: absolute;
  inset: 0;
}


.phomsip-app .felt__rail{
  inset: calc(62px + var(--safe-t)) 6px calc(78px + var(--safe-b)) !important;
  border-radius: 48% / 18%;
  box-shadow:
    inset 0 0 0 1px rgba(217, 178, 95, 0.32),
    inset 0 0 0 5px rgba(0, 0, 0, 0.18),
    inset 0 0 0 6px rgba(217, 178, 95, 0.1),
    inset 0 0 70px rgba(0, 0, 0, 0.45),
    0 0 40px rgba(217, 178, 95, 0.08);
}

.phomsip-app .felt__light{
  background: radial-gradient(ellipse 55% 38% at 50% 40%, rgba(255, 214, 150, 0.13), transparent 70%);
  mix-blend-mode: screen;
}

.phomsip-app .felt__texture{
  opacity: 0.22;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.phomsip-app .felt__vignette{
  background: radial-gradient(ellipse 100% 85% at 50% 48%, transparent 45%, rgba(0, 0, 0, 0.72) 100%);
}

.phomsip-app .zone,.phomsip-app .hud,.phomsip-app .actions{
  position: relative; 
}



.phomsip-app .hud{
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto auto;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 6px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(18, 24, 21, 0.78), rgba(6, 10, 8, 0.6));
  border: 1px solid var(--line);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 10px 30px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 20;
}

.phomsip-app .hud__icon{
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--gold-200);
  border: 1px solid rgba(217, 178, 95, 0.25);
  background: linear-gradient(180deg, #26302b, #111714);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 4px 10px rgba(0, 0, 0, 0.35);
}

.phomsip-app .hud__icon.is-off{
  color: var(--text-muted);
}

.phomsip-app .hud__title{
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-left: 4px;
  line-height: 1.2;
}

.phomsip-app .hud__title h1{
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 21px;
  line-height: 1.35;
  white-space: nowrap;
}

.phomsip-app .hud__bet{
  font-size: 11.5px;
  color: var(--text-muted);
  white-space: nowrap;
}

.phomsip-app .hud__wallet{
  display: flex;
  align-items: center;
  gap: 7px;
  height: 42px;
  padding: 0 12px 0 5px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.25));
  border: 1px solid rgba(217, 178, 95, 0.35);
}

.phomsip-app .hud__wallet b{
  font-size: 16px;
  font-weight: 700;
  color: var(--gold-100);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
}

.phomsip-app .hud__coin{
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 15px;
  color: #3a2406;
  background: radial-gradient(circle at 35% 30%, #fff6cf, #f1c75c 45%, #a87b2c 90%);
  box-shadow:
    inset 0 0 0 2px rgba(255, 240, 190, 0.5),
    0 2px 6px rgba(0, 0, 0, 0.4);
}



.phomsip-app .zone--opp{
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-areas:
    'seat hand'
    'melds melds';
  align-items: center;
  gap: 6px 10px;
  padding: 12px 6px 0;
}

.phomsip-app .zone--opp .seat{
  grid-area: seat;
}
.phomsip-app .zone--opp .opp-hand{
  grid-area: hand;
}
.phomsip-app .zone--opp .melds{
  grid-area: melds;
}

.phomsip-app .zone--center{
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  gap: 8px;
  padding: 4px 0;
  min-height: 0;
}

.phomsip-app .zone--me{
  display: flex;
  flex-direction: column;
}

.phomsip-app .me-bar{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 6px;
}



.phomsip-app .seat{
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.phomsip-app .seat__avatar-wrap{
  position: relative;
  width: 46px;
  height: 46px;
  flex: none;
}

.phomsip-app .seat--compact .seat__avatar-wrap{
  width: 40px;
  height: 40px;
}

.phomsip-app .seat__avatar{
  position: absolute;
  inset: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--gold-100);
  background: radial-gradient(circle at 35% 28%, #3e4c44, #121a16 72%);
  border: 2px solid rgba(217, 178, 95, 0.55);
  box-shadow:
    inset 0 2px 4px rgba(255, 255, 255, 0.12),
    inset 0 -4px 8px rgba(0, 0, 0, 0.5),
    0 6px 14px rgba(0, 0, 0, 0.45);
  animation: breathe 4.2s ease-in-out infinite;
}

.phomsip-app .seat__avatar--ai{
  background: radial-gradient(circle at 35% 28%, #7a1f30, #2a060d 75%);
}

.phomsip-app .seat__ring{
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0 40%, var(--gold-200) 70%, #fff6d8 78%, transparent 92%);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px));
  animation: spin 2.2s linear infinite;
}

.phomsip-app .seat__pulse{
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  animation: ringPulse 1.8s ease-out infinite;
}

.phomsip-app .seat__count{
  position: absolute;
  right: -6px;
  bottom: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 11.5px;
  font-weight: 700;
  color: #2b1a04;
  background: linear-gradient(180deg, #ffe7a3, #c48f2e);
  box-shadow: 0 0 0 2px var(--felt-800);
}

.phomsip-app .seat__info{
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.3;
}

.phomsip-app .seat__name{
  font-weight: 600;
  font-size: 14.5px;
  white-space: nowrap;
}

.phomsip-app .seat.is-active .seat__name{
  color: var(--gold-200);
}

.phomsip-app .seat__status{
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.phomsip-app .seat__score{
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.1;
  padding: 4px 9px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(217, 178, 95, 0.2);
}

.phomsip-app .seat__score b{
  font-family: var(--font-card);
  font-size: 18px;
  color: var(--gold-200);
  font-variant-numeric: tabular-nums;
}

.phomsip-app .seat__score small{
  font-size: 10.5px;
  color: var(--text-muted);
}



.phomsip-app .pcard{
  --w: var(--card-w);
  position: relative;
  width: var(--w);
  height: calc(var(--w) * 1.4);
  border-radius: calc(var(--w) * 0.085);
  perspective: 900px;
  flex: none;
}

.phomsip-app .pcard--hand{
  position: absolute;
  top: 34px;
}
.phomsip-app .pcard--pile{
  --w: var(--pile-w);
}
.phomsip-app .pcard--opp{
  --w: var(--opp-w);
}
.phomsip-app .pcard--mini{
  --w: var(--mini-w);
}
.phomsip-app .pcard--hero{
  --w: clamp(84px, 14vh, 112px);
}

.phomsip-app .pcard.is-interactive{
  cursor: pointer;
}

.phomsip-app .pcard.is-flying{
  z-index: 200 !important;
}

.phomsip-app .pcard__inner{
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  transform-style: preserve-3d;
}

.phomsip-app .pcard__face{
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.35),
    0 2px 4px rgba(0, 0, 0, 0.3);
  transition:
    box-shadow 0.3s var(--ease-out),
    filter 0.3s;
}

.phomsip-app .pcard--mini .pcard__face,.phomsip-app .pcard--opp .pcard__face{
  box-shadow:
    0 4px 10px rgba(0, 0, 0, 0.4),
    0 1px 2px rgba(0, 0, 0, 0.3);
}

.phomsip-app .pcard.is-flying .pcard__face{
  box-shadow:
    0 26px 44px rgba(0, 0, 0, 0.5),
    0 6px 10px rgba(0, 0, 0, 0.3);
  filter: blur(0.35px);
}


.phomsip-app .pcard__front{
  background: linear-gradient(158deg, #fffdf7 0%, #faf3e2 52%, #ece1c4 100%);
  border: 1px solid rgba(70, 52, 24, 0.35);
}

.phomsip-app .pcard__front::before{
  content: '';
  position: absolute;
  inset: calc(var(--w) * 0.035);
  border-radius: calc(var(--w) * 0.06);
  border: 1px solid rgba(168, 123, 44, 0.22);
  pointer-events: none;
}

.phomsip-app .pcard__front.is-red{
  color: var(--card-red);
}
.phomsip-app .pcard__front.is-black{
  color: var(--card-black);
}

.phomsip-app .pcard__corner{
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 0.95;
  top: calc(var(--w) * 0.06);
  left: calc(var(--w) * 0.065);
}

.phomsip-app .pcard__corner--br{
  top: auto;
  left: auto;
  bottom: calc(var(--w) * 0.06);
  right: calc(var(--w) * 0.065);
  transform: rotate(180deg);
}

.phomsip-app .pcard__rank{
  font-family: var(--font-card);
  font-weight: 800;
  font-size: calc(var(--w) * 0.25);
  letter-spacing: -0.04em;
}

.phomsip-app .pcard__suit{
  font-size: calc(var(--w) * 0.19);
  margin-top: calc(var(--w) * 0.01);
}

.phomsip-app .pcard__pip{
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: calc(var(--w) * 0.5);
  line-height: 1;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
}

.phomsip-app .pcard__pip.is-ace{
  font-size: calc(var(--w) * 0.62);
}

.phomsip-app .pcard__court{
  position: absolute;
  inset: 19% 17%;
  border-radius: calc(var(--w) * 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
  border: 1px solid rgba(168, 123, 44, 0.55);
  background:
    linear-gradient(160deg, rgba(255, 246, 216, 0.95), rgba(236, 214, 160, 0.95)),
    #f2e2b8;
  box-shadow:
    inset 0 0 0 2px rgba(255, 255, 255, 0.6),
    inset 0 0 12px rgba(168, 123, 44, 0.25);
}

.phomsip-app .pcard__court-rank{
  font-family: var(--font-card);
  font-weight: 800;
  font-size: calc(var(--w) * 0.36);
}

.phomsip-app .pcard__court-suit{
  font-size: calc(var(--w) * 0.2);
}


.phomsip-app .pcard--mini .pcard__corner--br,.phomsip-app .pcard--mini .pcard__pip,.phomsip-app .pcard--mini .pcard__court,.phomsip-app .pcard--opp .pcard__corner--br,.phomsip-app .pcard--opp .pcard__court,.phomsip-app .pcard--opp .pcard__pip{
  display: none;
}

.phomsip-app .pcard--mini .pcard__rank,.phomsip-app .pcard--opp .pcard__rank{
  font-size: calc(var(--w) * 0.44);
}

.phomsip-app .pcard--mini .pcard__suit,.phomsip-app .pcard--opp .pcard__suit{
  font-size: calc(var(--w) * 0.36);
}

.phomsip-app .pcard--mini .pcard__front::before,.phomsip-app .pcard--opp .pcard__front::before{
  display: none;
}


.phomsip-app .pcard__back{
  transform: rotateY(180deg);
  border: 1px solid rgba(217, 178, 95, 0.55);
  background:
    repeating-linear-gradient(45deg, rgba(217, 178, 95, 0.16) 0 1px, transparent 1px 7px),
    repeating-linear-gradient(-45deg, rgba(217, 178, 95, 0.16) 0 1px, transparent 1px 7px),
    radial-gradient(circle at 50% 38%, #93203a, #4d0c19 66%, #24050b);
}

.phomsip-app .pcard__back-frame{
  position: absolute;
  inset: 7%;
  border-radius: calc(var(--w) * 0.05);
  border: 1px solid rgba(246, 214, 138, 0.55);
  box-shadow:
    inset 0 0 0 2px rgba(0, 0, 0, 0.25),
    inset 0 0 0 3px rgba(246, 214, 138, 0.2);
  display: grid;
  place-items: center;
}

.phomsip-app .pcard__back-emblem{
  width: 52%;
  aspect-ratio: 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle, #3a0812 0 58%, transparent 60%),
    conic-gradient(from 200deg, #7a5212, #f6d68a, #fff6d8, #c9973f, #7a5212, #f6d68a, #7a5212);
  box-shadow: 0 0 calc(var(--w) * 0.12) rgba(0, 0, 0, 0.6);
}

.phomsip-app .pcard__back-emblem span{
  font-family: var(--font-display);
  font-weight: 800;
  font-size: calc(var(--w) * 0.17);
  line-height: 1;
}

.phomsip-app .pcard--mini .pcard__back-emblem span,.phomsip-app .pcard--opp .pcard__back-emblem span{
  display: none;
}

.phomsip-app .pcard__sheen{
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(125deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 30%, rgba(255, 255, 255, 0) 72%, rgba(255, 255, 255, 0.1) 100%);
}

.phomsip-app .pcard__back .pcard__sheen{
  opacity: 0.45;
}


.phomsip-app .pcard.is-selected .pcard__face{
  box-shadow:
    0 22px 38px rgba(0, 0, 0, 0.5),
    0 0 0 2px var(--gold-200),
    0 0 26px rgba(246, 214, 138, 0.7);
}

.phomsip-app .pcard.is-focus .pcard__face{
  box-shadow:
    0 16px 30px rgba(0, 0, 0, 0.5),
    0 0 0 2px var(--gold-200),
    0 0 22px rgba(246, 214, 138, 0.8);
}

.phomsip-app .pcard.is-glow .pcard__face{
  animation: cardGlow 1.4s ease-in-out infinite;
}

.phomsip-app .pcard.is-dim .pcard__face{
  filter: brightness(0.8) saturate(0.85);
}

@media (hover: hover) {
  .phomsip-app .hand .pcard.is-interactive:not(.is-selected):hover .pcard__face{
    box-shadow:
      0 14px 30px rgba(0, 0, 0, 0.45),
      0 0 0 1px rgba(246, 214, 138, 0.7);
  }
}



.phomsip-app .hand{
  position: relative;
  height: calc(var(--card-h) + 46px);
  overflow: visible;
}

.phomsip-app .hand.is-scroll{
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.phomsip-app .hand.is-scroll::-webkit-scrollbar{
  display: none;
}

.phomsip-app .hand__inner{
  position: relative;
  height: 100%;
}

.phomsip-app .opp-hand{
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  min-height: calc(var(--opp-w) * 1.4 + 16px);
  padding: 2px 6px 0 0;
}



.phomsip-app .pile{
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: none;
}

.phomsip-app .deck,.phomsip-app .discard{
  position: relative;
  width: var(--pile-w);
  height: calc(var(--pile-w) * 1.4);
}

.phomsip-app .deck.is-active{
  cursor: pointer;
}

.phomsip-app .discard{
  cursor: pointer;
}

.phomsip-app .slot{
  position: absolute;
  inset: -5px;
  border-radius: calc(var(--pile-w) * 0.11);
  border: 1px dashed rgba(217, 178, 95, 0.28);
  background: rgba(0, 0, 0, 0.14);
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.35);
}

.phomsip-app .deck__layer{
  position: absolute;
  inset: 0;
  border-radius: calc(var(--pile-w) * 0.085);
  background: linear-gradient(160deg, #5a1020, #2a060d);
  border: 1px solid rgba(217, 178, 95, 0.4);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.45);
}

.phomsip-app .deck__top,.phomsip-app .discard .pcard{
  position: absolute;
  left: 0;
  top: 0;
}

.phomsip-app .deck__ring{
  position: absolute;
  inset: -9px;
  border-radius: calc(var(--pile-w) * 0.14);
  border: 1.5px solid var(--gold-200);
  pointer-events: none;
  animation: deckRing 1.6s ease-in-out infinite;
}

.phomsip-app .discard.is-capturable .slot{
  border-style: solid;
  border-color: rgba(246, 214, 138, 0.7);
  box-shadow:
    inset 0 2px 10px rgba(0, 0, 0, 0.35),
    0 0 26px rgba(246, 214, 138, 0.4);
}

.phomsip-app .pile__label{
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

.phomsip-app .pile__label b{
  color: var(--gold-200);
  font-variant-numeric: tabular-nums;
}



.phomsip-app .turn{
  flex: 1;
  min-width: 0;
  max-width: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.phomsip-app .turn__pill{
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 15px;
  white-space: nowrap;
  border: 1px solid rgba(217, 178, 95, 0.4);
  background: rgba(0, 0, 0, 0.45);
  color: var(--gold-100);
  backdrop-filter: blur(6px);
}

.phomsip-app .turn__pill--player{
  color: #2b1a04;
  border-color: #ffefc0;
  background: linear-gradient(180deg, #ffe7a3, #d9a947 60%, #a87b2c);
  animation: pillGlow 1.8s ease-in-out infinite;
}

.phomsip-app .turn__dots{
  display: inline-flex;
  gap: 3px;
}

.phomsip-app .turn__dots i{
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  animation: dot 1.1s ease-in-out infinite;
}

.phomsip-app .turn__dots i:nth-child(2){
  animation-delay: 0.15s;
}
.phomsip-app .turn__dots i:nth-child(3){
  animation-delay: 0.3s;
}

.phomsip-app .turn__hint{
  font-size: 12.5px;
  line-height: 1.45;
  color: rgba(239, 230, 207, 0.78);
  max-width: 20ch;
}



.phomsip-app .melds{
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: calc(var(--mini-w) * 1.4 + 8px);
  min-width: 0;
  overflow: visible;
}

.phomsip-app .melds--end{
  justify-content: flex-end;
}

.phomsip-app .melds__empty{
  font-size: 12px;
  color: rgba(239, 230, 207, 0.4);
}

.phomsip-app .melds__more{
  font-size: 12px;
  font-weight: 700;
  color: var(--gold-200);
}

.phomsip-app .meld{
  position: relative;
  display: flex;
  padding-bottom: 4px;
}

.phomsip-app .meld .pcard + .pcard{
  margin-left: calc(var(--mini-w) * -0.4);
}

.phomsip-app .meld__pts{
  position: absolute;
  left: 50%;
  bottom: -7px;
  transform: translateX(-50%);
  z-index: 5;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--gold-100);
  padding: 0 5px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(217, 178, 95, 0.35);
  white-space: nowrap;
}



.phomsip-app .actions{
  display: grid;
  grid-template-columns: 1fr 1.25fr 1fr;
  gap: 10px;
  padding: 8px 4px calc(12px + var(--safe-b));
}

.phomsip-app .cbtn{
  position: relative;
  border: 0;
  padding: 0;
  background: none;
  border-radius: 18px;
  min-height: 56px;
  cursor: pointer;
  touch-action: manipulation;
}

.phomsip-app .cbtn__body{
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  min-height: inherit;
  padding: 0 12px;
  border-radius: inherit;
  overflow: hidden;
  font-weight: 700;
  font-size: 16px;
  white-space: nowrap;
  transition:
    filter 0.25s,
    box-shadow 0.25s;
}

.phomsip-app .cbtn__shine{
  position: absolute;
  left: 2px;
  right: 2px;
  top: 1px;
  height: 48%;
  border-radius: 16px 16px 40% 40% / 16px 16px 10px 10px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0));
  pointer-events: none;
}

.phomsip-app .cbtn__label,.phomsip-app .cbtn__icon{
  position: relative;
}

.phomsip-app .cbtn__ripple{
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transform: scale(0);
  animation: ripple 0.6s var(--ease-out) forwards;
  pointer-events: none;
}

.phomsip-app .cbtn--gold .cbtn__body{
  color: #2b1a04;
  background: linear-gradient(180deg, #ffe9a8 0%, #eec266 36%, #c48f2e 72%, #93641a 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    inset 0 -3px 0 rgba(90, 55, 10, 0.45),
    0 0 0 1px rgba(70, 44, 8, 0.85),
    0 8px 18px rgba(0, 0, 0, 0.45),
    0 0 26px rgba(246, 214, 138, 0.28);
}

.phomsip-app .cbtn--burgundy .cbtn__body{
  color: #fbe9d0;
  background: linear-gradient(180deg, #b0304a 0%, #7d172b 50%, #4c0a17 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 190, 200, 0.45),
    inset 0 -3px 0 rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(217, 178, 95, 0.45),
    0 8px 18px rgba(0, 0, 0, 0.45);
}

.phomsip-app .cbtn--special .cbtn__body{
  color: var(--gold-100);
  background: linear-gradient(180deg, #3a3017 0%, #1d180c 60%, #110d06 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 230, 160, 0.3),
    inset 0 0 14px rgba(246, 214, 138, 0.18),
    0 0 0 1px var(--gold-400),
    0 8px 18px rgba(0, 0, 0, 0.45);
}

.phomsip-app .cbtn--special .cbtn__shine{
  opacity: 0.35;
}

.phomsip-app .cbtn--ghost .cbtn__body{
  color: var(--text);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 0 0 1px rgba(217, 178, 95, 0.3);
}

.phomsip-app .cbtn--ghost .cbtn__shine{
  display: none;
}

.phomsip-app .cbtn--lg{
  min-height: 60px;
}
.phomsip-app .cbtn--lg .cbtn__body{
  font-size: 18px;
}

.phomsip-app .cbtn--xl{
  min-height: 60px;
  width: 100%;
}
.phomsip-app .cbtn--xl .cbtn__body{
  font-size: 19px;
}

.phomsip-app .cbtn.is-pulse .cbtn__body{
  animation: btnPulse 1.5s ease-in-out infinite;
}

.phomsip-app .cbtn:disabled{
  cursor: not-allowed;
}

.phomsip-app .cbtn:disabled .cbtn__body{
  filter: saturate(0.3) brightness(0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    0 0 0 1px rgba(0, 0, 0, 0.6),
    0 4px 10px rgba(0, 0, 0, 0.35);
}



.phomsip-app .toast-zone{
  position: fixed;
  left: 0;
  right: 0;
  top: calc(74px + var(--safe-t));
  display: flex;
  justify-content: center;
  z-index: 320;
  pointer-events: none;
  padding: 0 16px;
}

.phomsip-app .toast{
  max-width: 420px;
  text-align: center;
  padding: 10px 16px;
  border-radius: 14px;
  font-size: 14px;
  color: var(--gold-50);
  background: rgba(8, 12, 10, 0.9);
  border: 1px solid rgba(217, 178, 95, 0.4);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
}



.phomsip-app .fx{
  position: fixed;
  inset: 0;
  z-index: 300;
  pointer-events: none;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.phomsip-app .fx__dim{
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.phomsip-app .fx--lose .fx__dim{
  background: rgba(0, 0, 0, 0.62);
}

.phomsip-app .fx__glow{
  position: absolute;
  width: 130vmax;
  height: 130vmax;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 214, 140, 0.4), rgba(255, 190, 90, 0.12) 25%, transparent 50%);
}

.phomsip-app .fx--lose .fx__glow{
  background: radial-gradient(circle, rgba(214, 84, 40, 0.3), rgba(160, 30, 30, 0.1) 26%, transparent 50%);
}

.phomsip-app .fx--tie .fx__glow{
  background:
    radial-gradient(circle, rgba(120, 170, 255, 0.28), rgba(80, 120, 220, 0.1) 22%, transparent 42%),
    radial-gradient(circle, transparent 30%, rgba(246, 214, 138, 0.12) 36%, transparent 48%);
}

.phomsip-app .fx__rays{
  position: absolute;
  width: 160vmax;
  height: 160vmax;
}

.phomsip-app .fx__rays-spin{
  width: 100%;
  height: 100%;
  background: repeating-conic-gradient(from 0deg, rgba(255, 222, 150, 0.2) 0deg 5deg, transparent 5deg 15deg);
  -webkit-mask: radial-gradient(circle, #000 0%, transparent 42%);
  mask: radial-gradient(circle, #000 0%, transparent 42%);
  animation: spin 22s linear infinite;
}

.phomsip-app .fx__particles{
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
}

.phomsip-app .fx-coin{
  position: absolute;
  width: 24px;
  height: 24px;
  margin: -12px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff8d6, #f1c75c 42%, #b07d22 76%, #6e4a10);
  box-shadow:
    inset 0 0 0 2px rgba(255, 240, 190, 0.55),
    0 3px 8px rgba(0, 0, 0, 0.45);
}

.phomsip-app .fx-coin::after{
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  border: 1px solid rgba(110, 74, 16, 0.5);
}

.phomsip-app .chips{
  position: fixed;
  inset: 0;
  z-index: 400;
  pointer-events: none;
}

.phomsip-app .fx-coin--chip{
  position: fixed;
}

.phomsip-app .fx-confetti{
  position: absolute;
  top: 0;
  width: 6px;
  height: 13px;
  border-radius: 2px;
}

.phomsip-app .fx__text{
  position: relative;
  text-align: center;
  padding: 0 20px;
}

.phomsip-app .fx__text h2{
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(68px, 22vw, 150px);
  line-height: 1.3;
  filter: drop-shadow(0 6px 22px rgba(0, 0, 0, 0.65)) drop-shadow(0 0 28px rgba(246, 214, 138, 0.4));
}

.phomsip-app .fx--lose .fx__text h2{
  font-size: clamp(50px, 15vw, 104px);
  color: #e9d6c6;
  filter: drop-shadow(0 6px 22px rgba(0, 0, 0, 0.7)) drop-shadow(0 0 24px rgba(214, 90, 50, 0.45));
}

.phomsip-app .fx--tie .fx__text h2{
  font-size: clamp(56px, 17vw, 120px);
  filter: drop-shadow(0 6px 22px rgba(0, 0, 0, 0.65)) drop-shadow(0 0 28px rgba(110, 160, 255, 0.55));
}

.phomsip-app .fx__text p{
  font-size: 19px;
  font-weight: 600;
  color: var(--gold-100);
  letter-spacing: 0.02em;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.7);
}

.phomsip-app .fx--lose .fx__text p{
  color: rgba(239, 230, 207, 0.8);
}



.phomsip-app .rp-wrap{
  position: fixed;
  inset: 0;
  z-index: 350;
  display: grid;
  align-items: end;
  justify-items: center;
  padding: 0 12px calc(14px + var(--safe-b));
}

.phomsip-app .rp{
  width: min(420px, 100%);
  border-radius: 26px;
  padding: 20px 18px 16px;
  background: linear-gradient(180deg, rgba(30, 40, 34, 0.94), rgba(8, 12, 10, 0.97));
  border: 1px solid rgba(217, 178, 95, 0.38);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 30px 70px rgba(0, 0, 0, 0.7),
    0 0 50px rgba(246, 214, 138, 0.08);
  display: grid;
  gap: 14px;
}

.phomsip-app .rp--ai{
  border-color: rgba(214, 100, 70, 0.35);
}
.phomsip-app .rp--tie{
  border-color: rgba(130, 170, 255, 0.4);
}

.phomsip-app .rp__head{
  text-align: center;
}

.phomsip-app .rp__head h3{
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 24px;
  line-height: 1.4;
  color: var(--gold-200);
}

.phomsip-app .rp__head p{
  font-size: 13.5px;
  color: var(--text-muted);
}

.phomsip-app .rp__row{
  display: grid;
  grid-template-columns: 1fr 64px 76px;
  align-items: center;
  padding: 7px 4px;
  font-size: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.phomsip-app .rp__row b{
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.phomsip-app .rp__row--head{
  color: var(--text-muted);
  font-size: 12.5px;
}

.phomsip-app .rp__row--total{
  border-bottom: 0;
  font-size: 16px;
  font-weight: 700;
}

.phomsip-app .rp__row--total b{
  font-size: 18px;
}

.phomsip-app .rp__row b.is-win{
  color: var(--gold-200);
  text-shadow: 0 0 14px rgba(246, 214, 138, 0.6);
}

.phomsip-app .rp__reward{
  display: grid;
  justify-items: center;
  padding: 12px;
  border-radius: 18px;
  background: radial-gradient(ellipse at 50% 0%, rgba(246, 214, 138, 0.14), rgba(0, 0, 0, 0.3) 70%);
  border: 1px solid rgba(217, 178, 95, 0.2);
}

.phomsip-app .rp__reward span{
  font-size: 13px;
  color: var(--text-muted);
}

.phomsip-app .rp__reward b{
  font-family: var(--font-card);
  font-size: 40px;
  line-height: 1.15;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.phomsip-app .rp__reward b.is-plus{
  color: var(--gold-100);
  text-shadow: 0 0 24px rgba(246, 214, 138, 0.55);
}

.phomsip-app .rp__reward small{
  font-size: 12px;
  color: var(--text-muted);
}

.phomsip-app .rp__actions{
  display: grid;
  grid-template-columns: 1fr 1.6fr;
  gap: 10px;
}



.phomsip-app .modal{
  position: fixed;
  inset: 0;
  z-index: 500;
  display: grid;
  align-items: end;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.phomsip-app .modal__sheet{
  width: 100%;
  max-height: 86dvh;
  overflow-y: auto;
  padding: 16px 20px calc(20px + var(--safe-b));
  border-radius: 26px 26px 0 0;
  background: linear-gradient(180deg, rgba(30, 40, 34, 0.97), rgba(8, 12, 10, 0.98));
  border: 1px solid var(--line);
  border-bottom: 0;
  box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.6);
}

.phomsip-app .modal__head{
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.phomsip-app .modal__head h3{
  font-family: var(--font-display);
  font-size: 21px;
  color: var(--gold-200);
}

.phomsip-app .modal__text{
  font-size: 15px;
  line-height: 1.6;
  color: var(--text);
  margin: 6px 0 18px;
}

.phomsip-app .modal__actions{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.phomsip-app .toggle{
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  color: var(--gold-200);
}

.phomsip-app .toggle span{
  flex: 1;
  color: var(--text);
  font-size: 15px;
}

.phomsip-app .toggle input{
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.phomsip-app .toggle i{
  position: relative;
  width: 46px;
  height: 28px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
  transition: background 0.25s;
}

.phomsip-app .toggle i::after{
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(180deg, #f5f0e4, #c9c0aa);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.45);
  transition: transform 0.3s var(--ease-out);
}

.phomsip-app .toggle input:checked + i{
  background: linear-gradient(180deg, #eec266, #a87b2c);
}

.phomsip-app .toggle input:checked + i::after{
  transform: translateX(18px);
}

.phomsip-app .toggle input:focus-visible + i{
  outline: 2px solid var(--gold-200);
  outline-offset: 2px;
}

.phomsip-app .modal .field{
  margin: 16px 0;
}

.phomsip-app .seg{
  display: flex;
  padding: 4px;
  gap: 4px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.38);
  border: 1px solid rgba(217, 178, 95, 0.2);
}

.phomsip-app .seg button{
  position: relative;
  flex: 1;
  height: 40px;
  border: 0;
  background: none;
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 14.5px;
}

.phomsip-app .seg button.is-on{
  color: #2b1a04;
}

.phomsip-app .seg button > span:last-child{
  position: relative;
}

.phomsip-app .seg__pill{
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: linear-gradient(180deg, #ffe7a3, #d9a947 60%, #a87b2c);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.phomsip-app .rules{
  padding: 14px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 14px;
  line-height: 1.7;
  color: rgba(239, 230, 207, 0.85);
  user-select: text;
}

.phomsip-app .rules h4{
  font-size: 15px;
  color: var(--gold-200);
  margin-bottom: 4px;
}

.phomsip-app .rules p + p{
  margin-top: 6px;
}

.phomsip-app .rules ul{
  margin: 8px 0 0;
  padding-left: 18px;
}



.phomsip-app .debug{
  position: fixed;
  left: calc(50% - 115px);
  top: calc(70px + var(--safe-t));
  z-index: 600;
  width: 230px;
  font: 11px/1.4 ui-monospace, Menlo, monospace;
  background: rgba(0, 0, 0, 0.88);
  border: 1px solid rgba(120, 200, 255, 0.4);
  border-radius: 10px;
  color: #cfe8ff;
  touch-action: none;
}

.phomsip-app .debug.is-collapsed{
  width: 120px;
  left: calc(50% - 60px);
  opacity: 0.75;
}

.phomsip-app .debug header{
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
  cursor: grab;
}

.phomsip-app .debug header button{
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.phomsip-app .debug dl{
  display: grid;
  grid-template-columns: 54px 1fr;
  gap: 2px 6px;
  margin: 0;
  padding: 4px 8px;
}

.phomsip-app .debug dt{
  color: #7fa9c9;
}
.phomsip-app .debug dd{
  margin: 0;
  word-break: break-word;
}

.phomsip-app .debug__btns{
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 8px 8px;
}

.phomsip-app .debug__btns button{
  font: inherit;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid rgba(120, 200, 255, 0.4);
  background: rgba(40, 80, 120, 0.4);
  color: inherit;
  cursor: pointer;
}



@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.035);
  }
}

@keyframes ringPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(246, 214, 138, 0.55);
  }
  100% {
    box-shadow: 0 0 0 14px rgba(246, 214, 138, 0);
  }
}

@keyframes cardGlow {
  0%,
  100% {
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.35),
      0 0 0 1.5px rgba(246, 214, 138, 0.7),
      0 0 12px rgba(246, 214, 138, 0.35);
  }
  50% {
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.35),
      0 0 0 2px var(--gold-200),
      0 0 26px rgba(246, 214, 138, 0.8);
  }
}

@keyframes deckRing {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.03);
  }
}

@keyframes pillGlow {
  0%,
  100% {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.7),
      0 0 0 0 rgba(246, 214, 138, 0.5),
      0 6px 18px rgba(0, 0, 0, 0.4);
  }
  50% {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.7),
      0 0 0 6px rgba(246, 214, 138, 0),
      0 0 26px rgba(246, 214, 138, 0.55);
  }
}

@keyframes btnPulse {
  0%,
  100% {
    box-shadow:
      inset 0 1px 0 rgba(255, 230, 160, 0.3),
      inset 0 0 14px rgba(246, 214, 138, 0.18),
      0 0 0 1px var(--gold-400),
      0 8px 18px rgba(0, 0, 0, 0.45),
      0 0 0 rgba(246, 214, 138, 0);
  }
  50% {
    box-shadow:
      inset 0 1px 0 rgba(255, 230, 160, 0.5),
      inset 0 0 22px rgba(246, 214, 138, 0.4),
      0 0 0 1.5px var(--gold-200),
      0 8px 18px rgba(0, 0, 0, 0.45),
      0 0 30px rgba(246, 214, 138, 0.65);
  }
}

@keyframes ripple {
  to {
    transform: scale(1);
    opacity: 0;
  }
}

@keyframes dot {
  0%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-2px);
  }
}



@media (max-width: 380px) {
  .phomsip-app .hud{
    gap: 6px;
  }
  .phomsip-app .hud__icon{
    width: 38px;
    height: 38px;
  }
  .phomsip-app .hud__title h1{
    font-size: 18px;
  }
  .phomsip-app .hud__wallet{
    padding-right: 9px;
  }
  .phomsip-app .hud__wallet b{
    font-size: 14.5px;
  }
  .phomsip-app .hud__coin{
    width: 26px;
    height: 26px;
    font-size: 13px;
  }
  .phomsip-app .cbtn__body{
    font-size: 15px;
    padding: 0 8px;
    gap: 5px;
  }
  .phomsip-app .cbtn--lg .cbtn__body{
    font-size: 16.5px;
  }
  .phomsip-app .seat__name{
    font-size: 13.5px;
  }
  .phomsip-app .actions{
    gap: 8px;
  }
}

@media (min-width: 640px) {
  .phomsip-app .modal{
    align-items: center;
    justify-items: center;
  }
  .phomsip-app .modal__sheet{
    width: 440px;
    border-radius: 26px;
    border-bottom: 1px solid var(--line);
  }
  .phomsip-app .rp-wrap{
    align-items: center;
  }
  .phomsip-app .turn__hint{
    font-size: 13.5px;
  }
}

@media (min-width: 900px) {
  .phomsip-app .felt__rail{
    inset: calc(80px + var(--safe-t)) 3% calc(96px + var(--safe-b)) !important;
    border-radius: 50% / 34%;
  }
  .phomsip-app .zone--center{
    justify-content: center;
    gap: clamp(30px, 8vw, 120px);
  }
  .phomsip-app .actions{
    width: min(620px, 100%);
    justify-self: center;
  }
  .phomsip-app .zone--opp,.phomsip-app .me-bar{
    padding-inline: 4%;
  }
  .phomsip-app .turn__pill{
    font-size: 17px;
    padding: 9px 22px;
  }
}


.phomsip-app .rotate-hint{
  display: none;
}

@media (orientation: landscape) and (max-height: 500px) {
  .phomsip-app .rotate-hint{
    position: fixed;
    inset: 0;
    z-index: 900;
    display: grid;
    place-items: center;
    text-align: center;
    padding: 20px;
    font-size: 17px;
    background: radial-gradient(ellipse at center, #0f4535, var(--ink));
    color: var(--gold-100);
  }
}

@media (prefers-reduced-motion: reduce) {
  .phomsip-app *,.phomsip-app *::before,.phomsip-app *::after{
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
  }
}


@media (max-height: 700px) {
  .phomsip-app .intro{
    gap: 8px;
    padding-top: calc(16px + var(--safe-t));
  }
  .phomsip-app .intro__lead{
    font-size: 14px;
  }
  .phomsip-app .intro__panel{
    gap: 12px;
    padding: 14px 16px;
  }
  .phomsip-app .chip{
    width: 54px;
    height: 54px;
    font-size: 14px;
  }
  .phomsip-app .intro__balance{
    padding-bottom: 8px;
  }
}


@media (min-width: 900px) and (min-height: 700px) {
  .phomsip-app .hud{
    padding: 8px 10px;
    margin-top: 14px;
  }
  .phomsip-app .hud__title h1{
    font-size: 24px;
  }
  .phomsip-app .seat__avatar-wrap,.phomsip-app .seat--compact .seat__avatar-wrap{
    width: 56px;
    height: 56px;
  }
  .phomsip-app .seat__name{
    font-size: 16.5px;
  }
  .phomsip-app .seat__status{
    font-size: 13.5px;
  }
  .phomsip-app .seat__score b{
    font-size: 22px;
  }
  .phomsip-app .pile__label,.phomsip-app .melds__empty{
    font-size: 13.5px;
  }
}

.phomsip-app .ps-lobby{ justify-content: flex-start; overflow-y: auto; -webkit-overflow-scrolling: touch; padding-bottom: 28px; }
.phomsip-app .ps-lobby .intro__hero{ transform: scale(0.72); margin: -28px 0 -34px; flex: none; }
.phomsip-app .ps-lobby .intro__panel{ flex: none; }
.phomsip-app .ps-wait{ position: absolute; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; pointer-events: none; }
.phomsip-app .ps-wait__box{ pointer-events: auto; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; padding: 18px 22px; margin: 0 16px; border-radius: 18px; background: rgba(8, 20, 14, 0.86); border: 1px solid rgba(246, 214, 138, 0.45); box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5); }
.phomsip-app .ps-wait__box b{ font-size: 18px; color: var(--gold-200); }
.phomsip-app .ps-wait__box span{ font-size: 14px; color: var(--text); }
.phomsip-app .ps-wait__box small{ font-size: 12px; opacity: 0.75; }
.phomsip-app .ps-net{ position: absolute; left: 50%; top: 64px; transform: translateX(-50%); z-index: 70; padding: 6px 14px; border-radius: 999px; background: rgba(120, 20, 20, 0.9); color: #fff; font-size: 13px; white-space: nowrap; }
.phomsip-app .ps-rooms{ display: flex; flex-direction: column; gap: 10px; width: 100%; }
.phomsip-app .ps-room{ display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; border-radius: 16px; cursor: pointer; text-align: left; background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)); border: 1px solid rgba(246, 214, 138, 0.35); color: var(--text); }
.phomsip-app .ps-room:disabled{ opacity: 0.45; cursor: default; }
.phomsip-app .ps-room__lv{ flex: none; width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center; font-weight: 800; color: #3a2400; background: linear-gradient(180deg, #ffe7a3, #c98a22); }
.phomsip-app .ps-room__name,.phomsip-app .ps-room__pot{ display: flex; flex-direction: column; line-height: 1.3; }
.phomsip-app .ps-room__name{ flex: 1 1 auto; min-width: 0; }
.phomsip-app .ps-room__name b{ font-size: 16px; }
.phomsip-app .ps-room__name small,.phomsip-app .ps-room__pot small{ font-size: 12px; opacity: 0.75; }
.phomsip-app .ps-room__pot{ align-items: flex-end; }
.phomsip-app .ps-room__pot b{ color: var(--gold-200); font-size: 16px; }
`;

function GlobalStyles() {
  return <style>{PHOM_SIP_CSS}</style>;
}
