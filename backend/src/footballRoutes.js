// Express glue for WINNER69 Football League 7 (logic: football/league.js + football/engine.js).
//   POST /api/football/state   { rev }          the league as this member may see it ({ same: true } when nothing changed)
//   POST /api/football/act     { method, args } placePrediction | placeChampionPick (paid from the wallet)
//   POST /api/admin/football/state  { rev }     everything (admin key)
//   POST /api/admin/football/act    { method, args }  admin* / createSeason / adminUpdateSettings
// The league is kept in its own file next to the main db (football.json); it ticks every second here.
import fs from "node:fs";
import path from "node:path";
import { WalletLeague, ApiError } from "./football/league.js";

const r2 = (n) => Math.round(n * 100) / 100;

export function registerFootball(app, { readDb, writeDb, findMember, memberAuth, adminOnly, rateLimit, publicMember, audit }) {
  const file = path.join(path.dirname(path.resolve(process.env.DB_FILE || "./data/db.json")), "football.json");
  const storage = {
    load() { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return null; } },
    save(state) {
      try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file + ".tmp", JSON.stringify(state)); fs.renameSync(file + ".tmp", file); }
      catch (e) { console.error("[football] save", e); }
    },
  };
  const stat = (db, patch) => {
    db.gameStats = db.gameStats || {};
    const s = db.gameStats.football || (db.gameStats.football = { rounds: 0, wagered: 0, payout: 0, refunds: 0 });
    for (const k of Object.keys(patch)) s[k] = r2((s[k] || 0) + patch[k]);
  };
  const wallet = {
    balance(username) { const m = findMember(readDb(), username); return m ? m.balance : 0; },
    charge(username, amount, info) {
      const db = readDb();
      const m = findMember(db, username);
      if (!m || m.suspended || m.balance < amount) return false;
      m.balance = r2(m.balance - amount);
      stat(db, { wagered: amount, rounds: 1 });
      writeDb(db);
      return true;
    },
    credit(username, amount, info) {
      const db = readDb();
      const m = findMember(db, username);
      if (!m) return;
      m.balance = r2(m.balance + amount);
      stat(db, info && info.type === "REFUND" ? { refunds: amount, wagered: -amount, rounds: -1 } : { payout: amount });
      writeDb(db);
    },
  };
  const league = new WalletLeague({ storage, wallet });
  try { league.tick(); } catch (e) { console.error("[football] first tick", e); }
  setInterval(() => { try { league.tick(); } catch (e) { console.error("[football] tick", e); } }, 1000).unref?.();

  const limit = rateLimit(Number(process.env.FOOTBALL_RATE_LIMIT) || 240, 60_000);
  const nameOf = (m) => (m && m.nickname) || (m && m.username) || "";
  const fail = (res, e) => {
    if (e instanceof ApiError) return res.status(400).json({ error: e.message, code: e.code });
    console.error("[football]", e);
    return res.status(500).json({ error: "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง" });
  };
  const withMember = (req, res, fn) => {
    const m = findMember(readDb(), req.memberName);
    if (!m) return res.status(404).json({ error: "Member not found" });
    if (m.suspended) return res.status(403).json({ error: "Account suspended" });
    try { return fn(m); } catch (e) { return fail(res, e); }
  };

  app.post("/api/football/state", memberAuth, limit, (req, res) => withMember(req, res, (m) => {
    const rev = Number((req.body || {}).rev) || 0;
    league.member(m.username, nameOf(m));
    if (rev && rev === league.rev) return res.json({ same: true, rev, now: Date.now(), balance: m.balance });
    res.json(league.snapshot(m.username, nameOf(m)));
  }));
  app.post("/api/football/act", memberAuth, limit, (req, res) => withMember(req, res, (m) => {
    const b = req.body || {};
    const result = league.memberAct(m.username, nameOf(m), String(b.method || ""), Array.isArray(b.args) ? b.args : []);
    const fresh = findMember(readDb(), m.username);
    res.json({ ok: true, result, member: fresh ? publicMember(fresh) : undefined });
  }));

  app.post("/api/admin/football/state", adminOnly, (req, res) => {
    const rev = Number((req.body || {}).rev) || 0;
    if (rev && rev === league.rev) return res.json({ same: true, rev, now: Date.now() });
    res.json(league.adminSnapshot());
  });
  app.post("/api/admin/football/act", adminOnly, (req, res) => {
    const b = req.body || {};
    try {
      const method = String(b.method || "");
      const result = league.adminAct(method, Array.isArray(b.args) ? b.args : []);
      if (audit) { const db = readDb(); audit(db, "FOOTBALL_ADMIN", "admin", { method }); writeDb(db); }
      res.json({ ok: true, result: result === undefined ? null : result });
    } catch (e) { fail(res, e); }
  });
  return league;
}
