// Lottery (หวยไทย / หวยลาว / หวยด่วน) - virtual credits only.
// Two ways a round gets its result:
//   mode "manual": an admin types in the official numbers after the real draw
//   mode "auto":   the server draws random numbers itself at drawAt
// Credits are taken when a ticket is placed and paid by the server when the round is settled.
import crypto from "node:crypto";

export const BET_TYPES = {
  top3: { label: "3 ตัวบน", digits: 3 },
  tod3: { label: "3 ตัวโต๊ด", digits: 3 },
  top2: { label: "2 ตัวบน", digits: 2 },
  bottom2: { label: "2 ตัวล่าง", digits: 2 },
  runTop: { label: "วิ่งบน", digits: 1 },
  runBottom: { label: "วิ่งล่าง", digits: 1 },
};
export const DEFAULT_RATES = { top3: 900, tod3: 150, top2: 90, bottom2: 90, runTop: 3.2, runBottom: 4.2 };
const DEFAULT_SETTINGS = { rates: DEFAULT_RATES, maxPerLine: 100000, quick: { enabled: false, everyMin: 15, closeBeforeSec: 60 } };
const TYPES = ["thai", "lao", "quick"];
const r2 = (n) => Math.round(n * 100) / 100;
const digitsOk = (s, n) => typeof s === "string" && s.length === n && /^[0-9]+$/.test(s);

export function lotterySettings(db) {
  const s = (db.settings && db.settings.lottery) || {};
  return {
    rates: { ...DEFAULT_RATES, ...(s.rates || {}) },
    maxPerLine: Number.isFinite(s.maxPerLine) ? s.maxPerLine : DEFAULT_SETTINGS.maxPerLine,
    quick: { ...DEFAULT_SETTINGS.quick, ...(s.quick || {}) },
  };
}

// Does one line win against a result? Returns the multiplier (0 = no win).
export function lineMultiplier(line, result) {
  const { top3, bottom2 } = result;
  const n = line.number;
  switch (line.type) {
    case "top3": return n === top3 ? line.rate : 0;
    case "tod3": return n.split("").sort().join("") === top3.split("").sort().join("") ? line.rate : 0;
    case "top2": return n === top3.slice(1) ? line.rate : 0;
    case "bottom2": return n === bottom2 ? line.rate : 0;
    case "runTop": return top3.includes(n) ? line.rate : 0;
    case "runBottom": return bottom2.includes(n) ? line.rate : 0;
    default: return 0;
  }
}
function randomResult() {
  const d = (k) => Array.from({ length: k }, () => crypto.randomInt(0, 10)).join("");
  return { top3: d(3), bottom2: d(2) };
}
function cleanNumberList(v, digits) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((x) => String(x).trim()).filter((x) => digitsOk(x, digits)))].slice(0, 500);
}
function cleanNumberMap(v) {
  const out = {};
  if (!v || typeof v !== "object") return out;
  for (const t of Object.keys(BET_TYPES)) { const list = cleanNumberList(v[t], BET_TYPES[t].digits); if (list.length) out[t] = list; }
  return out;
}

