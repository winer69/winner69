import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { readDb, writeDb, id, now, audit, saveSlip, loadSlip, deleteSlip } from "./store.js";
import { registerGames, gameSettings, cleanGameSettings } from "./games.js";
import { registerLottery } from "./lottery.js";
import { hashPassword, verifyPassword, signUser, auth } from "./auth.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const origin = process.env.CORS_ORIGIN || "http://localhost:5173";

const origins = origin.split(",").map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: origins.length > 1 ? origins : origins[0] }));
app.use(express.json({ limit: "3mb" })); // deposit slip photos (already shrunk by the app)

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    credits: user.credits,
    createdAt: user.createdAt,
    suspended: user.suspended
  };
}

function validCredentials(username, password) {
  return typeof username === "string" && username.trim().length >= 3 &&
    typeof password === "string" && password.length >= 6;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "winner69-demo-backend", time: now() });
});

app.post("/api/auth/register", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = req.body.password;
  if (!validCredentials(username, password)) {
    return res.status(400).json({ error: "Username >= 3 chars and password >= 6 chars required" });
  }

  const db = readDb();
  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(409).json({ error: "Username already exists" });
  }

  const user = {
    id: id(),
    username,
    passwordHash: hashPassword(password),
    role: "member",
    credits: 1000,
    suspended: false,
    createdAt: now()
  };
  db.users.push(user);
  audit(db, "REGISTER", user.id, { username });
  writeDb(db);

  res.status(201).json({ user: publicUser(user), token: signUser(user) });
});

app.post("/api/auth/login", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = req.body.password;
  const db = readDb();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user || !verifyPassword(password || "", user.passwordHash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  if (user.suspended) return res.status(403).json({ error: "Account suspended" });

  audit(db, "LOGIN", user.id, {});
  writeDb(db);
  res.json({ user: publicUser(user), token: signUser(user) });
});

app.get("/api/me", auth, (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

app.get("/api/wallet", auth, (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ credits: user.credits });
});

// Demo-only credit top-up. Replace with a properly authorized service if the
// project ever becomes a lawful real-money product.
app.post("/api/wallet/demo-credit", auth, (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
    return res.status(400).json({ error: "Invalid demo credit amount" });
  }

  const db = readDb();
  const user = db.users.find(u => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.credits += Math.floor(amount);
  audit(db, "DEMO_CREDIT", user.id, { amount: Math.floor(amount) });
  writeDb(db);
  res.json({ credits: user.credits });
});

// Records a virtual-credit demo round. No payment, cash-out, or odds control.
app.post("/api/games/round", auth, (req, res) => {
  const gameId = String(req.body.gameId || "").trim();
  const stake = Number(req.body.stake);
  const result = String(req.body.result || "demo");

  if (!gameId || !Number.isFinite(stake) || stake <= 0 || stake > 100000) {
    return res.status(400).json({ error: "Invalid gameId or stake" });
  }

  const db = readDb();
  const user = db.users.find(u => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.suspended) return res.status(403).json({ error: "Account suspended" });
  if (user.credits < stake) return res.status(400).json({ error: "Insufficient demo credits" });

  user.credits -= Math.floor(stake);
  const round = {
    id: id(),
    userId: user.id,
    gameId,
    stake: Math.floor(stake),
    result,
    createdAt: now()
  };
  db.rounds.push(round);
  audit(db, "DEMO_GAME_ROUND", user.id, {
    roundId: round.id, gameId, stake: round.stake, result
  });
  writeDb(db);

  res.status(201).json({ round, credits: user.credits });
});

app.get("/api/games/history", auth, (req, res) => {
  const db = readDb();
  const rounds = db.rounds
    .filter(r => r.userId === req.user.sub)
    .slice(-100)
    .reverse();
  res.json({ rounds });
});

app.get("/api/admin/audit", auth, (req, res) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || req.headers["x-admin-key"] !== adminKey) {
    return res.status(403).json({ error: "Admin access denied" });
  }
  const db = readDb();
  res.json({ audit: db.audit.slice(-500).reverse() });
});


