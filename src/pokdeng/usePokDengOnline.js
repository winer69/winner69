// Online version of usePokDeng: the table runs on the server (backend/src/pokdeng/hub.js).
// It returns the same fields PokDengGame's own hook returns, built from server snapshots, and plays
// the deal / pok / win effects that each change between snapshots calls for.
import { useCallback, useEffect, useRef, useState } from "react";
import { SUITS, calculatePokDeng } from "../../backend/src/pokdeng/rules.js";

const PHASE = { IDLE: "IDLE", BETTING: "BETTING", DEALING: "DEALING", PLAYER_TURN: "PLAYER_TURN", DEALER_TURN: "DEALER_TURN", RESULT: "RESULT", RESET: "RESET" };
const POLL_MS = 600;
const DEAL_STEP = 280;
const SUIT = Object.fromEntries(SUITS.map((s) => [s.key, s]));

function toCard(c, uid, faceUp) {
  if (!c || c.hidden) return { id: uid, uid, rank: "", rankValue: 0, suit: "S", symbol: "", red: false, faceUp: false };
  const s = SUIT[c.suit] || SUITS[0];
  return { id: c.id, uid, rank: c.rank, rankValue: c.rankValue, suit: c.suit, symbol: s.symbol, red: s.red, faceUp };
}

