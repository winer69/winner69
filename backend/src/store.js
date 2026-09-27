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
