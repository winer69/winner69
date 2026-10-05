// Rules of the four imported slot games (Inferno 7s, Fruit Canopy, Aloha Totem, Copper Gulch).
// Shared by the server (games.js decides every spin) and the browser (standalone mode).
// Each spin() reproduces the game's own maths exactly; play() applies the admin RTP the same
// way every WINNER 69 game does: decide win/lose first, then draw a natural spin that matches.
// Pure ES module, the random source is passed in.

const r2 = (n) => Math.round(n * 100) / 100;
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pickKey = (rng, w) => { let s = 0; for (const k in w) s += w[k]; let r = rng() * s; for (const k in w) { r -= w[k]; if (r < 0) return k; } return Object.keys(w)[0]; };
const pickIdx = (rng, w) => { let t = 0; for (const x of w) t += x; let r = rng() * t; for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; } return w.length - 1; };

// RTP control: natural spins are grouped into payout buckets (in bets, each awarded free spin counted as
// worth the target RTP). For a target RTP the bucket chances are re-weighted (exponential tilting, the
// smallest change that reaches the target) and a natural spin from the chosen bucket is drawn.
// Payouts always follow the game's own rules; only how often each kind of result shows up moves.
const BASE_EDGES = [0, 0.5, 1, 2, 5, 15, 50, 200];
const MIN_MASS = 0.004; // rare top buckets are merged so a matching spin is always found quickly
const bucketIn = (edges, x) => { if (x <= 0) return 0; let b = 1; while (b < edges.length && x > edges[b]) b++; return b; };
function makeTilt(seed, sample, capX, n = 20000) {
  const rng = seeded(seed);
  const xs = [];
  for (let i = 0; i < n * 3 && xs.length < n; i++) { const s = sample(rng); if (s.total <= capX) xs.push([s.total, s.award || 0]); }
  // drop top edges until the highest bucket holds at least MIN_MASS of the spins
  let edges = BASE_EDGES.slice();
  for (;;) {
    const top = xs.filter(([t]) => bucketIn(edges, t) === edges.length).length / xs.length;
    if (top >= MIN_MASS || edges.length <= 2) break;
    edges = edges.slice(0, -1);
  }
  const K = edges.length + 1, cnt = new Array(K).fill(0), sumT = new Array(K).fill(0), sumA = new Array(K).fill(0);
  for (const [t, a] of xs) { const b = bucketIn(edges, t); cnt[b]++; sumT[b] += t; sumA[b] += a; }
  const p = cnt.map((c) => c / xs.length);
  const cache = {};
  const tilt = (rtp) => {
    if (cache[rtp]) return cache[rtp];
    const T = rtp / 100;
    // each free spin awarded is itself played at this RTP, so it is worth about T bets
    const m = cnt.map((c, i) => (c ? (sumT[i] + sumA[i] * T) / c : 0));
    const mean = (lam) => { let sw = 0, sx = 0; p.forEach((pi, i) => { if (!pi) return; const w = pi * Math.exp(lam * m[i]); sw += w; sx += w * m[i]; }); return sx / sw; };
    let lo = -40, hi = 40, lam = 0;
    for (let i = 0; i < 80; i++) { lam = (lo + hi) / 2; if (mean(lam) < T) lo = lam; else hi = lam; }
    let tot = 0; const q = p.map((pi, i) => { const w = pi ? pi * Math.exp(lam * m[i]) : 0; tot += w; return w; });
    return (cache[rtp] = q.map((w) => w / tot));
  };
  tilt.edges = edges;
  return tilt;
}
function tilted(rng, rtp, tilt, sample, capX) {
  const q = tilt(rtp);
  let r = rng(), b = 0;
  for (; b < q.length - 1; b++) { r -= q[b]; if (r < 0) break; }
  let last = null;
  for (let i = 0; i < 6000; i++) {
    const s = sample();
    if (s.total > capX) continue;
    if (bucketIn(tilt.edges, s.total) === b) return s;
    if (!last || s.total === 0) last = s;
  }
  return last || sample();
}

