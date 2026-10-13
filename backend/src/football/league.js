// WINNER69 Football League 7 on the WINNER 69 wallet.
// The game's own LeagueService (engine.js) runs here - one league for everybody - and every credit
// movement (stake, payout, refund) goes through the member's real WINNER 69 balance via `wallet`.
// Pure JS: footballRoutes.js uses it on the server, the browser uses it when there is no server.
//
// Fairness: match results come from simulateMatch(seed) and the season seed never leaves the
// server; a match's sim input (with its seed) is only sent once the match has kicked off, after
// predictions for it are closed.
import W69 from "./engine.js";

const { LeagueService, ApiError, addDays, epochToBkkDate, computeStandings } = W69;
export { W69, ApiError };

export const FOOTBALL_ADMIN = "winner69";
export const FOOTBALL_STAKES = [20, 50, 100, 200, 500, 1000];
export const MEMBER_METHODS = new Set(["placePrediction", "placeChampionPick"]);
export const ADMIN_METHODS = new Set([
  "adminStartNow", "adminSetSpeed", "adminPause", "adminFinishNow", "adminConfirm", "adminPostpone", "adminMarkPostponed",
  "adminCancel", "adminEditResult", "adminUpdateTeam", "adminAddTeam", "adminUpdatePlayer", "adminCloseSeason",
  "adminUpdateSettings", "createSeason",
]);
const NEXT_SEASON_GAP_MS = 6 * 3600 * 1000; // a closed season stays on show this long, then the next one is drawn

function randomSeed() {
  const c = globalThis.crypto;
  if (c && c.getRandomValues) return Array.from(c.getRandomValues(new Uint8Array(12))).map((b) => b.toString(16).padStart(2, "0")).join("");
  return Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
}
const userIdOf = (username) => "U-" + String(username).toLowerCase();

export class WalletLeague extends LeagueService {
  /**
   * opts.storage { load(), save(state) }
   * opts.wallet  { balance(username) -> number, charge(username, amount, info) -> true|false, credit(username, amount, info) }
   */
  constructor(opts = {}) {
    super({ ...opts, seed: opts.seed || randomSeed(), settings: { stakeOptions: FOOTBALL_STAKES, minStake: FOOTBALL_STAKES[0], maxStake: FOOTBALL_STAKES[FOOTBALL_STAKES.length - 1], ...(opts.settings || {}) } });
    this.wallet = opts.wallet;
    const st = this.state;
    st.admins = { [FOOTBALL_ADMIN]: { passHash: "-", mustChange: false } }; // signs in through the WINNER 69 admin key only
    if (st.season && /^S\d+$/.test(st.season.seed)) st.season.seed = randomSeed(); // never keep a guessable seed
    this.rev = this.rev || 1;
  }
  _save() {
    const st = this.state;
    if (st.ledger.length > 25000) st.ledger = st.ledger.slice(-20000);
    if (st.audit.length > 3000) st.audit = st.audit.slice(-2000);
    if (st.predictions.length > 25000) st.predictions = st.predictions.filter((p) => p.status === "pending").concat(st.predictions.filter((p) => p.status !== "pending").slice(-20000));
    this.rev = (this.rev || 0) + 1; this._pub = null; super._save();
  }

  /** every credit movement is a real wallet movement */
  _tx(userId, type, amount, ref, note) {
    const u = this.state.users[userId];
    if (!u) throw new ApiError("UNAUTH", "กรุณาเข้าสู่ระบบ");
    if (type === "INIT" || type === "RESET") throw new ApiError("FORBIDDEN", "ไม่รองรับในระบบนี้");
    const info = { type, ref, note };
    if (amount < 0) {
      if (!this.wallet || !this.wallet.charge(u.member, -amount, info)) throw new ApiError("INSUFFICIENT", "เครดิตไม่พอ");
    } else if (amount > 0 && this.wallet) this.wallet.credit(u.member, amount, info);
    u.balance = this.wallet ? this.wallet.balance(u.member) : u.balance + amount;
    const tx = { id: W69.uid("TX"), userId, type, amount, balanceAfter: u.balance, ref: ref || null, note: note || "", at: this.now() };
    this.state.ledger.push(tx);
    return tx;
  }
  loginUser() { throw new ApiError("FORBIDDEN", "เข้าเล่นผ่าน WINNER 69"); }
  loginAdmin() { throw new ApiError("FORBIDDEN", "ใช้หน้าแอดมิน WINNER 69"); }
  changeAdminPassword() { throw new ApiError("FORBIDDEN", "ใช้หน้าแอดมิน WINNER 69"); }
  resetCredits() { throw new ApiError("FORBIDDEN", "เครดิตคือยอดในกระเป๋า WINNER 69 รีเซ็ตไม่ได้"); }