// ---------------------------------------------------------------------------
// Withdraw requests (virtual credits). The front-end keeps member accounts in
// the browser, so these routes are deliberately simple:
//   members  -> POST a request, GET their own requests   (no login needed)
//   admin    -> list all requests / approve / reject      (x-admin-key header)
// ---------------------------------------------------------------------------
const hits = new Map(); // ip -> [timestamps] (tiny in-memory rate limit)
function rateLimit(limit, windowMs) {
  return (req, res, next) => {
    const key = req.ip + req.path;
    const t = Date.now();
    const list = (hits.get(key) || []).filter((x) => t - x < windowMs);
    if (list.length >= limit) return res.status(429).json({ error: "Too many requests" });
    list.push(t);
    hits.set(key, list);
    next();
  };
}

function adminOnly(req, res, next) {
  const adminKey = process.env.ADMIN_KEY;
  const given = String(req.headers["x-admin-key"] || "");
  const a = Buffer.from(given);
  const b = Buffer.from(adminKey || "");
  if (!adminKey || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: "Admin access denied" });
  }
  next();
}

function publicWithdraw(w, withAccount) {
  const out = { id: w.id, username: w.username, amount: w.amount, status: w.status, time: w.time, deviceId: w.deviceId };
  if (withAccount) out.account = w.account;
  return out;
}

app.post("/api/withdraw-requests", rateLimit(20, 60_000), (req, res) => {
  // A signed-in member: the name comes from the token and the credit is taken here.
  let tokenName = null;
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    try {
      const p = jwt.verify(auth.slice(7), process.env.JWT_SECRET || "dev-only-secret");
      if (p.kind === "member") tokenName = p.sub;
    } catch { return res.status(401).json({ error: "Invalid or expired token" }); }
  }
  const username = tokenName || String(req.body.username || "").trim();
  const account = String(req.body.account || "").trim().slice(0, 200);
  const amount = Number(req.body.amount);
  const clientId = String(req.body.id || "");
  if (!username || username.length > 40 || !Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
    return res.status(400).json({ error: "Invalid username or amount" });
  }

  const db = readDb();
  db.withdrawals = db.withdrawals || [];
  const reqId = /^[A-Za-z0-9_-]{6,64}$/.test(clientId) ? clientId : id();
  const existing = db.withdrawals.find((w) => w.id === reqId);
  if (existing) {
    const mm = tokenName ? findMember(db, tokenName) : null;
    return res.json({ request: publicWithdraw(existing, false), ...(mm ? { member: publicMember(mm) } : {}) }); // idempotent retry
  }
  const member = findMember(db, username);
  if (member && !tokenName) return res.status(401).json({ error: "Sign in required" }); // server accounts must be signed in
  if (member) {
    if (member.suspended) return res.status(403).json({ error: "Account suspended" });
    if (amount > member.balance) return res.status(400).json({ error: "insufficient_balance" });
    member.balance = roundMoney(member.balance - amount); // held until the admin decides; refunded if rejected
  }

  const time = Number(req.body.time);
  const item = {
    id: reqId, username, amount, account, status: "pending",
    deviceId: String(req.body.deviceId || "").slice(0, 60),
    time: Number.isFinite(time) && time > 0 ? time : Date.now(),
    createdAt: now()
  };
  db.withdrawals.push(item);
  db.withdrawals = db.withdrawals.slice(-1000);
  audit(db, "WITHDRAW_REQUEST", username, { id: item.id, amount });
  writeDb(db);
  res.status(201).json({ request: publicWithdraw(item, false), ...(member ? { member: publicMember(member) } : {}) });
});

app.get("/api/withdraw-requests", rateLimit(120, 60_000), (req, res) => {
  const username = String(req.query.username || "").trim();
  if (!username) return res.status(400).json({ error: "username required" });
  const db = readDb();
  const requests = (db.withdrawals || [])
    .filter((w) => w.username === username)
    .slice(-50)
    .reverse()
    .map((w) => publicWithdraw(w, false));
  res.json({ requests });
});

app.get("/api/admin/withdraw-requests", adminOnly, (_req, res) => {
  const db = readDb();
  const requests = (db.withdrawals || []).slice(-200).reverse().map((w) => publicWithdraw(w, true));
  res.json({ requests });
});