// ============================================================ Inferno 7s
// 3 reels + 1 bonus reel, single centre payline. Bonus reel: x2/x5/x10 multiplier or RESPIN (1-5 free spins).
export const INFERNO = {
  W_MAIN: { R7: 2, G7: 3, B7: 4, B3: 5, B2: 6, B1: 7, BL: 13.5 },
  W_BONUS: { BL: 16, X2: 5, X5: 2, X10: 0.7, RSP: 1.6 },
  PAY: { R7: 150, G7: 80, B7: 40, A7: 10, B3: 20, B2: 12, B1: 8, AB: 2 },
  MULT: { X2: 2, X5: 5, X10: 10 },
  BETS: [1, 2, 5, 10, 20, 45, 90, 180, 450, 900],
};
const isSeven = (s) => s === "R7" || s === "G7" || s === "B7";
const isBar = (s) => s === "B1" || s === "B2" || s === "B3";
export function infernoEvaluate(c) {
  const [a, b, d] = c;
  if (a === b && b === d && a !== "BL") return a;
  if (c.every(isSeven)) return "A7";
  if (c.every(isBar)) return "AB";
  return null;
}
function infernoSpin(rng, bet) {
  const res = [pickKey(rng, INFERNO.W_MAIN), pickKey(rng, INFERNO.W_MAIN), pickKey(rng, INFERNO.W_MAIN), pickKey(rng, INFERNO.W_BONUS)];
  const row = infernoEvaluate(res.slice(0, 3));
  const base = row ? INFERNO.PAY[row] * bet : 0;
  const mult = INFERNO.MULT[res[3]] || 1;
  const award = res[3] === "RSP" ? 1 + Math.floor(rng() * 5) : 0;
  return { res, row, mult, total: r2(base * mult), award };
}
let infernoTilt = null;
export function infernoPlay(rng, bet, rtp) {
  if (!infernoTilt) infernoTilt = makeTilt(707, (g) => infernoSpin(g, 1), 1500, 60000);
  return tilted(rng, rtp, infernoTilt, () => infernoSpin(rng, bet), bet * 1500);
}

// ============================================================ Fruit Canopy
// 5x3, 20 lines (line bet = bet/20). 3+ scatters pay x bet and award 15 free spins; in free spins a
// featured fruit lands on 5-10 extra positions. Symbols: 0 WILD, 1 SCATTER, 2..8 fruits.
export const FRUIT = {
  W_: 0, SC: 1, FEATS: [2, 3, 4, 5],
  PAYS: [[0, 0, 0, 50, 200, 1000], [0, 0, 0, 2, 10, 50], [0, 0, 0, 20, 100, 400], [0, 0, 0, 15, 60, 250], [0, 0, 0, 10, 40, 150], [0, 0, 0, 8, 30, 100], [0, 0, 0, 5, 20, 75], [0, 0, 0, 4, 15, 50], [0, 0, 0, 3, 10, 40]],
  WEIGHTS: [[0, 2, 3, 5, 6, 7, 8, 9, 10], [2, 2, 3, 5, 6, 7, 8, 9, 10], [2, 2, 3, 5, 6, 7, 8, 9, 10], [2, 2, 3, 5, 6, 7, 8, 9, 10], [1, 2, 3, 5, 6, 7, 8, 9, 10]],
  LINES: [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 1, 2, 1], [1, 2, 1, 0, 1], [0, 1, 1, 1, 0],
    [2, 1, 1, 1, 2], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 0, 1, 0, 0], [2, 2, 1, 2, 2], [0, 2, 0, 2, 0]],
  BETS: [2, 4, 10, 20, 40, 100, 200, 400, 1000, 2000],
  FS: 15,
};
export function fruitEvaluate(g, bet) {
  const { W_, SC, PAYS, LINES } = FRUIT;
  const lb = bet / 20, wins = [];
  LINES.forEach((L, li) => {
    const s = L.map((r, c) => g[c][r]);
    let wr = 0; while (wr < 5 && s[wr] === W_) wr++;
    const base = s.find((x) => x !== W_);
    let best = null;
    if (base !== undefined && base !== SC) { let n = 0; while (n < 5 && (s[n] === base || s[n] === W_)) n++; if (n >= 3) best = { sym: base, count: n, amt: PAYS[base][n] * lb }; }
    if (wr >= 3) { const a = PAYS[W_][wr] * lb; if (!best || a > best.amt) best = { sym: W_, count: wr, amt: a }; }
    if (best) wins.push({ ...best, li, cells: L.slice(0, best.count).map((r, c) => [c, r]) });
  });
  const sc = []; g.forEach((col, c) => col.forEach((s, r) => { if (s === SC) sc.push([c, r]); }));
  const scat = sc.length >= 3 ? { cells: sc, count: sc.length, amt: PAYS[SC][Math.min(5, sc.length)] * bet, li: -1, sym: SC } : null;
  const total = wins.reduce((a, w) => a + w.amt, 0) + (scat ? scat.amt : 0);
  return { wins, scat, total: r2(total) };
}
function fruitGrid(rng, feat) {
  const { SC, WEIGHTS } = FRUIT;
  const g = [];
  for (let c = 0; c < 5; c++) {
    const col = [];
    for (let r = 0; r < 3; r++) { let s = pickIdx(rng, WEIGHTS[c]); while (s === SC && col.includes(SC)) s = pickIdx(rng, WEIGHTS[c]); col.push(s); }
    g.push(col);
  }
  if (feat != null) {
    const n = 5 + Math.floor(rng() * 6), cells = [];
    for (let c = 0; c < 5; c++) for (let r = 0; r < 3; r++) if (g[c][r] !== SC) cells.push([c, r]);
    for (let i = 0; i < n && cells.length; i++) { const [c, r] = cells.splice(Math.floor(rng() * cells.length), 1)[0]; g[c][r] = feat; }
  }
  return g;
}
function fruitSpin(rng, bet, feat) {
  const grid = fruitGrid(rng, feat);
  const ev = fruitEvaluate(grid, bet);
  return { grid, total: ev.total, award: ev.scat ? FRUIT.FS : 0 };
}
const fruitTilt = {};
export function fruitPlay(rng, bet, rtp, feat = null) {
  const k = feat == null ? "base" : "f" + feat;
  if (!fruitTilt[k]) fruitTilt[k] = makeTilt(feat == null ? 1101 : 1200 + feat, (g) => fruitSpin(g, 1, feat), 2000);
  return tilted(rng, rtp, fruitTilt[k], () => fruitSpin(rng, bet, feat), bet * 2000);
}
export const fruitPickFeature = (rng) => FRUIT.FEATS[Math.floor(rng() * 4)];

