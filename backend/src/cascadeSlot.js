// Generic "ways + cascade" slot engine shared by the backend (games.js decides every spin
// when a server is configured) and the browser (src/CascadeSlot.jsx for the standalone demo
// and to read the paytable). Pure ES module - no Node or browser APIs; the random source is
// passed in. Each game is just a config object (see slotThemes.js).
//
// Rules for every game built on this engine
//  - R reels x N rows, N^R ways: a symbol pays when it lands on 3+ adjacent reels from the
//    left (any row). Ways = how many of that symbol (or WILD) sit on each of those reels,
//    multiplied together. Pay = bet x paytable[reels-3] x ways x current multiplier.
//  - Cascades: winning symbols are removed, the rest fall down and new ones drop in. Each
//    cascade in the same spin moves the multiplier one step up its ladder.
//  - WILD only lands on the reels listed in wildReels and substitutes for paying symbols.
//  - SCATTER anywhere: 3 / 4 / 5+ on the final screen award free spins (re-trigger too).
//  - Win per spin is capped at maxWinX times the bet.

const r2 = (n) => Math.round(n * 100) / 100;

function pick(rng, weights) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let x = rng() * total;
  for (const k in weights) { x -= weights[k]; if (x < 0) return k; }
  return Object.keys(weights)[0];
}

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function winChance(rtp, avgWinMult) {
  if (!(avgWinMult > 0)) return 0;
  return Math.max(0, Math.min(0.995, rtp / 100 / avgWinMult));
}

export function winTier(totalWin, bet) {
  const x = bet > 0 ? totalWin / bet : 0;
  if (x >= 60) return "super";
  if (x >= 35) return "mega";
  if (x >= 15) return "big";
  return null;
}

export function makeCascadeGame(cfg) {
  const { reels, rows, paytable, weights, wildReels, wildWeight, scatterWeight, mults, freeSpins, maxWinX = 2500, seed = 1688 } = cfg;
  const paying = Object.keys(paytable);
  const reelWeights = Array.from({ length: reels }, (_, r) => ({
    ...weights,
    SCATTER: scatterWeight,
    WILD: wildReels.includes(r) ? wildWeight : 0,
  }));
  const newReel = (rng, r, n) => Array.from({ length: n }, () => pick(rng, reelWeights[r]));

  function evaluate(grid, bet, mult) {
    const wins = [];
    for (const sym of paying) {
      if (!grid[0].includes(sym)) continue;
      const counts = [];
      for (let r = 0; r < reels; r++) {
        const c = grid[r].filter((s) => s === sym || s === "WILD").length;
        if (!c) break;
        counts.push(c);
      }
      if (counts.length < 3) continue;
      const n = counts.length;
      const ways = counts.reduce((a, b) => a * b, 1);
      const pay = r2(bet * paytable[sym][n - 3] * ways * mult);
      const cells = [];
      for (let r = 0; r < n; r++) grid[r].forEach((s, row) => { if (s === sym || s === "WILD") cells.push([r, row]); });
      wins.push({ sym, reels: n, ways, pay, cells });
    }
    return wins;
  }

  function spin(rng, bet, free = false) {
    const ladder = free ? mults.free : mults.base;
    let grid = Array.from({ length: reels }, (_, r) => newReel(rng, r, rows));
    const steps = [];
    let total = 0;
    for (let i = 0; i < 40; i++) {
      const mult = ladder[Math.min(i, ladder.length - 1)];
      const wins = evaluate(grid, bet, mult);
      const pay = r2(wins.reduce((a, w) => a + w.pay, 0));
      steps.push({ grid: grid.map((c) => c.slice()), wins, pay, mult });
      if (!wins.length) break;
      total = r2(total + pay);
      const remove = grid.map(() => new Set());
      for (const w of wins) for (const [r, row] of w.cells) remove[r].add(row);
      grid = grid.map((reel, r) => {
        const keep = reel.filter((_, row) => !remove[r].has(row));
        return [...newReel(rng, r, rows - keep.length), ...keep];
      });
    }
    const capped = Math.min(total, r2(bet * maxWinX));
    let scatters = 0;
    for (const reel of steps[steps.length - 1].grid) for (const s of reel) if (s === "SCATTER") scatters++;
    const fs = scatters >= 3 ? freeSpins[Math.min(5, scatters)] : 0;
    return { bet, free, steps, total: capped, scatters, freeSpins: fs };
  }

  // Average win (in bets) of a winning spin: turns the admin RTP into a win chance, the same
  // approach every WINNER 69 game uses. Seeded so the server and browser agree.
  const avgCache = {};
  function averageWin(free = false) {
    const key = free ? "free" : "base";
    if (avgCache[key]) return avgCache[key];
    const rng = seeded(free ? seed + 336 : seed);
    let sum = 0, n = 0;
    for (let i = 0; i < 60000 && n < 3000; i++) {
      const s = spin(rng, 1, free);
      if (s.total <= 0) continue;
      sum += s.total + s.freeSpins * 0.9; n++;
    }
    avgCache[key] = n ? sum / n : 2;
    return avgCache[key];
  }

  // one spin at a given RTP %: decide win/lose first, then draw a matching spin
  function play(rng, bet, rtp, free = false) {
    const won = rng() < winChance(rtp, averageWin(free));
    for (let i = 0; i < 400; i++) {
      const s = spin(rng, bet, free);
      if ((s.total > 0) === won) return s;
    }
    return spin(rng, bet, free);
  }

  return { ...cfg, maxWinX, paying, evaluate, spin, averageWin, play };
}