app.patch("/api/admin/withdraw-requests/:id", adminOnly, (req, res) => {
  const status = String(req.body.status || "");
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "status must be approved or rejected" });
  }
  const db = readDb();
  const item = (db.withdrawals || []).find((w) => w.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Request not found" });
  if (item.status !== "pending") {
    return res.status(409).json({ error: "Request already " + item.status, request: publicWithdraw(item, true) });
  }
  item.status = status;
  item.decidedAt = now();
  // A rejected withdrawal returns the held credit to the member's server-side account.
  const m = findMember(db, item.username);
  if (status === "rejected" && m && !item.refunded) {
    m.balance = roundMoney(m.balance + item.amount);
    item.refunded = true;
  }
  audit(db, "WITHDRAW_" + status.toUpperCase(), "admin", { id: item.id, username: item.username, amount: item.amount, refunded: !!item.refunded });
  writeDb(db);
  res.json({ request: publicWithdraw(item, true) });
});


// ---------------------------------------------------------------------------
// Deposit requests (slip photo is kept server-side, downloaded on demand by admin)
// ---------------------------------------------------------------------------
function publicDeposit(d) {
  return { id: d.id, username: d.username, amount: d.amount, status: d.status, time: d.time, deviceId: d.deviceId, hasSlip: !!(d.hasSlip || d.slipImage) };
}

app.post("/api/deposit-requests", rateLimit(20, 60_000), (req, res) => {
  const username = String(req.body.username || "").trim();
  const amount = Number(req.body.amount);
  const clientId = String(req.body.id || "");
  const slip = req.body.slipImage ? String(req.body.slipImage) : "";
  if (!username || username.length > 40 || !Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
    return res.status(400).json({ error: "Invalid username or amount" });
  }
  if (slip && (!slip.startsWith("data:image/") || slip.length > 2_500_000)) {
    return res.status(400).json({ error: "Invalid slip image" });
  }
  const db = readDb();
  db.deposits = db.deposits || [];
  const reqId = /^[A-Za-z0-9_-]{6,64}$/.test(clientId) ? clientId : id();
  const existing = db.deposits.find((d) => d.id === reqId);
  if (existing) return res.json({ request: publicDeposit(existing) });
  const time = Number(req.body.time);
  const item = {
    id: reqId, username, amount, hasSlip: !!slip, status: "pending",
    deviceId: String(req.body.deviceId || "").slice(0, 60),
    time: Number.isFinite(time) && time > 0 ? time : Date.now(),
    createdAt: now()
  };
  if (slip) saveSlip(item.id, slip);
  db.deposits.push(item);
  const dropped = db.deposits.slice(0, Math.max(0, db.deposits.length - 300));
  dropped.forEach((d) => deleteSlip(d.id));
  db.deposits = db.deposits.slice(-300);
  audit(db, "DEPOSIT_REQUEST", username, { id: item.id, amount });
  writeDb(db);
  res.status(201).json({ request: publicDeposit(item) });
});

app.get("/api/deposit-requests", rateLimit(120, 60_000), (req, res) => {
  const username = String(req.query.username || "").trim();
  if (!username) return res.status(400).json({ error: "username required" });
  const db = readDb();
  const requests = (db.deposits || []).filter((d) => d.username === username).slice(-50).reverse().map(publicDeposit);
  res.json({ requests });
});

app.get("/api/admin/deposit-requests", adminOnly, (_req, res) => {
  const db = readDb();
  res.json({ requests: (db.deposits || []).slice(-100).reverse().map(publicDeposit) });
});

app.get("/api/admin/deposit-requests/:id/slip", adminOnly, (req, res) => {
  const db = readDb();
  const item = (db.deposits || []).find((d) => d.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Request not found" });
  res.json({ slipImage: loadSlip(item.id) || item.slipImage || null });
});

app.patch("/api/admin/deposit-requests/:id", adminOnly, (req, res) => {
  const status = String(req.body.status || "");
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "status must be approved or rejected" });
  }
  const db = readDb();
  const item = (db.deposits || []).find((d) => d.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Request not found" });
  if (item.status !== "pending") {
    return res.status(409).json({ error: "Request already " + item.status, request: publicDeposit(item) });
  }
  item.status = status;
  item.decidedAt = now();
  if (status === "rejected") { item.slipImage = ""; item.hasSlip = false; deleteSlip(item.id); } // free space
  // An approved deposit is credited to the member's server-side account (once).
  const m = findMember(db, item.username);
  if (status === "approved" && m && !item.credited) {
    m.balance = roundMoney(m.balance + item.amount);
    item.credited = true;
  }
  audit(db, "DEPOSIT_" + status.toUpperCase(), "admin", { id: item.id, username: item.username, amount: item.amount, credited: !!item.credited });
  writeDb(db);
  res.json({ request: publicDeposit(item) });
});