// ============================================================ Aloha Totem
// 6 reels of 3/4/5/5/4/3 rows (3,600 ways). Free spins: 12 + 2 per extra scatter, +5 on re-trigger;
// wilds that did not take part in a win stay (max 5); stacked totem wilds may appear.
export const ALOHA = {
  H: [3, 4, 5, 5, 4, 3], W: 0, S: 1, NSYM: 13, PAY_K: 0.0772,
  PAY: { 2: [10, 20, 40, 100], 3: [8, 15, 30, 60], 4: [6, 12, 25, 50], 5: [5, 10, 20, 40], 6: [4, 8, 15, 30], 7: [3, 6, 12, 25], 8: [3, 5, 10, 20], 9: [2, 4, 8, 15], 10: [2, 4, 8, 15], 11: [1, 3, 6, 12], 12: [1, 3, 6, 12] },
  W_BASE: [3, 2.0, 4, 5, 6, 7, 8, 9, 10, 13, 13, 14, 14],
  W_FREE: [5, 1.6, 5, 6, 7, 7, 8, 9, 10, 12, 12, 13, 13],
  BETS: [1, 2, 5, 10, 20, 50, 100, 200],
};
export function alohaGenGrid(free, rng) {
  const { H, W, S } = ALOHA, w = free ? ALOHA.W_FREE : ALOHA.W_BASE, g = [];
  for (let r = 0; r < 6; r++) {
    const col = []; let sc = 0;
    for (let i = 0; i < H[r]; i++) { let s; do { s = pickIdx(rng, w); } while ((s === W && r === 0) || (s === S && sc >= 1)); if (s === S) sc++; col.push(s); }
    g.push(col);
  }
  if (free) for (let r = 1; r <= 4; r++) if (rng() < 0.07) {
    const len = 2 + Math.floor(rng() * (H[r] - 1)), start = Math.floor(rng() * (H[r] - len + 1));
    for (let i = start; i < start + len; i++) if (g[r][i] !== S) g[r][i] = W;
  }
  return g;
}
export function alohaEvaluate(g, bet) {
  const { W, NSYM, PAY, PAY_K } = ALOHA, wins = []; let total = 0;
  for (let s = 2; s < NSYM; s++) {
    let n = 0, ways = 1; const cells = [];
    for (let r = 0; r < 6; r++) { let c = 0; for (let i = 0; i < g[r].length; i++) if (g[r][i] === s || g[r][i] === W) { c++; cells.push([r, i]); } if (c === 0) break; ways *= c; n++; }
    if (n >= 3) { const pay = PAY[s][n - 3] * bet * PAY_K * ways; wins.push({ sym: s, count: n, ways, pay, cells: cells.filter(([r]) => r < n) }); total += pay; }
  }
  const scat = []; for (let r = 0; r < 6; r++) for (let i = 0; i < g[r].length; i++) if (g[r][i] === ALOHA.S) scat.push([r, i]);
  return { wins, total: r2(total), scatters: scat };
}
export function alohaApplySticky(g, sticky) { for (const k of sticky) { const [r, i] = k.split(",").map(Number); g[r][i] = ALOHA.W; } }
export function alohaNextSticky(g, res) {
  const used = new Set(); for (const w of res.wins) for (const [r, i] of w.cells) if (g[r][i] === ALOHA.W) used.add(r + "," + i);
  const out = []; for (let r = 0; r < 6; r++) for (let i = 0; i < g[r].length; i++) if (g[r][i] === ALOHA.W && !used.has(r + "," + i)) out.push(r + "," + i);
  return { keep: out.slice(0, 5), used: [...used] };
}
function alohaSpin(rng, bet, free, sticky) {
  const grid = alohaGenGrid(free, rng);
  if (free && sticky && sticky.length) alohaApplySticky(grid, sticky);
  const res = alohaEvaluate(grid, bet);
  const n = res.scatters.length;
  const award = n >= 3 ? (free ? 5 : 12 + 2 * (n - 3)) : 0;
  return { grid, total: res.total, award };
}
const alohaTilt = {};
export function alohaPlay(rng, bet, rtp, free = false, sticky = []) {
  const k = free ? "free" + sticky.length : "base";
  if (!alohaTilt[k]) { const st = Array.from({ length: sticky.length }, (_, i) => ["1,0", "2,0", "3,0", "4,0", "1,1"][i]); alohaTilt[k] = makeTilt(free ? 3600 + sticky.length : 3601, (g) => alohaSpin(g, 1, free, st), 3000, 12000); }
  return tilted(rng, rtp, alohaTilt[k], () => alohaSpin(rng, bet, free, sticky), bet * 3000);
}

