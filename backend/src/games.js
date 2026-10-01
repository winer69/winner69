// Server-side game rounds. The server decides every outcome and changes the balance itself,
// so a member can't fake a win from the browser. The rules are the same as the ones the
// games used to run in the browser (admin-set win rate per game, boost floor, same payouts).
import crypto from "node:crypto";

export const DEFAULT_EDGES = { dice: 99, limbo: 97, mines: 97, hilo: 97, keno: 97, slot: 97, jungle: 95, classicslots: 96, hoohey: 96, horserace: 94, roulette: 97.3, fortune: 95, dragontiger: 96.5, neonfortune: 97, plushieparadise: 92, neonfishing: 94, stocktrading: 96 };
export const DEFAULT_BOOST_BONUS = 120; // RTP % while a boost bet is active (can be above 100 = player-favoured)
const BOOST_COST = 50;
const BOOST_BETS_PER_USE = 3;
const MINES_SIZE = 25;
const SUITS = ["♠", "♥", "♦", "♣"];

const rand = () => crypto.randomInt(0, 2 ** 40) / 2 ** 40; // [0,1)
const randInt = (n) => crypto.randomInt(0, n);
const r2 = (n) => Math.round(n * 100) / 100;

// Seeded shuffle shared with NeonFortuneSlot.jsx (keep both copies identical).
export function nfSeededRandom(seed) {
  let a = seed >>> 0;
  return function () { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const NF_WEIGHTS = { A: 4, K: 4, Q: 5, J: 5, T: 5, MOON: 3, STAR: 3, GEM: 3, CROWN: 3, DRAGON: 2, PHOENIX: 2, TIGER: 2, QUEEN: 2, WILD: 1, SCATTER: 1 };
export function nfStrips() {
  const strips = [];
  for (let r = 0; r < 5; r++) {
    const rnd = nfSeededRandom(9001 + r);
    const strip = [];
    for (const sym in NF_WEIGHTS) for (let i = 0; i < NF_WEIGHTS[sym]; i++) strip.push(sym);
    for (let i = strip.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = strip[i]; strip[i] = strip[j]; strip[j] = t; }
    strips.push(strip);
  }
  return strips;
}

export function gameSettings(db) {
  const st = db.settings || {};
  const edges = { ...DEFAULT_EDGES };
  for (const [g, v] of Object.entries(st.edges || {})) if (g in DEFAULT_EDGES && Number.isFinite(v)) edges[g] = v;
  const boostBonus = Number.isFinite(st.boostBonus) ? st.boostBonus : DEFAULT_BOOST_BONUS;
  return { edges, boostBonus };
}
// Admin input -> clean values (20%-100% like the admin RTP picker)
export function cleanGameSettings(body) {
  const out = {};
  if (body.edges && typeof body.edges === "object") {
    out.edges = {};
    for (const [g, v] of Object.entries(body.edges)) {
      const n = Number(v);
      if (g in DEFAULT_EDGES && Number.isFinite(n)) out.edges[g] = Math.max(20, Math.min(100, Math.round(n * 10) / 10));
    }
  }
  if (body.boostBonus !== undefined) {
    const n = Number(body.boostBonus);
    if (Number.isFinite(n)) out.boostBonus = Math.max(20, Math.min(200, Math.round(n)));
  }
  return out;
}
// The admin value per game is the RTP (% of bets returned to players on average).
// Payouts follow each game's own rules and never change; the RTP only changes how
// often a bet wins:  chance of winning = RTP / (average payout multiple of a win).
function winChance(rtp, avgWinMult) {
  if (!(avgWinMult > 0)) return 0;
  return Math.max(0, Math.min(0.995, rtp / 100 / avgWinMult));
}
function edgeFor(db, m, game) {
  const { edges, boostBonus } = gameSettings(db);
  const base = edges[game];
  return m.data && m.data.boostActive ? Math.max(base, boostBonus) : base;
}
function useUpBoostBet(m) {
  m.data = m.data || {};
  if (!m.data.boostActive) return;
  const left = (m.data.boostBetsLeft || 0) - 1;
  m.data.boostBetsLeft = Math.max(0, left);
  m.data.boostActive = left > 0;
}
function takeBet(m, raw) {
  const bet = Math.floor(Number(raw));
  if (!Number.isFinite(bet) || bet < 1 || bet > 10_000_000) return { error: "Invalid bet" };
  if (bet > m.balance) return { error: "insufficient_balance" };
  m.balance = r2(m.balance - bet);
  return { bet };
}
function settle(db, m, game, bet, payout) {
  m.balance = r2(m.balance + payout);
  useUpBoostBet(m);
  db.gameStats = db.gameStats || {};
  const s = db.gameStats[game] || (db.gameStats[game] = { rounds: 0, wagered: 0, payout: 0 });
  s.rounds += 1; s.wagered = r2(s.wagered + bet); s.payout = r2(s.payout + payout);
}
function freshDeck() {
  const deck = [];
  for (let rank = 2; rank <= 14; rank++) for (const suit of SUITS) deck.push({ rank, suit });
  for (let i = deck.length - 1; i > 0; i--) { const j = randInt(i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck;
}
// how many cards left in the round's deck are higher / lower than the current card (shown as hints)
function hiloOdds(s) {
  let higher = 0, lower = 0;
  const rest = s.deck.slice(s.pos);
  for (const c of rest) { if (c.rank > s.current.rank) higher++; else if (c.rank < s.current.rank) lower++; }
  return { higher, lower, total: rest.length || 1 };
}
function minesMult(safe, mineCount, edgeF) {
  let mult = 1;
  for (let i = 0; i < safe; i++) { const left = MINES_SIZE - i; mult *= left / (left - mineCount); }
  return r2(mult * edgeF); // edgeF is 1: fair multiplier
}

export function registerGames(app, { readDb, writeDb, findMember, memberAuth, rateLimit, publicMember }) {
  // wraps every member game route: load member, block suspended, save, answer with the fresh member
  const route = (path, handler) => app.post(path, memberAuth, rateLimit(Number(process.env.GAME_RATE_LIMIT) || 240, 60_000), (req, res) => {
    const db = readDb();
    const m = findMember(db, req.memberName);
    if (!m) return res.status(404).json({ error: "Member not found" });
    if (m.suspended) return res.status(403).json({ error: "Account suspended" });
    m.data = m.data || {};
    const out = handler(db, m, req.body || {});
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    m.lastActiveAt = Date.now();
    writeDb(db);
    res.json({ ...out, member: publicMember(m) });
  });

  // ---- Dice: win decided by the win rate, roll drawn on the matching side of the target
  route("/api/games/dice", (db, m, b) => {
    const target = Number(b.target);
    const mode = b.mode === "under" ? "under" : "over";
    if (!Number.isFinite(target) || target < 1 || target > 99) return { error: "Invalid target" };
    const edge = edgeFor(db, m, "dice");
    const chance = Math.max(1, Math.min(96, mode === "over" ? 100 - target : target));
    const multiplier = r2(99 / chance); // fixed rule: 99 / win-range %
    const t = takeBet(m, b.bet); if (t.error) return t;
    const won = rand() < winChance(edge, multiplier);
    const raw = won
      ? (mode === "over" ? target + rand() * (100 - target) : rand() * target)
      : (mode === "over" ? rand() * target : target + rand() * (100 - target));
    const payout = won ? r2(t.bet * multiplier) : 0;
    settle(db, m, "dice", t.bet, payout);
    return { won, roll: r2(raw), multiplier, bet: t.bet, payout };
  });

  // ---- Limbo
  route("/api/games/limbo", (db, m, b) => {
    const target = r2(Number(b.target));
    if (!Number.isFinite(target) || target < 1.01 || target > 1_000_000) return { error: "Invalid target" };
    const edge = edgeFor(db, m, "limbo");
    const t = takeBet(m, b.bet); if (t.error) return t;
    const won0 = rand() < winChance(edge, target);
    const rolled = won0 ? r2(target + rand() * target * 4) : r2(1 + rand() * Math.max(0.01, target - 1.01));
    const won = rolled >= target;
    const payout = won ? r2(t.bet * target) : 0;
    settle(db, m, "limbo", t.bet, payout);
    return { won, rolled, bet: t.bet, payout };
  });

  // ---- Hi-Lo (a round is a session: start -> guess... -> cashout, or a wrong guess ends it)
  route("/api/games/hilo/start", (db, m, b) => {
    const t = takeBet(m, b.bet); if (t.error) return t;
    const deck = freshDeck();
    m.session = { game: "hilo", bet: t.bet, deck, pos: 1, current: deck[0], mult: 1 }; // an unfinished old round is forfeited
    return { card: deck[0], bet: t.bet, odds: hiloOdds(m.session) };
  });
  route("/api/games/hilo/guess", (db, m, b) => {
    const s = m.session;
    if (!s || s.game !== "hilo") return { error: "no_round", status: 409 };
    const direction = b.direction === "lower" ? "lower" : "higher";
    const cur = s.current;
    const remaining = s.deck.slice(s.pos);
    let higher = 0, lower = 0;
    for (const c of remaining) { if (c.rank > cur.rank) higher++; else if (c.rank < cur.rank) lower++; }
    const total = remaining.length || 1;
    const edge = edgeFor(db, m, "hilo");
    const natural = Math.max(0.02, (direction === "higher" ? higher : lower) / total);
    const won0 = rand() < (s.guessed ? natural : Math.min(0.995, natural * edge / 100));
    s.guessed = true;
    const up = () => Math.min(14, cur.rank + 1 + randInt(Math.max(1, 14 - cur.rank)));
    const down = () => Math.max(2, cur.rank - 1 - randInt(Math.max(1, cur.rank - 2)));
    const nextRank = direction === "higher" ? (won0 ? up() : down()) : (won0 ? down() : up());
    const card = { rank: nextRank, suit: SUITS[randInt(4)] };
    s.pos += 1;
    if (card.rank === cur.rank) { s.current = card; return { outcome: "push", card, multiplier: s.mult, odds: hiloOdds(s) }; }
    const won = direction === "higher" ? card.rank > cur.rank : card.rank < cur.rank;
    if (won) {
      const prob = Math.max(0.02, (direction === "higher" ? higher : lower) / total);
      s.mult = r2(s.mult * r2(1 / prob));
      s.current = card;
      return { outcome: "win", card, multiplier: s.mult, odds: hiloOdds(s) };
    }
    settle(db, m, "hilo", s.bet, 0);
    m.session = null;
    return { outcome: "lose", card, multiplier: 0, bet: s.bet, payout: 0 };
  });
  route("/api/games/hilo/cashout", (db, m) => {
    const s = m.session;
    if (!s || s.game !== "hilo") return { error: "no_round", status: 409 };
    const payout = r2(s.bet * s.mult);
    settle(db, m, "hilo", s.bet, payout);
    m.session = null;
    return { bet: s.bet, payout, multiplier: s.mult };
  });

  // ---- Mines (session: start -> click... -> cashout / bomb / all safe tiles opened)
  route("/api/games/mines/start", (db, m, b) => {
    const mineCount = Math.floor(Number(b.mineCount));
    if (!Number.isFinite(mineCount) || mineCount < 1 || mineCount > 24) return { error: "Invalid mine count" };
    const t = takeBet(m, b.bet); if (t.error) return t;
    m.session = { game: "mines", bet: t.bet, mineCount, revealed: [] };
    return { bet: t.bet };
  });
  route("/api/games/mines/click", (db, m, b) => {
    const s = m.session;
    if (!s || s.game !== "mines") return { error: "no_round", status: 409 };
    const tile = Math.floor(Number(b.tile));
    if (!Number.isFinite(tile) || tile < 0 || tile >= MINES_SIZE || s.revealed.includes(tile)) return { error: "Invalid tile" };
    const edge = edgeFor(db, m, "mines");
    const left = MINES_SIZE - s.revealed.length;
    const natural = (left - s.mineCount) / left;
    const survive = s.revealed.length === 0 ? Math.min(0.995, natural * edge / 100) : natural;
    if (rand() >= survive) {
      const others = Array.from({ length: MINES_SIZE }, (_, x) => x).filter((x) => !s.revealed.includes(x) && x !== tile);
      for (let i = others.length - 1; i > 0; i--) { const j = randInt(i + 1); [others[i], others[j]] = [others[j], others[i]]; }
      const mines = [tile, ...others.slice(0, Math.max(0, s.mineCount - 1))];
      settle(db, m, "mines", s.bet, 0);
      m.session = null;
      return { hit: true, mines, bet: s.bet, payout: 0 };
    }
    s.revealed.push(tile);
    if (s.revealed.length === MINES_SIZE - s.mineCount) {
      const payout = r2(s.bet * minesMult(s.revealed.length, s.mineCount, 1));
      settle(db, m, "mines", s.bet, payout);
      m.session = null;
      return { hit: false, finished: true, bet: s.bet, payout };
    }
    return { hit: false, finished: false, multiplier: minesMult(s.revealed.length, s.mineCount, 1) };
  });
  route("/api/games/mines/cashout", (db, m) => {
    const s = m.session;
    if (!s || s.game !== "mines" || s.revealed.length === 0) return { error: "no_round", status: 409 };
    const payout = r2(s.bet * minesMult(s.revealed.length, s.mineCount, 1));
    settle(db, m, "mines", s.bet, payout);
    m.session = null;
    return { bet: s.bet, payout };
  });

  // ======================================================================
  // One-shot games (batch 2). Same rules as the browser versions had:
  // win/lose decided by the admin win rate first, the visible result is then
  // built to match, the payout is worked out from that visible result.
  // ======================================================================
  const pickOne = (arr) => arr[randInt(arr.length)];
  const shuffled = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const edgeOf = (db, m, g) => edgeFor(db, m, g);
  const oneShot = (game, fn) => route("/api/games/play/" + game, (db, m, b) => {
    const t = takeBet(m, b.bet); if (t.error) return t;
    const out = fn(db, m, b, t.bet);
    if (out.error) { m.balance = r2(m.balance + t.bet); return out; } // bad input: give the bet back
    settle(db, m, game, out.wager ?? t.bet, out.payout);
    return { ...out, bet: t.bet };
  });

  // ---- Keno
  const KENO_PAY = { 1: [0, 2.9], 2: [0, 0, 8.5], 3: [0, 0, 2.2, 24], 4: [0, 0, 1.4, 5, 45], 5: [0, 0, 0.5, 2.1, 12, 70], 6: [0, 0, 0.3, 1.1, 4, 24, 100], 7: [0, 0, 0.2, 0.6, 2, 8, 40, 200], 8: [0, 0, 0.1, 0.4, 1.2, 4, 15, 65, 350], 9: [0, 0, 0, 0.3, 0.8, 2.5, 8, 25, 100, 500], 10: [0, 0, 0, 0.2, 0.5, 1.5, 4, 12, 40, 150, 1000] };
  oneShot("keno", (db, m, b, bet) => {
    const picks = Array.isArray(b.picks) ? [...new Set(b.picks.map(Number))].filter((n) => Number.isInteger(n) && n >= 1 && n <= 40) : [];
    if (picks.length < 1 || picks.length > 10 || picks.length !== (b.picks || []).length) return { error: "Invalid picks" };
    const edge = edgeOf(db, m, "keno");
    const table = KENO_PAY[picks.length];
    const paying = table.map((x, h) => (x > 0 ? h : -1)).filter((h) => h >= 0);
    const losing = table.map((x, h) => (x === 0 ? h : -1)).filter((h) => h >= 0);
    const avg = paying.reduce((a, h) => a + table[h], 0) / (paying.length || 1);
    const won0 = rand() < winChance(edge, avg);
    const targetHits = won0 && paying.length ? pickOne(paying) : losing.length ? pickOne(losing) : 0;
    const hitPool = shuffled(picks).slice(0, Math.min(targetHits, picks.length));
    const missPool = shuffled(Array.from({ length: 40 }, (_, i) => i + 1).filter((n) => !picks.includes(n))).slice(0, 10 - hitPool.length);
    const drawn = shuffled([...hitPool, ...missPool]);
    const hits = picks.filter((n) => drawn.includes(n)).length;
    const mult = table[hits] ?? 0;
    return { drawn, hits, mult, payout: r2(bet * mult) };
  });

  // ---- 3-reel slots (Gilt Reels = "slot", Classic Slots = "classicslots")
  const SLOT_SYMS = {
    slot: [["cherry", 30, 2, 1], ["lemon", 25, 3, 0], ["grape", 18, 6, 0], ["bell", 12, 12, 0], ["star", 9, 30, 0], ["gem", 4, 80, 0], ["seven", 2, 250, 0]],
    classicslots: [["cherry", 32, 2, 1], ["lemon", 24, 3, 0], ["bell", 16, 10, 0], ["bar", 12, 25, 0], ["seven", 6, 77, 0]],
  };
  const SLOT_SCALE = { slot: 97, classicslots: 96 };
  for (const game of ["slot", "classicslots"]) {
    const syms = SLOT_SYMS[game].map(([id, weight, pay3, pay2]) => ({ id, weight, pay3, pay2 }));
    const pool = syms.flatMap((x) => Array(x.weight).fill(x));
    const spin = () => pool[randInt(pool.length)];
    const baseOf = ([a, b2, c]) => (a.id === b2.id && b2.id === c.id ? a.pay3 : a.id === b2.id ? a.pay2 : b2.id === c.id ? b2.pay2 : a.id === c.id ? a.pay2 : 0);
    // average payout of the "win" layout (a pair, sometimes three of a kind), measured once
    let sum = 0; const N = 200000;
    for (let i = 0; i < N; i++) { const a = spin(); const c = rand() < 0.15 ? a : spin(); sum += baseOf([a, a, c]); }
    const avgWin = sum / N;
    console.log(`[games] ${game}: average win ${avgWin.toFixed(2)}x`);
    oneShot(game, (db, m, b, bet) => {
      const edge = edgeOf(db, m, game);
      let finals;
      if (rand() < winChance(edge, avgWin)) {
        const a = spin(); const c = rand() < 0.15 ? a : spin();
        finals = shuffled([a, a, c]);
      } else {
        const a = spin(); let b2; do { b2 = spin(); } while (b2.id === a.id);
        let c; do { c = spin(); } while (c.id === a.id || c.id === b2.id);
        finals = [a, b2, c];
      }
      const [a, b2, c] = finals;
      let base = 0;
      if (a.id === b2.id && b2.id === c.id) base = a.pay3;
      else if (a.id === b2.id) base = a.pay2;
      else if (b2.id === c.id) base = b2.pay2;
      else if (a.id === c.id) base = a.pay2;
      const mult = base;
      return { reels: finals.map((x) => x.id), mult, payout: r2(bet * mult) };
    });
  }

  // ---- Jungle Riches (5x5, a row pays when all 5 match, WILD counts as any)
  const JUNGLE = [["WILD", 50], ["SCATTER", 0], ["MASK", 20], ["STATUE", 15], ["A", 10], ["K", 8], ["Q", 5], ["J", 3], ["10", 2]].map(([id, mult]) => ({ id, mult }));
  const jRow = (row) => row.every((x) => x.id === row[0].id || x.id === "WILD") && row[0].mult > 0;
  const jGrid = () => Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => pickOne(JUNGLE)));
  const jPay = (grid) => grid.reduce((a, row) => a + (jRow(row) ? row[0].mult / 10 : 0), 0);
  let jSum = 0, jN = 0;
  for (let i = 0; i < 400000 && jN < 3000; i++) { const g = jGrid(); if (g.some(jRow)) { jSum += jPay(g); jN++; } }
  const jAvg = jN ? jSum / jN : 3;
  oneShot("jungle", (db, m, b, bet) => {
    const won = rand() < winChance(edgeOf(db, m, "jungle"), jAvg);
    let grid = null;
    for (let i = 0; i < 3000 && !grid; i++) { const g = jGrid(); if (g.some(jRow) === won) grid = g; }
    if (!grid) {
      grid = jGrid();
      if (won) grid[0] = Array.from({ length: 5 }, () => JUNGLE[2]);
      else grid.forEach((row) => { if (jRow(row)) row[0] = { ...row[0], id: row[0].id + "_x" }; });
    }
    let payout = 0;
    grid.forEach((row) => { if (jRow(row)) payout += bet * (row[0].mult / 10); });
    return { grid: grid.map((row) => row.map((x) => x.id)), payout: r2(payout) };
  });

  // ---- Hoo Hey How
  oneShot("hoohey", (db, m, b, bet) => {
    const picked = Math.floor(Number(b.picked));
    if (!(picked >= 0 && picked <= 5)) return { error: "Invalid pick" };
    const edge = edgeOf(db, m, "hoohey");
    let dice;
    if (rand() < winChance(edge, 84 / 36)) { const g = randInt(3); dice = [0, 1, 2].map((i) => (i === g ? picked + 1 : 1 + randInt(6))); }
    else dice = [0, 0, 0].map(() => { let v; do { v = 1 + randInt(6); } while (v === picked + 1); return v; });
    const matches = dice.filter((d) => d === picked + 1).length;
    const mult = [0, 2, 3, 4][matches];
    return { dice, matches, mult, payout: matches > 0 ? r2(bet * mult) : 0 };
  });

  // ---- Horse race
  const HORSE_ODDS = { 1: 2.5, 2: 3.5, 3: 4.5, 4: 6, 5: 8, 6: 12 };
  oneShot("horserace", (db, m, b, bet) => {
    const picked = Math.floor(Number(b.picked));
    if (!HORSE_ODDS[picked]) return { error: "Invalid horse" };
    const edge = edgeOf(db, m, "horserace");
    const winner = rand() < winChance(edge, HORSE_ODDS[picked]) ? picked : pickOne([1, 2, 3, 4, 5, 6].filter((h) => h !== picked));
    const durations = {};
    for (const h of [1, 2, 3, 4, 5, 6]) durations[h] = h === winner ? 2.6 + rand() * 0.3 : 3.1 + rand() * 1.2;
    const won = winner === picked;
    const mult = won ? HORSE_ODDS[picked] : 0;
    return { winner, durations, won, mult, payout: won ? r2(bet * mult) : 0 };
  });

  // ---- Roulette
  const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const RMULT = { red: 2, black: 2, odd: 2, even: 2, low: 2, high: 2, dozen1: 3, dozen2: 3, dozen3: 3, straight: 36 };
  const rWin = (n, t, s) => {
    if (t === "straight") return n === s;
    if (n === 0) return false;
    return { red: RED.has(n), black: !RED.has(n), odd: n % 2 === 1, even: n % 2 === 0, low: n <= 18, high: n >= 19, dozen1: n <= 12, dozen2: n >= 13 && n <= 24, dozen3: n >= 25 }[t] || false;
  };
  oneShot("roulette", (db, m, b, bet) => {
    const betType = String(b.betType);
    const straightNum = Math.floor(Number(b.straightNum));
    if (!RMULT[betType] || (betType === "straight" && !(straightNum >= 0 && straightNum <= 36))) return { error: "Invalid bet type" };
    const edge = edgeOf(db, m, "roulette");
    const all = Array.from({ length: 37 }, (_, i) => i);
    const wins = all.filter((n) => rWin(n, betType, straightNum));
    const loses = all.filter((n) => !rWin(n, betType, straightNum));
    const number = pickOne(rand() < winChance(edge, RMULT[betType]) && wins.length ? wins : loses.length ? loses : all);
    const won = rWin(number, betType, straightNum);
    const mult = won ? RMULT[betType] : 0;
    return { number, won, mult, payout: won ? r2(bet * mult) : 0 };
  });

  // ---- Fortune wheel (FREE SPIN segments give a spin at the same bet, kept on the server)
  const FSEG = [[50, 1], [2, 4], [0, 13], [1, 4], [0, 13], [5, 2], ["free", 2], [0, 13], [2, 4], [10, 2], [0, 13], ["free", 2], [1, 4], [0, 13], [2, 4], [0, 13], [5, 2], [1, 4], ["free", 2], [2, 4]]
    .map(([mult, weight], i) => ({ i, mult: mult === "free" ? 0 : mult, free: mult === "free", weight }));
  const weighted = (list) => { let r = rand() * list.reduce((a, x) => a + x.weight, 0); for (const x of list) { if (r < x.weight) return x; r -= x.weight; } return list[list.length - 1]; };
  route("/api/games/play/fortune", (db, m, b) => {
    m.freeSpins = m.freeSpins || {};
    const queue = m.freeSpins.fortune || (m.freeSpins.fortune = []);
    let bet, wager;
    if (queue.length > 0) { bet = queue.shift(); wager = 0; }       // a free spin uses the bet that won it
    else { const t = takeBet(m, b.bet); if (t.error) return t; bet = t.bet; wager = t.bet; }
    const edge = edgeOf(db, m, "fortune");
    const paying = FSEG.filter((x) => x.mult > 0), nonPay = FSEG.filter((x) => x.mult === 0);
    const avgWin = paying.reduce((a, x) => a + x.mult * x.weight, 0) / paying.reduce((a, x) => a + x.weight, 0);
    const freeShare = nonPay.filter((x) => x.free).reduce((a, x) => a + x.weight, 0) / nonPay.reduce((a, x) => a + x.weight, 0);
    const R = edge / 100;
    const pWin = Math.max(0, Math.min(0.995, (R * (1 - freeShare)) / (avgWin - freeShare * R)));
    const seg = rand() < pWin ? weighted(FSEG.filter((x) => x.mult > 0)) : weighted(FSEG.filter((x) => x.mult === 0));
    let payout = 0;
    if (seg.free) queue.push(bet);
    else payout = r2(bet * seg.mult);
    settle(db, m, "fortune", wager, payout);
    return { segment: seg.i, payout, bet, wager, freeSpins: queue.length };
  });
  app.get("/api/games/fortune/free", memberAuth, (req, res) => {
    const m = findMember(readDb(), req.memberName);
    res.json({ freeSpins: m && m.freeSpins && m.freeSpins.fortune ? m.freeSpins.fortune.length : 0, bet: m && m.freeSpins && m.freeSpins.fortune && m.freeSpins.fortune[0] || 0 });
  });

  // ---- Dragon Tiger
  oneShot("dragontiger", (db, m, b, bet) => {
    const betType = ["dragon", "tiger", "tie"].includes(b.betType) ? b.betType : null;
    if (!betType) return { error: "Invalid bet type" };
    const edge = edgeOf(db, m, "dragontiger");
    const won0 = rand() < winChance(edge, betType === "tie" ? 9 : 2);
    const rr = () => 2 + randInt(13);
    let rd, rt;
    if (betType === "tie") { if (won0) { rd = rt = rr(); } else { do { rd = rr(); rt = rr(); } while (rd === rt); } }
    else {
      const dragonHigh = betType === "dragon";
      if (won0) { do { rd = rr(); rt = rr(); } while (dragonHigh ? rd <= rt : rd >= rt); }
      else { do { rd = rr(); rt = rr(); } while (dragonHigh ? rd >= rt : rd <= rt); }
    }
    const dragon = { rank: rd, suit: pickOne(SUITS) }, tiger = { rank: rt, suit: pickOne(SUITS) };
    const outcome = rd === rt ? "tie" : rd > rt ? "dragon" : "tiger";
    let payout = 0;
    if (betType === outcome) payout = r2(bet * (outcome === "tie" ? 9 : 2));
    else if (outcome === "tie") payout = r2(bet * 0.5);
    return { dragon, tiger, outcome, payout };
  });

  // ======================================================================
  // Batch 3: the four big games (Neon Fortune, Plushie Paradise, Neon Fishing,
  // Stock Trading). Money moves only here; the browser animates.
  // ======================================================================

  // ---- Neon Fortune: 5x3, 20 lines. Reel strips are built with a fixed seed,
  // identical to the browser's, so the reels can stop exactly where the server says.
  const NF_PAY = { A: { 3: 2, 4: 5, 5: 10 }, K: { 3: 2, 4: 5, 5: 10 }, Q: { 3: 1.5, 4: 4, 5: 8 }, J: { 3: 1.5, 4: 4, 5: 8 }, T: { 3: 1, 4: 3, 5: 6 }, MOON: { 3: 5, 4: 15, 5: 40 }, STAR: { 3: 5, 4: 15, 5: 40 }, GEM: { 3: 6, 4: 18, 5: 45 }, CROWN: { 3: 6, 4: 18, 5: 45 }, DRAGON: { 3: 15, 4: 50, 5: 150 }, PHOENIX: { 3: 15, 4: 50, 5: 150 }, TIGER: { 3: 18, 4: 60, 5: 180 }, QUEEN: { 3: 20, 4: 70, 5: 200 }, WILD: { 3: 20, 4: 75, 5: 250 }, SCATTER: { 3: 2, 4: 5, 5: 20 }, BONUS: {} };
  const NF_HIGH = new Set(["DRAGON", "PHOENIX", "TIGER", "QUEEN"]);
  const NF_LINES = [[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,0,0],[2,2,1,2,2],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],[2,1,1,1,2],[1,0,1,0,1],[1,2,1,2,1],[0,1,0,1,0],[2,1,2,1,2],[1,1,0,1,1],[1,1,2,1,1],[0,2,0,2,0],[2,0,2,0,2],[0,2,2,2,0]];
  const NF_STRIPS = nfStrips();
  function nfSpinGrid() {
    const stopIdx = [], grid = [];
    for (let r = 0; r < 5; r++) {
      const strip = NF_STRIPS[r], idx = randInt(strip.length);
      stopIdx.push(idx);
      grid.push([0, 1, 2].map((row) => strip[(idx + row) % strip.length]));
    }
    return { grid, stopIdx };
  }
  function nfWins(grid, bet) {
    // line pays are x4 of the old table so a win is worth more than the bet (keep in sync with NeonFortuneSlot.jsx)
    const perLine = bet / 5; const lineWins = []; let total = 0;
    NF_LINES.forEach((pattern) => {
      const seq = pattern.map((row, reel) => grid[reel][row]);
      let eff = null, broke = false;
      for (const x of seq) { if (x === "SCATTER" || x === "BONUS") { broke = true; break; } if (x !== "WILD") { eff = x; break; } }
      if (broke) return;
      if (eff === null) { if (seq.every((x) => x === "WILD")) eff = "WILD"; else return; }
      let count = 0;
      for (const x of seq) { if (x === eff || x === "WILD") count++; else break; }
      if (count >= 3 && NF_PAY[eff] && NF_PAY[eff][count]) { const amount = NF_PAY[eff][count] * perLine; lineWins.push({ count, symbol: eff }); total += amount; }
    });
    let scatters = 0;
    grid.forEach((col) => col.forEach((x) => { if (x === "SCATTER") scatters++; }));
    if (scatters >= 3 && NF_PAY.SCATTER[Math.min(scatters, 5)]) total += NF_PAY.SCATTER[Math.min(scatters, 5)] * bet;
    return { total, lineWins, scatters };
  }
  // average payout multiple of a winning Neon Fortune spin (incl. the 8% jackpot chance), measured once
  const NF_AVG_WIN = (() => {
    let sum = 0, n = 0;
    for (let i = 0; i < 200000 && n < 4000; i++) {
      const c = nfSpinGrid(); const w = nfWins(c.grid, 1);
      if (w.total <= 0) continue;
      let x = w.total;
      if (w.total >= 10 && w.lineWins.some((l) => l.count === 5 && NF_HIGH.has(l.symbol))) x = 0.92 * w.total + 0.08 * (w.total * 10 + 100);
      if (w.scatters >= 3) x += (w.scatters === 3 ? 8 : w.scatters === 4 ? 12 : 20) * 0.9; // free spins are worth about one bet each
      sum += x; n++;
    }
    const avg = n ? sum / n : 2;
    console.log(`[games] neonfortune: average win ${avg.toFixed(2)}x`);
    return avg;
  })();
  route("/api/games/neonfortune/state", (db, m) => ({ freeSpinsLeft: (m.nf && m.nf.freeSpinsLeft) || 0, bet: (m.nf && m.nf.bet) || 0 }));
  route("/api/games/neonfortune/spin", (db, m, b) => {
    m.nf = m.nf || { freeSpinsLeft: 0, bet: 0 };
    let bet, wager, isFree = false;
    if (m.nf.freeSpinsLeft > 0) { isFree = true; bet = m.nf.bet; wager = 0; m.nf.freeSpinsLeft -= 1; }
    else {
      const want = Math.floor(Number(b.bet));
      if (!(want >= 1 && want <= 5000)) return { error: "Invalid bet" };
      const t = takeBet(m, want); if (t.error) return t; bet = wager = t.bet;
    }
    const won = rand() < winChance(edgeFor(db, m, "neonfortune"), NF_AVG_WIN);
    let res = null;
    for (let i = 0; i < 500 && !res; i++) { const c = nfSpinGrid(); if ((nfWins(c.grid, bet).total > 0) === won) res = c; }
    if (!res) res = nfSpinGrid();
    const w = nfWins(res.grid, bet);
    let payout = w.total, jackpot = false;
    if (w.total > 0 && w.total / bet >= 10 && w.lineWins.some((l) => l.count === 5 && NF_HIGH.has(l.symbol)) && rand() < 0.08) {
      jackpot = true; payout = Math.round(w.total * 10 + bet * 100);
    }
    payout = r2(payout);
    let fsAwarded = 0;
    if (w.scatters >= 3) {
      fsAwarded = isFree ? (w.scatters === 3 ? 5 : w.scatters === 4 ? 8 : 12) : (w.scatters === 3 ? 8 : w.scatters === 4 ? 12 : 20);
      if (!isFree) m.nf.bet = bet;
      m.nf.freeSpinsLeft += fsAwarded;
    }
    settle(db, m, "neonfortune", wager, payout);
    return { stopIdx: res.stopIdx, grid: res.grid, payout, jackpot, isFree, bet, freeSpinsLeft: m.nf.freeSpinsLeft, fsAwarded };
  });

  // ---- Plushie Paradise (claw): which plushie is under the claw is the player's aim;
  // whether the claw holds on, and the bonus/jackpot, are decided here.
  const PLUSHIE_REWARD = { bear: 300, bunny: 180, pinkcat: 120, dragon: 90, duck: 60, purplecat: 30, panda: 130, fox: 70, pig: 35, koala: 33, hamster: 30, whitecat: 65 };
  oneShot("plushieparadise", (db, m, b, bet) => {
    const base = b.speciesId ? PLUSHIE_REWARD[b.speciesId] : 0;
    if (b.speciesId && !base) return { error: "Unknown plushie" };
    const b10 = base / 10;
    const avgWin = 0.04 * 5 * b10 + 0.96 * 0.12 * (b10 + 5) + 0.96 * 0.88 * b10;
    const success = !!base && rand() < winChance(edgeOf(db, m, "plushieparadise"), avgWin);
    if (!success) return { success: false, reward: 0, payout: 0 };
    const unit = bet / 10;
    let reward = Math.round(base * unit), isJackpot = false, isBonus = false;
    if (rand() < 0.04) { isJackpot = true; reward = Math.round(base * unit * 5); }
    else if (rand() < 0.12) { isBonus = true; reward = Math.round(base * unit + bet * 5); }
    return { success: true, reward, isJackpot, isBonus, payout: reward };
  });

  // ---- Neon Fishing: cast = bet, catch/escape decided here. The fish on the hook is the
  // player's skill; the combo multiplier is tracked here.
  const FISH_REWARD = { blue: 15, orange: 18, puffy: 22, neonblue: 28, neonpink: 35, golden: 45, dragon: 55, shark: 65, crystal: 78, dragonking: 90 };
  route("/api/games/fishing/cast", (db, m, b) => {
    m.fishing = m.fishing || { combo: 0 };
    if (m.fishing.active) settle(db, m, "neonfishing", m.fishing.bet, 0); // an unfinished cast is lost
    const t = takeBet(m, b.bet); if (t.error) { m.fishing.active = false; return t; }
    Object.assign(m.fishing, { active: true, bet: t.bet, bonus: 0 });
    return { bet: t.bet };
  });
  route("/api/games/fishing/catch", (db, m, b) => {
    const f = m.fishing;
    if (!f || !f.active) return { error: "no_round", status: 409 };
    const reward = FISH_REWARD[b.fishId];
    if (!reward) return { error: "Unknown fish" };
    const combo = Math.min(5, 1 + Math.floor(f.combo / 3));
    const success = rand() < winChance(edgeFor(db, m, "neonfishing"), (reward / 10) * combo);
    let payout = 0;
    if (success) { payout = Math.round(reward * (f.bet / 10) * combo); f.combo += 1; }
    else f.combo = 0;
    f.active = false;
    settle(db, m, "neonfishing", f.bet, payout);
    return { success, payout, bet: f.bet };
  });
  route("/api/games/fishing/escape", (db, m) => {
    const f = m.fishing;
    if (!f || !f.active) return { error: "no_round", status: 409 };
    f.combo = 0; f.active = false;
    settle(db, m, "neonfishing", f.bet, 0);
    return { payout: 0, bet: f.bet };
  });
  route("/api/games/fishing/bonus", (db, m, b) => {
    const f = m.fishing;
    const amount = Number(b.amount);
    if (!f || !f.active || ![10, 25, 50, 100].includes(amount) || (f.bonus || 0) >= 5) return { error: "no_bonus", status: 409 };
    f.bonus = (f.bonus || 0) + 1;
    const credited = amount; // bonus coins pay their face value
    m.balance = r2(m.balance + credited);
    return { amount: credited };
  });

  // ---- Stock Trading: holdings live here; a sale's price move is decided here.
  const holdingsOf = (m) => (m.stocks = m.stocks || {});
  route("/api/games/stock/state", (db, m) => ({ holdings: holdingsOf(m) }));
  route("/api/games/stock/buy", (db, m, b) => {
    const id = String(b.stockId || "").slice(0, 40);
    const qty = Math.floor(Number(b.qty)), price = Number(b.price);
    if (!id || !(qty >= 1 && qty <= 1_000_000) || !(price > 0 && price <= 10_000_000)) return { error: "Invalid trade" };
    const total = r2(qty * price);
    if (total > m.balance) return { error: "insufficient_balance" };
    const h = holdingsOf(m); const ex = h[id] || { quantity: 0, averagePrice: 0 };
    const quantity = ex.quantity + qty;
    h[id] = { quantity, averagePrice: r2((ex.averagePrice * ex.quantity + price * qty) / quantity) };
    m.balance = r2(m.balance - total);
    return { total, holdings: h };
  });
  route("/api/games/stock/sell", (db, m, b) => {
    const id = String(b.stockId || ""); const qty = Math.floor(Number(b.qty));
    const h = holdingsOf(m); const ex = h[id];
    if (!ex || !(qty >= 1) || qty > ex.quantity) return { error: "no_holding", status: 409 };
    const costBasis = r2(ex.averagePrice * qty);
    const pUp = Math.max(0, Math.min(1, (edgeFor(db, m, "stocktrading") / 100 - 0.89) / 0.22));
    const won = rand() < pUp;
    const move = 0.02 + rand() * 0.18;
    const receive = r2(won ? costBasis * (1 + move) : costBasis * Math.max(0.05, 1 - move));
    if (ex.quantity - qty <= 0) delete h[id]; else h[id] = { ...ex, quantity: ex.quantity - qty };
    settle(db, m, "stocktrading", costBasis, receive);
    return { won, receive, costBasis, holdings: h };
  });

  // ---- Boost shop (the server owns boost charges now)
  route("/api/members/me/boost/buy", (db, m) => {
    const today = new Date().toDateString();
    const countToday = m.data.boostBuyDate === today ? (m.data.boostBuyCountToday || 0) : 0;
    const price = BOOST_COST + countToday * 100;
    if (m.balance < price) return { error: "insufficient_balance" };
    m.balance = r2(m.balance - price);
    m.data.boost = (m.data.boost || 0) + 2;
    m.data.boostBuyDate = today;
    m.data.boostBuyCountToday = countToday + 1;
    return { price };
  });
  route("/api/members/me/boost/use", (db, m) => {
    if ((m.data.boost || 0) <= 0) return { error: "no_boost" };
    const left = m.data.boostActive ? (m.data.boostBetsLeft || 0) : 0;
    m.data.boost -= 1;
    m.data.boostActive = true;
    m.data.boostBetsLeft = left + BOOST_BETS_PER_USE;
    return {};
  });
  // games that still run in the browser report a finished bet so the boost counts down
  route("/api/members/me/boost/tick", (db, m) => { useUpBoostBet(m); return {}; });
}