// ---------------------------------------------------------------------------
// Member accounts (server-side). Usernames are assigned here (US0001, US0002 ...)
// so they are unique across every device. Balances are changed with DELTAS so an
// admin adjustment and the member's own play never overwrite each other.
// NOTE: game rounds are still computed in the browser (this is a virtual-credit
// demo) - a technical member could send fake deltas. Real money would need the
// game outcomes to be computed here.
// ---------------------------------------------------------------------------
const ACCEPT_BROWSER_DELTAS = false;
function roundMoney(n) { return Math.round(Number(n) * 100) / 100; }
function findMember(db, username) {
  db.members = db.members || [];
  return db.members.find((m) => m.username === username);
}
const MEMBER_DATA_KEYS = ["boost", "boostActive", "boostBetsLeft", "boostBuyDate", "boostBuyCountToday", "wagerLimit", "redeemedCoupons"];
const SERVER_OWNED_KEYS = ["boost", "boostActive", "boostBetsLeft", "boostBuyDate", "boostBuyCountToday"]; // only the server / admin change these
function browserData(input) {
  const d = cleanMemberData(input);
  for (const k of SERVER_OWNED_KEYS) delete d[k];
  return d;
}
function cleanMemberData(input) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  for (const k of MEMBER_DATA_KEYS) {
    if (!(k in input)) continue;
    const v = input[k];
    if (k === "boostActive") out[k] = !!v;
    else if (k === "boostBuyDate") out[k] = String(v || "").slice(0, 40);
    else if (k === "redeemedCoupons") out[k] = Array.isArray(v) ? v.slice(0, 200).map((c) => String(c).slice(0, 40)) : [];
    else { const n = Number(v); out[k] = Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), 1_000_000_000) : 0; }
  }
  return out;
}
function publicMember(m) {
  const out = {
    username: m.username, balance: m.balance, suspended: !!m.suspended, note: m.note || "",
    joinedAt: m.joinedAt, lastLoginAt: m.lastLoginAt, lastActiveAt: m.lastActiveAt,
    data: m.data || {}, dataRev: m.dataRev || 0
  };
  out.phone = m.phone;
  return out;
}
function signMember(m) {
  return jwt.sign({ kind: "member", sub: m.username }, process.env.JWT_SECRET || "dev-only-secret", { expiresIn: "30d" });
}
function memberAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET || "dev-only-secret");
    if (p.kind !== "member") throw new Error("wrong token");
    req.memberName = p.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.post("/api/members/register", rateLimit(10, 60_000), (req, res) => {
  const phone = String(req.body.phone || "").trim();
  const password = String(req.body.password || "");
  if (!/^0[0-9]{8,9}$/.test(phone)) return res.status(400).json({ error: "Invalid phone number" });
  if (password.length < 4 || password.length > 100) return res.status(400).json({ error: "Password must be 4-100 characters" });
  const db = readDb();
  db.members = db.members || [];
  db.meta = db.meta || { memberSeq: 0 };
  // Never reuse a username that already appears on old withdraw/deposit requests (test data).
  const taken = new Set([...(db.withdrawals || []), ...(db.deposits || [])].map((r) => r.username));
  let seq = Number(db.meta.memberSeq) || 0;
  let username = "";
  do {
    seq += 1;
    username = "US" + String(seq).padStart(4, "0");
  } while ((taken.has(username) || findMember(db, username)) && seq < 99999);
  if (seq >= 99999) return res.status(507).json({ error: "Member limit reached" });
  db.meta.memberSeq = seq;
  const t = Date.now();
  const m = {
    username, phone, passwordHash: hashPassword(password), balance: 0, suspended: false, note: "",
    joinedAt: t, lastLoginAt: t, lastActiveAt: t, data: {}, dataRev: 0, ops: []
  };
  db.members.push(m);
  audit(db, "MEMBER_REGISTER", username, { phone });
  writeDb(db);
  res.status(201).json({ member: publicMember(m), token: signMember(m) });
});

