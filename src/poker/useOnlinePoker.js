// useOnlinePoker - the browser side of the online poker tables (server: backend/src/poker/hub.js).
// The server decides everything; this hook polls the table, turns each new snapshot into the same
// shape the original single-player hook produced (me at seat 0) and plays the animations/sounds
// that the change between two snapshots calls for.
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Engine from './game/engine.js';
import { PHASES, TIMING } from './game/constants.js';
import { AVATARS } from './utils/avatars.js';
import { audioManager } from './utils/audioManager.js';

let uidCounter = 0;
const uid = () => `${Date.now().toString(36)}-${(uidCounter += 1)}`;
const POLL_MS = 700;

/** rotate the server table so this member sits at index 0 (the bottom seat) */
function localView(v) {
  if (!v || !v.seated) return null;
  const st = v.state;
  const n = st.players.length;
  const you = v.you;
  const shift = you >= 0 ? you : 0;
  const map = (i) => (i >= 0 && n ? (i - shift + n) % n : i);
  const players = st.players.map((_, k) => {
    const p = st.players[(k + shift) % n];
    return { ...p, isHuman: you >= 0 && k === 0, avatar: AVATARS[(p.avatarId || 0) % AVATARS.length], personality: null };
  });
  return {
    ...st,
    players,
    dealerIndex: map(st.dealerIndex),
    smallBlindIndex: map(st.smallBlindIndex),
    bigBlindIndex: map(st.bigBlindIndex),
    currentPlayerIndex: map(st.currentPlayerIndex),
    winners: (st.winners || []).map(map),
  };
}

