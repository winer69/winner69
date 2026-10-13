// Online Texas Hold'em tables for WINNER 69.
// Pure JS (no express, no db): the server wraps it in pokerRoutes.js, and the same class can run
// in a browser for testing. Real members share tables; empty seats are filled with bots that play
// with the house's money. Every card, turn and payout is decided here - browsers only send actions.
//
// Money: a member brings a buy-in (wallet -> table stack) and pays the room's entry fee once per
// sit-down. Leaving (or being away too long) returns the stack to the wallet. Nothing between
// real players is rigged - the house earns the entry fees.
import * as Engine from "./engine.js";
import { decideAIAction } from "./ai.js";
import { PHASES } from "./constants.js";

export const POKER_ROOMS = [
  { id: "rookie", name: "มือใหม่", level: 1, sb: 1, bb: 2, min: 40, max: 200, fee: 20 },
  { id: "regular", name: "ทั่วไป", level: 2, sb: 5, bb: 10, min: 200, max: 1000, fee: 50 },
  { id: "vip", name: "VIP", level: 3, sb: 25, bb: 50, min: 1000, max: 5000, fee: 100 },
  { id: "master", name: "เซียน", level: 4, sb: 100, bb: 200, min: 4000, max: 20000, fee: 200 },
];
export const POKER_SEATS = 6;
export const POKER_TIMING = {
  turnMs: 20000,       // a member's time to act before an automatic check/fold
  botMin: 900, botMax: 2600,
  streetMs: 1150,      // pause before the next community cards
  afterHandMs: 6500,   // showdown / result time before the next hand
  idleKickMs: 45000,   // no polling for this long = the member left
  fillBotsMs: 2500,    // a new table waits this long for other members before bots sit in
};

const BOT_NAMES = ["Tiger88", "LuckyFox", "PokerKing", "BlueDragon", "NightWolf", "MangoBoy", "CrazyCat", "AceMaster", "GoldFish",
  "LuckyNine", "Mark92", "Nong_Ploy", "SiamShark", "RiverQueen", "xBluffer", "MrAllIn", "JadeMonk", "StormRider", "NeonPanda", "ChillDuck"];