app.post("/api/members/login", rateLimit(20, 60_000), (req, res) => {
  const username = String(req.body.username || "").trim().toUpperCase();
  const password = String(req.body.password || "");
  const db = readDb();
  const m = findMember(db, username);
  let ok = false;
  try { ok = !!m && verifyPassword(password, m.passwordHash); } catch { ok = false; }
  if (!ok) return res.status(401).json({ error: "Invalid username or password" });
  if (m.suspended) return res.status(403).json({ error: "Account suspended" });
  m.lastLoginAt = m.lastActiveAt = Date.now();
  audit(db, "MEMBER_LOGIN", username, {});
  writeDb(db);
  res.json({ member: publicMember(m), token: signMember(m) });
});

// One call does everything the member's browser needs: send the balance change since the
// last sync (delta), send the browser-owned data snapshot, and get the authoritative record back.
app.post("/api/members/me/sync", memberAuth, rateLimit(600, 60_000), (req, res) => {
  const db = readDb();
  const m = findMember(db, req.memberName);
  if (!m) return res.status(404).json({ error: "Member not found" });
  if (m.suspended) return res.status(403).json({ error: "Account suspended" });

  let changed = false;
  const opId = String(req.body.opId || "");
  const delta = Number(req.body.delta);
  m.ops = m.ops || [];
  // Every game, the shop, coupons, deposits and withdrawals now change the balance on the
  // server, so a balance change sent by the browser is ignored (kept only for old clients).
  if (ACCEPT_BROWSER_DELTAS && /^[A-Za-z0-9_-]{6,64}$/.test(opId) && !m.ops.includes(opId) && Number.isFinite(delta) && delta !== 0) {
    changed = true;
    const capped = Math.max(-10_000_000, Math.min(10_000_000, delta));
    m.balance = Math.max(0, roundMoney(m.balance + capped));
    m.ops = [...m.ops, opId].slice(-50);
    if (Math.abs(capped) >= 100_000) audit(db, "MEMBER_BIG_DELTA", m.username, { delta: capped });
  }

  // The browser's snapshot only wins if it has seen the latest admin change (dataRev).
  let dataAccepted = false;
  if (Number(req.body.dataRev) === (m.dataRev || 0) && req.body.data) {
    const nextData = { ...(m.data || {}), ...browserData(req.body.data) };
    if (JSON.stringify(nextData) !== JSON.stringify(m.data || {})) { m.data = nextData; changed = true; }
    dataAccepted = true;
  }
  if (Date.now() - (m.lastActiveAt || 0) > 30_000) { m.lastActiveAt = Date.now(); changed = true; }
  if (changed) writeDb(db);
  res.json({ member: publicMember(m), dataAccepted });
});

app.post("/api/members/me/password", memberAuth, rateLimit(10, 60_000), (req, res) => {
  const password = String(req.body.newPassword || "");
  if (password.length < 4 || password.length > 100) return res.status(400).json({ error: "Password must be 4-100 characters" });
  const db = readDb();
  const m = findMember(db, req.memberName);
  if (!m) return res.status(404).json({ error: "Member not found" });
  m.passwordHash = hashPassword(password);
  audit(db, "MEMBER_PASSWORD", m.username, {});
  writeDb(db);
  res.json({ ok: true });
});

app.get("/api/admin/members", adminOnly, (_req, res) => {
  const db = readDb();
  res.json({ members: (db.members || []).map((m) => publicMember(m)) });
});