  /** the WINNER 69 member as a league user (created on first visit, name follows the display name) */
  member(username, name) {
    const id = userIdOf(username);
    let u = this.state.users[id];
    const display = String(name || username).slice(0, 24);
    if (!u) { u = this.state.users[id] = { id, name: display, member: username, balance: 0, createdAt: this.now() }; this._save(); }
    else if (u.name !== display) { u.name = display; this._save(); }
    u.member = username;
    if (this.wallet) u.balance = this.wallet.balance(username);
    return { role: "user", userId: id };
  }
  adminToken() { return { role: "admin", admin: FOOTBALL_ADMIN }; }

  /** a member action - the token always comes from the logged-in member, never from the request */
  memberAct(username, name, method, args) {
    if (!MEMBER_METHODS.has(method)) throw new ApiError("FORBIDDEN", "ไม่อนุญาต");
    const tok = this.member(username, name);
    const req = { ...(args && args[0] ? args[0] : {}) };
    return this[method](tok, req);
  }
  adminAct(method, args) {
    if (!ADMIN_METHODS.has(method)) throw new ApiError("FORBIDDEN", "ไม่อนุญาต");
    const a = Array.isArray(args) ? args : [];
    if (method === "createSeason") {
      const cfg = a[0] || {};
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(cfg.startDate || ""))) throw new ApiError("BAD_INPUT", "วันที่เริ่มไม่ถูกต้อง");
      return this.createSeason({ startDate: cfg.startDate, seed: randomSeed(), force: !!cfg.force }, FOOTBALL_ADMIN);
    }
    if (method === "adminUpdateSettings") {
      const p = { ...(a[0] || {}) };
      delete p.startingCredits; // there are no starting credits: the wallet is the balance
      return this.adminUpdateSettings(this.adminToken(), p);
    }
    return this[method](this.adminToken(), ...a);
  }

  /** runs every second: matches, settlement, and a new season after the last one is over */
  tick() {
    let changed = super.tick();
    const st = this.state;
    const s = st.season;
    const now = this.now();
    if (s && !s.closed && st.matches.length && st.matches.every((m) => m.status === "confirmed" || m.status === "cancelled")) {
      const table = computeStandings(st.teams.filter((t) => s.teamIds.includes(t.id)), st.matches);
      s.closed = true; s.champion = table[0] ? table[0].teamId : null; s.closedAt = now;
      this._audit("system", "SEASON_CLOSED", { champion: s.champion, points: table[0] ? table[0].points : 0 });
      this.settleChampionship();
      this._save();
      changed = true;
    }
    if (s && s.closed && now - (s.closedAt || 0) >= NEXT_SEASON_GAP_MS) {
      this.createSeason({ startDate: addDays(epochToBkkDate(now), 1), seed: randomSeed() }, "system");
      changed = true;
    }
    return changed;
  }

  _publicPart() {
    if (this._pub && this._pub.rev === this.rev) return this._pub;
    const st = this.state;
    const started = (m) => !!m.run || m.status === "live" || m.status === "finished" || m.status === "confirmed";
    this._pub = {
      rev: this.rev,
      titleProbs: st.season ? this.titleProbabilities() : {},
      season: st.season ? { ...st.season, seed: "" } : null,
      matches: st.matches.map((m) => (started(m) || !m.simInput ? m : { ...m, simInput: undefined })),
      archive: st.archive.map((a) => ({ ...a, season: { ...a.season, seed: "" } })),
    };
    return this._pub;
  }
  /** what one member may see: the league plus only their own predictions and ledger */
  snapshot(username, name) {
    const tok = this.member(username, name);
    const st = this.state;
    const pub = this._publicPart();
    const me = st.users[tok.userId];
    return {
      rev: this.rev, now: this.now(), titleProbs: pub.titleProbs, userId: tok.userId,
      state: {
        v: st.v, settings: st.settings, teams: st.teams, season: pub.season, matches: pub.matches, archive: pub.archive,
        users: { [me.id]: me },
        ledger: st.ledger.filter((t) => t.userId === me.id).slice(-300),
        predictions: st.predictions.filter((p) => p.userId === me.id),
        champPicks: st.champPicks.filter((p) => p.userId === me.id),
        settled: {}, requests: {}, audit: [], admins: {},
      },
    };
  }
  /** the admin sees everything (recent history only, to keep it small) */
  adminSnapshot() {
    const st = this.state;
    return {
      rev: this.rev, now: this.now(), titleProbs: st.season ? this.titleProbabilities() : {}, admin: FOOTBALL_ADMIN,
      state: { ...st, ledger: st.ledger.slice(-500), predictions: st.predictions.slice(-3000), audit: st.audit.slice(-300), settled: {}, requests: {} },
    };
  }
}
