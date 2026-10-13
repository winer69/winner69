// Online Pok Deng (ป๊อกเด้ง) tables for WINNER 69. Pure JS - pokdengRoutes.js wraps it for the
// server, localApi runs it in the browser when there is no server.
//
// The house is the dealer. Up to 5 players (members + bots) sit at a table, each betting against the
// dealer from the chips they brought (buy-in + an entry fee per sit-down, like the poker rooms).
// Every card is dealt here. The admin RTP for "pokdeng" steers only the HOUSE side - which shuffle
// is used and whether the dealer draws on 4-5 - so it moves every member at the table the same way.
import { createDeck, shuffleDeck, calculatePokDeng, determineWinner, shouldPlayerAutoDraw, DEALER_RULES, OUTCOME } from "./rules.js";

export const POKDENG_ROOMS = [
  { id: "rookie", name: "มือใหม่", level: 1, minBet: 5, maxBet: 50, chips: [5, 10, 20, 50], min: 100, max: 500, fee: 20 },
  { id: "regular", name: "ทั่วไป", level: 2, minBet: 20, maxBet: 200, chips: [20, 50, 100, 200], min: 400, max: 2000, fee: 50 },
  { id: "vip", name: "VIP", level: 3, minBet: 100, maxBet: 1000, chips: [100, 200, 500, 1000], min: 2000, max: 10000, fee: 100 },
  { id: "master", name: "เซียน", level: 4, minBet: 500, maxBet: 5000, chips: [500, 1000, 2000, 5000], min: 10000, max: 50000, fee: 200 },
];
export const POKDENG_SEATS = 5;
export const POKDENG_TIMING = {
  betMs: 12000,       // betting window
  dealPerCard: 300, dealExtra: 900,
  pokMs: 1400,        // pause to show poks
  turnMs: 12000,      // a member's time to draw / stay
  botTurn: [700, 1500],
  dealerMs: 1300,
  resultMs: 6500,
  idleKickMs: 45000,
  fillBotsMs: 1500,
};

