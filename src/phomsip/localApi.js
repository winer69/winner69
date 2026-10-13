// Standalone mode (no VITE_API_URL): the ผสมสิบ tables run in the browser against the local wallet.
import { PhomSipHub, PHOMSIP_ROOMS } from "../../backend/src/phomsip/hub.js";

export function createLocalPhomSipApi({ username = "you", getBalance, addBalance }) {
  const hub = new PhomSipHub({
    charge: (u, amount) => { if (getBalance() < amount) return false; addBalance(-amount); return true; },
    credit: (u, amount) => addBalance(amount),
  });
  let timer = 0;
  const run = () => { if (!timer) timer = setInterval(() => hub.tick(Date.now()), 200); };
  const fail = (msg) => { throw new Error(msg); };
  return {
    stop() { clearInterval(timer); timer = 0; if (hub.tableOf(username)) hub.leave(username); },
    async call(path, body = {}) {
      run();
      if (path.endsWith("/join")) {
        const room = PHOMSIP_ROOMS.find((r) => r.id === body.room) || fail("bad_room");
        if (getBalance() < room.bet + room.fee) fail("insufficient_balance");
        const out = hub.join(username, { name: username }, room.id);
        if (out.error) fail(out.error);
        return out;
      }
      if (path.endsWith("/leave")) return hub.leave(username);
      if (path.endsWith("/act")) { const r = hub.act(username, body); if (r.error) fail(r.error); return hub.view(username); }
      return fail("bad_path");
    },
    async poll(path) {
      run();
      if (path.endsWith("/rooms")) return { rooms: hub.rooms() };
      return hub.view(username);
    },
  };
}
