// Online Dummy (ดัมมี่) tables for WINNER 69. Pure JS - dummyRoutes.js wraps it for the server,
// the browser runs the same class when there is no server.
//
// 4 seats per table (members first, bots fill the rest). Each game every member pays the room's
// bet + entry fee from the wallet; the winner takes the pot (bet x players, bots' bets come from
// the house). Members play each other for real, so nothing is rigged - the house earns the fees.
import { createDeck, shuffleDeck, sortCards, meldType, orderMeld, candidateMelds, bestPartition, canUseCard, knockPlan, chooseDiscard, computeResults, sumPoints, HAND_SIZE } from "./rules.js";

export const DUMMY_ROOMS = [
  { id: "rookie", name: "มือใหม่", level: 1, bet: 10, fee: 20 },
  { id: "regular", name: "ทั่วไป", level: 2, bet: 50, fee: 50 },
  { id: "vip", name: "VIP", level: 3, bet: 200, fee: 100 },
  { id: "master", name: "เซียน", level: 4, bet: 1000, fee: 200 },
];
export const DUMMY_SEATS = 4;
export const DUMMY_TIMING = {
  waitMs: 5000,      // a new table waits this long for other members before bots sit in
  turnMs: 30000,     // a member's turn
  botStep: [650, 1300],
  autoStep: 500,
  dealPerCard: 80, dealExtra: 2400,
  endMs: 20000,      // after a game: time to press "เล่นต่อ"
  idleKickMs: 60000,
};
const BOT_NAMES = ["Alex", "Mia", "Daniel", "Emma", "Lucas", "Sophia", "Noah", "Olivia", "James", "Liam", "Ava", "Ethan", "Chloe", "Mason", "Luna", "Leo", "Nina", "Kai", "Zoe", "Ryan"];
const AVATAR_EMOJI = ["🦊", "🐼", "🐯", "🦁", "🐸", "🐵", "🐨", "🐰", "🤖", "🧙", "🥷", "🤠", "😎", "🐲", "🦉", "🐺", "👑", "🎩", "🦄", "🐙"];
const AVATAR_GRAD = [["#FFD76A", "#C98A22"], ["#7F5AF0", "#2C1C6B"], ["#2CB67D", "#0B5144"], ["#FF6B6B", "#8E1B1B"], ["#4CC9F0", "#1D3D8F"], ["#F72585", "#5A0F3F"], ["#F5B93F", "#7A3E06"], ["#9EF01A", "#1F5C0B"]];
const PERSONALITIES = ["cautious", "balanced", "aggressive"];
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const avatarFor = (seed) => { const h = hash(seed); const g = AVATAR_GRAD[h % AVATAR_GRAD.length]; return { emoji: AVATAR_EMOJI[(h >>> 8) % AVATAR_EMOJI.length], g1: g[0], g2: g[1] }; };
let uid = 0;
const newId = (p) => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`;

export class DummyHub {
  /** hooks: charge(username, amount) -> true|false (take bet + fee from the wallet),
   *  credit(username, amount, info), onGameEnd(table, results[{username, wager, payout}]) */
  constructor(hooks = {}) {
    this.hooks = hooks;
    this.tables = new Map();
    this.where = new Map();
  }

  rooms() {
    return DUMMY_ROOMS.map((r) => {
      let players = 0;
      for (const t of this.tables.values()) if (t.room.id === r.id) players += t.seats.filter((s) => s.kind === "human").length;
      return { ...r, players, pot: r.bet * DUMMY_SEATS };
    });
  }
  tableOf(u) { const id = this.where.get(u); return id ? this.tables.get(id) : null; }

  join(username, profile, roomId, now = Date.now()) {
    if (this.where.has(username)) return { error: "already_seated" };
    const room = DUMMY_ROOMS.find((r) => r.id === roomId);
    if (!room) return { error: "bad_room" };
    let table = null;
    for (const t of this.tables.values()) {
      // join a table that is waiting for players or between games, with a free member seat
      if (t.room.id === room.id && (t.status === "waiting" || t.status === "ended") && t.seats.filter((s) => s.kind === "human").length < DUMMY_SEATS) { table = t; break; }
    }
    if (!table) table = this.createTable(room, now);
    const seat = { pid: newId("h"), kind: "human", username, name: profile.name || username, avatar: avatarFor(username), lastSeen: now, ready: true, auto: false };
    if (table.status === "ended") { // replace a bot for the next game
      const b = table.seats.findIndex((s) => s.kind === "bot");
      if (table.seats.length >= DUMMY_SEATS && b >= 0) table.seats.splice(b, 1);
    }
    table.seats.push(seat);
    this.where.set(username, table.id);
    if (table.status === "waiting" && table.seats.filter((s) => s.kind === "human").length >= DUMMY_SEATS) table.phaseEnds = now; // full: start now
    table.version++;
    return { ok: true, tableId: table.id };
  }

  /** before a game starts: no cost. During a game: a bot plays the seat to the end (bet is lost unless it wins). */
  leave(username, now = Date.now()) {
    const t = this.tableOf(username);
    if (!t) return { error: "not_seated" };
    const i = t.seats.findIndex((s) => s.username === username);
    this.where.delete(username);
    if (i < 0) return { ok: true };
    if (t.status === "playing" || t.status === "dealing") { t.seats[i].auto = true; t.seats[i].gone = true; }
    else t.seats.splice(i, 1);
    t.version++;
    return { ok: true, forfeited: t.status === "playing" || t.status === "dealing" };
  }

  createTable(room, now) {
    const t = { id: newId("dm"), room, seats: [], status: "waiting", phaseEnds: now + DUMMY_TIMING.waitMs, version: 1, game: null, results: null, gameNo: 0 };
    this.tables.set(t.id, t);
    return t;
  }

  makeBot(used) {
    let name = pick(BOT_NAMES), k = 0;
    while (used.has(name) && k++ < 30) name = pick(BOT_NAMES) + rint(2, 99);
    used.add(name);
    return { pid: newId("b"), kind: "bot", name, avatar: avatarFor(name + rint(1, 1e6)), personality: pick(PERSONALITIES), ready: true };
  }

  startGame(t, now) {
    // members who did not press "เล่นต่อ" (or left / went idle) stand up
    t.seats = t.seats.filter((s) => s.kind === "bot" || (!s.gone && s.ready && now - s.lastSeen < DUMMY_TIMING.idleKickMs) || (this.where.delete(s.username), false));
    // everybody pays bet + fee; who cannot pay stands up
    t.seats = t.seats.filter((s) => {
      if (s.kind === "bot") return true;
      const ok = this.hooks.charge ? this.hooks.charge(s.username, t.room.bet + t.room.fee, { tableId: t.id, fee: t.room.fee }) : true;
      if (!ok) this.where.delete(s.username);
      return ok;
    });
    if (!t.seats.some((s) => s.kind === "human")) { this.tables.delete(t.id); return; }
    const used = new Set(t.seats.map((s) => s.name));
    t.seats = t.seats.filter((s) => s.kind === "human").concat(t.seats.filter((s) => s.kind === "bot"));
    while (t.seats.length < DUMMY_SEATS) t.seats.push(this.makeBot(used));
    if (t.seats.length > DUMMY_SEATS) t.seats = t.seats.slice(0, DUMMY_SEATS);
    t.seats.forEach((s) => { s.ready = s.kind === "bot"; s.auto = false; s.gone = false; s.timeouts = 0; });
    const n = t.seats.length;
    const deck = shuffleDeck(createDeck());
    const hs = HAND_SIZE[n];
    const hands = t.seats.map(() => []);
    for (let k = 0; k < hs; k++) for (let p = 0; p < n; p++) hands[p].push(deck.pop());
    const head = deck.pop();
    const starter = t.gameNo++ % n;
    t.game = {
      players: t.seats.map((s, i) => ({ id: i, pid: s.pid, name: s.name, avatar: s.avatar, hand: sortCards(hands[i], "suit"), meldPoints: 0, personality: s.personality })),
      deck, discard: [head], melds: [], current: starter, phase: "draw", mustMeldId: null, lastDrawnId: null, turnId: 1, bet: t.room.bet,
    };
    t.results = null;
    t.status = "dealing";
    t.phaseEnds = now + n * hs * DUMMY_TIMING.dealPerCard + DUMMY_TIMING.dealExtra;
    t.version++;
  }

  // ---------------------------------------------------------------- moves (all validated here)
  seatIndex(t, username) { return t.seats.findIndex((s) => s.username === username); }

  move(t, i, m, now) {
    const g = t.game;
    if (t.status !== "playing" || g.current !== i) return { error: "not_your_turn" };
    const p = g.players[i];
    const card = (id) => p.hand.find((c) => c.id === id);
    switch (m.type) {
      case "draw": {
        if (g.phase !== "draw") return { error: "already_drew" };
        if (!g.deck.length) { this.endGame(t, null, false, now); return { ok: true }; }
        const c = g.deck.pop();
        p.hand.push(c);
        g.phase = "play"; g.lastDrawnId = c.id; g.lastEvent = { type: "draw", who: i };
        break;
      }
      case "take": {
        if (g.phase !== "draw") return { error: "already_drew" };
        const top = g.discard[g.discard.length - 1];
        if (!top || !canUseCard(top, p.hand, g.melds)) return { error: "cannot_take" };
        g.discard.pop();
        p.hand.push(top);
        g.phase = "play"; g.mustMeldId = top.id; g.lastDrawnId = top.id; g.lastEvent = { type: "take", who: i, card: top.id };
        break;
      }
      case "meld": {
        if (g.phase !== "play") return { error: "draw_first" };
        const cards = (m.ids || []).map(card);
        if (cards.some((c) => !c) || !meldType(cards)) return { error: "bad_meld" };
        this.createMeld(g, i, cards);
        break;
      }
      case "layoff": {
        if (g.phase !== "play") return { error: "draw_first" };
        const cards = (m.ids || []).map(card);
        const meld = g.melds.find((x) => x.id === m.meldId);
        if (!meld || cards.some((c) => !c) || !cards.length || !meldType([...meld.cards, ...cards])) return { error: "bad_layoff" };
        this.layoff(g, i, cards, meld);
        break;
      }
      case "discard": {
        if (g.phase !== "play") return { error: "draw_first" };
        if (g.mustMeldId) return { error: "must_meld_taken" };
        const c = card(m.id);
        if (!c) return { error: "bad_card" };
        p.hand = p.hand.filter((x) => x.id !== c.id);
        g.discard.push(c);
        g.lastEvent = { type: "discard", who: i, card: c.id };
        if (!p.hand.length) { this.endGame(t, i, true, now); return { ok: true }; }
        this.nextTurn(t, now);
        return { ok: true };
      }
      case "knock": {
        if (g.phase !== "play") return { error: "draw_first" };
        const plan = knockPlan(p.hand, g.melds, g.mustMeldId);
        if (!plan) return { error: "cannot_knock" };
        plan.melds.forEach((mm) => this.createMeld(g, i, mm));
        const idMap = {};
        g.melds.forEach((ml) => plan.melds.forEach((pm, k) => { if (pm.every((c) => ml.cards.some((x) => x.id === c.id))) idMap[`new${k}`] = ml.id; }));
        plan.layoffs.forEach((l) => { const ml = g.melds.find((x) => x.id === (idMap[l.meldId] || l.meldId)); if (ml) this.layoff(g, i, [l.card], ml); });
        if (plan.discard) { p.hand = p.hand.filter((x) => x.id !== plan.discard.id); g.discard.push(plan.discard); }
        g.lastEvent = { type: "knock", who: i };
        this.endGame(t, i, true, now);
        return { ok: true };
      }
      default: return { error: "bad_move" };
    }
    if (!p.hand.length) { this.endGame(t, i, true, now); return { ok: true }; }
    t.version++;
    this.schedule(t, now);
    return { ok: true };
  }

  createMeld(g, i, cards) {
    const ids = new Set(cards.map((c) => c.id));
    const p = g.players[i];
    g.melds = g.melds.map((m) => ({ ...m, fresh: false }));
    g.melds.push({ id: `m${g.turnId}-${Math.random().toString(36).slice(2, 7)}`, owner: i, cards: orderMeld(cards), type: meldType(cards), fresh: true });
    p.hand = p.hand.filter((c) => !ids.has(c.id));
    p.meldPoints += sumPoints(cards);
    if (ids.has(g.mustMeldId)) g.mustMeldId = null;
    g.lastEvent = { type: "meld", who: i };
  }
  layoff(g, i, cards, meld) {
    const ids = new Set(cards.map((c) => c.id));
    const p = g.players[i];
    g.melds = g.melds.map((m) => (m.id === meld.id ? { ...m, cards: orderMeld([...m.cards, ...cards]), fresh: true } : { ...m, fresh: false }));
    p.hand = p.hand.filter((c) => !ids.has(c.id));
    p.meldPoints += sumPoints(cards);
    if (ids.has(g.mustMeldId)) g.mustMeldId = null;
    g.lastEvent = { type: "layoff", who: i };
  }

  nextTurn(t, now) {
    const g = t.game;
    g.current = (g.current + 1) % g.players.length;
    g.phase = "draw"; g.mustMeldId = null; g.lastDrawnId = null; g.turnId++;
    t.version++;
    if (!g.deck.length) { this.endGame(t, null, false, now); return; }
    this.schedule(t, now);
  }

  schedule(t, now) {
    const g = t.game;
    const s = t.seats[g.current];
    if (s.kind === "bot") t.phaseEnds = now + rint(...DUMMY_TIMING.botStep);
    else if (s.auto || now - s.lastSeen > DUMMY_TIMING.idleKickMs) t.phaseEnds = now + DUMMY_TIMING.autoStep;
    else if (!t.turnStart || t.turnStartId !== g.turnId) { t.turnStart = now; t.turnStartId = g.turnId; t.phaseEnds = now + DUMMY_TIMING.turnMs; }
  }

  /** the next move for a bot (or a member who ran out of time) - the same play as the original AI */
  aiMove(t, i) {
    const g = t.game;
    const p = g.players[i];
    const diff = "normal";
    if (g.phase === "draw") {
      const top = g.discard[g.discard.length - 1];
      const takeChance = p.personality === "cautious" ? 0.8 : 1;
      if (top && canUseCard(top, p.hand, g.melds) && Math.random() < takeChance) return { type: "take" };
      return { type: "draw" };
    }
    if (g.mustMeldId) {
      const took = p.hand.find((c) => c.id === g.mustMeldId);
      const m = candidateMelds(p.hand).filter((mm) => mm.includes(took)).sort((a, b) => b.length - a.length)[0];
      if (m) return { type: "meld", ids: m.map((c) => c.id) };
      const tm = g.melds.find((mm) => meldType([...mm.cards, took]));
      if (tm) return { type: "layoff", ids: [took.id], meldId: tm.id };
    }
    if (knockPlan(p.hand, g.melds, g.mustMeldId)) return { type: "knock" };
    const part = bestPartition(p.hand);
    for (const m of part.melds) if (p.hand.length - m.length >= 1) return { type: "meld", ids: m.map((c) => c.id) };
    if (p.hand.length > 1) for (const c of p.hand) { const tm = g.melds.find((mm) => meldType([...mm.cards, c])); if (tm) return { type: "layoff", ids: [c.id], meldId: tm.id }; }
    const c = chooseDiscard(p.hand, diff, { discard: g.discard, melds: g.melds, mustMeldId: g.mustMeldId });
    return { type: "discard", id: c.id };
  }

  endGame(t, winnerIdx, knock, now) {
    const g = t.game;
    const res = computeResults(g.players.map((p, i) => ({ ...p, isUser: false, idx: i })), winnerIdx, knock);
    const pot = t.room.bet * g.players.length;
    const results = [];
    t.seats.forEach((s, i) => {
      if (s.kind !== "human") return;
      const won = res.winner === i;
      if (won && this.hooks.credit) this.hooks.credit(s.username, pot, { tableId: t.id });
      results.push({ username: s.username, wager: t.room.bet, payout: won ? pot : 0 });
    });
    t.results = { ...res, pot, winnerPid: t.seats[res.winner] ? t.seats[res.winner].pid : null };
    t.status = "ended";
    t.phaseEnds = now + DUMMY_TIMING.endMs;
    t.seats.forEach((s) => { if (s.kind === "human") s.ready = false; });
    t.version++;
    if (this.hooks.onGameEnd) this.hooks.onGameEnd(t, results);
  }

  // ---------------------------------------------------------------- member requests
  act(username, m, now = Date.now()) {
    const t = this.tableOf(username);
    if (!t) return { error: "not_seated" };
    const i = this.seatIndex(t, username);
    if (i < 0) return { error: "not_seated" };
    const s = t.seats[i];
    s.lastSeen = now;
    if (m.type === "ready") {
      if (t.status !== "ended") return { error: "not_ended" };
      s.ready = true;
      if (t.seats.filter((x) => x.kind === "human").every((x) => x.ready)) t.phaseEnds = Math.min(t.phaseEnds, now + 800);
      t.version++;
      return { ok: true };
    }
    s.timeouts = 0;
    return this.move(t, i, m, now);
  }

  tick(now = Date.now()) {
    for (const t of [...this.tables.values()]) {
      if (now < t.phaseEnds) continue;
      if (t.status === "waiting") { this.startGame(t, now); continue; }
      if (t.status === "ended") {
        // members that did not press "เล่นต่อ" stand up; start again if anybody is ready
        const ready = t.seats.filter((s) => s.kind === "human" && s.ready && !s.gone);
        for (const s of t.seats.filter((x) => x.kind === "human" && (!x.ready || x.gone))) this.where.delete(s.username);
        t.seats = t.seats.filter((s) => s.kind === "bot" || (s.ready && !s.gone));
        if (!ready.length) { this.tables.delete(t.id); continue; }
        this.startGame(t, now);
        continue;
      }
      if (t.status === "dealing") { t.status = "playing"; t.version++; this.schedule(t, now); continue; }
      if (t.status === "playing") {
        const g = t.game;
        const i = g.current;
        const s = t.seats[i];
        if (s.kind === "human" && !s.auto && g.phase === "draw") { s.timeouts = (s.timeouts || 0) + 1; if (s.timeouts >= 3) s.auto = true; }
        const r = this.move(t, i, this.aiMove(t, i), now);
        if (r.error) { // should not happen: fall back to drawing / discarding the first card
          const p = g.players[i];
          if (g.phase === "draw") this.move(t, i, { type: "draw" }, now);
          else { g.mustMeldId = null; this.move(t, i, { type: "discard", id: p.hand[0].id }, now); }
        }
      }
    }
  }

  view(username, now = Date.now()) {
    const t = this.tableOf(username);
    if (!t) return { seated: false };
    const you = this.seatIndex(t, username);
    if (you < 0) return { seated: false };
    t.seats[you].lastSeen = now;
    const base = { seated: true, tableId: t.id, room: t.room, status: t.status, version: t.version, msLeft: Math.max(0, t.phaseEnds - now), you,
      seats: t.seats.map((s, i) => ({ pid: s.pid, name: s.name, avatar: s.avatar, kind: s.kind, member: s.kind === "human" && i !== you, ready: !!s.ready, auto: !!s.auto })) };
    if (!t.game || t.status === "waiting") return base;
    const g = t.game;
    const ended = t.status === "ended";
    return {
      ...base,
      game: {
        players: g.players.map((p, i) => ({ id: i, pid: p.pid, name: p.name, avatar: p.avatar, meldPoints: p.meldPoints, count: p.hand.length,
          hand: i === you || ended ? p.hand : null })),
        gameNo: t.gameNo, deckCount: g.deck.length, discard: g.discard, melds: g.melds, current: g.current, phase: g.phase, turnId: g.turnId, bet: g.bet,
        mustMeldId: g.current === you ? g.mustMeldId : null, lastDrawnId: g.current === you ? g.lastDrawnId : null, lastEvent: g.lastEvent || null,
        turnMsLeft: t.status === "playing" && g.current === you ? Math.max(0, t.phaseEnds - now) : 0,
      },
      results: ended ? t.results : null,
    };
  }
}
