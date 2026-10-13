// Express glue for the online ผสมสิบ (Phom Sip) tables (logic: phomsip/hub.js).
//   POST /api/cards/phomsip/rooms
//   POST /api/cards/phomsip/join   { room }      sit down (the bet + entry fee is taken when a game starts)
//   POST /api/cards/phomsip/state                the table as this member may see it (poll, no db write)
//   POST /api/cards/phomsip/act    { type, ids, id }   draw | capture | meld | discard | ready  (card ids are the per-game tokens from /state)
//   POST /api/cards/phomsip/leave
// While a game runs, each member's bet is remembered on the member record; if the server restarts
// mid-game the game is void and the bet is given back.
import { PhomSipHub, PHOMSIP_ROOMS } from "./phomsip/hub.js";

const r2 = (n) => Math.round(n * 100) / 100;

export function registerPhomSip(app, { readDb, writeDb, findMember, memberAuth, rateLimit, publicMember }) {
  const stat = (db, patch) => {
    db.gameStats = db.gameStats || {};
    const s = db.gameStats.phomsip || (db.gameStats.phomsip = { rounds: 0, wagered: 0, payout: 0, fees: 0 });
    for (const k of Object.keys(patch)) s[k] = r2((s[k] || 0) + patch[k]);
  };
  const hub = new PhomSipHub({
    charge(username, amount, info) {
      const db = readDb();
      const m = findMember(db, username);
      if (!m || m.suspended || m.balance < amount) return false;
      m.balance = r2(m.balance - amount);
      m.phomsipHold = { table: info.tableId, amount: r2(amount - info.fee), at: Date.now() };
      stat(db, { fees: info.fee });
      writeDb(db);
      return true;
    },
    credit(username, amount) {
      const db = readDb();
      const m = findMember(db, username);
      if (m) { m.balance = r2(m.balance + amount); writeDb(db); }
    },
    onGameEnd(table, results) {
      const db = readDb();
      for (const r of results) { stat(db, { rounds: 1, wagered: r.wager, payout: r.payout }); const m = findMember(db, r.username); if (m) delete m.phomsipHold; }
      writeDb(db);
    },
  });

  { // restart: games in progress are void - give the bets back
    const db = readDb();
    let changed = false;
    for (const m of db.members || []) if (m.phomsipHold) { m.balance = r2(m.balance + (Number(m.phomsipHold.amount) || 0)); delete m.phomsipHold; changed = true; }
    if (changed) writeDb(db);
  }
  setInterval(() => { try { hub.tick(Date.now()); } catch (e) { console.error("[phomsip] tick", e); } }, 200).unref?.();

  const limit = rateLimit(Number(process.env.CARDS_RATE_LIMIT) || 600, 60_000);
  const withMember = (res, username, out) => {
    if (out && out.error) return res.status(400).json({ error: out.error });
    const m = findMember(readDb(), username);
    res.json({ ...out, member: m ? publicMember(m) : undefined });
  };

  app.post("/api/cards/phomsip/rooms", memberAuth, limit, (req, res) => res.json({ rooms: hub.rooms() }));
  app.post("/api/cards/phomsip/join", memberAuth, limit, (req, res) => {
    const u = req.memberName;
    const room = PHOMSIP_ROOMS.find((r) => r.id === String((req.body || {}).room));
    if (!room) return res.status(400).json({ error: "bad_room" });
    const m = findMember(readDb(), u);
    if (!m) return res.status(404).json({ error: "Member not found" });
    if (m.suspended) return res.status(403).json({ error: "Account suspended" });
    if (m.balance < room.bet + room.fee) return res.status(400).json({ error: "insufficient_balance" });
    withMember(res, u, hub.join(u, { name: m.nickname || u }, room.id));
  });
  app.post("/api/cards/phomsip/state", memberAuth, limit, (req, res) => res.json(hub.view(req.memberName)));
  app.post("/api/cards/phomsip/act", memberAuth, limit, (req, res) => {
    const b = req.body || {};
    const out = hub.act(req.memberName, { type: String(b.type || ""), ids: Array.isArray(b.ids) ? b.ids.map(String).slice(0, 2) : undefined, id: b.id ? String(b.id) : undefined });
    if (out.error) return res.status(400).json({ error: out.error });
    // ready / the last move can move money: send the member too
    const view = hub.view(req.memberName);
    const m = findMember(readDb(), req.memberName);
    res.json({ ...view, member: m ? publicMember(m) : undefined });
  });
  app.post("/api/cards/phomsip/leave", memberAuth, limit, (req, res) => withMember(res, req.memberName, hub.leave(req.memberName)));
  return hub;
}