export function registerLottery(app, { readDb, writeDb, audit, id, findMember, memberAuth, adminOnly, rateLimit, publicMember }) {
  const rounds = (db) => (db.lotteryRounds = db.lotteryRounds || []);
  const tickets = (db) => (db.lotteryTickets = db.lotteryTickets || []);
  const isOpen = (r, now = Date.now()) => r.status === "open" && now < r.closeAt;

  function pay(db, username, amount) {
    const m = findMember(db, username);
    if (m && amount) m.balance = r2(m.balance + amount);
    return m;
  }
  function settleRound(db, round, result) {
    let paid = 0, stake = 0;
    for (const t of tickets(db)) {
      if (t.roundId !== round.id || t.status === "cancelled") continue;
      let payout = 0;
      t.lines = t.lines.map((l) => { const mult = lineMultiplier(l, result); const win = r2(l.amount * mult); payout += win; return { ...l, win }; });
      t.payout = r2(payout);
      t.status = t.payout > 0 ? "won" : "lost";
      pay(db, t.username, t.payout);
      paid += t.payout; stake += t.total;
    }
    round.result = result;
    round.settleStats = { paid: r2(paid), stake: r2(stake) };
    round.status = "settled";
    round.settledAt = Date.now();
    db.gameStats = db.gameStats || {};
    const s = db.gameStats.lottery || (db.gameStats.lottery = { rounds: 0, wagered: 0, payout: 0 });
    s.rounds += 1; s.wagered = r2(s.wagered + stake); s.payout = r2(s.payout + paid);
    return { paid: r2(paid), stake: r2(stake) };
  }
  // take back what a wrong result paid out, so the round can be settled again
  function unsettleRound(db, round) {
    let shortfall = 0;
    for (const t of tickets(db)) {
      if (t.roundId !== round.id || t.status === "cancelled" || !t.payout) continue;
      const m = findMember(db, t.username);
      if (m) { const take = Math.min(m.balance, t.payout); shortfall += t.payout - take; m.balance = r2(m.balance - take); }
      t.payout = 0; t.status = "pending";
    }
    const s = db.gameStats && db.gameStats.lottery;
    if (s) {
      const prev = round.settleStats || { paid: 0, stake: 0 };
      s.rounds = Math.max(0, s.rounds - 1); s.wagered = r2(s.wagered - prev.stake); s.payout = r2(s.payout - prev.paid);
    }
    round.status = "open";
    return r2(shortfall);
  }
  function nextQuickDraw(now, everyMin) {
    const step = everyMin * 60_000;
    return Math.ceil((now + 1) / step) * step;
  }
  // auto draws + keep one upcoming quick round; called on a timer and before reads
  function tick(db) {
    let changed = false;
    const now = Date.now();
    for (const r of rounds(db)) {
      if (r.status === "open" && r.mode === "auto" && now >= r.drawAt) {
        settleRound(db, r, randomResult());
        changed = true;
      }
    }
    const q = lotterySettings(db).quick;
    if (q.enabled) {
      const upcoming = rounds(db).some((r) => r.type === "quick" && r.status === "open" && r.drawAt > now);
      if (!upcoming) {
        let drawAt = nextQuickDraw(now, q.everyMin);
        if (drawAt - q.closeBeforeSec * 1000 <= now) drawAt += q.everyMin * 60_000;
        const hhmm = new Date(drawAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });
        rounds(db).push({ id: id(), type: "quick", title: "หวยด่วน " + hhmm, mode: "auto", status: "open", drawAt, closeAt: drawAt - q.closeBeforeSec * 1000, createdAt: now, blocked: {}, half: {} });
        changed = true;
      }
    }
    // keep storage bounded: 400 newest rounds, tickets of the kept rounds (max 20000)
    if (rounds(db).length > 400) {
      const keep = rounds(db).slice(-400); const ids = new Set(keep.map((r) => r.id));
      db.lotteryRounds = keep; db.lotteryTickets = tickets(db).filter((t) => ids.has(t.roundId));
      changed = true;
    }
    if (tickets(db).length > 20000) { db.lotteryTickets = tickets(db).slice(-20000); changed = true; }
    return changed;
  }
  const withTick = () => { const db = readDb(); if (tick(db)) writeDb(db); return db; };
  setInterval(() => { try { withTick(); } catch (e) { console.error("lottery tick", e); } }, 15_000).unref?.();

  const publicRound = (r) => ({
    id: r.id, type: r.type, title: r.title, mode: r.mode, status: r.status, closeAt: r.closeAt, drawAt: r.drawAt,
    result: r.status === "settled" ? r.result : null, blocked: r.blocked || {}, half: r.half || {},
  });

  // ---------------- members ----------------
  app.get("/api/lottery/rounds", rateLimit(120, 60_000), (_req, res) => {
    const db = withTick();
    const now = Date.now();
    const all = rounds(db);
    const open = all.filter((r) => isOpen(r, now)).sort((a, b) => a.closeAt - b.closeAt);
    const waiting = all.filter((r) => r.status === "open" && !isOpen(r, now)).sort((a, b) => a.drawAt - b.drawAt);
    const settled = all.filter((r) => r.status === "settled").sort((a, b) => b.drawAt - a.drawAt).slice(0, 30);
    const st = lotterySettings(db);
    res.json({ now, open: open.map(publicRound), waiting: waiting.map(publicRound), settled: settled.map(publicRound), rates: st.rates, maxPerLine: st.maxPerLine, types: BET_TYPES });
  });

  app.post("/api/lottery/tickets", memberAuth, rateLimit(60, 60_000), (req, res) => {
    const db = withTick();
    const m = findMember(db, req.memberName);
    if (!m) return res.status(404).json({ error: "Member not found" });
    if (m.suspended) return res.status(403).json({ error: "Account suspended" });
    const round = rounds(db).find((r) => r.id === String(req.body.roundId));
    if (!round || !isOpen(round)) return res.status(409).json({ error: "round_closed" });
    const clientId = String(req.body.id || "");
    if (/^[A-Za-z0-9_-]{6,64}$/.test(clientId)) {
      const dup = tickets(db).find((t) => t.id === clientId);
      if (dup) return res.json({ ticket: dup, member: publicMember(m) }); // resend after a lost answer
    }
    const st = lotterySettings(db);
    const raw = Array.isArray(req.body.lines) ? req.body.lines : [];
    if (raw.length < 1 || raw.length > 200) return res.status(400).json({ error: "1-200 lines per ticket" });
    const lines = [];
    for (const l of raw) {
      const type = String(l.type); const number = String(l.number || "").trim(); const amount = Math.floor(Number(l.amount));
      if (!BET_TYPES[type] || !(st.rates[type] > 0)) return res.status(400).json({ error: "bad_type", type });
      if (!digitsOk(number, BET_TYPES[type].digits)) return res.status(400).json({ error: "bad_number", number });
      if (!(amount >= 1 && amount <= st.maxPerLine)) return res.status(400).json({ error: "bad_amount", number });
      if ((round.blocked?.[type] || []).includes(number)) return res.status(400).json({ error: "blocked", type, number });
      const half = (round.half?.[type] || []).includes(number);
      lines.push({ type, number, amount, rate: half ? r2(st.rates[type] / 2) : st.rates[type], half });
    }
    const total = r2(lines.reduce((a, l) => a + l.amount, 0));
    if (total > m.balance) return res.status(400).json({ error: "insufficient_balance" });
    m.balance = r2(m.balance - total);
    const t = { id: /^[A-Za-z0-9_-]{6,64}$/.test(clientId) ? clientId : id(), roundId: round.id, username: m.username, lines, total, status: "pending", payout: 0, time: Date.now() };
    tickets(db).push(t);
    m.lastActiveAt = Date.now();
    writeDb(db);
    res.status(201).json({ ticket: t, member: publicMember(m) });
  });

  app.get("/api/lottery/my-tickets", memberAuth, rateLimit(120, 60_000), (req, res) => {
    const db = withTick();
    const mine = tickets(db).filter((t) => t.username === req.memberName).slice(-100).reverse();
    const byId = Object.fromEntries(rounds(db).map((r) => [r.id, r]));
    res.json({ tickets: mine.map((t) => ({ ...t, round: byId[t.roundId] ? publicRound(byId[t.roundId]) : null })) });
  });

  // ---------------- admin ----------------
  app.get("/api/admin/lottery", adminOnly, (_req, res) => {
    const db = withTick();
    const agg = {};
    for (const t of tickets(db)) {
      const a = agg[t.roundId] || (agg[t.roundId] = { tickets: 0, stake: 0, paid: 0 });
      if (t.status === "cancelled") continue;
      a.tickets += 1; a.stake = r2(a.stake + t.total); a.paid = r2(a.paid + (t.payout || 0));
    }
    const list = rounds(db).slice(-100).reverse().map((r) => ({ ...publicRound(r), result: r.result || null, ...(agg[r.id] || { tickets: 0, stake: 0, paid: 0 }) }));
    res.json({ rounds: list, settings: lotterySettings(db), types: BET_TYPES });
  });

  app.put("/api/admin/lottery/settings", adminOnly, (req, res) => {
    const db = readDb();
    const cur = lotterySettings(db);
    const b = req.body || {};
    const rates = { ...cur.rates };
    if (b.rates && typeof b.rates === "object") for (const t of Object.keys(BET_TYPES)) {
      if (b.rates[t] === undefined) continue;
      const v = Number(b.rates[t]);
      if (!Number.isFinite(v) || v < 0 || v > 100000) return res.status(400).json({ error: "bad_rate", type: t });
      rates[t] = r2(v); // 0 = type switched off
    }
    let maxPerLine = cur.maxPerLine;
    if (b.maxPerLine !== undefined) { const v = Math.floor(Number(b.maxPerLine)); if (!(v >= 1 && v <= 10_000_000)) return res.status(400).json({ error: "bad_max" }); maxPerLine = v; }
    const quick = { ...cur.quick };
    if (b.quick && typeof b.quick === "object") {
      if (b.quick.enabled !== undefined) quick.enabled = !!b.quick.enabled;
      if (b.quick.everyMin !== undefined) { const v = Math.floor(Number(b.quick.everyMin)); if (!(v >= 1 && v <= 1440)) return res.status(400).json({ error: "bad_every" }); quick.everyMin = v; }
      if (b.quick.closeBeforeSec !== undefined) { const v = Math.floor(Number(b.quick.closeBeforeSec)); if (!(v >= 0 && v < quick.everyMin * 60)) return res.status(400).json({ error: "bad_close_before" }); quick.closeBeforeSec = v; }
    }
    db.settings = db.settings || {};
    db.settings.lottery = { rates, maxPerLine, quick };
    audit(db, "ADMIN_LOTTERY_SETTINGS", "admin", db.settings.lottery);
    tick(db);
    writeDb(db);
    res.json({ settings: lotterySettings(db) });
  });

  app.post("/api/admin/lottery/rounds", adminOnly, (req, res) => {
    const b = req.body || {};
    const type = TYPES.includes(b.type) ? b.type : null;
    const mode = b.mode === "auto" ? "auto" : "manual";
    const closeAt = Number(b.closeAt), drawAt = Number(b.drawAt);
    const title = String(b.title || "").trim().slice(0, 80);
    if (!type || !title) return res.status(400).json({ error: "type and title required" });
    if (!Number.isFinite(closeAt) || !Number.isFinite(drawAt) || closeAt <= Date.now() || drawAt < closeAt) return res.status(400).json({ error: "bad_times" });
    const db = readDb();
    const r = { id: id(), type, title, mode, status: "open", closeAt, drawAt, createdAt: Date.now(), blocked: cleanNumberMap(b.blocked), half: cleanNumberMap(b.half) };
    rounds(db).push(r);
    audit(db, "ADMIN_LOTTERY_ROUND", "admin", { id: r.id, type, title, mode });
    writeDb(db);
    res.status(201).json({ round: r });
  });

  app.patch("/api/admin/lottery/rounds/:id", adminOnly, (req, res) => {
    const db = readDb();
    const r = rounds(db).find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: "not_found" });
    if (r.status !== "open") return res.status(409).json({ error: "round_not_open" });
    const b = req.body || {};
    if (b.title !== undefined) r.title = String(b.title).trim().slice(0, 80) || r.title;
    if (b.closeAt !== undefined) { const v = Number(b.closeAt); if (!Number.isFinite(v)) return res.status(400).json({ error: "bad_times" }); r.closeAt = v; }
    if (b.drawAt !== undefined) { const v = Number(b.drawAt); if (!Number.isFinite(v)) return res.status(400).json({ error: "bad_times" }); r.drawAt = v; }
    if (r.drawAt < r.closeAt) return res.status(400).json({ error: "bad_times" });
    if (b.blocked !== undefined) r.blocked = cleanNumberMap(b.blocked);
    if (b.half !== undefined) r.half = cleanNumberMap(b.half);
    audit(db, "ADMIN_LOTTERY_EDIT", "admin", { id: r.id });
    writeDb(db);
    res.json({ round: r });
  });

  // result: { top3: "123", bottom2: "45" } or { firstPrize: "123456", bottom2: "45" } (Thai: 3 ตัวบน = last 3 digits)
  app.post("/api/admin/lottery/rounds/:id/result", adminOnly, (req, res) => {
    const db = readDb();
    const r = rounds(db).find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: "not_found" });
    if (r.status === "cancelled") return res.status(409).json({ error: "cancelled" });
    const b = req.body || {};
    const first = String(b.firstPrize || "").trim();
    const top3 = digitsOk(first, 6) ? first.slice(3) : String(b.top3 || "").trim();
    const bottom2 = String(b.bottom2 || "").trim();
    if (!digitsOk(top3, 3) || !digitsOk(bottom2, 2)) return res.status(400).json({ error: "bad_result" });
    let shortfall = 0;
    const correcting = r.status === "settled";
    if (correcting) shortfall = unsettleRound(db, r);
    else if (Date.now() < r.closeAt) r.closeAt = Date.now(); // entering a result closes betting
    const out = settleRound(db, r, { top3, bottom2, ...(digitsOk(first, 6) ? { firstPrize: first } : {}) });
    r.resultBy = "admin";
    audit(db, correcting ? "ADMIN_LOTTERY_RESULT_CORRECTED" : "ADMIN_LOTTERY_RESULT", "admin", { id: r.id, top3, bottom2, ...out, shortfall });
    writeDb(db);
    res.json({ round: r, ...out, shortfall });
  });

  app.post("/api/admin/lottery/rounds/:id/cancel", adminOnly, (req, res) => {
    const db = readDb();
    const r = rounds(db).find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: "not_found" });
    if (r.status !== "open") return res.status(409).json({ error: "only_open_rounds" });
    let refunded = 0;
    for (const t of tickets(db)) {
      if (t.roundId !== r.id || t.status !== "pending") continue;
      pay(db, t.username, t.total); refunded += t.total; t.status = "cancelled";
    }
    r.status = "cancelled";
    audit(db, "ADMIN_LOTTERY_CANCEL", "admin", { id: r.id, refunded: r2(refunded) });
    writeDb(db);
    res.json({ round: r, refunded: r2(refunded) });
  });

  // how much is riding on each number (to decide เลขอั้น)
  app.get("/api/admin/lottery/rounds/:id/summary", adminOnly, (req, res) => {
    const db = readDb();
    const r = rounds(db).find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: "not_found" });
    const by = {};
    for (const t of tickets(db)) {
      if (t.roundId !== r.id || t.status === "cancelled") continue;
      for (const l of t.lines) {
        const k = l.type + ":" + l.number;
        const a = by[k] || (by[k] = { type: l.type, number: l.number, amount: 0, risk: 0 });
        a.amount = r2(a.amount + l.amount); a.risk = r2(a.risk + l.amount * l.rate);
      }
    }
    res.json({ numbers: Object.values(by).sort((a, b) => b.risk - a.risk).slice(0, 100) });
  });
}
