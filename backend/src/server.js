import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import { readDb, writeDb, id, now, audit } from "./store.js";
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
  const username = String(req.body.username || "").trim();
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
  if (existing) return res.json({ request: publicWithdraw(existing, false) }); // idempotent retry

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
  res.status(201).json({ request: publicWithdraw(item, false) });
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
  audit(db, "WITHDRAW_" + status.toUpperCase(), "admin", { id: item.id, username: item.username, amount: item.amount });
  writeDb(db);
  res.json({ request: publicWithdraw(item, true) });
});


// ---------------------------------------------------------------------------
// Deposit requests (slip photo is kept server-side, downloaded on demand by admin)
// ---------------------------------------------------------------------------
function publicDeposit(d) {
  return { id: d.id, username: d.username, amount: d.amount, status: d.status, time: d.time, deviceId: d.deviceId, hasSlip: !!d.slipImage };
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
    id: reqId, username, amount, slipImage: slip, status: "pending",
    deviceId: String(req.body.deviceId || "").slice(0, 60),
    time: Number.isFinite(time) && time > 0 ? time : Date.now(),
    createdAt: now()
  };
  db.deposits.push(item);
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
  res.json({ slipImage: item.slipImage || null });
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
  if (status === "rejected") item.slipImage = ""; // free space
  audit(db, "DEPOSIT_" + status.toUpperCase(), "admin", { id: item.id, username: item.username, amount: item.amount });
  writeDb(db);
  res.json({ request: publicDeposit(item) });
});

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