const PERSONALITIES = ["tight", "normal", "normal", "aggressive", "random"];
const AVATAR_COUNT = 25;
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
let uid = 0;
const newId = (p) => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`;

export class PokerHub {
  /**
   * hooks: {
   *   onCashOut(username, chips, info)      stack goes back to the wallet
   *   onHandStart(table, humans[{username, chips}])  persist stacks (crash safety)
   *   onHandEnd(table, results[{username, wager, payout}])  statistics
   * }
   */
  constructor(hooks = {}) {
    this.hooks = hooks;
    this.tables = new Map();
    this.where = new Map(); // username -> tableId
  }

  rooms() {
    return POKER_ROOMS.map((r) => {
      let players = 0, tables = 0;
      for (const t of this.tables.values()) if (t.room.id === r.id) { tables++; players += t.seats.filter((s) => s.kind === "human").length + t.queue.length; }
      return { ...r, players, tables };
    });
  }

  tableOf(username) { const id = this.where.get(username); return id ? this.tables.get(id) : null; }

  // ---------------------------------------------------------------- join / leave
  /** wallet has already been charged buyIn + fee by the caller */
  join(username, profile, roomId, buyIn, now = Date.now()) {
    if (this.where.has(username)) return { error: "already_seated" };
    const room = POKER_ROOMS.find((r) => r.id === roomId);
    if (!room) return { error: "bad_room" };
    // a table of this room with space for one more member (bots give their seat up)
    let table = null;
    for (const t of this.tables.values()) {
      if (t.room.id !== room.id) continue;
      const humans = t.seats.filter((s) => s.kind === "human").length + t.queue.length;
      if (humans < POKER_SEATS) { table = t; break; }
    }
    if (!table) table = this.createTable(room, now);
    const seat = { pid: newId("h"), kind: "human", username, name: profile.name || username, avatarId: hash(username) % AVATAR_COUNT, level: profile.level || 1, chips: buyIn, buyIn, lastSeen: now, leaving: false };
    table.queue.push(seat); // seated when the next hand starts (watching until then)
    this.where.set(username, table.id);
    table.version++;
    return { ok: true, tableId: table.id };
  }

  /** member stands up. If a hand is running the member folds now and is paid out when it ends. */
  leave(username, now = Date.now()) {
    const t = this.tableOf(username);
    if (!t) return { error: "not_seated" };
    const q = t.queue.findIndex((s) => s.username === username);
    if (q >= 0) { const [s] = t.queue.splice(q, 1); this.cashOut(t, s, "leave"); t.version++; return { ok: true, chips: s.chips }; }
    const i = t.seats.findIndex((s) => s.username === username);
    if (i < 0) { this.where.delete(username); return { ok: true, chips: 0 }; }
    const seat = t.seats[i];
    seat.leaving = true; // folds automatically when the turn comes, paid out when the hand ends
    const st = t.state;
    if (Engine.isBettingPhase(st.gamePhase) && st.currentPlayerIndex === i && !st.awaitingStreet) this.apply(t, i, "fold", undefined, now);
    if (!Engine.isBettingPhase(t.state.gamePhase)) this.removeSeat(t, i, "leave");
    t.version++;
    return { ok: true, pending: Engine.isBettingPhase(t.state.gamePhase) };
  }

  cashOut(t, seat, why) {
    this.where.delete(seat.username);
    if (this.hooks.onCashOut) this.hooks.onCashOut(seat.username, Math.max(0, seat.chips), { tableId: t.id, room: t.room.id, why });
  }

  removeSeat(t, i, why) {
    const seat = t.seats[i];
    const p = t.state.players[i];
    if (p) seat.chips = p.chips;
    t.seats.splice(i, 1);
    t.state = { ...t.state, players: t.state.players.filter((_, k) => k !== i) };
    if (seat.kind === "human") this.cashOut(t, seat, why);
  }

  // ---------------------------------------------------------------- tables
  createTable(room, now) {
    const t = {
      id: newId("pk"), room, seats: [], queue: [], version: 1, createdAt: now,
      state: { ...Engine.createInitialState(), blinds: { smallBlind: room.sb, bigBlind: room.bb } },
      nextAt: now + POKER_TIMING.fillBotsMs, actAt: 0, deadline: 0, handEndAt: 0,
    };
    this.tables.set(t.id, t);
    return t;
  }

  makeBot(room, used) {
    let name = pick(BOT_NAMES), k = 0;
    while (used.has(name) && k++ < 30) name = pick(BOT_NAMES) + (k > 10 ? rnd(2, 99) : "");
    used.add(name);
    const stack = Math.round(rnd(room.min, Math.round(room.max * 1.2)) / room.bb) * room.bb;
    return { pid: newId("b"), kind: "bot", name, avatarId: rnd(0, AVATAR_COUNT - 1), level: rnd(3, 99), chips: stack, personality: pick(PERSONALITIES) };
  }

  handOver(t) { return t.state.gamePhase === PHASES.SHOWDOWN || t.state.gamePhase === PHASES.HAND_OVER; }

  /** between hands: pay out leavers, drop broke bots, seat waiting members, fill with bots, deal */
  startNextHand(t, now) {
    const st = t.state;
    // carry chips from the finished hand into the seats
    t.seats.forEach((s, i) => { if (st.players[i]) s.chips = st.players[i].chips; });
    const dealerId = st.dealerIndex >= 0 && t.seats[st.dealerIndex] ? t.seats[st.dealerIndex].pid : null;
    for (let i = t.seats.length - 1; i >= 0; i--) {
      const s = t.seats[i];
      const gone = s.kind === "human" && (s.leaving || now - s.lastSeen > POKER_TIMING.idleKickMs || s.chips < t.room.bb);
      if (gone) { t.seats.splice(i, 1); this.cashOut(t, s, s.chips < t.room.bb ? "busted" : s.leaving ? "leave" : "idle"); }
      else if (s.kind === "bot" && (s.chips < t.room.bb * 2 || Math.random() < 0.06)) t.seats.splice(i, 1); // bots come and go
    }
    // waiting members take bot seats if needed
    while (t.queue.length) {
      if (t.seats.length >= POKER_SEATS) { const b = t.seats.findIndex((s) => s.kind === "bot"); if (b < 0) break; t.seats.splice(b, 1); }
      t.seats.push(t.queue.shift());
    }
    const humans = t.seats.filter((s) => s.kind === "human").length;
    if (!humans) { this.tables.delete(t.id); return; } // nobody left: close the table
    const used = new Set(t.seats.map((s) => s.name));
    const target = POKER_SEATS - 1; // bots fill the table but keep one seat free for the next member
    while (t.seats.length < target) t.seats.push(this.makeBot(t.room, used));

    const players = t.seats.map((s) => {
      const p = Engine.createPlayer({ id: s.pid, name: s.name, avatar: null, level: s.level, chips: s.chips, isHuman: false, personality: s.personality || null });
      p.avatarId = s.avatarId; p.kind = s.kind;
      return p;
    });
    const base = { ...st, players, dealerIndex: dealerId ? players.findIndex((p) => p.id === dealerId) : -1 };
    if (base.dealerIndex < 0 && st.dealerIndex >= 0) base.dealerIndex = Math.min(st.dealerIndex, players.length - 1);
    const next = Engine.startHand(base);
    t.state = next;
    t.version++;
    t.handEndAt = 0;
    if (this.hooks.onHandStart) this.hooks.onHandStart(t, t.seats.filter((s) => s.kind === "human").map((s) => ({ username: s.username, chips: s.chips })));
    this.schedule(t, now + 1400); // let the deal animation play
  }

  /** who acts next and when */
  schedule(t, now) {
    const st = t.state;
    t.actAt = 0; t.deadline = 0;
    if (!Engine.isBettingPhase(st.gamePhase)) return;
    if (st.awaitingStreet) { t.actAt = now + POKER_TIMING.streetMs; return; }
    const i = st.currentPlayerIndex;
    if (i < 0) return;
    const seat = t.seats[i];
    if (seat.kind === "bot") t.actAt = now + rnd(POKER_TIMING.botMin, POKER_TIMING.botMax);
    else if (seat.leaving) t.actAt = now + 300;
    else { t.deadline = now + POKER_TIMING.turnMs; t.actAt = t.deadline; }
  }

  apply(t, i, action, amount, now) {
    const err = Engine.validateAction(t.state, i, action, amount);
    if (err) return { error: err };
    t.state = Engine.applyAction(t.state, i, action, amount);
    this.afterChange(t, now);
    return { ok: true };
  }

  afterChange(t, now) {
    const st = t.state;
    t.version++;
    if (Engine.isBettingPhase(st.gamePhase)) this.schedule(t, now); else if (this.handOver(t) && !t.handEndAt) this.finishHand(t, now);
  }

  finishHand(t, now) {
    const st = t.state;
    const shown = st.players.filter((p) => p.showCards).length;
    t.handEndAt = now;
    t.nextAt = now + POKER_TIMING.afterHandMs + shown * 650;
    t.actAt = 0; t.deadline = 0;
    const results = [];
    st.players.forEach((p, i) => { const s = t.seats[i]; if (s && s.kind === "human") { s.chips = p.chips; results.push({ username: s.username, wager: p.totalBet, payout: p.winAmount }); } });
    if (this.hooks.onHandEnd) this.hooks.onHandEnd(t, results);
  }

  /** member action */
  act(username, action, amount, now = Date.now()) {
    const t = this.tableOf(username);
    if (!t) return { error: "not_seated" };
    const i = t.seats.findIndex((s) => s.username === username);
    if (i < 0) return { error: "waiting_for_seat" };
    t.seats[i].lastSeen = now;
    if (t.state.currentPlayerIndex !== i || t.state.awaitingStreet) return { error: "Not your turn" };
    const a = ["fold", "check", "call", "raise", "allin"].includes(action) ? action : null;
    if (!a) return { error: "Unknown action" };
    return this.apply(t, i, a, a === "raise" ? Math.round(Number(amount)) : undefined, now);
  }

  // ---------------------------------------------------------------- clock
  tick(now = Date.now()) {
    for (const t of [...this.tables.values()]) {
      const st = t.state;
      if (st.gamePhase === PHASES.IDLE || this.handOver(t)) {
        if (now >= t.nextAt) this.startNextHand(t, now);
        continue;
      }
      if (!t.actAt || now < t.actAt) continue;
      if (st.awaitingStreet) { t.state = Engine.dealNextStreet(st); this.afterChange(t, now); continue; }
      const i = st.currentPlayerIndex;
      if (i < 0) continue;
      const seat = t.seats[i];
      let d;
      if (seat.kind === "bot") d = decideAIAction(st, i);
      else { const legal = Engine.getLegalActions(st, i); d = { action: legal.canCheck ? "check" : "fold" }; seat.timeouts = (seat.timeouts || 0) + 1; if (seat.timeouts >= 3) seat.leaving = true; }
      const r = this.apply(t, i, d.action, d.amount, now);
      if (r.error) { const legal = Engine.getLegalActions(t.state, i); this.apply(t, i, legal.canCheck ? "check" : "fold", undefined, now); }
      if (seat.kind === "human" && d.action !== "fold" && d.action !== "check") seat.timeouts = 0;
    }
  }

  // ---------------------------------------------------------------- what a member sees
  view(username, now = Date.now()) {
    const t = this.tableOf(username);
    if (!t) return { seated: false };
    const you = t.seats.findIndex((s) => s.username === username);
    const waiting = you < 0;
    const me = waiting ? t.queue.find((s) => s.username === username) : t.seats[you];
    if (me) me.lastSeen = now;
    const st = t.state;
    const showdown = st.gamePhase === PHASES.SHOWDOWN;
    const players = st.players.map((p, i) => {
      const s = t.seats[i] || {};
      const mine = i === you;
      const open = mine || (showdown && p.showCards);
      return {
        id: p.id, name: p.name, avatarId: p.avatarId ?? s.avatarId ?? 0, level: p.level, kind: s.kind || "bot", member: s.kind === "human" && !mine,
        chips: p.chips, bet: p.bet, totalBet: p.totalBet, folded: p.folded, allIn: p.allIn, hasActed: p.hasActed, sittingOut: p.sittingOut,
        lastAction: p.lastAction, showCards: open && p.showCards, isWinner: p.isWinner, winAmount: p.winAmount, netResult: p.netResult,
        holeCards: open ? p.holeCards : p.holeCards.map((_, k) => ({ id: `x${i}${k}`, rank: 0, suit: "s", hidden: true })),
        handResult: open ? p.handResult : null, leaving: !!s.leaving,
      };
    });
    const { deck, ...pub } = st;
    return {
      seated: true, tableId: t.id, room: t.room, you, waiting, version: t.version,
      chipsWaiting: waiting && me ? me.chips : null,
      turnLeftMs: t.deadline && st.currentPlayerIndex === you ? Math.max(0, t.deadline - now) : 0,
      turnMs: POKER_TIMING.turnMs,
      nextHandInMs: (this.handOver(t) || st.gamePhase === PHASES.IDLE) ? Math.max(0, t.nextAt - now) : 0,
      state: { ...pub, players, log: (st.log || []).slice(-30), handResult: showdown ? st.handResult : null },
    };
  }
}
