// Online ผสมสิบ (Phom Sip) tables for WINNER 69. Pure JS - phomsipRoutes.js wraps it for the server,
// the browser runs the same class when there is no server.
//
// 2 seats per table (head-to-head, like the original game). A member plays another member when one is
// waiting in the same room, otherwise a bot. Each game every member pays the room's bet + entry fee from
// the wallet; the winner takes the pot (bet x 2, a bot's bet comes from the house), a tie gives the bets
// back. Members play each other for real, so nothing is rigged - the house earns the fees.
//
// Every card carries a random per-game token. Views use the token as the card id, so the browser can
// animate cards between piles without ever learning a hidden card's face (real ids are "7-hearts").
import { RULES, AI_LEVELS, createInitialState, startRound, dealOne, gameReducer, scoresOf, aiChooseDraw, aiChooseMelds, aiChooseDiscard } from "./rules.js";

export const PHOMSIP_ROOMS = [
  { id: "rookie", name: "มือใหม่", level: 1, bet: 20, fee: 20, ai: "easy" },
  { id: "regular", name: "ทั่วไป", level: 2, bet: 100, fee: 50, ai: "normal" },
  { id: "vip", name: "VIP", level: 3, bet: 500, fee: 100, ai: "hard" },
  { id: "master", name: "เซียน", level: 4, bet: 2500, fee: 250, ai: "hard" },
];
export const PHOMSIP_SEATS = 2;
export const PHOMSIP_TIMING = {
  waitMs: 5000,       // a new table waits this long for another member before a bot sits in
  dealMs: 4200,       // the browser animates the deal (650 + 11 x 230ms) inside this window
  turnMs: 25000,      // a member's whole turn
  botThink: [900, 1500],
  botFocus: 650,      // a bot lifts the cards it is about to use, then plays them
  botGap: 750,
  autoStep: 450,
  endMs: 15000,       // after a game: time to press "เล่นอีกครั้ง"
  idleKickMs: 60000,
};
const SIDES = ["player", "ai"];
const BOT_NAMES = ["Alex", "Mia", "Daniel", "Emma", "Lucas", "Sophia", "Noah", "Olivia", "James", "Liam", "Ava", "Ethan", "Chloe", "Mason", "Luna", "Leo", "Nina", "Kai", "Zoe", "Ryan"];
const AVATAR_EMOJI = ["🦊", "🐼", "🐯", "🦁", "🐸", "🐵", "🐨", "🐰", "🤖", "🧙", "🥷", "🤠", "😎", "🐲", "🦉", "🐺", "👑", "🎩", "🦄", "🐙"];
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const avatarFor = (seed) => AVATAR_EMOJI[hash(seed) % AVATAR_EMOJI.length];
const token = () => Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
let uid = 0;
const newId = (p) => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`;

/** the engine state as seen from `side` (the AI helpers always play the 'ai' side) */
function asSide(s, side) {
  if (side === "ai") return s;
  const sw = (o) => ({ player: o.ai, ai: o.player });
  return { ...s, hands: sw(s.hands), melds: sw(s.melds), bonus: sw(s.bonus), turn: s.turn === "player" ? "ai" : "player" };
}

export class PhomSipHub {
  /** hooks: charge(username, amount, info) -> true|false (bet + fee from the wallet),
   *  credit(username, amount, info), onGameEnd(table, results[{username, wager, payout}]) */
  constructor(hooks = {}) {
    this.hooks = hooks;
    this.tables = new Map();
    this.where = new Map();
  }

  rooms() {
    return PHOMSIP_ROOMS.map((r) => {
      let players = 0;
      for (const t of this.tables.values()) if (t.room.id === r.id) players += t.seats.filter((s) => s.kind === "human").length;
      return { ...r, players, pot: r.bet * PHOMSIP_SEATS };
    });
  }
  tableOf(u) { const id = this.where.get(u); return id ? this.tables.get(id) : null; }
  seatIndex(t, username) { return t.seats.findIndex((s) => s.username === username); }

  join(username, profile, roomId, now = Date.now()) {
    if (this.where.has(username)) return { error: "already_seated" };
    const room = PHOMSIP_ROOMS.find((r) => r.id === roomId);
    if (!room) return { error: "bad_room" };
    let table = null;
    for (const t of this.tables.values()) {
      if (t.room.id === room.id && (t.status === "waiting" || t.status === "ended") && t.seats.filter((s) => s.kind === "human").length < PHOMSIP_SEATS) { table = t; break; }
    }
    if (!table) table = this.createTable(room, now);
    if (table.status === "ended") { // take the bot's chair for the next game
      const b = table.seats.findIndex((s) => s.kind === "bot");
      if (table.seats.length >= PHOMSIP_SEATS && b >= 0) table.seats.splice(b, 1);
    }
    table.seats.push({ pid: newId("h"), kind: "human", username, name: profile.name || username, avatar: avatarFor(username), lastSeen: now, ready: true, auto: false });
    this.where.set(username, table.id);
    if (table.status === "waiting" && table.seats.filter((s) => s.kind === "human").length >= PHOMSIP_SEATS) table.phaseEnds = now; // full: start now
    table.version++;
    return { ok: true, tableId: table.id };
  }

  /** before a game: free. During a game: a bot finishes the seat (the bet is lost unless it wins). */
  leave(username) {
    const t = this.tableOf(username);
    if (!t) return { error: "not_seated" };
    const i = this.seatIndex(t, username);
    this.where.delete(username);
    if (i < 0) return { ok: true };
    const live = t.status === "playing" || t.status === "dealing";
    if (live) { t.seats[i].auto = true; t.seats[i].gone = true; }
    else t.seats.splice(i, 1);
    if (!live && !t.seats.some((s) => s.kind === "human")) this.tables.delete(t.id);
    t.version++;
    return { ok: true, forfeited: live };
  }

  createTable(room, now) {
    const t = { id: newId("ps"), room, seats: [], status: "waiting", phaseEnds: now + PHOMSIP_TIMING.waitMs, version: 1, game: null, results: null, gameNo: 0, turnNo: 0, focus: [], pending: null };
    this.tables.set(t.id, t);
    return t;
  }

  makeBot(used) {
    let name = pick(BOT_NAMES), k = 0;
    while (used.has(name) && k++ < 30) name = pick(BOT_NAMES) + rint(2, 99);
    used.add(name);
    return { pid: newId("b"), kind: "bot", name, avatar: avatarFor(name + rint(1, 1e6)), ready: true };
  }

  startGame(t, now) {
    t.seats = t.seats.filter((s) => s.kind === "bot" || (!s.gone && s.ready && now - s.lastSeen < PHOMSIP_TIMING.idleKickMs) || (this.where.delete(s.username), false));
    t.seats = t.seats.filter((s) => {
      if (s.kind === "bot") return true;
      const ok = this.hooks.charge ? this.hooks.charge(s.username, t.room.bet + t.room.fee, { tableId: t.id, fee: t.room.fee }) : true;
      if (!ok) this.where.delete(s.username);
      return ok;
    });
    if (!t.seats.some((s) => s.kind === "human")) { this.tables.delete(t.id); return; }
    const used = new Set(t.seats.map((s) => s.name));
    t.seats = t.seats.filter((s) => s.kind === "human").concat(t.seats.filter((s) => s.kind === "bot"));
    while (t.seats.length < PHOMSIP_SEATS) t.seats.push(this.makeBot(used));
    t.seats = t.seats.slice(0, PHOMSIP_SEATS);
    t.seats.forEach((s) => { s.ready = s.kind === "bot"; s.auto = false; s.gone = false; s.timeouts = 0; });

    let g = startRound(createInitialState(RULES));
    g = { ...g, deck: g.deck.map((c) => ({ ...c, tok: token() })) };
    // deal order: 5 cards each, alternating, then the starter discard (dealOne's own order)
    const total = RULES.HAND_SIZE * 2;
    const order = g.deck.slice(-(total + 1)).reverse().map((c, k) => ({ tok: c.tok, to: k < total ? (k % 2 === 0 ? "player" : "ai") : "discard" }));
    while (g.status === "dealing") g = dealOne(g);
    const starter = SIDES[t.gameNo % 2];
    g = { ...g, turn: starter, step: "draw" };
    t.gameNo++;
    t.game = g;
    t.deal = order;
    t.inGame = new Set(t.seats.map((s) => s.pid));
    t.results = null;
    t.focus = []; t.pending = null; t.turnNo++;
    t.status = "dealing";
    t.phaseEnds = now + PHOMSIP_TIMING.dealMs;
    t.version++;
  }

  // ---------------------------------------------------------------- moves (validated by the engine)
  apply(t, i, m, now) {
    const g = t.game;
    const side = SIDES[i];
    if (t.status !== "playing" || g.status !== "playing" || g.turn !== side) return { error: "not_your_turn" };
    const byTok = (tok) => g.hands[side].find((c) => c.tok === tok);
    let action;
    switch (m.type) {
      case "draw": action = { type: "DRAW", who: side }; break;
      case "capture": { const c = byTok(m.id); if (!c) return { error: "bad_card" }; action = { type: "CAPTURE", who: side, cardId: c.id }; break; }
      case "meld": { const cs = (m.ids || []).map(byTok); if (cs.length !== 2 || cs.some((c) => !c)) return { error: "bad_card" }; action = { type: "MELD", who: side, cardIds: cs.map((c) => c.id) }; break; }
      case "discard": { const c = byTok(m.id); if (!c) return { error: "bad_card" }; action = { type: "DISCARD", who: side, cardId: c.id }; break; }
      default: return { error: "bad_move" };
    }
    const next = gameReducer(g, action);
    if (next.notice) return { error: "illegal", notice: next.notice };
    t.game = next;
    t.focus = []; t.pending = null;
    t.version++;
    if (next.status === "roundOver") { this.endGame(t, now); return { ok: true }; }
    if (next.turn !== g.turn) t.turnNo++;
    this.schedule(t, now);
    return { ok: true };
  }

  schedule(t, now) {
    const s = t.seats[SIDES.indexOf(t.game.turn)];
    if (s.kind === "bot") t.phaseEnds = now + (t.game.step === "draw" && t.botTurn !== t.turnNo ? rint(...PHOMSIP_TIMING.botThink) : PHOMSIP_TIMING.botGap);
    else if (s.auto || t.autoTurn === t.turnNo || now - s.lastSeen > PHOMSIP_TIMING.idleKickMs) t.phaseEnds = now + PHOMSIP_TIMING.autoStep;
    else if (t.memberTurn !== t.turnNo) { t.memberTurn = t.turnNo; t.phaseEnds = now + PHOMSIP_TIMING.turnMs; }
    if (s.kind === "bot") t.botTurn = t.turnNo;
  }

  /** the next move for the seat on turn - the original game's AI, with the room's level */
  aiMove(t, i) {
    const g = t.game;
    const side = SIDES[i];
    const view = asSide(g, side);
    const level = t.seats[i].kind === "bot" ? t.room.ai : "normal";
    const tok = (id) => g.hands[side].find((c) => c.id === id)?.tok;
    if (g.step === "draw") {
      const d = aiChooseDraw(view, level);
      return d.type === "capture" ? { type: "capture", id: tok(d.cardId) } : { type: "draw" };
    }
    if (t.planTurn !== t.turnNo) { t.planTurn = t.turnNo; t.plan = aiChooseMelds(view, level); }
    while (t.plan.length) {
      const ids = t.plan.shift();
      if (ids.every((id) => g.hands[side].some((c) => c.id === id))) return { type: "meld", ids: ids.map(tok) };
    }
    return { type: "discard", id: tok(aiChooseDiscard(view, level)) };
  }

  endGame(t, now) {
    const g = t.game;
    const res = g.result;
    const pot = t.room.bet * PHOMSIP_SEATS;
    const results = [];
    t.seats.forEach((s, i) => {
      if (s.kind !== "human") return;
      const payout = res.winner === "tie" ? t.room.bet : res.winner === SIDES[i] ? pot : 0;
      if (payout && this.hooks.credit) this.hooks.credit(s.username, payout, { tableId: t.id });
      results.push({ username: s.username, wager: t.room.bet, payout });
    });
    t.results = { winner: res.winner, pot, bet: t.room.bet };
    t.status = "ended";
    t.focus = []; t.pending = null;
    t.phaseEnds = now + PHOMSIP_TIMING.endMs;
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
    return this.apply(t, i, m, now);
  }

  tick(now = Date.now()) {
    for (const t of [...this.tables.values()]) {
      if (now < t.phaseEnds) continue;
      if (t.status === "waiting") { this.startGame(t, now); continue; }
      if (t.status === "ended") {
        const ready = t.seats.filter((s) => s.kind === "human" && s.ready && !s.gone);
        for (const s of t.seats.filter((x) => x.kind === "human" && (!x.ready || x.gone))) this.where.delete(s.username);
        t.seats = t.seats.filter((s) => s.kind === "bot" || (s.ready && !s.gone));
        if (!ready.length) { this.tables.delete(t.id); continue; }
        this.startGame(t, now);
        continue;
      }
      if (t.status === "dealing") { t.status = "playing"; t.version++; this.schedule(t, now); continue; }
      if (t.status !== "playing") continue;
      const i = SIDES.indexOf(t.game.turn);
      const s = t.seats[i];
      if (s.kind === "bot") {
        // two beats: lift the cards (focus), then play them
        if (!t.pending) {
          const m = this.aiMove(t, i);
          if (m.type === "draw") { this.safe(t, i, m, now); continue; }
          const g = t.game;
          t.pending = m;
          t.focus = m.type === "capture" ? [m.id, g.discard[g.discard.length - 1]?.tok].filter(Boolean) : m.ids || [m.id];
          t.phaseEnds = now + PHOMSIP_TIMING.botFocus;
          t.version++;
          continue;
        }
        const m = t.pending;
        t.pending = null;
        this.safe(t, i, m, now);
        continue;
      }
      // a member ran out of time (or left / went idle): finish this turn for them
      if (t.autoTurn !== t.turnNo && !s.auto) { s.timeouts = (s.timeouts || 0) + 1; if (s.timeouts >= 3) s.auto = true; }
      t.autoTurn = t.turnNo;
      this.safe(t, i, this.aiMove(t, i), now);
    }
  }

  safe(t, i, m, now) {
    const r = this.apply(t, i, m, now);
    if (!r.error) return;
    const g = t.game; // should not happen: draw, or throw away the first card
    const side = SIDES[i];
    if (g.step === "draw") this.apply(t, i, { type: "draw" }, now);
    else if (g.hands[side][0]) this.apply(t, i, { type: "discard", id: g.hands[side][0].tok }, now);
  }

  view(username, now = Date.now()) {
    const t = this.tableOf(username);
    if (!t) return { seated: false };
    const you = this.seatIndex(t, username);
    if (you < 0) return { seated: false };
    t.seats[you].lastSeen = now;
    const me = SIDES[you], opp = SIDES[1 - you];
    const persp = (x) => (x === me ? "player" : x === opp ? "ai" : x); // the browser is always 'player'
    const seat = (s) => s && { pid: s.pid, name: s.name, avatar: s.avatar, kind: s.kind, ready: !!s.ready, auto: !!s.auto };
    const base = { seated: true, tableId: t.id, room: t.room, status: t.status, version: t.version, msLeft: Math.max(0, t.phaseEnds - now),
      me: seat(t.seats[you]), opponent: seat(t.seats[1 - you]) || null };
    // waiting, or just sat down at a table between games: nothing to show until the next deal
    if (!t.game || t.status === "waiting" || !t.inGame.has(t.seats[you].pid)) return base;
    const g = t.game;
    const ended = t.status === "ended";
    const open = (c) => { const { tok, ...rest } = c; return { ...rest, id: tok }; };
    const hidden = (c) => ({ id: c.tok, hidden: true, value: 0, rank: "", symbol: "", color: "black" });
    const meld = (m) => ({ ...m, cards: m.cards.map(open) });
    const scores = ended ? scoresOf(g, true) : null;
    let result = null;
    if (ended && g.result) {
      result = { winner: persp(g.result.winner), reason: g.result.reason, knocker: g.result.knocker ? persp(g.result.knocker) : null,
        scores: { player: g.result.scores[me], ai: g.result.scores[opp] } };
    }
    const myPay = ended && t.results ? (t.results.winner === "tie" ? t.room.bet : t.results.winner === me ? t.results.pot : 0) : 0;
    return {
      ...base,
      game: {
        round: t.gameNo,
        status: ended ? "roundOver" : t.status === "dealing" ? "dealing" : "playing",
        turn: persp(g.turn), step: g.step,
        deckCount: g.deck.length, deckTop: g.deck.length ? g.deck[g.deck.length - 1].tok : null,
        discard: g.discard.map(open),
        hands: { player: g.hands[me].map(open), ai: g.hands[opp].map(ended ? open : hidden) },
        melds: { player: g.melds[me].map(meld), ai: g.melds[opp].map(meld) },
        bonus: { player: g.bonus[me], ai: g.bonus[opp] },
        lastEvent: g.lastEvent ? { type: g.lastEvent.type, by: persp(g.lastEvent.by), seq: g.lastEvent.seq, points: g.lastEvent.points } : null,
        deal: t.status === "dealing" ? t.deal.map((d) => ({ id: d.tok, to: d.to === "discard" ? "discard" : persp(d.to) })) : null,
        focus: t.focus,
        turnMsLeft: t.status === "playing" && g.turn === me ? Math.max(0, t.phaseEnds - now) : 0,
        result, scores,
      },
      results: ended && t.results ? { winner: persp(t.results.winner), pot: t.results.pot, bet: t.results.bet, payout: myPay } : null,
    };
  }
}

export { AI_LEVELS };