const BOT_NAMES = ["Lucky88", "Mango", "Tiger99", "Somchai", "GoldFish", "Ace777", "Bambam", "JackPot", "MaliPink", "Dragon8", "Fah_Sky", "Lotus99", "Nong_Ploy", "BigBoss", "Kitti_K", "Pim_Chan"];
const FLAGS = ["🇹🇭", "🇱🇦", "🇻🇳", "🇲🇾", "🇸🇬", "🇰🇭", "🇯🇵", "🇰🇷", "🇵🇭", "🇮🇩"];
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
let uid = 0;
const newId = (p) => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`;
const pub = (c) => ({ id: c.id, rank: c.rank, rankValue: c.rankValue, suit: c.suit });

export class PokDengHub {
  /** hooks: onCashOut(username, chips), onRoundStart(table, humans[{username, chips}]),
   *  onRoundEnd(table, results[{username, wager, payout}]), rtp() -> target %, realized() -> {wagered, payout} */
  constructor(hooks = {}) {
    this.hooks = hooks;
    this.tables = new Map();
    this.where = new Map();
  }

  rooms() {
    return POKDENG_ROOMS.map((r) => {
      let players = 0;
      for (const t of this.tables.values()) if (t.room.id === r.id) players += t.seats.filter((s) => s.kind === "human").length + t.queue.length;
      return { ...r, players };
    });
  }
  tableOf(u) { const id = this.where.get(u); return id ? this.tables.get(id) : null; }

  join(username, profile, roomId, buyIn, now = Date.now()) {
    if (this.where.has(username)) return { error: "already_seated" };
    const room = POKDENG_ROOMS.find((r) => r.id === roomId);
    if (!room) return { error: "bad_room" };
    let table = null;
    for (const t of this.tables.values()) {
      if (t.room.id === room.id && t.seats.filter((s) => s.kind === "human").length + t.queue.length < POKDENG_SEATS) { table = t; break; }
    }
    if (!table) table = this.createTable(room, now);
    table.queue.push({ pid: newId("h"), kind: "human", username, name: profile.name || username, seed: `m-${username}`, flag: "🇹🇭", stack: buyIn, lastSeen: now, missed: 0 });
    this.where.set(username, table.id);
    // between rounds a new member sits down at once
    if (table.phase === "betting" || table.phase === "idle") this.seatQueue(table, now);
    table.version++;
    return { ok: true, tableId: table.id };
  }

  leave(username, now = Date.now()) {
    const t = this.tableOf(username);
    if (!t) return { error: "not_seated" };
    const q = t.queue.findIndex((s) => s.username === username);
    if (q >= 0) { const [s] = t.queue.splice(q, 1); this.cashOut(t, s, "leave"); t.version++; return { ok: true }; }
    const i = t.seats.findIndex((s) => s.username === username);
    if (i < 0) { this.where.delete(username); return { ok: true }; }
    const seat = t.seats[i];
    if (!seat.bet || t.phase === "betting" || t.phase === "idle" || t.phase === "result") {
      if (t.phase === "betting") seat.bet = 0;
      t.seats.splice(i, 1);
      this.cashOut(t, seat, "leave");
    } else seat.leaving = true; // in the middle of a round: paid out when it ends
    t.version++;
    return { ok: true, pending: !!seat.leaving };
  }

  cashOut(t, seat, why) {
    this.where.delete(seat.username);
    if (this.hooks.onCashOut) this.hooks.onCashOut(seat.username, Math.max(0, seat.stack), { tableId: t.id, room: t.room.id, why });
  }

  createTable(room, now) {
    const t = { id: newId("pd"), room, seats: [], queue: [], version: 1, round: 0, phase: "idle", phaseEnds: now + POKDENG_TIMING.fillBotsMs, dealer: { hand: [], revealed: false }, deck: [], turn: -1, history: [], message: "" };
    this.tables.set(t.id, t);
    return t;
  }

  makeBot(room, used) {
    let name = pick(BOT_NAMES), k = 0;
    while (used.has(name) && k++ < 30) name = pick(BOT_NAMES) + rnd(2, 99);
    used.add(name);
    return { pid: newId("b"), kind: "bot", name, seed: `${name}-${rnd(1, 1e9)}`, flag: pick(FLAGS), stack: rnd(room.min, room.max * 3) };
  }

  seatQueue(t, now) {
    while (t.queue.length) {
      if (t.seats.length >= POKDENG_SEATS) { const b = t.seats.findIndex((s) => s.kind === "bot" && !s.bet); if (b < 0) break; t.seats.splice(b, 1); }
      const s = t.queue.shift();
      s.bet = 0; s.hand = []; s.revealed = false; s.result = null; s.acted = false;
      t.seats.push(s);
    }
  }

  /** start a betting window: tidy the table, fill bots, bots place bets */
  openBetting(t, now) {
    for (let i = t.seats.length - 1; i >= 0; i--) {
      const s = t.seats[i];
      const gone = s.kind === "human" && (s.leaving || now - s.lastSeen > POKDENG_TIMING.idleKickMs || s.stack < t.room.minBet || s.missed >= 5);
      if (gone) { t.seats.splice(i, 1); this.cashOut(t, s, s.stack < t.room.minBet ? "busted" : "leave"); }
      else if (s.kind === "bot" && (s.stack < t.room.minBet * 5 || Math.random() < 0.07)) t.seats.splice(i, 1);
    }
    this.seatQueue(t, now);
    if (!t.seats.some((s) => s.kind === "human")) { this.tables.delete(t.id); return; }
    const used = new Set(t.seats.map((s) => s.name));
    while (t.seats.length < POKDENG_SEATS - 1) t.seats.push(this.makeBot(t.room, used));
    t.round++;
    t.phase = "betting";
    t.phaseEnds = now + POKDENG_TIMING.betMs;
    t.dealer = { hand: [], revealed: false };
    t.turn = -1;
    t.message = "วางเดิมพัน";
    for (const s of t.seats) {
      s.hand = []; s.revealed = false; s.result = null; s.acted = false;
      s.bet = s.kind === "bot" ? Math.min(pick(t.room.chips), s.stack) : 0;
    }
    t.version++;
  }

  bet(username, amount, now = Date.now()) {
    const t = this.tableOf(username);
    if (!t) return { error: "not_seated" };
    const s = t.seats.find((x) => x.username === username);
    if (!s) return { error: "waiting_for_seat" };
    s.lastSeen = now;
    if (t.phase !== "betting") return { error: "betting_closed" };
    const a = Math.floor(Number(amount));
    if (!(a >= t.room.minBet && a <= t.room.maxBet)) return { error: "bad_bet" };
    if (a > s.stack) return { error: "insufficient_chips" };
    s.bet = a;
    t.version++;
    // everybody human has bet -> deal a moment later
    if (t.seats.filter((x) => x.kind === "human").every((x) => x.bet > 0)) t.phaseEnds = Math.min(t.phaseEnds, now + 700);
    return { ok: true };
  }

  // ---------------------------------------------------------------- house steering (RTP)
  houseMood() {
    const target = this.hooks.rtp ? this.hooks.rtp() : 96;
    const r = this.hooks.realized ? this.hooks.realized() : null;
    if (!r || !(r.wagered > 0)) return 0;
    const real = (r.payout / r.wagered) * 100;
    if (real > target + 1) return 1;   // members are ahead of the target: house plays tighter
    if (real < target - 1) return -1;  // below: house plays looser
    return 0;
  }
  /** members' total result for a deal, if everybody follows the usual rule (draw on 0-4) */
  humansNet(t, deck, players, dealerDraws) {
    let d = deck.slice();
    const hands = players.map(() => []);
    const dealer = [];
    for (let r = 0; r < 2; r++) { hands.forEach((h) => h.push(d.shift())); dealer.push(d.shift()); }
    const dEv0 = calculatePokDeng(dealer);
    hands.forEach((h) => { if (!dEv0.isPok && shouldPlayerAutoDraw(calculatePokDeng(h))) h.push(d.shift()); });
    let dEv = dEv0;
    if (!dEv0.isPok && (dEv0.points <= DEALER_RULES.ALWAYS_DRAW_AT_OR_BELOW || (dEv0.points < DEALER_RULES.NEVER_DRAW_AT_OR_ABOVE && dealerDraws))) { dealer.push(d.shift()); dEv = calculatePokDeng(dealer); }
    let net = 0;
    players.forEach((s, i) => { if (s.kind === "human") net += determineWinner(calculatePokDeng(hands[i]), dEv, s.bet, s.stack).delta; });
    return net;
  }

  deal(t, now) {
    const players = t.seats.filter((s) => s.bet > 0);
    t.seats.forEach((s) => { if (s.kind === "human" && !s.bet) s.missed = (s.missed || 0) + 1; else if (s.kind === "human") s.missed = 0; });
    const mood = this.houseMood();
    let deck = shuffleDeck(createDeck());
    if (mood !== 0) {
      let best = deck, bestNet = this.humansNet(t, deck, players, Math.random() < 0.5);
      for (let k = 0; k < 5; k++) {
        const d = shuffleDeck(createDeck());
        const n = this.humansNet(t, d, players, Math.random() < 0.5);
        if (mood > 0 ? n < bestNet : n > bestNet) { best = d; bestNet = n; }
      }
      deck = best;
    }
    // same order as a real deal: one card each (players, dealer), twice
    const order = t.seats.map((s, i) => (s.bet > 0 ? i : -1)).filter((i) => i >= 0);
    for (let r = 0; r < 2; r++) {
      for (const i of order) t.seats[i].hand.push(deck.shift());
      t.dealer.hand.push(deck.shift());
    }
    // keep humansNet's card order for the 3rd cards: players in seat order, then dealer
    t.deck = deck;
    t.order = order;
    t.phase = "dealing";
    t.message = "กำลังแจกไพ่";
    t.phaseEnds = now + (order.length + 1) * 2 * POKDENG_TIMING.dealPerCard + POKDENG_TIMING.dealExtra;
    t.version++;
  }

  afterDeal(t, now) {
    const dEv = calculatePokDeng(t.dealer.hand);
    let anyPok = false;
    for (const i of t.order) { const s = t.seats[i]; if (calculatePokDeng(s.hand).isPok) { s.revealed = true; s.acted = true; anyPok = true; } }
    if (dEv.isPok) {
      t.dealer.revealed = true;
      t.message = "เจ้ามือป๊อก!";
      t.phase = "dealer";
      t.dealerDone = true;
      t.phaseEnds = now + POKDENG_TIMING.pokMs + 600;
    } else {
      t.phase = "turns";
      t.turn = -1;
      t.phaseEnds = now + (anyPok ? POKDENG_TIMING.pokMs : 300);
    }
    t.version++;
  }

  nextTurn(t, now) {
    const next = t.order.find((i) => !t.seats[i].acted);
    if (next === undefined) {
      t.turn = -1;
      t.phase = "dealer";
      t.dealerDone = false;
      t.dealer.revealed = true;
      t.message = "เจ้ามือเปิดไพ่";
      t.phaseEnds = now + POKDENG_TIMING.dealerMs;
      t.version++;
      return;
    }
    t.turn = next;
    const s = t.seats[next];
    t.message = s.kind === "human" ? `ตา ${s.name}` : `${s.name} กำลังคิด`;
    t.phaseEnds = now + (s.kind === "bot" || s.leaving ? rnd(...POKDENG_TIMING.botTurn) : POKDENG_TIMING.turnMs);
    t.version++;
  }

  playerMove(t, i, draw, now) {
    const s = t.seats[i];
    if (draw) s.hand.push(t.deck.shift());
    s.acted = true;
    s.drew = !!draw;
    t.message = `${s.name} ${draw ? "จั่วไพ่" : "อยู่"}`;
    t.turn = -1;
    t.phaseEnds = now + (draw ? 650 : 350);
    t.version++;
  }

  act(username, action, now = Date.now()) {
    const t = this.tableOf(username);
    if (!t) return { error: "not_seated" };
    const i = t.seats.findIndex((s) => s.username === username);
    if (i < 0) return { error: "waiting_for_seat" };
    t.seats[i].lastSeen = now;
    if (t.phase !== "turns" || t.turn !== i) return { error: "not_your_turn" };
    if (action !== "draw" && action !== "stay") return { error: "bad_action" };
    this.playerMove(t, i, action === "draw", now);
    return { ok: true };
  }

  dealerPlay(t, now) {
    const ev = calculatePokDeng(t.dealer.hand);
    if (!t.dealerDone && !ev.isPok && t.dealer.hand.length === 2) {
      let draw;
      if (ev.points <= DEALER_RULES.ALWAYS_DRAW_AT_OR_BELOW) draw = true;
      else if (ev.points >= DEALER_RULES.NEVER_DRAW_AT_OR_ABOVE) draw = false;
      else {
        // 4-5: the house may choose; steer towards the RTP target, otherwise a coin flip
        const mood = this.houseMood();
        if (mood === 0) draw = Math.random() < DEALER_RULES.DRAW_CHANCE_BETWEEN;
        else {
          const net = (withThird) => {
            const hand = withThird ? [...t.dealer.hand, t.deck[0]] : t.dealer.hand;
            const dEv = calculatePokDeng(hand);
            return t.order.reduce((a, i) => (t.seats[i].kind === "human" ? a + determineWinner(calculatePokDeng(t.seats[i].hand), dEv, t.seats[i].bet, t.seats[i].stack).delta : a), 0);
          };
          draw = mood > 0 ? net(true) < net(false) : net(true) > net(false);
        }
      }
      t.dealerDone = true;
      if (draw) { t.dealer.hand.push(t.deck.shift()); t.message = "เจ้ามือจั่วไพ่"; t.phaseEnds = now + 1100; t.version++; return; }
      t.message = "เจ้ามืออยู่";
    }
    this.settle(t, now);
  }

  settle(t, now) {
    const dEv = calculatePokDeng(t.dealer.hand);
    const results = [];
    for (const i of t.order) {
      const s = t.seats[i];
      const ev = calculatePokDeng(s.hand);
      const r = determineWinner(ev, dEv, s.bet, s.stack);
      s.stack = Math.max(0, s.stack + r.delta);
      s.result = { outcome: r.outcome, multiplier: r.multiplier, delta: r.delta };
      s.revealed = true;
      if (s.kind === "human") {
        const lost = r.delta < 0 ? -r.delta : 0;
        results.push({ username: s.username, wager: Math.max(s.bet, lost), payout: r.delta > 0 ? s.bet + r.delta : r.delta === 0 ? s.bet : 0 });
      }
    }
    t.dealer.revealed = true;
    t.phase = "result";
    t.message = "";
    t.phaseEnds = now + POKDENG_TIMING.resultMs;
    t.history = [{ id: t.round, dealer: dEv.badge }, ...t.history].slice(0, 14);
    t.version++;
    if (this.hooks.onRoundEnd) this.hooks.onRoundEnd(t, results);
  }

  tick(now = Date.now()) {
    for (const t of [...this.tables.values()]) {
      if (now < t.phaseEnds) continue;
      switch (t.phase) {
        case "idle": case "result": this.openBetting(t, now); break;
        case "betting": {
          const humans = t.seats.filter((s) => s.kind === "human");
          if (!humans.some((s) => s.bet > 0)) { // nobody real is playing: keep the window open
            t.phaseEnds = now + POKDENG_TIMING.betMs;
            humans.forEach((s) => { s.missed = (s.missed || 0) + 1; });
            if (humans.every((s) => s.missed >= 5 || now - s.lastSeen > POKDENG_TIMING.idleKickMs)) { t.phase = "result"; t.phaseEnds = now; }
            t.version++;
            break;
          }
          if (this.hooks.onRoundStart) this.hooks.onRoundStart(t, humans.map((s) => ({ username: s.username, chips: s.stack })));
          this.deal(t, now);
          break;
        }
        case "dealing": this.afterDeal(t, now); break;
        case "turns": {
          if (t.turn < 0) { this.nextTurn(t, now); break; }
          const s = t.seats[t.turn];
          // bots and timeouts follow the usual rule: draw on 0-4
          this.playerMove(t, t.turn, shouldPlayerAutoDraw(calculatePokDeng(s.hand)), now);
          break;
        }
        case "dealer": this.dealerPlay(t, now); break;
        default: break;
      }
    }
  }

  view(username, now = Date.now()) {
    const t = this.tableOf(username);
    if (!t) return { seated: false };
    const you = t.seats.findIndex((s) => s.username === username);
    const me = you >= 0 ? t.seats[you] : t.queue.find((s) => s.username === username);
    if (me) me.lastSeen = now;
    const showAll = t.phase === "result";
    const seat = (s, i) => {
      const mine = i === you;
      const open = mine || s.revealed || showAll;
      return {
        id: s.pid, name: s.name, seed: s.seed, flag: s.flag, kind: s.kind, member: s.kind === "human" && !mine,
        stack: s.stack, bet: s.bet || 0, drew: !!s.drew, acted: !!s.acted,
        hand: (s.hand || []).map((c, k) => (open ? { ...pub(c), up: true } : { id: `x${i}${k}`, hidden: true })),
        result: showAll ? s.result : null,
      };
    };
    return {
      seated: true, tableId: t.id, room: t.room, you, waiting: you < 0, version: t.version, round: t.round,
      phase: t.phase, msLeft: Math.max(0, t.phaseEnds - now), turn: t.turn, message: t.message,
      myTurn: t.phase === "turns" && t.turn === you && you >= 0,
      seats: t.seats.map(seat),
      dealer: { hand: t.dealer.hand.map((c, k) => (t.dealer.revealed ? { ...pub(c), up: true } : { id: `d${k}`, hidden: true })), revealed: t.dealer.revealed },
      deckCount: t.phase === "betting" || t.phase === "idle" || !t.deck || !t.deck.length ? 52 : t.deck.length,
      history: t.history,
      chipsWaiting: you < 0 && me ? me.stack : null,
    };
  }
}
