// Connects the imported games (Inferno 7s, Fruit Canopy, Aloha Totem, Copper Gulch, ยิงปลา) to the
// WINNER 69 wallet. With a server every request goes to /api/games/x/<game>/<action> and the server
// decides the result; without one the very same handler (backend/src/extraGames.js) runs here
// against the local wallet, using the admin RTP.
import { EXTRA_GAMES } from "../backend/src/extraGames.js";

export function makeExtraHost(game, { server, getBalance, getRtp, onBalanceDelta, onRound }) {
  const local = {};          // per-game state in standalone mode (free spins, open shots...)
  let shadow = null;          // local balance incl. changes React has not rendered yet
  const bal = () => (shadow != null ? shadow : getBalance());
  return {
    getBalance: () => Math.round(bal() * 100) / 100,
    syncFromProps(b) { shadow = null; void b; },
    async call(action, body) {
      if (server) {
        const r = await server.call(`/api/games/x/${game}/${action}`, body || {});
        if (r && r.member && typeof r.member.balance === "number") shadow = r.member.balance;
        return r;
      }
      const h = EXTRA_GAMES[game].actions[action];
      const out = h(local, body || {}, {
        rng: Math.random, rtp: getRtp(),
        charge: (a) => { if (a > bal() + 1e-9) return "insufficient_balance"; shadow = Math.round((bal() - a) * 100) / 100; onBalanceDelta(-a); return null; },
      });
      if (out.error) { const e = new Error(out.error); throw e; }
      if (out.payout > 0) { shadow = Math.round((bal() + out.payout) * 100) / 100; onBalanceDelta(out.payout); }
      return out;
    },
    async state() {
      if (!server) return {};
      try { const r = await server.call(`/api/games/x/${game}/state`, {}); return (r && r.state) || {}; } catch (e) { return {}; }
    },
    round(wager, payout) { if (onRound) onRound(wager, payout); },
  };
}
export const errText = (e) => (e && e.message === "insufficient_balance" ? "เครดิตไม่พอ" : "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองใหม่อีกครั้ง");