// ============================================================ Copper Gulch
// 6x5 ways with cascades. Winning gold-framed symbols turn into WILD instead of breaking. The
// multiplier doubles after every winning cascade (x1 .. x1024); it resets each paid spin and keeps
// growing through free spins. 3+ bells = 10 free spins (+2 per extra bell), +5 on re-trigger.
export const COPPER = {
  COLS: 6, ROWS: 5, MCAP: 10, GOLD_P: 0.06,
  W: { A: 10, K: 10, Q: 12, J: 12, T: 12, N: 12, E: 12, H: 7, B: 6, L: 5, P: 4, W: 0, S: 0.85 },
  PAY: { P: [0.5, 1, 2, 4], L: [0.4, 0.8, 1.5, 3], B: [0.3, 0.6, 1.2, 2.4], H: [0.25, 0.5, 1, 2], A: [0.1, 0.2, 0.4, 0.8], K: [0.1, 0.2, 0.4, 0.8], Q: [0.06, 0.12, 0.25, 0.5], J: [0.06, 0.12, 0.25, 0.5], T: [0.06, 0.12, 0.25, 0.5], N: [0.06, 0.12, 0.25, 0.5], E: [0.06, 0.12, 0.25, 0.5] },
  BETS: [2, 5, 10, 20, 50, 100],
};
function copperSym(rng, col, noScatter) {
  const pool = []; let tot = 0;
  for (const k in COPPER.W) { let w = COPPER.W[k]; if (k === "W") w = col >= 1 && col <= 4 ? 0.2 : 0; if (k === "S" && noScatter) w = 0; if (w > 0) { pool.push([k, w]); tot += w; } }
  let x = rng() * tot; for (const [k, w] of pool) { if ((x -= w) <= 0) return k; } return "A";
}
const copperGold = (rng, c, s) => c >= 1 && c <= 4 && s !== "S" && s !== "W" && rng() < COPPER.GOLD_P;
export function copperEvaluate(grid, bet) {
  const wins = [];
  for (const s of Object.keys(COPPER.PAY)) {
    let len = 0, ways = 1; const pos = [];
    for (let c = 0; c < COPPER.COLS; c++) { let n = 0; for (let r = 0; r < COPPER.ROWS; r++) { const g = grid[c][r]; if (g.s === s || g.s === "W") { n++; pos.push([c, r]); } } if (!n) break; ways *= n; len++; }
    if (len >= 3) wins.push({ s, len, ways, pay: (COPPER.PAY[s][len - 3] * bet * ways) / 10, pos });
  }
  return wins;
}
// one whole spin incl. every cascade. Returns the first screen + the new symbols that drop into each
// column after each cascade (in the order the browser creates them), so it can replay it exactly.
function copperSpin(rng, bet, mIdx, forceScatter = 0) {
  const { COLS, ROWS, MCAP } = COPPER;
  const final = [];
  for (let c = 0; c < COLS; c++) { final[c] = []; for (let r = 0; r < ROWS; r++) { const s = copperSym(rng, c); final[c][r] = { s, gold: copperGold(rng, c, s) }; } }
  for (let c = 0; c < COLS; c++) { let seen = false; for (let r = 0; r < ROWS; r++) if (final[c][r].s === "S") { if (seen) final[c][r].s = copperSym(rng, c, true); seen = true; } }
  if (forceScatter) {
    const reels = [0, 1, 2, 3, 4, 5].map((x) => [x, rng()]).sort((a, b) => a[1] - b[1]).slice(0, forceScatter).map((x) => x[0]);
    for (let c = 0; c < COLS; c++) {
      const has = final[c].some((x) => x.s === "S");
      if (reels.includes(c) && !has) final[c][Math.floor(rng() * ROWS)] = { s: "S", gold: false };
      if (!reels.includes(c) && has) final[c].forEach((x) => { if (x.s === "S") x.s = copperSym(rng, c, true); });
    }
  }
  const start = final.map((col) => col.map((g) => ({ ...g })));
  let grid = final.map((col) => col.map((g) => ({ ...g })));
  const steps = []; let total = 0, m = mIdx;
  for (let k = 0; k < 60; k++) {
    const wins = copperEvaluate(grid, bet);
    if (!wins.length) break;
    const mult = Math.pow(2, m);
    const win = r2(wins.reduce((a, w) => a + w.pay, 0) * mult);
    total = r2(total + win);
    const hit = new Set(); wins.forEach((w) => w.pos.forEach(([c, r]) => hit.add(c + "," + r)));
    for (const key of hit) { const [c, r] = key.split(",").map(Number); const g = grid[c][r]; if (g.gold && g.s !== "W") { g.s = "W"; g.gold = false; } else g.dead = true; }
    if (m < MCAP) m++;
    const drops = [];
    for (let c = 0; c < COLS; c++) {
      const alive = grid[c].filter((g) => !g.dead), n = ROWS - alive.length, fresh = [];
      for (let i = 0; i < n; i++) { const s = copperSym(rng, c, false); fresh.push({ s, gold: copperGold(rng, c, s) }); }
      drops.push(fresh);
      grid[c] = [...fresh.map((g) => ({ ...g })), ...alive];
    }
    steps.push({ win, mult, drops });
  }
  let scat = 0; for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (grid[c][r].s === "S") scat++;
  const award = scat >= 3 ? 10 + 2 * (scat - 3) : 0;
  return { start, steps, total, mIdxAfter: m, scatters: scat, award };
}
const copperTilt = {};
export function copperPlay(rng, bet, rtp, { free = false, mIdx = 0 } = {}) {
  const k = (free ? "f" : "b") + mIdx;
  if (!copperTilt[k]) copperTilt[k] = makeTilt(5000 + mIdx * 7 + (free ? 1 : 0), (g) => copperSpin(g, 1, mIdx), 1000, 12000);
  return tilted(rng, rtp, copperTilt[k], () => copperSpin(rng, bet, mIdx), bet * 1000);
}