// Admin changes: balanceDelta (add/subtract), balanceSet (absolute), data {boost, wagerLimit...}, suspended, note
app.patch("/api/admin/members/:username", adminOnly, (req, res) => {
  const db = readDb();
  const m = findMember(db, String(req.params.username));
  if (!m) return res.status(404).json({ error: "Member not found" });
  const b = req.body || {};
  const changes = {};
  if (b.balanceSet !== undefined) {
    const v = Number(b.balanceSet);
    if (!Number.isFinite(v) || v < 0 || v > 1_000_000_000) return res.status(400).json({ error: "Invalid balanceSet" });
    changes.balanceFrom = m.balance;
    m.balance = roundMoney(v);
    changes.balanceSet = m.balance;
  } else if (b.balanceDelta !== undefined) {
    const v = Number(b.balanceDelta);
    if (!Number.isFinite(v) || Math.abs(v) > 1_000_000_000) return res.status(400).json({ error: "Invalid balanceDelta" });
    m.balance = Math.max(0, roundMoney(m.balance + v));
    changes.balanceDelta = v;
  }
  if (b.data && typeof b.data === "object") {
    m.data = { ...(m.data || {}), ...cleanMemberData(b.data) };
    m.dataRev = (m.dataRev || 0) + 1; // tells the member's browser to adopt the admin's values
    changes.data = cleanMemberData(b.data);
  }
  if (b.suspended !== undefined) { m.suspended = !!b.suspended; changes.suspended = m.suspended; }
  if (b.note !== undefined) { m.note = String(b.note).slice(0, 500); changes.note = true; }
  audit(db, "ADMIN_MEMBER_EDIT", "admin", { username: m.username, ...changes, reason: String(b.reason || "").slice(0, 200) });
  writeDb(db);
  res.json({ member: publicMember(m) });
});

// ---------------------------------------------------------------------------
// Shared settings (bank account shown on the deposit screen) and coupon codes.
// ---------------------------------------------------------------------------
app.get("/api/settings", rateLimit(120, 60_000), (_req, res) => {
  const db = readDb();
  const st = db.settings || {};
  const g = gameSettings(db);
  res.json({ bankInfo: typeof st.bankInfo === "string" ? st.bankInfo : null, bankInfoUpdatedAt: st.bankInfoUpdatedAt || 0, edges: g.edges, boostBonus: g.boostBonus });
});

app.put("/api/admin/settings", adminOnly, (req, res) => {
  const b = req.body || {};
  const game = cleanGameSettings(b);
  if (typeof b.bankInfo !== "string" && !game.edges && game.boostBonus === undefined) return res.status(400).json({ error: "Nothing to save" });
  const db = readDb();
  db.settings = db.settings || {};
  if (typeof b.bankInfo === "string") {
    db.settings.bankInfo = b.bankInfo.slice(0, 1000);
    db.settings.bankInfoUpdatedAt = Date.now();
    audit(db, "ADMIN_BANK_INFO", "admin", {});
  }
  if (game.edges) db.settings.edges = { ...(db.settings.edges || {}), ...game.edges };
  if (game.boostBonus !== undefined) db.settings.boostBonus = game.boostBonus;
  if (game.edges || game.boostBonus !== undefined) audit(db, "ADMIN_GAME_SETTINGS", "admin", game);
  writeDb(db);
  const g = gameSettings(db);
  res.json({ bankInfo: db.settings.bankInfo ?? null, bankInfoUpdatedAt: db.settings.bankInfoUpdatedAt || 0, edges: g.edges, boostBonus: g.boostBonus });
});

function cleanCouponCode(v) { return String(v || "").trim().toUpperCase().slice(0, 40); }
app.get("/api/admin/coupons", adminOnly, (_req, res) => {
  const db = readDb();
  res.json({ coupons: db.coupons || {} });
});
app.post("/api/admin/coupons", adminOnly, (req, res) => {
  const code = cleanCouponCode(req.body.code);
  const amount = Number(req.body.amount);
  if (!/^[A-Z0-9_-]{2,40}$/.test(code)) return res.status(400).json({ error: "Code: 2-40 letters/numbers" });
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return res.status(400).json({ error: "Invalid amount" });
  const db = readDb();
  db.coupons = db.coupons || {};
  db.coupons[code] = { amount: roundMoney(amount), createdAt: Date.now() };
  audit(db, "ADMIN_COUPON_CREATE", "admin", { code, amount });
  writeDb(db);
  res.status(201).json({ coupons: db.coupons });
});
app.delete("/api/admin/coupons/:code", adminOnly, (req, res) => {
  const code = cleanCouponCode(req.params.code);
  const db = readDb();
  db.coupons = db.coupons || {};
  delete db.coupons[code];
  audit(db, "ADMIN_COUPON_DELETE", "admin", { code });
  writeDb(db);
  res.json({ coupons: db.coupons });
});
// The server checks the code and "already used" and adds the credit itself, so a code
// can't be used twice even from two devices.
app.post("/api/members/me/redeem", memberAuth, rateLimit(20, 60_000), (req, res) => {
  const code = cleanCouponCode(req.body.code);
  const db = readDb();
  const m = findMember(db, req.memberName);
  if (!m) return res.status(404).json({ error: "Member not found" });
  if (m.suspended) return res.status(403).json({ error: "Account suspended" });
  const c = (db.coupons || {})[code];
  if (!code || !c) return res.status(404).json({ error: "not_found" });
  m.couponsUsed = m.couponsUsed || [];
  if (m.couponsUsed.includes(code)) return res.status(409).json({ error: "already_used" });
  m.couponsUsed.push(code);
  m.balance = roundMoney(m.balance + c.amount);
  audit(db, "MEMBER_COUPON", m.username, { code, amount: c.amount });
  writeDb(db);
  res.json({ amount: c.amount, member: publicMember(m) });
});

