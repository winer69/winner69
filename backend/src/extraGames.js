// Request handlers for the five imported games. Pure functions shared by the server (games.js wraps
// them with the member's wallet) and the browser (standalone mode wraps them with the local wallet).
//
//   handle(state, body, ctx) -> result | { error }
//     state : per-member object for this game (free spins, open bullets...), mutated in place
//     ctx   : { rng, rtp, charge(amount) -> null | "insufficient_balance" }
//   every result carries { wager, payout } so the wrapper can settle and keep statistics.
import { INFERNO, infernoPlay, FRUIT, fruitPlay, fruitPickFeature, ALOHA, alohaPlay, alohaEvaluate, alohaNextSticky, COPPER, copperPlay } from "./extraSlots.js";

const r2 = (n) => Math.round(n * 100) / 100;
const betFrom = (body, list) => { const b = Number(body && body.bet); return list.includes(b) ? b : null; };

// ---------------------------------------------------------------- Inferno 7s
function inferno(st, body, { rng, rtp, charge }) {
  st.respins = st.respins || 0;
  let bet, wager = 0, free = false;
  if (st.respins > 0) { free = true; bet = st.bet; st.respins--; }
  else {
    bet = betFrom(body, INFERNO.BETS); if (!bet) return { error: "Invalid bet" };
    const e = charge(bet); if (e) return { error: e };
    wager = bet; st.bet = bet;
  }
  const s = infernoPlay(rng, bet, rtp);
  st.respins += s.award;
  return { res: s.res, row: s.row, mult: s.mult, total: s.total, award: s.award, free, bet, respinsLeft: st.respins, wager, payout: s.total };
}

// ---------------------------------------------------------------- Fruit Canopy
function fruit(st, body, { rng, rtp, charge }) {
  let bet, wager = 0, feat = null, free = false;
  if (st.fs && st.fs.left > 0) { free = true; bet = st.fs.bet; feat = st.fs.feat; st.fs.left--; st.fs.idx++; }
  else {
    st.fs = null;
    bet = betFrom(body, FRUIT.BETS); if (!bet) return { error: "Invalid bet" };
    const e = charge(bet); if (e) return { error: e };
    wager = bet;
  }
  const s = fruitPlay(rng, bet, rtp, feat);
  let fsAward = 0;
  if (s.award) {
    fsAward = FRUIT.FS;
    if (free) { st.fs.left += FRUIT.FS; st.fs.n += FRUIT.FS; }
    else st.fs = { left: FRUIT.FS, n: FRUIT.FS, idx: 0, bet, feat: fruitPickFeature(rng) };
  }
  if (st.fs) st.fs.total = r2((st.fs.total || 0) + (free ? s.total : 0));
  return { grid: s.grid, total: s.total, free, bet, fsAward, fs: st.fs ? { left: st.fs.left, n: st.fs.n, idx: st.fs.idx, feat: st.fs.feat } : null, wager, payout: s.total };
}

// ---------------------------------------------------------------- Aloha Totem
function aloha(st, body, { rng, rtp, charge }) {
  let bet, wager = 0, free = false;
  if (st.fs && st.fs.left > 0) { free = true; bet = st.fs.bet; st.fs.left--; st.fs.count++; }
  else {
    st.fs = null;
    bet = betFrom(body, ALOHA.BETS); if (!bet) return { error: "Invalid bet" };
    const e = charge(bet); if (e) return { error: e };
    wager = bet;
  }
  const sticky = free ? st.fs.sticky : [];
  const s = alohaPlay(rng, bet, rtp, free, sticky);
  const res = alohaEvaluate(s.grid, bet);
  if (free) st.fs.sticky = alohaNextSticky(s.grid, res).keep;
  if (s.award) {
    if (free) st.fs.left += s.award;
    else st.fs = { left: s.award, n: s.award, count: 0, bet, sticky: [] };
  }
  return { grid: s.grid, total: s.total, award: s.award, free, bet, fsLeft: st.fs ? st.fs.left : 0, wager, payout: s.total };
}

// ---------------------------------------------------------------- Copper Gulch
function copper(st, body, { rng, rtp, charge }) {
  let bet, wager = 0, free = false;
  if (st.fs && st.fs.left > 0) { free = true; bet = st.fs.bet; st.fs.left--; }
  else {
    st.fs = null;
    bet = betFrom(body, COPPER.BETS); if (!bet) return { error: "Invalid bet" };
    const e = charge(bet); if (e) return { error: e };
    wager = bet; st.mIdx = 0;
  }
  const s = copperPlay(rng, bet, rtp, { free, mIdx: free ? st.mIdx || 0 : 0 });
  st.mIdx = s.mIdxAfter;
  let award = 0;
  if (s.scatters >= 3) {
    award = free ? 5 : s.award;
    if (free) st.fs.left += 5; else { st.fs = { left: award, bet }; st.mIdx = 0; }
  }
  return { start: s.start, steps: s.steps, total: s.total, scatters: s.scatters, award, free, bet, fsLeft: st.fs ? st.fs.left : 0, mIdx: st.mIdx, wager, payout: s.total };
}

