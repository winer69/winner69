import "dotenv/config";
import express from "express";
import cors from "cors";
import { readDb, writeDb, id, now, audit } from "./store.js";
import { hashPassword, verifyPassword, signUser, auth } from "./auth.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const origin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin }));
app.use(express.json({ limit: "1mb" }));

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

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`WINNER 69 demo backend: http://localhost:${port}`);
});