export default function useOnlinePoker({ api }) {
  const [view, setView] = useState(null); // raw server answer
  const [game, setGame] = useState(() => Engine.createInitialState());
  const [rooms, setRooms] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [dealing, setDealing] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [revealed, setRevealed] = useState([]);
  const [resultStage, setResultStage] = useState('none');
  const [flights, setFlights] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [notice, setNotice] = useState(null);
  const [soundOn, setSoundOnState] = useState(true);

  const prevRef = useRef(null);
  const timers = useRef(new Set());
  const alive = useRef(true);
  const apiRef = useRef(api);
  apiRef.current = api;

  const later = useCallback((fn, ms) => {
    const t = setTimeout(() => { timers.current.delete(t); if (alive.current) fn(); }, ms);
    timers.current.add(t);
    return t;
  }, []);
  useEffect(() => { alive.current = true; return () => { alive.current = false; timers.current.forEach(clearTimeout); }; }, []);

  const play = useCallback((name) => audioManager.play(name), []);
  const setSoundOn = useCallback((value) => { audioManager.setEnabled(value); setSoundOnState(value); }, []);

  const addFlight = useCallback((flight) => {
    const id = uid();
    setFlights((list) => [...list, { id, ...flight }]);
    later(() => setFlights((list) => list.filter((f) => f.id !== id)), TIMING.chipFlight + 450);
  }, [later]);
  const showNotice = useCallback((key, value, tone = 'info') => {
    const id = uid();
    setNotice({ id, key, value, tone });
    later(() => setNotice((x) => (x && x.id === id ? null : x)), 1400);
  }, [later]);
  const sendReaction = useCallback((seatIndex, emoji) => {
    const id = uid();
    setReactions((list) => [...list, { id, seatIndex, emoji, drift: Math.random() * 30 - 15 }]);
    later(() => setReactions((list) => list.filter((r) => r.id !== id)), 2000);
  }, [later]);

  // ---------------------------------------------------------------- snapshot -> animations
  const absorb = useCallback((v) => {
    setView(v);
    const g = localView(v);
    if (!g) { prevRef.current = null; setGame(Engine.createInitialState()); return; }
    const prev = prevRef.current;
    prevRef.current = g;
    setGame(g);
    if (!prev || prev.handNumber !== g.handNumber) {
      // a new hand: deal animation + blinds
      setRevealed([]); setResultStage('none'); setSweeping(false);
      if (g.handNumber && Engine.isBettingPhase(g.gamePhase)) {
        setDealing(true);
        const cards = g.players.reduce((n, p) => n + p.holeCards.length, 0);
        for (let k = 0; k < cards; k++) later(() => play('card_deal'), k * TIMING.dealCardStagger);
        [g.smallBlindIndex, g.bigBlindIndex].forEach((i) => { if (g.players[i]) addFlight({ from: { type: 'seat', index: i }, to: { type: 'bet', index: i }, amount: g.players[i].bet }); });
        later(() => setDealing(false), cards * TIMING.dealCardStagger + 700);
      }
      if (prev) return;
    }
    // bets made since the last snapshot
    const sameStreet = prev.communityCards.length === g.communityCards.length;
    g.players.forEach((p, i) => {
      const q = prev.players.find((x) => x.id === p.id);
      if (!q) return;
      const paid = sameStreet ? p.bet - q.bet : p.totalBet - q.totalBet;
      const acted = p.lastAction && (!q.lastAction || q.lastAction.type !== p.lastAction.type || q.lastAction.amount !== p.lastAction.amount || paid > 0);
      if (paid > 0 && Engine.isBettingPhase(g.gamePhase)) {
        addFlight({ from: { type: 'seat', index: i }, to: { type: 'bet', index: i }, amount: paid, big: p.lastAction?.type === 'allin' });
        later(() => play('chip'), 160);
      }
      if (acted && p.lastAction && !['sb', 'bb', 'out'].includes(p.lastAction.type)) {
        const type = p.lastAction.type;
        play({ fold: 'fold', check: 'check', call: 'call', raise: 'raise', allin: 'raise' }[type] || 'click');
        if (p.isHuman) showNotice(type, type === 'call' ? paid : p.bet, type === 'allin' ? 'allin' : 'info');
        else if (type === 'allin') showNotice('otherAllin', p.name, 'allin');
      }
    });
    if (g.communityCards.length > prev.communityCards.length) {
      const betters = prev.players.map((p, i) => (p.bet > 0 ? i : -1)).filter((i) => i >= 0);
      betters.forEach((i) => addFlight({ from: { type: 'bet', index: i }, to: { type: 'pot' }, amount: prev.players[i].bet }));
      if (betters.length) play('chip');
      setSweeping(true);
      later(() => { setSweeping(false); play('card_flip'); }, 420);
    }
    const ended = (x) => x.gamePhase === PHASES.SHOWDOWN || x.gamePhase === PHASES.HAND_OVER;
    if (ended(g) && !ended(prev)) {
      const n = g.players.length;
      const order = g.gamePhase === PHASES.SHOWDOWN
        ? g.players.map((_, i) => i).filter((i) => !g.players[i].isHuman && g.players[i].showCards)
          .sort((a, b) => ((a - g.dealerIndex + n) % n) - ((b - g.dealerIndex + n) % n))
        : [];
      setResultStage(order.length ? 'reveal' : 'result');
      let t = order.length ? 450 : 250;
      order.forEach((i) => { later(() => { setRevealed((r) => (r.includes(i) ? r : [...r, i])); play('card_flip'); }, t); t += TIMING.showdownReveal; });
      const me = g.players.find((p) => p.isHuman);
      later(() => {
        setResultStage('result');
        g.winners.forEach((i) => addFlight({ from: { type: 'pot' }, to: { type: 'seat', index: i }, amount: g.players[i].winAmount, big: true }));
        if (me && me.isWinner) play('win'); else if (me && !me.folded) play('lose'); else play('chip');
      }, t + 250);
      later(() => setResultStage('done'), t + 250 + TIMING.winOverlay);
    }
  }, [addFlight, later, play, showNotice]);

  // ---------------------------------------------------------------- server calls
  const poll = useCallback(async () => {
    try { const v = await apiRef.current.poll('/api/cards/poker/state'); if (alive.current) { absorb(v); setError(''); } }
    catch (e) { if (alive.current) setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กำลังลองใหม่…'); }
  }, [absorb]);

  useEffect(() => {
    let stop = false, t = 0;
    const loop = async () => { if (stop) return; await poll(); if (!stop) t = setTimeout(loop, document.hidden ? 2500 : POLL_MS); };
    loop();
    return () => { stop = true; clearTimeout(t); };
  }, [poll]);

  const loadRooms = useCallback(async () => {
    try { const r = await apiRef.current.poll('/api/cards/poker/rooms'); setRooms(r.rooms || []); } catch (e) { setRooms([]); }
  }, []);

  const join = useCallback(async (room, buyIn) => {
    audioManager.unlock();
    setBusy(true); setError('');
    try { await apiRef.current.call('/api/cards/poker/join', { room, buyIn }); await poll(); return true; }
    catch (e) { setError(e && e.message === 'insufficient_balance' ? 'เครดิตไม่พอสำหรับซื้อชิปและค่าเข้าโต๊ะ' : 'เข้าโต๊ะไม่สำเร็จ ลองใหม่อีกครั้ง'); return false; }
    finally { setBusy(false); }
  }, [poll]);

  const leave = useCallback(async () => {
    setBusy(true);
    try { await apiRef.current.call('/api/cards/poker/leave', {}); } catch (e) { /* not seated */ }
    finally { setBusy(false); }
    await poll();
  }, [poll]);

  const humanAction = useCallback(async (action, amount) => {
    audioManager.unlock();
    if (dealing) return false;
    try { const v = await apiRef.current.poll('/api/cards/poker/act', { action, amount }); absorb(v); return true; }
    catch (e) { showNotice('error', e && e.message ? e.message : 'error', 'error'); return false; }
  }, [absorb, dealing, showNotice]);

  const legal = Engine.getLegalActions(game, 0);
  const isMe0 = game.players[0] && game.players[0].isHuman;
  const thinkingIndex = Engine.isBettingPhase(game.gamePhase) && !game.awaitingStreet && game.currentPlayerIndex > 0 ? game.currentPlayerIndex : (!isMe0 && Engine.isBettingPhase(game.gamePhase) ? game.currentPlayerIndex : -1);

  return {
    view, game, rooms, error, busy,
    humanIndex: 0,
    legal: isMe0 ? legal : Engine.getLegalActions({ ...game, currentPlayerIndex: -1 }, 0),
    thinkingIndex, dealing, sweeping, revealed, resultStage, flights, reactions, notice,
    soundOn, setSoundOn, sendReaction,
    loadRooms, join, leave, humanAction,
  };
}