// ---------------------------------------------------------------------------
// Support chat: one thread per member. Every message gets a global sequence number,
// so each device asks only for what is new ("since"). Pictures are kept as files and
// sent once with the message. Read state = the time each side last opened the thread.
// ---------------------------------------------------------------------------
const CHAT_KEEP = 3000;
function chatImageKey(msgId) { return "chat-" + msgId; }
function chatOut(m, withImage) {
  return {
    id: m.id, seq: m.seq, username: m.username, from: m.from, text: m.text, time: m.time,
    hasImage: !!m.hasImage, image: withImage && m.hasImage ? (loadSlip(chatImageKey(m.id)) || null) : null
  };
}
function chatMeta(db, username) {
  const t = (db.chatThreads || {})[username] || {};
  return { userReadAt: t.userReadAt || 0, adminReadAt: t.adminReadAt || 0 };
}
function addChatMessage(db, username, from, body) {
  const text = String(body.text || "").trim().slice(0, 2000);
  const image = body.image ? String(body.image) : "";
  if (!text && !image) return { error: "Empty message" };
  if (image && (!image.startsWith("data:image/") || image.length > 2_500_000)) return { error: "Invalid image" };
  db.chatMessages = db.chatMessages || [];
  db.meta = db.meta || {};
  const clientId = String(body.id || "");
  const msgId = /^[A-Za-z0-9_-]{6,64}$/.test(clientId) ? clientId : id();
  const existing = db.chatMessages.find((m) => m.id === msgId);
  if (existing) return { msg: existing }; // resend after a lost response
  db.meta.chatSeq = (Number(db.meta.chatSeq) || 0) + 1;
  const msg = { id: msgId, seq: db.meta.chatSeq, username, from, text, hasImage: !!image, time: Date.now() };
  if (image) saveSlip(chatImageKey(msgId), image);
  db.chatMessages.push(msg);
  if (db.chatMessages.length > CHAT_KEEP) {
    db.chatMessages.slice(0, db.chatMessages.length - CHAT_KEEP).forEach((m) => { if (m.hasImage) deleteSlip(chatImageKey(m.id)); });
    db.chatMessages = db.chatMessages.slice(-CHAT_KEEP);
  }
  // sending counts as having read the thread
  db.chatThreads = db.chatThreads || {};
  const t = db.chatThreads[username] || (db.chatThreads[username] = {});
  if (from === "user") t.userReadAt = msg.time; else t.adminReadAt = msg.time;
  return { msg };
}
function sinceParam(req) { const n = Number(req.query.since); return Number.isFinite(n) && n > 0 ? n : 0; }

