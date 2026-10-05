import React, { useEffect, useRef, useState, useCallback } from "react";

/* ============================================================
   PLUSHIE PARADISE — NEON FISHING
   Self-contained React component (canvas game + DOM HUD/cabinet)
   Drop into WINNER 69 as an 8th game, same as Plushie Paradise
   Claw Machine. Virtual credits only — no real money.
   ============================================================ */

/* ---------------- 30. CONFIG ---------------- */
const CONFIG = {
  startingCoins: 1250,
  bet: 10,
  fishSpawnRate: 1.2,     // avg fish spawns / second (scaled by difficulty)
  bonusCoinChance: 0.12,  // chance to spawn a bonus coin per interval
  jackpotChance: 0.02,    // chance a jackpot (legendary) fish spawns
  maxMultiplier: 5,
  soundEnabled: true,
  particles: true,
  difficulty: 1,
};

/* ---------------- 8. FISH TYPES ---------------- */
/* rewards are calibrated so that at CONFIG.bet (10), payouts range 15–90;
   resolveCatch() scales every payout by (bet / CONFIG.bet), so any other
   bet amount shifts this whole 15–90 range up or down with it. */
const FISH_TYPES = [
  { id: "blue",       emoji: "🐟", name: "Blue Fish",        reward: 15,  rarity: "common",     color: "#4fc3f7", glow: "#8fe3ff", catchChance: 0.78, speed: 70,  size: 26 },
  { id: "orange",     emoji: "🐠", name: "Orange Fish",      reward: 18,  rarity: "common",     color: "#ff9d3d", glow: "#ffc98a", catchChance: 0.76, speed: 78,  size: 27 },
  { id: "puffy",      emoji: "🐡", name: "Puffy Fish",       reward: 22,  rarity: "common",     color: "#ffd93d", glow: "#fff2b0", catchChance: 0.74, speed: 56,  size: 30 },
  { id: "neonblue",   emoji: "🐟", name: "Neon Blue Fish",   reward: 28,  rarity: "uncommon",   color: "#00e5ff", glow: "#7dfbff", catchChance: 0.58, speed: 96,  size: 30 },
  { id: "neonpink",   emoji: "🐠", name: "Neon Pink Fish",   reward: 35,  rarity: "uncommon",   color: "#ff4fd8", glow: "#ffb3f0", catchChance: 0.56, speed: 102, size: 32 },
  { id: "golden",     emoji: "🐟", name: "Golden Fish",      reward: 45,  rarity: "uncommon",   color: "#ffd700", glow: "#fff1a8", catchChance: 0.54, speed: 90,  size: 33 },
  { id: "dragon",     emoji: "🐉", name: "Mini Dragon Fish", reward: 55,  rarity: "rare",       color: "#b06bff", glow: "#e2c4ff", catchChance: 0.36, speed: 120, size: 38 },
  { id: "shark",      emoji: "🦈", name: "Neon Shark",       reward: 65,  rarity: "rare",       color: "#7c4dff", glow: "#c2a8ff", catchChance: 0.34, speed: 132, size: 42 },
  { id: "crystal",    emoji: "🐲", name: "Crystal Fish",     reward: 78,  rarity: "epic",       color: "#00ffd0", glow: "#baffed", catchChance: 0.20, speed: 148, size: 46 },
  { id: "dragonking", emoji: "👑", name: "Golden Dragon Fish", reward: 90, rarity: "legendary", color: "#ffe066", glow: "#fff6cc", catchChance: 0.10, speed: 160, size: 54 },
];

const RARITY_WEIGHT = { common: 100, uncommon: 46, rare: 16, epic: 6, legendary: 1 };
const RARITY_WEIGHT_GOLDEN = { common: 40, uncommon: 55, rare: 40, epic: 22, legendary: 8 };

/* ---------------- small math helpers ---------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

function weightedFish(golden) {
  const table = golden ? RARITY_WEIGHT_GOLDEN : RARITY_WEIGHT;
  const pool = [];
  FISH_TYPES.forEach((f) => {
    const w = Math.round((table[f.rarity] || 1));
    for (let i = 0; i < w; i++) pool.push(f);
  });
  return pick(pool);
}

/* ============================================================
   AudioSystem — Web Audio API synth, no external files
   ============================================================ */
class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = CONFIG.soundEnabled;
  }
  unlock() {
    if (this.ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
    }
  }
  setEnabled(v) {
    this.enabled = v;
  }
  tone(freq, dur, type = "sine", startGain = 0.5, slideTo = null) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(startGain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
  noise(dur, gainAmt = 0.3) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gainAmt, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1800;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }
  click() { this.tone(600, 0.06, "square", 0.25); }
  cast() { this.tone(320, 0.18, "sine", 0.3, 180); this.noise(0.15, 0.08); }
  splash() { this.noise(0.35, 0.35); }
  bite() { this.tone(220, 0.12, "triangle", 0.4, 440); }
  reelTick() { this.tone(rand(500, 700), 0.05, "square", 0.15); }
  coin() { this.tone(1200, 0.09, "square", 0.25, 1600); }
  win() {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.22, "triangle", 0.35), i * 70)
    );
  }
  fail() { this.tone(300, 0.3, "sawtooth", 0.25, 90); }
  jackpot() {
    [392, 523, 659, 784, 1046, 1318].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.35, "triangle", 0.4), i * 90)
    );
    setTimeout(() => this.noise(0.5, 0.2), 100);
  }
}

/* ============================================================
   Fish instance factory
   ============================================================ */
function makeFish(type, w, h) {
  const fromLeft = Math.random() < 0.5;
  return {
    type,
    x: fromLeft ? -40 : w + 40,
    y: rand(h * 0.28, h * 0.82),
    baseY: 0,
    dir: fromLeft ? 1 : -1,
    speed: type.speed * rand(0.85, 1.15),
    phase: rand(0, Math.PI * 2),
    wobble: rand(10, 22),
    state: "swim", // swim | curious | biting | hooked | fleeing
    id: Math.random().toString(36).slice(2),
    turnCooldown: rand(1.5, 3.5),
    tailPhase: 0,
    trail: [],
  };
}

/* ============================================================
   Fish drawing — procedural canvas shapes (no emoji reliance)
   ============================================================ */
