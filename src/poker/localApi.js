// Standalone mode (no VITE_API_URL): the same table logic runs in the browser against the local
// wallet, so the game also works in the offline demo. With a server, pokerRoutes.js is used instead.
import { PokerHub, POKER_ROOMS } from "../../backend/src/poker/hub.js";

export function createLocalPokerApi({ username = "you", getBalance, addBalance }) {
  const hub = new PokerHub({ onCashOut: (u, chips) => addBalance(chips) });
  let timer = 0;
  const run = () => { if (!timer) timer = setInterval(() => hub.tick(Date.now()), 200); };
  const fail = (msg) => { throw new Error(msg); };
  return {
    stop() { clearInterval(timer); timer = 0; const t = hub.tableOf(username); if (t) { hub.leave(username); for (let k = 0; k < 400 && hub.tableOf(username); k++) hub.tick(Date.now() + k * 1000 + 60000); } },
    async call(path, body = {}) {
      run();
      if (path.endsWith("/join")) {
        const room = POKER_ROOMS.find((r) => r.id === body.room) || fail("bad_room");
        const buyIn = Math.floor(Number(body.buyIn));
        if (!(buyIn >= room.min && buyIn <= room.max)) fail("bad_buyin");
        if (buyIn + room.fee > getBalance()) fail("insufficient_balance");
        addBalance(-(buyIn + room.fee));
        const out = hub.join(username, { name: username }, room.id, buyIn);
        if (out.error) { addBalance(buyIn + room.fee); fail(out.error); }
        return out;
      }
      if (path.endsWith("/leave")) return hub.leave(username);
      return fail("bad_path");
    },
    async poll(path, body = {}) {
      run();
      if (path.endsWith("/rooms")) return { rooms: hub.rooms() };
      if (path.endsWith("/act")) { const r = hub.act(username, String(body.action || ""), body.amount); if (r.error) fail(r.error); }
      return hub.view(username);
    },
  };
}