// ---------------------------------------------------------------- Fish Shooter (ยิงปลา)
// Every shot is paid for when it is fired. When a shot's net/explosion touches fish, the browser
// claims that shot ONCE with the list of fish it touched; each claimed fish dies with chance
//   rtp / (fishes in the claim x fish value), so a shot is worth exactly the RTP whatever the
// browser claims. Special fish also carry a chain-reaction budget paid with the kill.
export const FISH = {
  BETS: [1, 2, 3, 5, 10, 20, 30, 50, 90, 100],
  BMULTS: [1, 2, 5, 10],
  VALUES: { clown: 2, puffer: 3, tang: 4, angel: 5, dolphin: 8, sword: 12, crab: 10, angler: 15, octo: 20, lobster: 25, chest: 30, turtle: 40, koi: 55, whale: 80, rocket: 100, dragon: 150, queen: 300, poseidon: 500 },
  SPECIAL: { crab: "bomb", whale: "zap", rocket: "rocket", dragon: "chain", queen: "queen", poseidon: "trident", chest: "chest" },
  CHAIN_EV: { bomb: 12, zap: 25, rocket: 45, chain: 60, queen: 120, trident: 200, chest: 0 },
  MULTS: [1, 2, 3, 4, 5, 7, 10],
  MAX_OPEN: 400, MAX_FISH_PER_CLAIM: 8,
};
const FISH_BET_OK = new Set(FISH.BETS.flatMap((b) => FISH.BMULTS.map((m) => b * m)));
function fish(st, body, { rng, rtp, charge }) {
  st.open = st.open || {};
  const shots = Array.isArray(body.shots) ? body.shots.slice(0, 200) : [];
  const claims = Array.isArray(body.claims) ? body.claims.slice(0, 200) : [];
  let wager = 0;
  for (const s of shots) {
    const b = Number(s && s.bet), id = String(s && s.id || "");
    if (!FISH_BET_OK.has(b) || !id || id.length > 24 || st.open[id]) return { error: "Invalid shot" };
    wager += b;
  }
  if (wager > 0) { const e = charge(wager); if (e) return { error: e }; }
  for (const s of shots) st.open[String(s.id)] = Number(s.bet);
  const ids = Object.keys(st.open);
  if (ids.length > FISH.MAX_OPEN) ids.slice(0, ids.length - FISH.MAX_OPEN).forEach((k) => delete st.open[k]); // very old shots that never hit are lost
  const kills = []; let payout = 0;
  for (const c of claims) {
    const id = String(c && c.b || ""), bet = st.open[id];
    if (!bet) continue; // unknown or already claimed shot
    delete st.open[id];
    const list = (Array.isArray(c.fish) ? c.fish : []).slice(0, FISH.MAX_FISH_PER_CLAIM).filter((f) => f && FISH.VALUES[f.t] && FISH.MULTS.includes(Number(f.m) || 1));
    const n = list.length;
    for (const f of list) {
      const mult = Number(f.m) || 1, sp = FISH.SPECIAL[f.t] || "", chainEv = FISH.CHAIN_EV[sp] || 0;
      const v = FISH.VALUES[f.t] * mult + chainEv;
      const p = Math.min(0.95, rtp / 100 / (n * v));
      if (rng() < p) {
        const reward = r2(FISH.VALUES[f.t] * mult * bet);
        const chain = chainEv ? r2(Math.round(chainEv * (0.6 + rng() * 0.8)) * bet) : 0;
        kills.push({ b: id, id: f.id, reward, chain });
        payout = r2(payout + reward + chain);
      }
    }
  }
  return { kills, wager, payout };
}

export const EXTRA_GAMES = {
  inferno7s: { edge: "inferno7s", actions: { spin: inferno } },
  fruitcanopy: { edge: "fruitcanopy", actions: { spin: fruit } },
  alohatotem: { edge: "alohatotem", actions: { spin: aloha } },
  coppergulch: { edge: "coppergulch", actions: { spin: copper } },
  fishshooter: { edge: "fishshooter", actions: { shots: fish } },
};
// what a returning member still has pending (free spins etc.), so the game can resume it
export function extraState(game, st) {
  if (!st) return {};
  if (game === "inferno7s") return { respins: st.respins || 0, bet: st.bet || 0 };
  if (game === "fruitcanopy") return { fs: st.fs && st.fs.left > 0 ? { left: st.fs.left, n: st.fs.n, idx: st.fs.idx, feat: st.fs.feat, bet: st.fs.bet } : null };
  if (game === "alohatotem") return { fs: st.fs && st.fs.left > 0 ? { left: st.fs.left, bet: st.fs.bet, sticky: st.fs.sticky } : null };
  if (game === "coppergulch") return { fs: st.fs && st.fs.left > 0 ? { left: st.fs.left, bet: st.fs.bet } : null, mIdx: st.mIdx || 0 };
  return {};
}