export default function usePokDengOnline({ api, fxRef }) {
  const [view, setView] = useState(null);
  const [rooms, setRooms] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [bet, setBetState] = useState(0);
  const [dealt, setDealt] = useState(999);
  const [dealTick, setDealTick] = useState(0);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [history, setHistory] = useState([]);
  const [pokFx, setPokFx] = useState(null);
  const [clock, setClock] = useState(0);

  const alive = useRef(true);
  const apiRef = useRef(api); apiRef.current = api;
  const prev = useRef(null);
  const once = useRef(new Set());
  const timers = useRef(new Set());
  const later = (ms, fn) => { const t = setTimeout(() => { timers.current.delete(t); if (alive.current) fn(); }, ms); timers.current.add(t); };
  const fx = (name, ...args) => { const f = fxRef && fxRef.current && fxRef.current[name]; if (typeof f === "function") { try { f(...args); } catch (e) { /* effects never break the game */ } } };
  useEffect(() => { alive.current = true; return () => { alive.current = false; timers.current.forEach(clearTimeout); }; }, []);
  useEffect(() => { const id = setInterval(() => setClock((c) => c + 1), 250); return () => clearInterval(id); }, []);

  const absorb = useCallback((v) => {
    const p = prev.current;
    if (v) v._at = Date.now();
    prev.current = v;
    setView(v);
    if (!v || !v.seated) return;
    const me = v.you >= 0 ? v.seats[v.you] : null;
    if (me && !bet) setBetState((b) => b || v.room.chips[0]);
    if (!p || !p.seated || p.round !== v.round) { once.current = new Set(); setResult(null); setShowResult(false); }
    // deal animation: count cards out one by one
    if (v.phase === "dealing" && (!p || p.phase !== "dealing" || p.round !== v.round)) {
      const total = (v.seats.filter((s) => s.hand.length).length + 1) * 2;
      setDealt(0);
      for (let k = 1; k <= total; k++) later(k * DEAL_STEP, () => { setDealt(k); setDealTick((x) => x + 1); fx("play", "card_deal"); });
    } else if (v.phase !== "dealing" && (!p || p.phase === "dealing" || p.round !== v.round)) setDealt(999);
    if (p && p.round === v.round) {
      // a 3rd card dealt
      const cards = (x) => x.seats.reduce((n, s) => n + s.hand.length, 0) + x.dealer.hand.length;
      if (cards(v) > cards(p) && v.phase !== "dealing") { setDealTick((x) => x + 1); fx("play", "card_deal"); }
      const flips = v.seats.some((s, i) => s.hand.some((c, k) => c.up && p.seats[i] && p.seats[i].hand[k] && !p.seats[i].hand[k].up)) || (v.dealer.revealed && !p.dealer.revealed);
      if (flips) fx("play", "card_flip");
    }
    // poks
    const key = (k) => `${v.round}-${k}`;
    if (me && me.hand.length === 2 && me.hand.every((c) => c.up) && v.phase !== "dealing" && !once.current.has(key("mypok"))) {
      const ev = calculatePokDeng(me.hand);
      once.current.add(key("mypok"));
      if (ev.isPok) { setPokFx({ key: key("p"), who: "player", label: ev.badge, tag: ev.tag }); fx("play", "pok"); fx("pok", "player"); later(1700, () => setPokFx(null)); }
    }
    if (v.dealer.revealed && v.dealer.hand.length === 2 && !once.current.has(key("dpok"))) {
      once.current.add(key("dpok"));
      const ev = calculatePokDeng(v.dealer.hand);
      if (ev.isPok) { setPokFx({ key: key("d"), who: "dealer", label: ev.badge, tag: ev.tag }); fx("play", "pok"); fx("pok", "dealer"); later(1700, () => setPokFx(null)); }
    }
    const others = v.seats.filter((_, i) => i !== v.you);
    others.forEach((s, i) => {
      if (s.hand.length === 2 && s.hand.every((c) => c.up) && v.phase !== "result" && !once.current.has(key("bp" + s.id))) {
        once.current.add(key("bp" + s.id));
        if (calculatePokDeng(s.hand).isPok) fx("botPok", i);
      }
    });
    // result
    if (v.phase === "result" && !once.current.has(key("res"))) {
      once.current.add(key("res"));
      if (me && me.result) {
        const r = me.result;
        const playerEval = calculatePokDeng(me.hand), dealerEval = calculatePokDeng(v.dealer.hand);
        const bots = others.filter((s) => s.result).map((s) => ({ ...s.result, eval: calculatePokDeng(s.hand) }));
        setResult({ ...r, bet: me.bet, playerEval, dealerEval, bots, round: v.round, balanceAfter: me.stack });
        setHistory((h) => [{ id: v.round, outcome: r.outcome }, ...h].slice(0, 14));
        if (r.outcome === "WIN") { fx("play", "win"); if (r.multiplier > 1) later(420, () => fx("play", "deng")); fx("celebrate", r.multiplier > 1); fx("coins"); }
        else if (r.outcome === "LOSE") fx("play", "lose");
        else { fx("play", "chip_click"); fx("draw"); }
        later(1200, () => setShowResult(true));
      }
      fx("botsSettled", []);
    }
  }, [bet]); // eslint-disable-line react-hooks/exhaustive-deps

  const poll = useCallback(async () => {
    try { const v = await apiRef.current.poll("/api/cards/pokdeng/state"); if (alive.current) { absorb(v); setError(""); } }
    catch (e) { if (alive.current) setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กำลังลองใหม่…"); }
  }, [absorb]);
  useEffect(() => {
    let stop = false, t = 0;
    const loop = async () => { if (stop) return; await poll(); if (!stop) t = setTimeout(loop, document.hidden ? 2500 : POLL_MS); };
    loop();
    return () => { stop = true; clearTimeout(t); };
  }, [poll]);

  const loadRooms = useCallback(async () => { try { const r = await apiRef.current.poll("/api/cards/pokdeng/rooms"); setRooms(r.rooms || []); } catch (e) { setRooms([]); } }, []);
  const join = useCallback(async (room, buyIn) => {
    setBusy(true); setError("");
    try { await apiRef.current.call("/api/cards/pokdeng/join", { room, buyIn }); await poll(); return true; }
    catch (e) { setError(e && e.message === "insufficient_balance" ? "เครดิตไม่พอสำหรับซื้อชิปและค่าเข้าโต๊ะ" : "เข้าโต๊ะไม่สำเร็จ ลองใหม่อีกครั้ง"); return false; }
    finally { setBusy(false); }
  }, [poll]);
  const leave = useCallback(async () => {
    setBusy(true);
    try { await apiRef.current.call("/api/cards/pokdeng/leave", {}); } catch (e) { /* not seated */ }
    finally { setBusy(false); }
    await poll();
  }, [poll]);

  // ---------------------------------------------------------------- the PokDengGame interface
  const v = view && view.seated ? view : null;
  const me = v && v.you >= 0 ? v.seats[v.you] : null;
  const room = v ? v.room : null;
  void clock; // re-render 4x a second for the countdowns
  const msLeft = v ? Math.max(0, v.msLeft - (Date.now() - (v._at || Date.now()))) : 0;
  const secs = Math.ceil(msLeft / 1000);
  const order = v ? v.seats.map((s, i) => (s.hand.length ? i : -1)).filter((i) => i >= 0) : [];
  const dealPos = (seatIdx, k) => (k >= 2 ? -1 : k * (order.length + 1) + order.indexOf(seatIdx));
  const shown = (seatIdx, cards, prefix, mine) => cards
    .map((c, k) => ({ c, k }))
    .filter(({ k }) => !(v.phase === "dealing" && dealt < 999 && dealPos(seatIdx, k) >= dealt))
    .map(({ c, k }) => toCard(c, `${v.round}-${prefix}-${k}`, mine ? !(v.phase === "dealing") && c.up : !!c.up));
  const dealerCards = v ? v.dealer.hand
    .map((c, k) => ({ c, k }))
    .filter(({ k }) => !(v.phase === "dealing" && dealt < 999 && k < 2 && k * (order.length + 1) + order.length >= dealt))
    .map(({ c, k }) => toCard(c, `${v.round}-dealer-${k}`, !!c.up)) : [];
  const othersIdx = v ? v.seats.map((_, i) => i).filter((i) => i !== v.you) : [];

  let gameState = PHASE.IDLE;
  if (v) {
    if (v.phase === "betting") gameState = me && me.bet > 0 ? PHASE.DEALER_TURN : PHASE.BETTING;
    else if (v.phase === "dealing") gameState = PHASE.DEALING;
    else if (v.phase === "turns") gameState = v.myTurn ? PHASE.PLAYER_TURN : PHASE.DEALER_TURN;
    else if (v.phase === "dealer") gameState = PHASE.DEALER_TURN;
    else if (v.phase === "result") gameState = PHASE.RESULT;
    if (!me && v.phase !== "result") gameState = PHASE.DEALER_TURN;
  }
  let message = v ? v.message : "";
  if (v && v.waiting) message = "รอที่นั่ง — จะได้ลงเล่นรอบถัดไป";
  else if (v && v.phase === "betting") message = me && me.bet > 0 ? `วางเดิมพันแล้ว · แจกไพ่ใน ${secs} วินาที` : `วางเดิมพันภายใน ${secs} วินาที`;
  else if (v && v.myTurn) message = `ตาคุณ · ${secs} วินาที`;
  else if (v && v.phase === "result") message = `รอบใหม่ใน ${secs} วินาที`;

  const stack = me ? me.stack : v && v.chipsWaiting != null ? v.chipsWaiting : 0;
  const levels = room ? room.chips : [10];
  const place = async () => {
    if (!v || v.phase !== "betting" || !me || me.bet > 0) return false;
    fx("play", "button_click");
    try { const r = await apiRef.current.poll("/api/cards/pokdeng/bet", { amount: bet }); absorb(r); return true; }
    catch (e) { setError(e && e.message === "insufficient_chips" ? "ชิปไม่พอ" : "วางเดิมพันไม่สำเร็จ"); return false; }
  };
  const playerAction = async (action) => {
    fx("play", "button_click");
    try { const r = await apiRef.current.poll("/api/cards/pokdeng/act", { action }); absorb(r); }
    catch (e) { /* turn already over */ }
  };

  return {
    // table
    view, rooms, error, busy, loadRooms, join, leave, room, waiting: !!(v && v.waiting), seated: !!v,
    others: othersIdx.map((i) => v.seats[i]),
    // usePokDeng interface
    gameState,
    playerHand: me && v ? shown(v.you, me.hand, "me", true) : [],
    dealerHand: dealerCards,
    botHands: othersIdx.map((i) => (v.seats[i].hand.length ? shown(i, v.seats[i].hand, v.seats[i].id, false) : [])),
    botBets: othersIdx.map((i) => v.seats[i].bet),
    botResults: othersIdx.map((i) => (v.phase === "result" ? v.seats[i].result : null)),
    activeBot: v && v.phase === "turns" && v.turn >= 0 && v.turn !== v.you ? othersIdx.indexOf(v.turn) : -1,
    deckCount: v ? v.deckCount : 52,
    bet,
    lockedBet: me ? me.bet : 0,
    balance: stack,
    result,
    multiplier: result ? result.multiplier : 1,
    showResult,
    history,
    message,
    pokFx,
    dealTick,
    round: v ? v.round : 0,
    canStart: !!(v && v.phase === "betting" && me && !me.bet && bet > 0 && bet <= stack),
    secondsLeft: secs,
    startRound: place,
    playerAction,
    playAgain: () => setShowResult(false),
    setBet: (x) => { if (x <= stack) { setBetState(x); fx("play", "chip_click"); } },
    stepBet: (dir) => {
      const opts = levels.filter((l) => l <= stack);
      if (!opts.length) return;
      const next = dir > 0 ? opts.find((l) => l > bet) ?? opts[opts.length - 1] : [...opts].reverse().find((l) => l < bet) ?? opts[0];
      setBetState(next); fx("play", "chip_click");
    },
    resetCredits: () => {},
    getBalance: () => stack,
  };
}
