import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const file = path.resolve(process.env.DB_FILE || "./data/db.json");
const dir = path.dirname(file);

function ensure() {
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({
      users: [],
      rounds: [],
      withdrawals: [],
      deposits: [],
      members: [],
      meta: { memberSeq: 0 },
      audit: []
    }, null, 2));
  }
}
ensure();

export function readDb() {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function writeDb(db) {
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
}

export function id() {
  return crypto.randomUUID();
}

export function now() {
  return new Date().toISOString();
}

export function audit(db, action, actor, details = {}) {
  db.audit.push({ id: id(), at: now(), action, actor, details });
}

// Slip photos live in their own files (next to db.json) so db.json stays small -
// it is read on every member sync.
const slipDir = path.join(dir, "slips");
function slipPath(id) {
  return path.join(slipDir, String(id).replace(/[^A-Za-z0-9_-]/g, "_") + ".txt");
}
export function saveSlip(id, dataUrl) {
  if (!dataUrl) return false;
  fs.mkdirSync(slipDir, { recursive: true });
  fs.writeFileSync(slipPath(id), dataUrl);
  return true;
}
export function loadSlip(id) {
  try { return fs.readFileSync(slipPath(id), "utf8"); } catch { return ""; }
}
export function deleteSlip(id) {
  try { fs.unlinkSync(slipPath(id)); } catch {}
}