function drawFish(ctx, f, t) {
  const type = f.type;
  const size = type.size;
  const wag = Math.sin(t * 6 + f.tailPhase) * 0.5;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.dir, 1);

  // trailing glow for rare+
  if (type.rarity === "rare" || type.rarity === "epic" || type.rarity === "legendary") {
    ctx.save();
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.fillStyle = type.glow;
      ctx.ellipse(-size * (0.6 + i * 0.35), 0, size * 0.35, size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.shadowColor = type.glow;
  ctx.shadowBlur = type.rarity === "legendary" ? 28 : type.rarity === "epic" ? 20 : 12;

  // tail
  ctx.beginPath();
  ctx.moveTo(-size * 0.55, 0);
  ctx.lineTo(-size * 0.95, -size * 0.35 + wag * size * 0.25);
  ctx.lineTo(-size * 0.95, size * 0.35 + wag * size * 0.25);
  ctx.closePath();
  const tailGrad = ctx.createLinearGradient(-size, 0, -size * 0.5, 0);
  tailGrad.addColorStop(0, type.glow);
  tailGrad.addColorStop(1, type.color);
  ctx.fillStyle = tailGrad;
  ctx.fill();

  // body
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.55, size * 0.34, 0, 0, Math.PI * 2);
  const bodyGrad = ctx.createLinearGradient(-size * 0.5, -size * 0.3, size * 0.5, size * 0.3);
  bodyGrad.addColorStop(0, type.color);
  bodyGrad.addColorStop(0.5, type.glow);
  bodyGrad.addColorStop(1, type.color);
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // top fin
  ctx.beginPath();
  ctx.moveTo(-size * 0.05, -size * 0.3);
  ctx.lineTo(size * 0.1, -size * 0.55 + wag * size * 0.15);
  ctx.lineTo(size * 0.25, -size * 0.28);
  ctx.closePath();
  ctx.fillStyle = type.glow;
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.globalAlpha = 1;

  // eye
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(size * 0.32, -size * 0.05, size * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.fillStyle = "#0b0018";
  ctx.arc(size * 0.35, -size * 0.05, size * 0.045, 0, Math.PI * 2);
  ctx.fill();

  // crown sparkle for legendary
  if (type.rarity === "legendary") {
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#fff6cc";
    ctx.font = `${size * 0.5}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("✨", 0, -size * 0.65);
  }

  ctx.restore();
}

/* ============================================================
   Particle helpers
   ============================================================ */
function spawnRipple(list, x, y) {
  list.push({ kind: "ripple", x, y, r: 4, alpha: 0.55, life: 0.9, age: 0 });
}
function spawnSplash(list, x, y, n = 14) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const spd = rand(40, 160);
    list.push({
      kind: "drop", x, y,
      vx: Math.cos(a) * spd * 0.6,
      vy: -Math.abs(Math.sin(a)) * spd - 60,
      alpha: 1, life: rand(0.4, 0.8), age: 0,
      color: "rgba(180,230,255,0.9)",
    });
  }
  spawnRipple(list, x, y);
}
function spawnBubble(list, x, y) {
  list.push({ kind: "bubble", x, y, r: rand(2, 5), vy: -rand(20, 45), alpha: 0.6, life: rand(1, 2), age: 0 });
}
function spawnSparkle(list, x, y, color = "#ffe066") {
  list.push({
    kind: "sparkle", x, y,
    vx: rand(-30, 30), vy: rand(-70, -20),
    alpha: 1, life: rand(0.5, 0.9), age: 0, color,
  });
}
function spawnCoinFly(list, x, y, targetX, targetY, amount) {
  list.push({
    kind: "coinfly", x, y, x0: x, y0: y, tx: targetX, ty: targetY,
    alpha: 1, life: 0.7, age: 0, amount,
  });
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function PlushieParadiseNeonFishing({
  initialBalance,
  winRate,
  onBalanceDelta,
  onRound,
  onBigWin,
  muted,
  server,        // optional { call(path, body) -> Promise }: the backend takes the bet and decides each catch
} = {}) {
  const serverRef = useRef(server);
  serverRef.current = server;
  const castPendingRef = useRef(false);
  const resolvingRef = useRef(false);
  const hasExternalBalance = typeof onBalanceDelta === "function";
  const winRateScale = typeof winRate === "number" ? Math.max(0, winRate / 100) : 1;
  const roundWagerRef = useRef(CONFIG.bet); // wager captured at cast time, reported with the payout at resolveCatch

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const audioRef = useRef(null);

  // mutable game refs (avoid re-render every frame)
  const sizeRef = useRef({ w: 960, h: 540 });
  const timeRef = useRef(0);
  const lastTsRef = useRef(0);
  const fishRef = useRef([]);
  const particlesRef = useRef([]);
  const bonusCoinsRef = useRef([]);
  const rodXRef = useRef(0.5); // 0..1 across width
  const keysRef = useRef({ left: false, right: false });
  const hookRef = useRef({ x: 0, y: 0, active: false, biteFishId: null });
  const castRef = useRef({ t: 0, dur: 0.55, from: { x: 0, y: 0 }, to: { x: 0, y: 0 } });
  const reelRef = useRef({ holding: false, timeLeft: 0, tickAcc: 0 });
  const goldenRef = useRef({ active: false, timer: rand(18, 32) });
  const spawnAccRef = useRef(0);
  const bonusAccRef = useRef(0);
  const stateRef = useRef("IDLE");
  const hookedFishRef = useRef(null);
  const bannerTimerRef = useRef(0);
  const coinBalanceScreenPos = useRef({ x: 0, y: 0 });

  // React (UI) state
  const [coins, setCoins] = useState(() => (typeof initialBalance === "number" ? initialBalance : CONFIG.startingCoins));
  const [bet, setBet] = useState(CONFIG.bet);

  // Wraps setCoins so every change also mirrors to the host app's shared
  // wallet when integrated (see PlushieParadise.jsx / NeonFortuneSlot.jsx
  // for the same pattern) - spendCoins/addCoins below are the only places
  // that should ever touch balance from here on.
  const spendCoins = useCallback((amount) => {
    setCoins((c) => c - amount);
    if (hasExternalBalance) onBalanceDelta(-amount);
  }, [hasExternalBalance, onBalanceDelta]);
  const addCoins = useCallback((amount) => {
    setCoins((c) => c + amount);
    if (hasExternalBalance) onBalanceDelta(amount);
  }, [hasExternalBalance, onBalanceDelta]);
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [gameState, setGameState] = useState("IDLE");
  const [reelProgress, setReelProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("neutral"); // neutral|good|bad|epic
  const [soundOn, setSoundOn] = useState(() => (typeof muted === "boolean" ? !muted : CONFIG.soundEnabled));
  const [goldenMode, setGoldenMode] = useState(false);
  const [jackpotBanner, setJackpotBanner] = useState(false);
  const [collection, setCollection] = useState({});
  const [fishOnLabel, setFishOnLabel] = useState("");

  const setState = useCallback((s) => {
    stateRef.current = s;
    setGameState(s);
  }, []);

  const flashMessage = useCallback((text, tone = "neutral", dur = 1.6) => {
    setMessage(text);
    setMessageTone(tone);
    bannerTimerRef.current = dur;
  }, []);

  /* --------- audio init on first gesture --------- */
  useEffect(() => {
    audioRef.current = new AudioSystem();
    audioRef.current.setEnabled(soundOn);
    const unlock = () => audioRef.current && audioRef.current.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (audioRef.current) audioRef.current.setEnabled(soundOn);
  }, [soundOn]);

  /* --------- resize handling --------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      const w = Math.max(280, cr.width);
      const h = Math.max(160, cr.width * 0.5625);
      sizeRef.current = { w, h };
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* --------- keyboard controls --------- */
  useEffect(() => {
    const down = (e) => {
      if (["ArrowLeft", "a", "A"].includes(e.key)) keysRef.current.left = true;
      if (["ArrowRight", "d", "D"].includes(e.key)) keysRef.current.right = true;
      if (e.key === " ") {
        e.preventDefault();
        handleAction();
      }
    };
    const up = (e) => {
      if (["ArrowLeft", "a", "A"].includes(e.key)) keysRef.current.left = false;
      if (["ArrowRight", "d", "D"].includes(e.key)) keysRef.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ============================================================
     GAME ACTIONS
     ============================================================ */
  const handleCast = useCallback(() => {
    const s = stateRef.current;
    if (s !== "IDLE" && s !== "AIMING") return;
    if (coins < bet) {
      flashMessage("💸 เครดิตไม่พอ", "bad", 1.4);
      return;
    }
    if (serverRef.current && !castPendingRef.current) {
      // the server takes the bet first; the line only goes out once it has
      castPendingRef.current = true;
      const wager = bet;
      serverRef.current.call("/api/games/fishing/cast", { bet: wager })
        .then(() => { castPendingRef.current = false; startCast(wager); })
        .catch((e) => {
          castPendingRef.current = false;
          flashMessage(e && e.message === "insufficient_balance" ? "💸 เครดิตไม่พอ" : "⚠️ เชื่อมต่อไม่ได้ ลองใหม่", "bad", 1.6);
        });
      return;
    }
    if (castPendingRef.current) return;
    startCast(bet);
  }, [flashMessage, setState, coins, bet, spendCoins]);

  const startCast = useCallback((wager) => {
    roundWagerRef.current = wager;
    spendCoins(wager);
    const { w, h } = sizeRef.current;
    const rodTipX = w * rodXRef.current;
    const rodTipY = h * 0.14;
    castRef.current = {
      t: 0,
      dur: 0.55,
      from: { x: rodTipX, y: rodTipY },
      to: { x: rodTipX + rand(-30, 30), y: rand(h * 0.42, h * 0.85) },
    };
    hookRef.current = { x: rodTipX, y: rodTipY, active: true, biteFishId: null };
    setState("CASTING");
    audioRef.current && audioRef.current.cast();
    flashMessage("", "neutral", 0);
  }, [flashMessage, setState, spendCoins]);

  const handleReelPress = useCallback(() => {
    const s = stateRef.current;
    if (s === "BITE") {
      // hook the fish
      const fish = hookedFishRef.current;
      const rarity = fish ? fish.type.rarity : "common";
      const timeByRarity = { common: 5.5, uncommon: 5.5, rare: 6.2, epic: 6.8, legendary: 7.5 };
      reelRef.current = { holding: true, timeLeft: timeByRarity[rarity] || 5.5, tickAcc: 0 };
      setReelProgress(28);
      setState("REELING");
      if (fish && fish.type.rarity === "legendary") setJackpotBanner(true);
      flashMessage("⚡ REEL!", "good", 0.8);
    } else if (s === "IDLE" || s === "AIMING") {
      handleCast();
    }
  }, [flashMessage, handleCast, setState]);

  const handleAction = useCallback(() => {
    const s = stateRef.current;
    if (s === "IDLE" || s === "AIMING") handleCast();
    else if (s === "BITE") handleReelPress();
  }, [handleCast, handleReelPress]);

  const resolveCatch = useCallback(
    (success, serverPayout, fromServer) => {
      if (serverRef.current && !success && !fromServer) {
        serverRef.current.call("/api/games/fishing/escape", {}).catch(() => {});
      }
      const fish = hookedFishRef.current;
      const { w, h } = sizeRef.current;
      const wagerForRound = roundWagerRef.current;
      if (success && fish) {
        const mult = Math.min(CONFIG.maxMultiplier, multiplier);
        const payout = typeof serverPayout === "number" ? serverPayout : Math.round(fish.type.reward * (bet / CONFIG.bet || 1) * mult);
        addCoins(payout);
        setCombo((c) => {
          const nc = c + 1;
          setMultiplier(Math.min(CONFIG.maxMultiplier, 1 + Math.floor(nc / 3)));
          return nc;
        });
        setCollection((col) => ({ ...col, [fish.type.id]: (col[fish.type.id] || 0) + 1 }));
        spawnCoinFly(particlesRef.current, hookRef.current.x, hookRef.current.y, w - 70, 28, payout);
        for (let i = 0; i < 10; i++) spawnSparkle(particlesRef.current, hookRef.current.x, hookRef.current.y, fish.type.glow);
        audioRef.current && audioRef.current.win();
        if (fish.type.rarity === "legendary") {
          audioRef.current && audioRef.current.jackpot();
          flashMessage(`👑 JACKPOT FISH! +${payout} COINS`, "epic", 2.4);
          setState("JACKPOT");
          if (onBigWin) onBigWin(wagerForRound > 0 ? payout / wagerForRound : payout, "jackpot");
          setTimeout(() => {
            setJackpotBanner(false);
            setState("IDLE");
          }, 2200);
        } else {
          flashMessage(`🎉 CATCH! +${payout} COINS`, "good", 1.6);
          setState("SUCCESS");
          setTimeout(() => setState("IDLE"), 1100);
        }
        if (onRound) onRound(wagerForRound, payout);
      } else {
        setCombo(0);
        setMultiplier(1);
        setJackpotBanner(false);
        audioRef.current && audioRef.current.fail();
        flashMessage("😅 FISH ESCAPED!", "bad", 1.4);
        setState("FAIL");
        setTimeout(() => setState("IDLE"), 900);
        if (onRound) onRound(wagerForRound, 0);
      }
      hookedFishRef.current = null;
      hookRef.current.active = false;
      fishRef.current = fishRef.current.filter((f) => f.state !== "hooked");
    },
    [bet, flashMessage, multiplier, setState, addCoins, winRateScale, onRound, onBigWin]
  );

  /* ============================================================
     UPDATE LOOP
     ============================================================ */
  const update = useCallback(
    (dt) => {
      const { w, h } = sizeRef.current;
      timeRef.current += dt;
      const t = timeRef.current;

      // rod movement
      const rodSpeed = 0.55; // fraction per second
      if (keysRef.current.left) rodXRef.current -= rodSpeed * dt;
      if (keysRef.current.right) rodXRef.current += rodSpeed * dt;
      rodXRef.current = clamp(rodXRef.current, 0.08, 0.92);

      // golden fish event timer
      const g = goldenRef.current;
      g.timer -= dt;
      if (g.timer <= 0) {
        if (!g.active) {
          g.active = true;
          g.timer = 8;
          setGoldenMode(true);
        } else {
          g.active = false;
          g.timer = rand(22, 38);
          setGoldenMode(false);
        }
      }

      // fish spawning
      spawnAccRef.current += dt;
      const spawnInterval = 1 / (CONFIG.fishSpawnRate * CONFIG.difficulty);
      if (spawnAccRef.current > spawnInterval && fishRef.current.length < 9) {
        spawnAccRef.current = 0;
        const type = weightedFish(goldenRef.current.active);
        if (type.rarity === "legendary" && Math.random() > CONFIG.jackpotChance * 6) {
          // damp legendary over-spawn outside golden window
        } else {
          const f = makeFish(type, w, h);
          f.baseY = f.y;
          fishRef.current.push(f);
        }
      }

      // bonus coin spawning
      bonusAccRef.current += dt;
      if (bonusAccRef.current > 2.2 && bonusCoinsRef.current.length < 4) {
        bonusAccRef.current = 0;
        if (Math.random() < CONFIG.bonusCoinChance * 3) {
          bonusCoinsRef.current.push({
            x: rand(w * 0.15, w * 0.85),
            y: rand(h * 0.35, h * 0.82),
            phase: rand(0, Math.PI * 2),
            amount: pick([10, 25, 50, 100]),
            id: Math.random().toString(36).slice(2),
          });
        }
      }

      // hook / casting / reeling state machine
      const state = stateRef.current;

      if (state === "CASTING") {
        const c = castRef.current;
        c.t += dt;
        const pr = clamp(c.t / c.dur, 0, 1);
        const e = easeOutCubic(pr);
        hookRef.current.x = lerp(c.from.x, c.to.x, e);
        hookRef.current.y = lerp(c.from.y, c.to.y, e);
        if (pr >= 1) {
          spawnSplash(particlesRef.current, hookRef.current.x, hookRef.current.y);
          audioRef.current && audioRef.current.splash();
          setState("WAITING");
        }
      } else if (state === "WAITING") {
        // occasional bubbles from hook
        if (Math.random() < dt * 2) spawnBubble(particlesRef.current, hookRef.current.x + rand(-4, 4), hookRef.current.y);
        // bonus coin collection near hook
        bonusCoinsRef.current = bonusCoinsRef.current.filter((bc) => {
          const dx = bc.x - hookRef.current.x;
          const dy = bc.y - hookRef.current.y;
          if (Math.sqrt(dx * dx + dy * dy) < 26 && serverRef.current) {
            // the server checks and pays the bonus coin
            const bx = bc.x, by = bc.y;
            serverRef.current.call("/api/games/fishing/bonus", { amount: bc.amount }).then((res) => {
              addCoins(res.amount);
              spawnCoinFly(particlesRef.current, bx, by, sizeRef.current.w - 70, 28, res.amount);
              audioRef.current && audioRef.current.coin();
              flashMessage(`🪙 BONUS +${res.amount}`, "good", 1);
            }).catch(() => {});
            return false;
          }
          if (Math.sqrt(dx * dx + dy * dy) < 26) {
            const scaledAmount = Math.max(1, Math.round(bc.amount * winRateScale));
            addCoins(scaledAmount);
            spawnCoinFly(particlesRef.current, bc.x, bc.y, w - 70, 28, scaledAmount);
            for (let i = 0; i < 8; i++) spawnSparkle(particlesRef.current, bc.x, bc.y, "#ffd700");
            audioRef.current && audioRef.current.coin();
            flashMessage(`🪙 BONUS +${scaledAmount}`, "good", 1);
            return false;
          }
          return true;
        });
        // find nearest fish to attract
        let nearest = null;
        let nd = Infinity;
        fishRef.current.forEach((f) => {
          if (f.state === "hooked") return;
          const dx = f.x - hookRef.current.x;
          const dy = f.y - hookRef.current.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < nd) {
            nd = d;
            nearest = f;
          }
        });
        if (nearest && nd < 220) nearest.state = "curious";
        fishRef.current.forEach((f) => {
          if (f !== nearest && f.state === "curious") f.state = "swim";
        });
        if (nearest && nearest.state === "curious" && nd < 16 && Math.random() < dt * 0.9) {
          nearest.state = "biting";
          hookedFishRef.current = nearest;
          hookRef.current.biteFishId = nearest.id;
          setFishOnLabel(nearest.type.name);
          audioRef.current && audioRef.current.bite();
          flashMessage("🔥 FISH ON!", "good", 1.1);
          setState("BITE");
          reelRef.current.timeLeft = 1.3; // bite window
        }
      } else if (state === "BITE") {
        reelRef.current.timeLeft -= dt;
        if (reelRef.current.timeLeft <= 0) {
          // missed the window
          if (hookedFishRef.current) hookedFishRef.current.state = "fleeing";
          hookedFishRef.current = null;
          setState("WAITING");
          flashMessage("Missed it...", "bad", 0.9);
        }
      } else if (state === "REELING") {
        const r = reelRef.current;
        r.timeLeft -= dt;
        const fish = hookedFishRef.current;
        if (fish) {
          fish.x = lerp(fish.x, hookRef.current.x, 0.15);
          fish.y = lerp(fish.y, hookRef.current.y, 0.15);
          fish.state = "hooked";
        }
        let progress = reelProgressRef.current;
        if (r.holding) {
          progress += 26 * dt;
          r.tickAcc += dt;
          if (r.tickAcc > 0.14) {
            r.tickAcc = 0;
            audioRef.current && audioRef.current.reelTick();
          }
        } else {
          progress -= 14 * dt;
        }
        // fish struggle jerks
        if (Math.random() < dt * 0.8) {
          progress -= rand(2, 7);
          spawnRipple(particlesRef.current, hookRef.current.x, hookRef.current.y);
        }
        progress = clamp(progress, 0, 100);
        reelProgressRef.current = progress;
        setReelProgress(progress);

        if (progress >= 100) {
          // Win/lose is now decided directly by winRateScale (the admin
          // win rate), replacing the old fish-rarity-based catchChance -
          // reaching 100% progress still requires the player's own timing
          // skill, but whether that successful reel actually lands the
          // fish is now the admin-controlled probability, matching every
          // other game's model (see DiceGame in the main app).
          if (serverRef.current) {
            if (!resolvingRef.current) {
              resolvingRef.current = true;
              const fishId = hookedFishRef.current ? hookedFishRef.current.type.id : null;
              serverRef.current.call("/api/games/fishing/catch", { fishId })
                .then((res) => resolveCatch(!!res.success, res.payout, true))
                .catch(() => resolveCatch(false, 0, true))
                .finally(() => { resolvingRef.current = false; });
            }
          } else resolveCatch(Math.random() < winRateScale);
        } else if (!resolvingRef.current && (progress <= 0 || r.timeLeft <= 0)) {
          resolveCatch(false);
        }
      }

      // update all free-swimming fish
      fishRef.current.forEach((f) => {
        if (f.state === "hooked") return;
        if (f.state === "curious" || f.state === "biting") {
          const dx = hookRef.current.x - f.x;
          const dy = hookRef.current.y - f.y;
          const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          f.dir = dx > 0 ? 1 : -1;
          f.x += (dx / d) * f.speed * 0.55 * dt;
          f.y += (dy / d) * f.speed * 0.55 * dt;
        } else if (f.state === "fleeing") {
          f.x += f.dir * f.speed * 2.2 * dt;
          f.y += Math.sin(t * 6 + f.phase) * 30 * dt;
        } else {
          f.turnCooldown -= dt;
          if (f.turnCooldown <= 0) {
            f.turnCooldown = rand(2, 4.5);
            if (Math.random() < 0.4) f.dir *= -1;
          }
          f.x += f.dir * f.speed * dt;
          f.y = f.baseY + Math.sin(t * 1.4 + f.phase) * f.wobble;
        }
        f.tailPhase = f.phase;
      });
      // cull offscreen / fleeing fish
      fishRef.current = fishRef.current.filter(
        (f) => f.x > -80 && f.x < w + 80 && !(f.state === "fleeing" && (f.x < -60 || f.x > w + 60))
      );

      // particles
      const keep = [];
      particlesRef.current.forEach((p) => {
        p.age += dt;
        if (p.age >= p.life) return;
        const lt = 1 - p.age / p.life;
        if (p.kind === "drop") {
          p.vy += 220 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.alpha = lt;
          keep.push(p);
        } else if (p.kind === "bubble") {
          p.y += p.vy * dt;
          p.alpha = lt * 0.6;
          keep.push(p);
        } else if (p.kind === "ripple") {
          p.r += 90 * dt;
          p.alpha = lt * 0.5;
          keep.push(p);
        } else if (p.kind === "sparkle") {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 60 * dt;
          p.alpha = lt;
          keep.push(p);
        } else if (p.kind === "coinfly") {
          const pr = easeOutCubic(clamp(p.age / p.life, 0, 1));
          p.x = lerp(p.x0, p.tx, pr);
          p.y = lerp(p.y0, p.ty, pr) - Math.sin(pr * Math.PI) * 40;
          p.alpha = 1 - pr * 0.2;
          keep.push(p);
        }
      });
      particlesRef.current = keep;

      // message banner timer
      if (bannerTimerRef.current > 0) {
        bannerTimerRef.current -= dt;
        if (bannerTimerRef.current <= 0) setMessage("");
      }
    },
    [flashMessage, resolveCatch, setState, addCoins, winRateScale]
  );

  const reelProgressRef = useRef(0);

  /* ============================================================
     DRAW LOOP
     ============================================================ */
  const draw = useCallback((ctx) => {
    const { w, h } = sizeRef.current;
    const t = timeRef.current;
    const golden = goldenRef.current.active;

    ctx.clearRect(0, 0, w, h);

    // ---- background arcade neon ----
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (golden) {
      bgGrad.addColorStop(0, "#2a1a05");
      bgGrad.addColorStop(1, "#120a10");
    } else {
      bgGrad.addColorStop(0, "#3a0a0e");
      bgGrad.addColorStop(1, "#0d0304");
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // blurred neon arcade shapes in background
    for (let i = 0; i < 5; i++) {
      const bx = (i / 5) * w + Math.sin(t * 0.2 + i) * 20;
      ctx.save();
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = i % 2 ? "#ff5a4e" : "#ffc93c";
      ctx.beginPath();
      ctx.ellipse(bx, h * 0.18, 60, 90, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // waterline
    const waterY = h * 0.34;

    // water body
    const waterGrad = ctx.createLinearGradient(0, waterY, 0, h);
    if (golden) {
      waterGrad.addColorStop(0, "rgba(255,214,100,0.35)");
      waterGrad.addColorStop(1, "rgba(60,30,10,0.9)");
    } else {
      waterGrad.addColorStop(0, "rgba(0,229,255,0.28)");
      waterGrad.addColorStop(0.5, "rgba(124,77,255,0.28)");
      waterGrad.addColorStop(1, "rgba(10,6,25,0.95)");
    }
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, waterY, w, h - waterY);

    // wave line
    ctx.beginPath();
    ctx.moveTo(0, waterY);
    for (let x = 0; x <= w; x += 8) {
      ctx.lineTo(x, waterY + Math.sin(x * 0.045 + t * 2) * 4);
    }
    ctx.lineTo(w, waterY);
    ctx.closePath();
    ctx.fillStyle = golden ? "rgba(255,224,140,0.5)" : "rgba(180,240,255,0.35)";
    ctx.fill();

    // caustic light streaks
    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 137) % w) + Math.sin(t * 0.5 + i) * 30;
      ctx.fillStyle = golden ? "#ffe066" : "#8fe3ff";
      ctx.beginPath();
      ctx.ellipse(cx, waterY + 40 + i * 22, 70, 10, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // bonus coins
    bonusCoinsRef.current.forEach((bc) => {
      const bob = Math.sin(t * 3 + bc.phase) * 4;
      ctx.save();
      ctx.translate(bc.x, bc.y + bob);
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.fillStyle = "#ffd700";
      ctx.ellipse(0, 0, 10, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff6cc";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#7a5b00";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", 0, 0);
      ctx.restore();
    });

    // fish (draw behind line, in front of water bg)
    fishRef.current.forEach((f) => drawFish(ctx, f, t));

    // particles: bubbles + ripples behind line
    particlesRef.current.forEach((p) => {
      if (p.kind === "bubble") {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.strokeStyle = "#cdf5ff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (p.kind === "ripple") {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.strokeStyle = "#bff3ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r, p.r * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    });

    // fishing line + rod
    const rodBaseX = w * rodXRef.current;
    const rodBaseY = h * 0.02;
    const rodTipX = rodBaseX;
    const rodTipY = h * 0.14;
    const state = stateRef.current;
    const tension = state === "REELING" ? 0.6 : state === "BITE" ? 0.9 : 0.25;
    const sway = Math.sin(t * (state === "REELING" ? 10 : 3)) * (6 * tension);

    if (hookRef.current.active) {
      const hx = hookRef.current.x;
      const hy = hookRef.current.y;
      const cx = (rodTipX + hx) / 2 + sway;
      const cy = (rodTipY + hy) / 2;
      ctx.save();
      ctx.strokeStyle = "rgba(230,240,255,0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rodTipX, rodTipY);
      ctx.quadraticCurveTo(cx, cy, hx, hy);
      ctx.stroke();
      ctx.restore();

      // hook + bait
      ctx.save();
      ctx.translate(hx, hy);
      ctx.shadowColor = "#ffe066";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#ffe066";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // rod (drawn last, over water edge)
    ctx.save();
    const bendX = hookRef.current.active ? clamp((hookRef.current.x - rodBaseX) * 0.04, -10, 10) : 0;
    ctx.strokeStyle = "#ffe9b8";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.shadowColor = "#ffb02e";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(rodBaseX, rodBaseY);
    ctx.quadraticCurveTo(rodBaseX + bendX, (rodBaseY + rodTipY) / 2, rodTipX + bendX, rodTipY);
    ctx.stroke();
    ctx.restore();

    // splash drops + sparkles (foreground)
    particlesRef.current.forEach((p) => {
      if (p.kind === "drop") {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.kind === "sparkle") {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.kind === "coinfly") {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = "#ffd700";
        ctx.shadowColor = "#ffe066";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });

    // hooked fish stamina glow ring
    if (state === "REELING" && hookedFishRef.current) {
      const f = hookedFishRef.current;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#ff4fd8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.type.size * 0.9 + Math.sin(t * 20) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }, []);

  /* ============================================================
     MAIN LOOP
     ============================================================ */
  useEffect(() => {
    const loop = (ts) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;
      update(dt);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        draw(ctx);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [update, draw]);

  /* ============================================================
     UI HANDLERS
     ============================================================ */
  const startReelHold = () => {
    reelRef.current.holding = true;
    audioRef.current && audioRef.current.click();
    if (stateRef.current === "BITE") handleReelPress();
  };
  const stopReelHold = () => {
    reelRef.current.holding = false;
  };
  const startMove = (dir) => {
    audioRef.current && audioRef.current.click();
    if (dir === "left") keysRef.current.left = true;
    else keysRef.current.right = true;
  };
  const stopMove = (dir) => {
    if (dir === "left") keysRef.current.left = false;
    else keysRef.current.right = false;
  };
  const changeBet = (delta) => setBet((b) => clamp(b + delta, 5, 100));

  const canCast = (gameState === "IDLE" || gameState === "AIMING") && coins >= bet;
  const canReel = gameState === "BITE" || gameState === "REELING";
  const rarityColor = {
    common: "#8fe3ff",
    uncommon: "#00e5ff",
    rare: "#b06bff",
    epic: "#00ffd0",
    legendary: "#ffe066",
  };

  return (
    <div className="ppf-root">
      <style>{`
        .ppf-root {
          --pink: #ff664f;
          --purple: #ff5b60;
          --cyan: #f9b806;
          --gold: #ffd700;
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          font-family: 'Trebuchet MS', ui-rounded, 'Baloo 2', sans-serif;
          color: #fff;
          background: radial-gradient(circle at 50% 0%, #501419 0%, #160607 70%);
          border-radius: 22px;
          padding: 14px;
          box-sizing: border-box;
          border: 3px solid #ff4fd870;
          box-shadow: 0 0 0 2px #00000080, 0 0 40px 4px #a35bff55, inset 0 0 40px #ff4fd822;
          position: relative;
          overflow: hidden;
          user-select: none;
        }
        .ppf-led-border {
          position: absolute; inset: 0; pointer-events: none; border-radius: 22px;
          box-shadow: inset 0 0 0 2px transparent;
        }
        .ppf-led-border::before {
          content: ""; position: absolute; inset: -2px; border-radius: 22px;
          background: conic-gradient(from 0deg, var(--pink), var(--purple), var(--cyan), var(--gold), var(--pink));
          filter: blur(6px); opacity: 0.55; z-index: -1;
          animation: ppf-spin 6s linear infinite;
        }
        @keyframes ppf-spin { to { transform: rotate(360deg); } }
        .ppf-marquee {
          text-align: center; padding: 4px 0 10px;
          position: relative; z-index: 2;
        }
        .ppf-title {
          font-size: clamp(20px, 4vw, 30px);
          font-weight: 900; letter-spacing: 1px;
          background: linear-gradient(90deg, var(--pink), var(--gold), var(--cyan));
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: ppf-flicker 2.6s infinite;
          text-shadow: 0 0 20px #ff4fd888;
        }
        .ppf-subtitle {
          font-size: clamp(10px, 2vw, 13px);
          letter-spacing: 4px; color: var(--cyan);
          text-shadow: 0 0 10px var(--cyan);
          margin-top: 2px;
        }
        @keyframes ppf-flicker {
          0%, 19%, 21%, 23%, 54%, 56%, 100% { opacity: 1; }
          20%, 22%, 55% { opacity: 0.55; }
        }
        .ppf-stage {
          display: flex; gap: 10px; align-items: stretch;
        }
        .ppf-side {
          width: 128px; flex: 0 0 auto;
          display: flex; flex-direction: column; gap: 8px;
        }
        .ppf-panel {
          background: linear-gradient(160deg, #380f12, #1e0809);
          border: 1px solid #a35bff55;
          border-radius: 12px; padding: 8px;
          box-shadow: inset 0 0 12px #00000066;
        }
        .ppf-panel-title {
          font-size: 10px; letter-spacing: 1px; color: var(--gold);
          text-shadow: 0 0 6px var(--gold); margin-bottom: 6px;
        }
        .ppf-fish-row {
          display: flex; justify-content: space-between; font-size: 10px;
          padding: 2px 0; opacity: 0.9;
        }
        .ppf-fish-row.caught { opacity: 1; }
        .ppf-fish-count {
          color: var(--cyan); font-size: 9px;
        }
        .ppf-mini-stat { font-size: 11px; display:flex; justify-content:space-between; padding: 3px 0; }
        .ppf-game-wrap {
          flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px;
        }
        .ppf-canvas-frame {
          position: relative; border-radius: 12px; overflow: hidden;
          border: 2px solid #00e5ff55; box-shadow: 0 0 18px #00e5ff33, inset 0 0 20px #00000088;
        }
        .ppf-canvas-frame canvas { display: block; width: 100%; height: auto; }
        .ppf-hud-top {
          position: absolute; top: 6px; left: 8px; right: 8px;
          display: flex; justify-content: space-between; pointer-events: none;
          font-size: 12px; z-index: 3;
        }
        .ppf-coin-chip, .ppf-combo-chip {
          background: #0a0618cc; border: 1px solid var(--gold);
          padding: 4px 10px; border-radius: 20px; box-shadow: 0 0 10px #ffd70055;
        }
        .ppf-combo-chip { border-color: var(--pink); box-shadow: 0 0 10px #ff4fd855; }
        .ppf-banner {
          position: absolute; top: 40%; left: 50%; transform: translate(-50%,-50%);
          font-size: clamp(16px, 3.4vw, 24px); font-weight: 900; text-align: center;
          padding: 6px 16px; border-radius: 12px; pointer-events: none; z-index: 5;
          animation: ppf-pop 0.25s ease-out;
          white-space: nowrap;
        }
        @keyframes ppf-pop { from { transform: translate(-50%,-50%) scale(0.6); opacity:0; } to { transform: translate(-50%,-50%) scale(1); opacity:1; } }
        .ppf-banner.good { color: #baffed; text-shadow: 0 0 14px #f9b806; }
        .ppf-banner.bad { color: #ffb3b3; text-shadow: 0 0 14px #ff4d4d; }
        .ppf-banner.epic { color: #fff6cc; text-shadow: 0 0 20px #ffe066, 0 0 40px #ffd700; font-size: clamp(18px,4vw,28px); }
        .ppf-jackpot-flash {
          position: absolute; inset: 0; pointer-events: none; z-index: 4;
          background: radial-gradient(circle, #ffe06655, transparent 70%);
          animation: ppf-jflash 0.8s ease-in-out infinite;
        }
        @keyframes ppf-jflash { 0%,100% { opacity: 0.4; } 50% { opacity: 0.9; } }
        .ppf-reelbar-wrap {
          position: absolute; left: 10%; right: 10%; bottom: 10px; z-index: 3;
          background: #0a0618cc; border: 1px solid var(--pink); border-radius: 10px;
          padding: 4px 8px;
        }
        .ppf-reelbar-label { font-size: 9px; letter-spacing: 1px; color: var(--pink); margin-bottom: 3px; }
        .ppf-reelbar-track { height: 8px; border-radius: 6px; background: #300f12; overflow: hidden; }
        .ppf-reelbar-fill { height: 100%; background: linear-gradient(90deg, var(--pink), var(--gold)); transition: width 0.05s linear; }
        .ppf-controls {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          background: linear-gradient(160deg, #380f12, #1e0809);
          border: 1px solid #a35bff55; border-radius: 14px; padding: 10px;
        }
        .ppf-dir-btns { display: flex; gap: 8px; }
        .ppf-btn {
          border: none; cursor: pointer; color: #fff; font-weight: 800;
          border-radius: 14px; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 0 #00000055, 0 0 14px currentColor;
          transition: transform 0.06s ease;
        }
        .ppf-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #00000055; }
        .ppf-dir {
          width: 46px; height: 46px; font-size: 18px;
          background: linear-gradient(160deg, #702124, #300f12); color: var(--cyan);
        }
        .ppf-cast {
          flex: 1; height: 52px; font-size: 15px; letter-spacing: 1px;
          background: linear-gradient(160deg, var(--pink), #a32b18); color: #fff;
        }
        .ppf-reel {
          flex: 1; height: 52px; font-size: 15px; letter-spacing: 1px;
          background: linear-gradient(160deg, var(--cyan), #a30f0a); color: #26090c;
        }
        .ppf-btn:disabled { opacity: 0.35; cursor: not-allowed; box-shadow: none; }
        .ppf-bet-box {
          display: flex; align-items: center; gap: 4px; font-size: 12px;
        }
        .ppf-bet-adj {
          width: 26px; height: 26px; border-radius: 8px; font-size: 14px;
          background: #501a1c; color: var(--gold);
        }
        .ppf-sound-btn {
          width: 36px; height: 36px; border-radius: 10px; font-size: 15px;
          background: #501a1c; color: var(--gold);
        }
        .ppf-bottom-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        @media (max-width: 720px) {
          .ppf-side { display: none; }
          .ppf-mobile-bar {
            display: flex !important; gap: 8px; overflow-x: auto; padding-bottom: 2px;
          }
        }
        .ppf-mobile-bar { display: none; }
        .ppf-mobile-chip {
          flex: 0 0 auto; font-size: 10px; padding: 4px 8px; border-radius: 10px;
          background: #380f12; border: 1px solid #a35bff55; white-space: nowrap;
        }
      `}</style>

      <div className="ppf-led-border" />

      <div className="ppf-marquee">
        <div className="ppf-title">🎣 NEON FISHING</div>
        <div className="ppf-subtitle">ตกปลาเรียกทรัพย์</div>
      </div>

      <div className="ppf-stage">
        {/* LEFT PANEL */}
        <div className="ppf-side">
          <div className="ppf-panel">
            <div className="ppf-panel-title">BONUS</div>
            <div className="ppf-mini-stat"><span>🪙 Coin</span><span>+10~100</span></div>
          </div>
          <div className="ppf-panel">
            <div className="ppf-panel-title">JACKPOT</div>
            <div className="ppf-mini-stat"><span>👑 Dragon</span><span style={{ color: "#ffe066" }}>x{multiplier}</span></div>
          </div>
          <div className="ppf-panel">
            <div className="ppf-panel-title">COMBO</div>
            <div className="ppf-mini-stat"><span>🔥 Streak</span><span style={{ color: "#ff7a4e" }}>{combo}</span></div>
          </div>
          {goldenMode && (
            <div className="ppf-panel" style={{ borderColor: "#ffd700", boxShadow: "0 0 12px #ffd70088" }}>
              <div className="ppf-panel-title" style={{ color: "#fff6cc" }}>✨ GOLDEN FISH!</div>
              <div style={{ fontSize: 10, opacity: 0.9 }}>Rare fish chance ↑</div>
            </div>
          )}
        </div>

        {/* CENTER GAME */}
        <div className="ppf-game-wrap">
          <div className="ppf-canvas-frame" ref={containerRef}>
            <canvas ref={canvasRef} />
            <div className="ppf-hud-top">
              <div className="ppf-coin-chip">🪙 {coins.toLocaleString()}</div>
              <div className="ppf-combo-chip">🔥 x{combo} &nbsp;⭐ x{multiplier}</div>
            </div>
            {jackpotBanner && <div className="ppf-jackpot-flash" />}
            {message && <div className={`ppf-banner ${messageTone}`}>{message}</div>}
            {canReel && gameState === "REELING" && (
              <div className="ppf-reelbar-wrap">
                <div className="ppf-reelbar-label">FISH STAMINA — {fishOnLabel}</div>
                <div className="ppf-reelbar-track">
                  <div className="ppf-reelbar-fill" style={{ width: `${reelProgress}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="ppf-mobile-bar">
            {FISH_TYPES.map((f) => (
              <div key={f.id} className="ppf-mobile-chip" style={{ color: rarityColor[f.rarity] }}>
                {f.emoji} {f.reward}
              </div>
            ))}
          </div>

          {/* BOTTOM CONTROL PANEL */}
          <div className="ppf-controls">
            <div className="ppf-dir-btns">
              <button
                className="ppf-btn ppf-dir"
                onPointerDown={() => startMove("left")}
                onPointerUp={() => stopMove("left")}
                onPointerLeave={() => stopMove("left")}
                aria-label="Move left"
              >◀</button>
              <button
                className="ppf-btn ppf-dir"
                onPointerDown={() => startMove("right")}
                onPointerUp={() => stopMove("right")}
                onPointerLeave={() => stopMove("right")}
                aria-label="Move right"
              >▶</button>
            </div>

            <div className="ppf-bottom-row" style={{ flex: 1, justifyContent: "center" }}>
              <div className="ppf-bet-box">
                <span>BET</span>
                <button className="ppf-btn ppf-bet-adj" onClick={() => changeBet(-5)}>-</button>
                <span style={{ minWidth: 26, textAlign: "center" }}>{bet}</span>
                <button className="ppf-btn ppf-bet-adj" onClick={() => changeBet(5)}>+</button>
              </div>

              {canReel ? (
                <button
                  className="ppf-btn ppf-reel"
                  onPointerDown={startReelHold}
                  onPointerUp={stopReelHold}
                  onPointerLeave={stopReelHold}
                >⚡ REEL</button>
              ) : (
                <button className="ppf-btn ppf-cast" disabled={!canCast} onClick={handleCast}>
                  {coins < bet ? "💸 เครดิตไม่พอ" : "🎣 CAST"}
                </button>
              )}
            </div>

            <button
              className="ppf-btn ppf-sound-btn"
              onClick={() => setSoundOn((s) => !s)}
              aria-label="Toggle sound"
            >{soundOn ? "🔊" : "🔇"}</button>
          </div>
        </div>

        {/* RIGHT PANEL — FISH COLLECTION */}
        <div className="ppf-side">
          <div className="ppf-panel" style={{ flex: 1 }}>
            <div className="ppf-panel-title">🐟 COLLECTION</div>
            {FISH_TYPES.map((f) => (
              <div key={f.id} className={`ppf-fish-row ${collection[f.id] ? "caught" : ""}`} style={{ color: rarityColor[f.rarity] }}>
                <span>{f.emoji} {f.name.split(" ")[0]}</span>
                <span>
                  {f.reward}
                  {collection[f.id] ? <span className="ppf-fish-count"> ×{collection[f.id]}</span> : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
