// Standalone mode (no VITE_API_URL): the Pok Deng tables run in the browser against the local
// wallet. With a server, pokdengRoutes.js is used instead.
import { PokDengHub, POKDENG_ROOMS } from "../../backend/src/pokdeng/hub.js";

export function createLocalPokDengApi({ username = "you", getBalance, addBalance, getRtp = () => 96 }) {
  const stats = { wagered: 0, payout: 0 };
  const hub = new PokDengHub({
    onCashOut: (u, chips) => addBalance(chips),
    onRoundEnd: (t, results) => results.forEach((r) => { stats.wagered += r.wager; stats.payout += r.payout; }),
    rtp: getRtp,
    realized: () => stats,
  });
  let timer = 0;
  const run = () => { if (!timer) timer = setInterval(() => hub.tick(Date.now()), 200); };
  const fail = (msg) => { throw new Error(msg); };
  return {
    stop() { clearInterval(timer); timer = 0; if (hub.tableOf(username)) { hub.leave(username); for (let k = 0; k < 400 && hub.tableOf(username); k++) hub.tick(Date.now() + k * 1000 + 60000); } },
    async call(path, body = {}) {
      run();
      if (path.endsWith("/join")) {
        const room = POKDENG_ROOMS.find((r) => r.id === body.room) || fail("bad_room");
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
      if (path.endsWith("/bet")) { const r = hub.bet(username, body.amount); if (r.error) fail(r.error); }
      if (path.endsWith("/act")) { const r = hub.act(username, String(body.action || "")); if (r.error) fail(r.error); }
      return hub.view(username);
    },
  };
}
