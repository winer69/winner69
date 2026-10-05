// น้ำเต้าปูปลา (NamTaoPuPla) - shared rules for the server (games.js) and the browser
// (src/NamTaoPuPla.jsx standalone mode). Pure ES module, the random source is passed in.
//
// Board: 6 single spots (0 น้ำเต้า, 1 ปู, 2 ปลา, 3 เสือ, 4 กุ้ง, 5 ไก่) laid out 3x2,
// plus 7 "pair" spots between neighbours. Three dice are rolled.
//  - single: each die showing the symbol pays 1x the stake (stake back + 1 per die)
//  - pair:   both symbols appear at least once -> stake back + PAIR_PAY x stake
// Admin RTP: the 216 possible rolls are re-weighted (exponential tilting on the payout of
// THIS bet slip) so the expected return equals the RTP; payouts themselves never change.

export const NT_PAIR_PAY = 5;
export const NT_PAIRS = [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 4], [2, 5]];
export const NT_SPOT_IDS = [...[0, 1, 2, 3, 4, 5].map((a) => "s" + a), ...NT_PAIRS.map(([a, b]) => "p" + a + b)];
const MAX_PER_SPOT = 1_000_000;

// what a roll returns in total (stake included) for a bet slip
export function ntPayout(res, bets) {
  const cnt = [0, 0, 0, 0, 0, 0];
  res.forEach((r) => cnt[r]++);
  let won = 0;
  for (let a = 0; a < 6; a++) { const v = bets["s" + a] || 0; if (v && cnt[a]) won += v * (1 + cnt[a]); }
  for (const [a, b] of NT_PAIRS) { const v = bets["p" + a + b] || 0; if (v && cnt[a] && cnt[b]) won += v * (1 + NT_PAIR_PAY); }
  return won;
}

// validate a bet slip coming from the browser -> { bets, total } or { error }
export function ntCleanBets(raw) {
  if (!raw || typeof raw !== "object") return { error: "Invalid bets" };
  const bets = {};
  let total = 0;
  for (const [k, v] of Object.entries(raw)) {
    if (!NT_SPOT_IDS.includes(k)) return { error: "Invalid bets" };
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n) || n < 0 || n > MAX_PER_SPOT) return { error: "Invalid bets" };
    if (n > 0) { bets[k] = n; total += n; }
  }
  if (total < 1) return { error: "Invalid bets" };
  return { bets, total };
}

const ALL_ROLLS = (() => {
  const out = [];
  for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) for (let c = 0; c < 6; c++) out.push([a, b, c]);
  return out;
})();

// pick the three dice for this bet slip at the given RTP (%)
export function ntPick(rng, bets, rtp) {
  const staked = Object.values(bets).reduce((a, x) => a + x, 0) || 1;
  const x = ALL_ROLLS.map((r) => ntPayout(r, bets) / staked);
  const target = Math.max(0, rtp) / 100;
  const mean = (lam) => { let sw = 0, sx = 0; for (const v of x) { const w = Math.exp(lam * v); sw += w; sx += w * v; } return sx / sw; };
  let lo = -60, hi = 60, lam = 0;
  const min = Math.min(...x), max = Math.max(...x);
  if (max - min < 1e-9) lam = 0;
  else if (target <= min) lam = lo;
  else if (target >= max) lam = hi;
  else { for (let i = 0; i < 60; i++) { lam = (lo + hi) / 2; if (mean(lam) < target) lo = lam; else hi = lam; } }
  const top = Math.max(...x.map((v) => lam * v));
  const w = x.map((v) => Math.exp(lam * v - top));
  let t = rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { t -= w[i]; if (t < 0) return ALL_ROLLS[i].slice(); }
  return ALL_ROLLS[ALL_ROLLS.length - 1].slice();
}
