// Express glue for the online Pok Deng tables (logic: pokdeng/hub.js). Same money model as poker:
// buy-in + entry fee to sit down, chips back to the wallet when leaving. Extra route:
//   POST /api/cards/pokdeng/bet { amount }   during the betting window
// The house (dealer) side is steered by the admin RTP for "pokdeng".
//   POST /api/cards/pokdeng/rooms   -> rooms with how many members are playing
//   POST /api/cards/pokdeng/join    { room, buyIn }  wallet pays buyIn + the room's entry fee
//   POST /api/cards/pokdeng/state   -> the table as this member may see it (poll ~1/s, no db write)
//   POST /api/cards/pokdeng/act     { action, amount }
//   POST /api/cards/pokdeng/leave   -> stack back to the wallet (after the running hand)
// Stacks are written to the member record at every hand start, so if the server restarts the
// member gets that stack back (the unfinished hand is void).
import { PokDengHub, POKDENG_ROOMS } from "./pokdeng/hub.js";
import { gameSettings } from "./games.js";

const r2 = (n) => Math.round(n * 100) / 100;

export function registerPokDeng(app, { readDb, writeDb, findMember, memberAuth, rateLimit, publicMember }) {
  const withMember = (username, fn) => {
    const db = readDb();
    const m = findMember(db, username);
    if (!m) return null;
    const out = fn(db, m);
    writeDb(db);
    return out;
  };
  const stat = (db, patch) => {
    db.gameStats = db.gameStats || {};
    const s = db.gameStats.pokdeng || (db.gameStats.pokdeng = { rounds: 0, wagered: 0, payout: 0, fees: 0 });
    for (const k of Object.keys(patch)) s[k] = r2((s[k] || 0) + patch[k]);
  };

  let statCache = { at: 0, v: null };
  const hub = new PokDengHub({
    rtp() { try { return gameSettings(readDb()).edges.pokdeng ?? 96; } catch (e) { return 96; } },
    realized() {
      if (Date.now() - statCache.at > 5000) { const s = ((readDb().gameStats || {}).pokdeng) || null; statCache = { at: Date.now(), v: s }; }
      return statCache.v;
    },
    onCashOut(username, chips) {
      withMember(username, (db, m) => {
        m.balance = r2(m.balance + chips);
        if (m.cardSeat && m.cardSeat.game === "pokdeng") delete m.cardSeat;
      });
    },
    onRoundStart(table, humans) {
      if (!humans.length) return;
      const db = readDb();
      for (const h of humans) {
        const m = findMember(db, h.username);
        if (m) m.cardSeat = { game: "pokdeng", table: table.id, room: table.room.id, chips: h.chips, at: Date.now() };
      }
      writeDb(db);
    },
    onRoundEnd(table, results) {
      if (!results.length) return;
      const db = readDb();
      for (const r of results) stat(db, { rounds: 1, wagered: r.wager, payout: r.payout });
      writeDb(db);
    },
  });

  // a restart lost the tables: give every member the stack they had when the last hand began
  {
    const db = readDb();
    let changed = false;
    for (const m of db.members || []) {
      if (m.cardSeat && m.cardSeat.game === "pokdeng") { m.balance = r2(m.balance + (Number(m.cardSeat.chips) || 0)); delete m.cardSeat; changed = true; }
    }
    if (changed) writeDb(db);
  }

  setInterval(() => { try { hub.tick(Date.now()); } catch (e) { console.error("[pokdeng] tick", e); } }, 200).unref?.();

  const limit = rateLimit(Number(process.env.CARDS_RATE_LIMIT) || 600, 60_000);
  const reply = (res, out, username) => {
    if (out && out.error) return res.status(out.status || 400).json({ error: out.error });
    const db = readDb();
    const m = findMember(db, username);
    res.json({ ...out, member: m ? publicMember(m) : undefined });
  };

  app.post("/api/cards/pokdeng/rooms", memberAuth, limit, (req, res) => {
    res.json({ rooms: hub.rooms(), seated: !!hub.tableOf(req.memberName) });
  });

  app.post("/api/cards/pokdeng/join", memberAuth, limit, (req, res) => {
    const u = req.memberName;
    if (hub.tableOf(u)) return reply(res, { ok: true, already: true }, u);
    const room = POKDENG_ROOMS.find((r) => r.id === String(req.body && req.body.room));
    if (!room) return res.status(400).json({ error: "bad_room" });
    const buyIn = Math.floor(Number(req.body.buyIn));
    if (!(buyIn >= room.min && buyIn <= room.max)) return res.status(400).json({ error: "bad_buyin" });
    const db = readDb();
    const m = findMember(db, u);
    if (!m) return res.status(404).json({ error: "Member not found" });
    if (m.suspended) return res.status(403).json({ error: "Account suspended" });
    if (m.cardSeat) return res.status(409).json({ error: "already_seated" });
    if (buyIn + room.fee > m.balance) return res.status(400).json({ error: "insufficient_balance" });
    m.balance = r2(m.balance - buyIn - room.fee);
    m.cardSeat = { game: "pokdeng", room: room.id, chips: buyIn, at: Date.now() };
    stat(db, { fees: room.fee });
    m.lastActiveAt = Date.now();
    writeDb(db);
    const out = hub.join(u, { name: m.nickname || u }, room.id, buyIn);
    if (out.error) { // undo
      const db2 = readDb(); const m2 = findMember(db2, u);
      if (m2) { m2.balance = r2(m2.balance + buyIn + room.fee); delete m2.cardSeat; writeDb(db2); }
      return res.status(400).json({ error: out.error });
    }
    reply(res, { ...out, fee: room.fee, buyIn }, u);
  });

  app.post("/api/cards/pokdeng/state", memberAuth, limit, (req, res) => {
    res.json(hub.view(req.memberName));
  });

  app.post("/api/cards/pokdeng/bet", memberAuth, limit, (req, res) => {
    const out = hub.bet(req.memberName, (req.body || {}).amount);
    if (out.error) return res.status(400).json({ error: out.error });
    res.json(hub.view(req.memberName));
  });

  app.post("/api/cards/pokdeng/act", memberAuth, limit, (req, res) => {
    const b = req.body || {};
    const out = hub.act(req.memberName, String(b.action || ""));
    if (out.error) return res.status(400).json({ error: out.error });
    res.json(hub.view(req.memberName));
  });

  app.post("/api/cards/pokdeng/leave", memberAuth, limit, (req, res) => {
    const out = hub.leave(req.memberName);
    reply(res, out, req.memberName);
  });

  return hub;
}