app.get("/api/members/me/chat", memberAuth, rateLimit(120, 60_000), (req, res) => {
  const db = readDb();
  const since = sinceParam(req);
  const mine = (db.chatMessages || []).filter((m) => m.username === req.memberName);
  const fresh = mine.filter((m) => m.seq > since).slice(-200);
  res.json({ messages: fresh.map((m) => chatOut(m, true)), meta: chatMeta(db, req.memberName), lastSeq: (db.meta && db.meta.chatSeq) || 0 });
});
app.post("/api/members/me/chat", memberAuth, rateLimit(30, 60_000), (req, res) => {
  const db = readDb();
  const m = findMember(db, req.memberName);
  if (!m) return res.status(404).json({ error: "Member not found" });
  if (m.suspended) return res.status(403).json({ error: "Account suspended" });
  const r = addChatMessage(db, m.username, "user", req.body || {});
  if (r.error) return res.status(400).json({ error: r.error });
  writeDb(db);
  res.status(201).json({ message: chatOut(r.msg, false), meta: chatMeta(db, m.username) });
});
app.post("/api/members/me/chat/read", memberAuth, rateLimit(60, 60_000), (req, res) => {
  const db = readDb();
  db.chatThreads = db.chatThreads || {};
  const t = db.chatThreads[req.memberName] || (db.chatThreads[req.memberName] = {});
  t.userReadAt = Date.now();
  writeDb(db);
  res.json({ meta: chatMeta(db, req.memberName) });
});

app.get("/api/admin/chats", adminOnly, (req, res) => {
  const db = readDb();
  const since = sinceParam(req);
  const fresh = (db.chatMessages || []).filter((m) => m.seq > since).slice(-400);
  const threads = {};
  for (const name of Object.keys(db.chatThreads || {})) threads[name] = chatMeta(db, name);
  res.json({ messages: fresh.map((m) => chatOut(m, true)), threads, lastSeq: (db.meta && db.meta.chatSeq) || 0 });
});
app.post("/api/admin/chats/:username", adminOnly, (req, res) => {
  const db = readDb();
  const username = String(req.params.username);
  if (!findMember(db, username)) return res.status(404).json({ error: "Member not found" });
  const r = addChatMessage(db, username, "admin", req.body || {});
  if (r.error) return res.status(400).json({ error: r.error });
  writeDb(db);
  res.status(201).json({ message: chatOut(r.msg, false), meta: chatMeta(db, username) });
});
app.post("/api/admin/chats/:username/read", adminOnly, (req, res) => {
  const db = readDb();
  const username = String(req.params.username);
  db.chatThreads = db.chatThreads || {};
  const t = db.chatThreads[username] || (db.chatThreads[username] = {});
  t.adminReadAt = Date.now();
  writeDb(db);
  res.json({ meta: chatMeta(db, username) });
});

registerGames(app, { readDb, writeDb, findMember, memberAuth, rateLimit, publicMember });
registerLottery(app, { readDb, writeDb, audit, id, findMember, memberAuth, adminOnly, rateLimit, publicMember });
app.get("/api/admin/game-stats", adminOnly, (_req, res) => { res.json({ stats: readDb().gameStats || {} }); });

// ---------------------------------------------------------------------------
// Admin PIN login (PINs live only in Railway variables, not in the web page).
//   ADMIN_PINS = admin1=code,admin2=code,admin3=code,admin4=code
// If ADMIN_PINS is not set, ADMIN_KEY works as the PIN of admin1 so nobody is locked out.
// ---------------------------------------------------------------------------
function adminPins() {
  const map = {};
  String(process.env.ADMIN_PINS || "").split(",").forEach((pair) => {
    const i = pair.indexOf("=");
    if (i > 0) {
      const k = pair.slice(0, i).trim();
      const v = pair.slice(i + 1).trim();
      if (k && v) map[k] = v;
    }
  });
  if (Object.keys(map).length === 0 && process.env.ADMIN_KEY) map.admin1 = process.env.ADMIN_KEY;
  return map;
}

function safeEqual(a, b) {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

app.post("/api/admin/login", rateLimit(10, 60_000), (req, res) => {
  const pin = String(req.body.pin || "");
  const pins = adminPins();
  let found = null;
  for (const [adminId, code] of Object.entries(pins)) {
    if (safeEqual(pin, code)) found = adminId; // no early exit: constant work
  }
  if (!found || !process.env.ADMIN_KEY) return res.status(401).json({ error: "Invalid PIN" });
  const db = readDb();
  audit(db, "ADMIN_LOGIN", found, {});
  writeDb(db);
  res.json({ id: found, adminKey: process.env.ADMIN_KEY });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`WINNER 69 demo backend: http://localhost:${port}`);
});
