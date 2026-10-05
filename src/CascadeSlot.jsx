// Cascade slot - PG-style vertical "ways + tumble" slot used by every themed slot game
// (มังกรทองนำโชค, ขุมทรัพย์ราชันย์, 777 คลาสสิก, ป่ามรกต). Rules/paytables live in
// backend/src/slotThemes.js (shared with the server); art lives in ./slotArt.jsx.
//
//  <CascadeSlot
//    gameId="goldendragon"              // key of CASCADE_GAMES / SLOT_THEMES
//    balance={balance}                  // live wallet balance (number)
//    winRate={edges[game.edge]}         // admin RTP %, used only when there is no server
//    server={server}                    // optional { call(path, body) } - the backend decides spins
//    onBalanceDelta={(d) => ...}        // standalone mode only: -bet on spin, +win at the end
//    onRound={(wager, payout) => ...}   // once per spin (wager 0 for free spins)
//    onBigWin={(x) => ...}              // Big/Mega/Super win hook
//    muted={muted}
//  />
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CASCADE_GAMES } from "../backend/src/slotThemes.js";
import { winTier } from "../backend/src/cascadeSlot.js";
import { SymbolDefs, SLOT_THEMES } from "./slotArt.jsx";

const BETS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
const AUTO_OPTIONS = [10, 30, 50, 100];
const fmt = (n) => Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- tiny synth
function useSfx(muted) {
  const ctxRef = useRef(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  return useCallback((kind) => {
    if (mutedRef.current) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = ctxRef.current || (ctxRef.current = new AC());
      if (ctx.state === "suspended") ctx.resume();
      const t0 = ctx.currentTime;
      const tone = (freq, start, dur, type = "triangle", vol = 0.08) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t0 + start);
        g.gain.setValueAtTime(0.0001, t0 + start); g.gain.exponentialRampToValueAtTime(vol, t0 + start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
        o.connect(g).connect(ctx.destination); o.start(t0 + start); o.stop(t0 + start + dur + 0.02);
      };
      if (kind === "spin") { tone(220, 0, 0.12, "square", 0.04); tone(330, 0.05, 0.1, "square", 0.03); }
      else if (kind === "land") tone(140, 0, 0.08, "sine", 0.06);
      else if (kind === "win") [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.22));
      else if (kind === "boom") { tone(90, 0, 0.25, "sawtooth", 0.05); tone(880, 0, 0.1, "triangle", 0.04); }
      else if (kind === "big") [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.35, "triangle", 0.09));
      else if (kind === "scatter") [660, 880, 1320].forEach((f, i) => tone(f, i * 0.1, 0.3, "sine", 0.08));
    } catch (e) { /* audio is optional */ }
  }, []);
}

// ---------------------------------------------------------------- component
const randomGrid = (game) => Array.from({ length: game.reels }, () => Array.from({ length: game.rows }, () => {
  const ids = game.paying;
  return ids[Math.floor(Math.random() * ids.length)];
}));
const TIER_LABEL = { big: "BIG WIN", mega: "MEGA WIN", super: "SUPER MEGA WIN" };
const TIER_TH = { big: "ชนะใหญ่", mega: "ชนะมหาศาล", super: "ชนะสุดยอด" };

export default function CascadeSlot({ gameId = "goldendragon", balance = 0, winRate = 96.5, server, onBalanceDelta, onRound, onBigWin, muted }) {
  const game = CASCADE_GAMES[gameId];
  const theme = SLOT_THEMES[gameId];
  const Sym = theme.Sym;
  const ROWS = game.rows;
  const sfx = useSfx(muted);
  const [view, setView] = useState(() => ({ grid: randomGrid(game), anim: null, key: 0, win: null, boom: null }));
  const [betIdx, setBetIdx] = useState(3);
  const [busy, setBusy] = useState(false);
  const [multIdx, setMultIdx] = useState(0);
  const [free, setFree] = useState({ left: 0, total: 0, win: 0, active: false, bet: 0 });
  const [spinWin, setSpinWin] = useState(0);
  const [winInfo, setWinInfo] = useState(null);
  const [overlay, setOverlay] = useState(null);
  const [turbo, setTurbo] = useState(false);
  const [autoLeft, setAutoLeft] = useState(0);
  const [autoMenu, setAutoMenu] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [msg, setMsg] = useState("");

  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const s = useRef({});
  s.current = { balance, betIdx, free, turbo, autoLeft, busy, server, winRate, onBalanceDelta, onRound, onBigWin };
  const overlayResolve = useRef(null);
  const T = (ms) => (s.current.turbo ? ms * 0.45 : ms);
  const bet = free.active ? free.bet : BETS[betIdx];
  const ladder = free.active ? game.mults.free : game.mults.base;
  const maxIdx = ladder.length - 1;

  // resume free spins the server still owes this member
  useEffect(() => {
    if (!server) return;
    server.call(`/api/games/cascade/${gameId}/state`, {}).then((r) => {
      if (alive.current && r && r.freeSpinsLeft > 0) setFree({ left: r.freeSpinsLeft, total: r.freeSpinsLeft, win: 0, active: true, bet: r.bet });
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const waitOverlay = (o, autoMs) => new Promise((resolve) => {
    setOverlay(o);
    let done = false;
    const finish = () => { if (done) return; done = true; overlayResolve.current = null; if (alive.current) setOverlay(null); resolve(); };
    overlayResolve.current = finish;
    if (autoMs) setTimeout(finish, autoMs);
  });

  // ---- one spin, start to finish
  const spin = useCallback(async () => {
    const st = s.current;
    if (st.busy) return false;
    const isFree = st.free.active && st.free.left > 0;
    const stake = isFree ? st.free.bet : BETS[st.betIdx];
    if (!isFree && stake > st.balance) { setMsg("เครดิตไม่พอ ลดเดิมพันหรือฝากเงินก่อน"); setAutoLeft(0); return false; }
    setMsg(""); setBusy(true); setWinInfo(null); setSpinWin(0); setMultIdx(0);
    sfx("spin");
    setView((v) => ({ ...v, anim: "out", key: v.key + 1, win: null, boom: null }));

    let result;
    try {
      if (st.server) {
        const r = await st.server.call(`/api/games/cascade/${gameId}/spin`, { bet: stake });
        result = r.result;
        if (r.isFree !== isFree) { /* server is the source of truth for free spins */ }
        setFree((f) => ({ ...f, left: r.freeSpinsLeft, active: r.isFree || r.freeSpinsLeft > 0, bet: r.isFree ? r.bet : (r.freeSpinsLeft > 0 ? r.bet : f.bet) }));
      } else {
        result = game.play(Math.random, stake, st.winRate, isFree);
        if (!isFree && st.onBalanceDelta) st.onBalanceDelta(-stake);
        if (isFree) setFree((f) => ({ ...f, left: f.left - 1 }));
      }
    } catch (e) {
      setMsg(e && e.message === "insufficient_balance" ? "เครดิตไม่พอ" : "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองใหม่อีกครั้ง");
      setBusy(false); setAutoLeft(0);
      setView((v) => ({ ...v, anim: "drop", key: v.key + 1 }));
      return false;
    }
    await sleep(T(220));
    if (!alive.current) return false;

    // drop the first screen in
    setView((v) => ({ grid: result.steps[0].grid, anim: "drop", key: v.key + 1, win: null, boom: null }));
    await sleep(T(650));
    sfx("land");

    let running = 0;
    for (let i = 0; i < result.steps.length; i++) {
      const step = result.steps[i];
      if (!step.wins.length || !alive.current) break;
      setMultIdx(Math.min(i, game.mults.base.length - 1));
      const cells = new Set(step.wins.flatMap((w) => w.cells.map(([r, row]) => r + ":" + row)));
      running = Math.round((running + step.pay) * 100) / 100;
      const best = step.wins.reduce((a, w) => (w.pay > a.pay ? w : a), step.wins[0]);
      setWinInfo({ sym: best.sym, ways: best.ways, reels: best.reels, count: step.wins.length, mult: step.mult, pay: step.pay });
      setSpinWin(Math.min(running, result.total || running));
      setView((v) => ({ ...v, anim: null, win: cells, boom: null }));
      sfx("win");
      await sleep(T(900));
      setView((v) => ({ ...v, win: null, boom: cells }));
      sfx("boom");
      await sleep(T(330));
      const next = result.steps[i + 1];
      if (!next) break;
      // compute how far each surviving symbol falls + new ones from the top
      const fall = step.grid.map((reel, r) => {
        const removed = reel.map((_, row) => cells.has(r + ":" + row));
        const nRemoved = removed.filter(Boolean).length;
        const out = [];
        let newRow = ROWS - 1;
        for (let row = ROWS - 1; row >= 0; row--) if (!removed[row]) { out[newRow] = newRow - row; newRow--; }
        for (let row = 0; row < nRemoved; row++) out[row] = nRemoved + 0.3;
        return out;
      });
      setMultIdx(Math.min(i + 1, game.mults.base.length - 1));
      setView((v) => ({ grid: next.grid, anim: "fall", fall, key: v.key + 1, win: null, boom: null }));
      await sleep(T(480));
      sfx("land");
    }

    const total = result.total;
    setSpinWin(total);
    const wager = isFree ? 0 : stake;
    const tier = winTier(total, stake);
    if (tier) {
      sfx("big");
      if (st.onBigWin) st.onBigWin(total / stake);
      await waitOverlay({ type: "big", tier, amount: total }, s.current.autoLeft > 0 || isFree ? 5200 : 0);
    }
    if (!st.server && total > 0 && st.onBalanceDelta) st.onBalanceDelta(total);
    if (st.onRound) st.onRound(wager, total);

    if (isFree) setFree((f) => ({ ...f, win: Math.round((f.win + total) * 100) / 100 }));
    if (result.freeSpins > 0) {
      sfx("scatter");
      const scat = new Set();
      result.steps[result.steps.length - 1].grid.forEach((reel, r) => reel.forEach((sym, row) => { if (sym === "SCATTER") scat.add(r + ":" + row); }));
      setView((v) => ({ ...v, anim: null, win: scat }));
      await sleep(T(900));
      await waitOverlay({ type: "fsIntro", count: result.freeSpins, retrigger: isFree }, 6000);
      setFree((f) => (st.server
        ? { ...f, active: true, total: (isFree ? f.total : 0) + result.freeSpins, win: isFree ? f.win : 0 }
        : { left: f.left + result.freeSpins, total: (isFree ? f.total : 0) + result.freeSpins, win: isFree ? f.win : 0, active: true, bet: stake }));
    }
    setBusy(false);
    return true;
  }, [sfx]); // eslint-disable-line react-hooks/exhaustive-deps

  // free spins play themselves; auto spin keeps going while it has spins left
  useEffect(() => {
    if (busy || overlay) return undefined;
    if (free.active && free.left > 0) {
      const t = setTimeout(() => spin(), T(700));
      return () => clearTimeout(t);
    }
    if (free.active && free.left <= 0) {
      const won = free.win;
      (async () => {
        await waitOverlay({ type: "fsOutro", amount: won, spins: free.total }, 7000);
        setFree({ left: 0, total: 0, win: 0, active: false, bet: 0 });
      })();
      return undefined;
    }
    if (autoLeft > 0) {
      const t = setTimeout(async () => { const ok = await spin(); if (ok) setAutoLeft((a) => Math.max(0, a - 1)); }, T(450));
      return () => clearTimeout(t);
    }
    return undefined;
  }, [busy, overlay, free.active, free.left, autoLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  // space / enter = spin
  useEffect(() => {
    const onKey = (e) => {
      if ((e.code === "Space" || e.key === "Enter") && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName || "")) { e.preventDefault(); if (!free.active) spin(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spin, free.active]);

  const canChangeBet = !busy && !free.active && autoLeft === 0;
  const tierOf = (sym) => (game.names[sym] || sym);

  return (
    <div className={`gd-root${free.active ? " gd-free" : ""}${turbo ? " gd-turbo" : ""}${theme.lightReels ? " gd-light" : ""}`} style={{ ...theme.look, "--reels": game.reels }}>
      <CSStyle />
      <SymbolDefs />

      <div className="gd-head">
        <div className="gd-title">
          <span className="gd-title-th">{theme.titleTh}</span>
          <span className="gd-title-en">{theme.titleEn} · {Math.pow(game.rows, game.reels).toLocaleString("en-US")} WAYS</span>
        </div>
        <div className="gd-ladder" style={{ gridTemplateColumns: `repeat(${ladder.length},1fr)` }}>
          {ladder.map((m, i) => <div key={i} className={`gd-mult${i === multIdx && busy ? " on" : ""}${i === multIdx && !busy && i === 0 ? " on idle" : ""}`}>x{m}</div>)}
        </div>
        {free.active && <div className="gd-free-banner">ฟรีสปิน <b>{Math.max(0, free.left)}</b> / {free.total || free.left} · ชนะรวม <b>{fmt(free.win)}</b></div>}
      </div>

      <div className="gd-frame">
        <div className="gd-reels">
          {view.grid.map((reel, r) => (
            <div className="gd-reel" key={r}>
              {reel.map((sym, row) => {
                const id = r + ":" + row;
                const cls = ["gd-cell"];
                let style;
                if (view.anim === "out") cls.push("out");
                if (view.anim === "drop") { cls.push("drop"); style = { "--d": ROWS + 0.4, "--delay": `${r * 70 + (ROWS - row) * 22}ms` }; }
                if (view.anim === "fall" && view.fall && view.fall[r][row] > 0) { cls.push("drop"); style = { "--d": view.fall[r][row], "--delay": `${r * 25}ms` }; }
                if (view.win && view.win.has(id)) cls.push("win");
                if (view.boom && view.boom.has(id)) cls.push("boom");
                if (sym === "WILD" || sym === "SCATTER") cls.push("special");
                return (
                  <div className={cls.join(" ")} style={style} key={`${view.key}-${id}`}>
                    <Sym id={sym} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="gd-wininfo">
        {winInfo ? (
          <span><Sym id={winInfo.sym} /> {tierOf(winInfo.sym)} {winInfo.reels} รีล × {winInfo.ways} ทาง{winInfo.count > 1 ? ` (+${winInfo.count - 1})` : ""} · x{winInfo.mult} = <b>{fmt(winInfo.pay)}</b></span>
        ) : msg ? <span className="gd-msg">{msg}</span> : (
          <span className="gd-hint">{free.active ? "ฟรีสปินกำลังเล่นอัตโนมัติ…" : "สัญลักษณ์เรียงจากซ้ายติดกัน 3 รีลขึ้นไป · ชนะแล้วหล่นต่อ ตัวคูณเพิ่มขึ้น"}</span>
        )}
      </div>

      <div className="gd-panel">
        <div className="gd-stats">
          <div className="gd-stat"><span>เครดิต</span><b>{fmt(balance)}</b></div>
          <div className="gd-stat gd-stat-bet">
            <span>เดิมพัน</span>
            <div className="gd-bet">
              <button aria-label="ลดเดิมพัน" disabled={!canChangeBet || betIdx === 0} onClick={() => setBetIdx((i) => Math.max(0, i - 1))}>−</button>
              <b>{fmt(bet)}</b>
              <button aria-label="เพิ่มเดิมพัน" disabled={!canChangeBet || betIdx === BETS.length - 1} onClick={() => setBetIdx((i) => Math.min(BETS.length - 1, i + 1))}>+</button>
            </div>
          </div>
          <div className="gd-stat"><span>ชนะ</span><b className={spinWin > 0 ? "gd-pos" : ""}>{fmt(spinWin)}</b></div>
        </div>

        <div className="gd-controls">
          <button className={`gd-round${turbo ? " on" : ""}`} onClick={() => setTurbo((t) => !t)} aria-label="เทอร์โบ"><span>⚡</span><small>เทอร์โบ</small></button>
          <button className="gd-round" onClick={() => setShowInfo(true)} aria-label="อัตราจ่าย"><span>☰</span><small>อัตราจ่าย</small></button>
          <button className={`gd-spin${busy ? " busy" : ""}`} disabled={free.active || (busy && autoLeft === 0)} aria-label="หมุน"
            onClick={() => { if (autoLeft > 0) { setAutoLeft(0); return; } spin(); }}>
            {autoLeft > 0 ? <span className="gd-spin-auto">{autoLeft}<small>หยุด</small></span> : <svg viewBox="0 0 64 64" width="44" height="44"><path d="M32 10a22 22 0 1 1-19.5 11.8" fill="none" stroke="#3a1d00" strokeWidth="6" strokeLinecap="round" /><path d="M8 12l5 11 11-4" fill="none" stroke="#3a1d00" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </button>
          <div style={{ position: "relative" }}>
            <button className={`gd-round${autoLeft > 0 ? " on" : ""}`} disabled={free.active} onClick={() => (autoLeft > 0 ? setAutoLeft(0) : setAutoMenu((o) => !o))} aria-label="ออโต้"><span>⟳</span><small>{autoLeft > 0 ? "หยุดออโต้" : "ออโต้"}</small></button>
            {autoMenu && (
              <div className="gd-automenu">
                {AUTO_OPTIONS.map((n) => <button key={n} onClick={() => { setAutoMenu(false); setAutoLeft(n); }}>{n} ครั้ง</button>)}
              </div>
            )}
          </div>
          <button className="gd-round" disabled={!canChangeBet} onClick={() => setBetIdx(BETS.length - 1 > betIdx ? Math.min(BETS.length - 1, betIdx + 2) : 0)} aria-label="เปลี่ยนเดิมพันเร็ว"><span>🪙</span><small>เดิมพัน</small></button>
        </div>
      </div>

      {overlay && overlay.type === "big" && <BigWin Sym={Sym} symId={theme.bigSym} tier={overlay.tier} amount={overlay.amount} onDone={() => overlayResolve.current && overlayResolve.current()} />}
      {overlay && overlay.type === "fsIntro" && (
        <div className="gd-overlay" onClick={() => overlayResolve.current && overlayResolve.current()}>
          <div className="gd-rays" />
          <div className="gd-ov-card">
            <div className="gd-ov-sym"><Sym id="SCATTER" /></div>
            <div className="gd-ov-title">{overlay.retrigger ? "ได้ฟรีสปินเพิ่ม!" : "ฟรีสปิน"}</div>
            <div className="gd-ov-num">{overlay.count}</div>
            <div className="gd-ov-sub">ตัวคูณในฟรีสปิน {game.mults.free.map((m) => "x" + m).join(" → ")}</div>
            <button className="gd-ov-btn">เริ่มเลย</button>
          </div>
        </div>
      )}
      {overlay && overlay.type === "fsOutro" && (
        <div className="gd-overlay" onClick={() => overlayResolve.current && overlayResolve.current()}>
          <div className="gd-rays" />
          <div className="gd-ov-card">
            <div className="gd-ov-title">สรุปฟรีสปิน</div>
            <div className="gd-ov-sub">{overlay.spins} ครั้ง ชนะรวม</div>
            <div className="gd-ov-num gd-ov-money">{fmt(overlay.amount)}</div>
            <button className="gd-ov-btn">รับรางวัล</button>
          </div>
        </div>
      )}
      {showInfo && <Paytable game={game} Sym={Sym} bet={BETS[betIdx]} onClose={() => setShowInfo(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------- big win scene
function BigWin({ Sym, symId, tier, amount, onDone }) {
  const [shown, setShown] = useState(0);
  const [finished, setFinished] = useState(false);
  const raf = useRef(0);
  useEffect(() => {
    const dur = tier === "super" ? 4200 : tier === "mega" ? 3400 : 2600;
    const start = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      setShown(amount * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(step); else setFinished(true);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [amount, tier]);
  const coins = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ i, left: Math.random() * 100, delay: Math.random() * 1.6, dur: 1.6 + Math.random() * 1.4, size: 14 + Math.random() * 16 })), []);
  const click = () => { if (!finished) { cancelAnimationFrame(raf.current); setShown(amount); setFinished(true); } else onDone(); };
  return (
    <div className={`gd-overlay gd-big tier-${tier}`} onClick={click}>
      <div className="gd-rays" />
      {coins.map((c) => <span key={c.i} className="gd-coin" style={{ left: `${c.left}%`, width: c.size, height: c.size, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }} />)}
      <div className="gd-big-inner">
        <div className="gd-big-sym"><Sym id={symId} /></div>
        <div className="gd-big-label">{TIER_LABEL[tier]}</div>
        <div className="gd-big-th">{TIER_TH[tier]}</div>
        <div className="gd-big-amount">{fmt(shown)}</div>
        <div className="gd-big-tap">{finished ? "แตะเพื่อเล่นต่อ" : "แตะเพื่อข้าม"}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- paytable
function Paytable({ game, Sym, bet, onClose }) {
  const rows = game.paying;
  const counts = Array.from({ length: game.reels - 2 }, (_, k) => game.reels - k); // e.g. [5,4,3]
  const ways = Math.pow(game.rows, game.reels).toLocaleString("th-TH");
  const wildReels = game.wildReels.map((r) => r + 1).join(", ");
  return (
    <div className="gd-overlay gd-info" onClick={onClose}>
      <div className="gd-info-card" onClick={(e) => e.stopPropagation()}>
        <div className="gd-info-head"><b>อัตราจ่าย</b><span>เดิมพัน {fmt(bet)} · ต่อ 1 ทาง</span><button onClick={onClose} aria-label="ปิด">✕</button></div>
        <div className="gd-info-grid">
          {rows.map((id) => (
            <div className="gd-pay" key={id}>
              <div className="gd-pay-sym"><Sym id={id} /></div>
              <div className="gd-pay-vals">
                {counts.map((n) => <div key={n}><span>{n}</span><b>{fmt(bet * game.paytable[id][n - 3])}</b></div>)}
              </div>
            </div>
          ))}
        </div>
        <div className="gd-info-special">
          <div className="gd-pay-sym"><Sym id="WILD" /></div>
          <p><b>{game.names.WILD}</b> ออกเฉพาะรีล {wildReels} แทนสัญลักษณ์ได้ทุกตัว ยกเว้น SCATTER</p>
        </div>
        <div className="gd-info-special">
          <div className="gd-pay-sym"><Sym id="SCATTER" /></div>
          <p><b>{game.names.SCATTER}</b> 3 / 4 / 5 ตัวขึ้นไปที่ไหนก็ได้ = ฟรีสปิน {game.freeSpins[3]} / {game.freeSpins[4]} / {game.freeSpins[5]} ครั้ง (ได้เพิ่มระหว่างฟรีสปินได้)</p>
        </div>
        <ul className="gd-rules">
          <li>{game.reels} รีล × {game.rows} แถว = {ways} ทาง: สัญลักษณ์เดียวกันเรียงติดกันจากรีลซ้ายสุด 3 รีลขึ้นไป แถวไหนก็ได้</li>
          <li>จำนวนทาง = จำนวนสัญลักษณ์นั้นในแต่ละรีลคูณกัน · รางวัล = อัตราจ่าย × ทาง × ตัวคูณ</li>
          <li>ชนะแล้วสัญลักษณ์จะแตกหาย ของใหม่หล่นลงมา ตัวคูณเพิ่มทุกครั้ง: {game.mults.base.map((m) => "x" + m).join(" → ")}</li>
          <li>ในฟรีสปินตัวคูณเริ่มที่ {game.mults.free.map((m) => "x" + m).join(" → ")}</li>
          <li>รางวัลสูงสุด {game.maxWinX.toLocaleString("th-TH")} เท่าของเดิมพันต่อรอบ · เครดิต B เป็นแต้มเสมือน</li>
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- styles
const CSS = `
.gd-root { position:relative; width:100%; max-width:460px; margin:0 auto; padding:10px 10px 14px; box-sizing:border-box; color:#fff7e3; font-family:'Prompt',sans-serif; user-select:none; -webkit-user-select:none;
  background:
    radial-gradient(70% 40% at 50% 0%, var(--glow,rgba(255,90,60,0.35)), transparent 70%),
    radial-gradient(60% 30% at 50% 100%, rgba(255,170,40,0.15), transparent 70%),
    linear-gradient(180deg,var(--bg1,#4a0a0e) 0%,var(--bg2,#2a0508) 45%,var(--bg3,#160304) 100%);
  border-radius:18px; overflow:hidden; }
.gd-root * { box-sizing:border-box; }
.gd-root.gd-free { background:
    radial-gradient(70% 40% at 50% 0%, rgba(80,170,255,0.35), transparent 70%),
    radial-gradient(60% 30% at 50% 100%, rgba(255,200,60,0.2), transparent 70%),
    linear-gradient(180deg,#1b1f5a 0%,#140b33 45%,#0b0418 100%); }
.gd-head { text-align:center; margin-bottom:8px; }
.gd-title { display:flex; flex-direction:column; align-items:center; line-height:1; margin:4px 0 8px; }
.gd-title-th { font-weight:900; font-size:28px; letter-spacing:.02em; background:linear-gradient(180deg,#fff7cf 0%,#ffd75e 40%,#e09a1c 70%,#9a5a0c 100%); -webkit-background-clip:text; background-clip:text; color:transparent;
  filter:drop-shadow(0 2px 0 #5a0b10) drop-shadow(0 0 12px rgba(255,170,40,.45)); }
.gd-title-en { margin-top:4px; font-size:10px; font-weight:800; letter-spacing:.28em; color:#ffd98a; opacity:.85; }
.gd-ladder { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; padding:5px; border-radius:14px; background:rgba(0,0,0,.35); border:1px solid rgba(255,210,110,.35); }
.gd-mult { padding:6px 0; border-radius:10px; font-weight:900; font-size:17px; color:#c9a76a; background:linear-gradient(180deg,#3b0c10,#220507); border:1px solid rgba(255,210,110,.18); transition:all .25s ease; }
.gd-mult.on { color:#3a1d00; background:linear-gradient(180deg,#fff2a8,#ffc93c 50%,#d48a12); border-color:#fff2bf; transform:scale(1.08); box-shadow:0 0 16px rgba(255,200,60,.75); }
.gd-mult.on.idle { transform:none; box-shadow:0 0 8px rgba(255,200,60,.4); }
.gd-free .gd-mult.on { background:linear-gradient(180deg,#e6fbff,#7fd2ff 50%,#2d7de0); color:#06224a; box-shadow:0 0 16px rgba(120,200,255,.8); }
.gd-free-banner { margin-top:8px; padding:6px 10px; border-radius:10px; font-size:13px; background:linear-gradient(90deg,transparent,rgba(120,200,255,.25),transparent); color:#dff4ff; }
.gd-free-banner b { color:#fff; font-size:15px; }

.gd-frame { position:relative; padding:7px; border-radius:16px;
  background:linear-gradient(180deg,#ffe58f,#c8861b 40%,#7a4a0c 60%,#ffd45a);
  box-shadow:0 0 0 2px #3a0a0c, 0 10px 30px rgba(0,0,0,.6), 0 0 28px rgba(255,170,40,.25); }
.gd-frame::before, .gd-frame::after { content:""; position:absolute; top:-6px; width:26px; height:26px; border-radius:50%; background:radial-gradient(circle at 35% 30%,#fff3c4,#e0262d 45%,#6e0a0e); border:2px solid #ffd45a; z-index:2; }
.gd-frame::before { left:-6px; } .gd-frame::after { right:-6px; }
.gd-reels { display:grid; grid-template-columns:repeat(var(--reels,5),1fr); gap:3px; border-radius:11px; overflow:hidden; padding:3px;
  background:
    radial-gradient(circle at 50% 50%, rgba(255,210,110,.08) 0 1px, transparent 2px) 0 0/14px 14px,
    linear-gradient(180deg,var(--reelA,#5e0c12),var(--reelB,#2a0407)); }
.gd-light .gd-reels { background:linear-gradient(180deg,var(--reelA),var(--reelB)); }
.gd-light .gd-reel { background:rgba(0,0,0,.05); }
.gd-light .gd-reel + .gd-reel { box-shadow:-2px 0 0 rgba(120,90,40,.25); }
.gd-free .gd-reels { background:radial-gradient(circle at 50% 50%, rgba(160,220,255,.1) 0 1px, transparent 2px) 0 0/14px 14px, linear-gradient(180deg,#22307a,#0d0f35); }
.gd-reel { display:flex; flex-direction:column; gap:3px; background:rgba(0,0,0,.18); border-radius:8px; }
.gd-cell { position:relative; aspect-ratio:1/1; display:grid; place-items:center; padding:5%; border-radius:8px; }
.gd-cell svg { width:100%; height:100%; overflow:visible; }
.gd-cell.special::before { content:""; position:absolute; inset:6%; border-radius:50%; background:radial-gradient(circle, rgba(255,210,90,.45), transparent 70%); animation:gd-glow 1.6s ease-in-out infinite; }
.gd-cell.drop { animation:gd-fall .42s cubic-bezier(.25,1.35,.45,1) both; animation-delay:var(--delay,0ms); }
.gd-turbo .gd-cell.drop { animation-duration:.24s; }
.gd-cell.out { animation:gd-out .2s ease-in both; }
.gd-cell.win { animation:gd-win .45s ease-in-out infinite alternate; z-index:2; }
.gd-cell.win::after { content:""; position:absolute; inset:0; border-radius:10px; border:2px solid #ffe58f; box-shadow:0 0 14px #ffc93c, inset 0 0 14px rgba(255,201,60,.6); }
.gd-cell.boom { animation:gd-boom .32s ease-in both; z-index:2; }
.gd-cell.boom::after { content:""; position:absolute; inset:-20%; border-radius:50%; background:radial-gradient(circle, #fff6c9 0%, rgba(255,201,60,.8) 30%, transparent 65%); animation:gd-burst .32s ease-out both; }
.gd-flame { animation:gd-flicker 1.2s ease-in-out infinite; transform-origin:50% 60%; }
@keyframes gd-fall { from { transform:translateY(calc(var(--d,4) * -100%)); } to { transform:translateY(0); } }
@keyframes gd-out { to { transform:translateY(40%); opacity:0; filter:blur(2px); } }
@keyframes gd-win { from { transform:scale(1); filter:brightness(1); } to { transform:scale(1.1); filter:brightness(1.3) drop-shadow(0 0 6px #ffd45a); } }
@keyframes gd-boom { 0% { transform:scale(1.1); opacity:1; } 100% { transform:scale(0.2) rotate(20deg); opacity:0; } }
@keyframes gd-burst { from { transform:scale(.3); opacity:1; } to { transform:scale(1.4); opacity:0; } }
@keyframes gd-glow { 0%,100% { opacity:.4; transform:scale(.9); } 50% { opacity:1; transform:scale(1.08); } }
@keyframes gd-flicker { 0%,100% { transform:scale(1); opacity:.85; } 50% { transform:scale(1.08); opacity:1; } }

.gd-wininfo { min-height:40px; margin:8px 0 6px; display:flex; align-items:center; justify-content:center; text-align:center; font-size:13px; padding:4px 10px; border-radius:12px; background:rgba(0,0,0,.3); border:1px solid rgba(255,210,110,.18); }
.gd-wininfo svg { width:26px; height:26px; vertical-align:middle; }
.gd-wininfo b { color:#ffe58f; font-size:16px; }
.gd-hint { color:#d6b98a; font-size:11.5px; }
.gd-msg { color:#ff8a7a; font-weight:700; }

.gd-panel { padding:10px; border-radius:16px; background:linear-gradient(180deg,rgba(0,0,0,.45),rgba(0,0,0,.6)); border:1px solid rgba(255,210,110,.3); }
.gd-stats { display:grid; grid-template-columns:1fr 1.25fr 1fr; gap:6px; margin-bottom:10px; }
.gd-stat { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:5px 4px; border-radius:10px; background:rgba(255,255,255,.05); min-width:0; }
.gd-stat span { font-size:10.5px; color:#d6b98a; }
.gd-stat b { font-size:15px; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; }
.gd-stat b.gd-pos { color:#ffe58f; }
.gd-bet { display:flex; align-items:center; gap:6px; }
.gd-bet button { width:26px; height:26px; border-radius:50%; border:1px solid rgba(255,210,110,.5); background:#3b0c10; color:#ffe58f; font-weight:900; font-size:16px; line-height:1; cursor:pointer; }
.gd-bet button:disabled { opacity:.35; cursor:default; }
.gd-controls { display:flex; align-items:center; justify-content:space-between; gap:4px; }
.gd-round { width:56px; display:flex; flex-direction:column; align-items:center; gap:2px; background:none; border:none; color:#f3d79a; cursor:pointer; padding:0; font-family:inherit; }
.gd-round span { width:42px; height:42px; display:grid; place-items:center; border-radius:50%; font-size:18px; background:linear-gradient(180deg,#4a1014,#250608); border:1.5px solid rgba(255,210,110,.55); box-shadow:inset 0 1px 0 rgba(255,255,255,.12); }
.gd-round small { font-size:9.5px; font-weight:700; white-space:nowrap; }
.gd-round.on span { background:linear-gradient(180deg,#fff2a8,#ffc93c 50%,#d48a12); color:#3a1d00; border-color:#fff2bf; box-shadow:0 0 12px rgba(255,200,60,.7); }
.gd-round:disabled { opacity:.4; cursor:default; }
.gd-spin { width:84px; height:84px; border-radius:50%; display:grid; place-items:center; cursor:pointer; padding:0;
  background:radial-gradient(circle at 35% 28%,#fff6c9,#ffd45a 35%,#e0a020 65%,#9a5a0c); border:3px solid #fff1bf;
  box-shadow:0 0 0 4px #6e0a0e, 0 0 0 6px #ffd45a, 0 8px 18px rgba(0,0,0,.6), 0 0 26px rgba(255,190,60,.55); transition:transform .1s ease; }
.gd-spin:active:not(:disabled) { transform:scale(.94); }
.gd-spin.busy svg { animation:gd-rot .6s linear infinite; }
.gd-spin:disabled { filter:grayscale(.4) brightness(.8); cursor:default; }
.gd-spin-auto { display:flex; flex-direction:column; align-items:center; font-weight:900; font-size:22px; color:#3a1d00; line-height:1; }
.gd-spin-auto small { font-size:10px; }
@keyframes gd-rot { to { transform:rotate(360deg); } }
.gd-automenu { position:absolute; bottom:64px; left:50%; transform:translateX(-50%); z-index:20; display:flex; flex-direction:column; gap:4px; padding:6px; border-radius:12px; background:#250608; border:1px solid rgba(255,210,110,.5); box-shadow:0 10px 24px rgba(0,0,0,.6); }
.gd-automenu button { white-space:nowrap; padding:7px 14px; border-radius:8px; border:none; background:#3b0c10; color:#ffe58f; font-weight:800; font-family:inherit; cursor:pointer; }

.gd-overlay { position:absolute; inset:0; z-index:50; display:flex; align-items:center; justify-content:center; background:rgba(10,2,3,.82); overflow:hidden; cursor:pointer; animation:gd-fade .25s ease both; }
@keyframes gd-fade { from { opacity:0; } }
.gd-rays { position:absolute; left:50%; top:45%; width:900px; height:900px; margin:-450px 0 0 -450px; background:repeating-conic-gradient(from 0deg, rgba(255,210,90,.16) 0 10deg, transparent 10deg 20deg); animation:gd-rot 14s linear infinite; mask:radial-gradient(circle, #000 15%, transparent 60%); -webkit-mask:radial-gradient(circle, #000 15%, transparent 60%); }
.gd-ov-card { position:relative; text-align:center; padding:20px; animation:gd-pop .45s cubic-bezier(.2,1.5,.4,1) both; }
@keyframes gd-pop { from { transform:scale(.4); opacity:0; } }
.gd-ov-sym { width:110px; height:110px; margin:0 auto; }
.gd-ov-title { font-size:30px; font-weight:900; background:linear-gradient(180deg,#fff7cf,#ffd75e 45%,#d48a12); -webkit-background-clip:text; background-clip:text; color:transparent; filter:drop-shadow(0 2px 0 #5a0b10); }
.gd-ov-num { font-size:84px; font-weight:900; line-height:1; color:#fff; text-shadow:0 0 24px rgba(120,200,255,.9), 0 4px 0 #1b3c9e; }
.gd-ov-money { font-size:48px; color:#ffe58f; text-shadow:0 0 20px rgba(255,190,60,.8), 0 3px 0 #7a4a0c; margin:6px 0; }
.gd-ov-sub { font-size:13px; color:#ffe9b8; margin-top:6px; }
.gd-ov-btn { margin-top:16px; padding:11px 34px; border-radius:999px; border:2px solid #fff1bf; font-family:inherit; font-weight:900; font-size:16px; color:#3a1d00; background:linear-gradient(180deg,#fff2a8,#ffc93c 50%,#d48a12); box-shadow:0 4px 0 #7a4a0c, 0 0 18px rgba(255,200,60,.6); cursor:pointer; }
.gd-big-inner { position:relative; text-align:center; animation:gd-pop .5s cubic-bezier(.2,1.5,.4,1) both; }
.gd-big-sym { width:120px; height:120px; margin:0 auto -6px; animation:gd-flicker 1s ease-in-out infinite; }
.gd-big-label { font-size:44px; font-weight:900; font-style:italic; letter-spacing:.02em; line-height:1.05;
  background:linear-gradient(180deg,#fffbe6 0%,#ffe27a 35%,#f0a51c 65%,#a85f0a 100%); -webkit-background-clip:text; background-clip:text; color:transparent;
  filter:drop-shadow(0 3px 0 #6e0a0e) drop-shadow(0 0 18px rgba(255,170,40,.8)); }
.tier-mega .gd-big-label { font-size:50px; }
.tier-super .gd-big-label { font-size:40px; background:linear-gradient(180deg,#ffffff,#ffd5f6 30%,#ff5ab0 60%,#8a1aa8); -webkit-background-clip:text; background-clip:text; }
.gd-big-th { font-size:16px; font-weight:800; color:#ffe9b8; margin-top:2px; }
.gd-big-amount { margin-top:10px; font-size:46px; font-weight:900; color:#fff; font-variant-numeric:tabular-nums; text-shadow:0 0 20px rgba(255,190,60,.9), 0 3px 0 #7a4a0c; }
.gd-big-tap { margin-top:14px; font-size:12px; color:#d6b98a; animation:gd-glow 1.4s ease-in-out infinite; }
.gd-coin { position:absolute; top:-40px; border-radius:50%; background:radial-gradient(circle at 35% 30%,#fff6c9,#ffd45a 40%,#c8861b 75%,#7a4a0c); box-shadow:inset 0 0 0 2px rgba(122,74,12,.6); animation:gd-coin linear infinite; }
@keyframes gd-coin { from { transform:translateY(0) rotateY(0); } to { transform:translateY(900px) rotateY(720deg); } }

.gd-info { cursor:default; align-items:flex-start; padding:12px; overflow-y:auto; }
.gd-info-card { width:100%; max-width:420px; background:linear-gradient(180deg,#3b0a0e,#1a0305); border:1px solid rgba(255,210,110,.5); border-radius:16px; padding:14px; }
.gd-info-head { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.gd-info-head b { font-size:18px; color:#ffe58f; }
.gd-info-head span { flex:1; font-size:11.5px; color:#d6b98a; }
.gd-info-head button { width:30px; height:30px; border-radius:50%; border:1px solid rgba(255,210,110,.5); background:#3b0c10; color:#ffe58f; cursor:pointer; }
.gd-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.gd-pay { display:flex; align-items:center; gap:8px; padding:6px; border-radius:10px; background:rgba(255,255,255,.04); }
.gd-pay-sym { width:50px; height:50px; flex:0 0 auto; }
.gd-pay-sym svg { width:100%; height:100%; }
.gd-pay-vals { font-size:12px; flex:1; min-width:0; }
.gd-pay-vals div { display:flex; justify-content:space-between; gap:6px; }
.gd-pay-vals span { color:#d6b98a; } .gd-pay-vals span::after { content:" ตัว"; }
.gd-pay-vals b { color:#fff; }
.gd-info-special { display:flex; align-items:center; gap:10px; margin-top:8px; padding:6px; border-radius:10px; background:rgba(255,255,255,.04); font-size:12.5px; }
.gd-info-special p { margin:0; color:#f3e2c0; } .gd-info-special b { color:#ffe58f; }
.gd-rules { margin:10px 0 0; padding-left:18px; font-size:12px; line-height:1.8; color:#e7d3ad; }
@media (max-width:360px) { .gd-spin { width:72px; height:72px; } .gd-round { width:48px; } .gd-round span { width:36px; height:36px; font-size:15px; } .gd-title-th { font-size:24px; } }
`;
function CSStyle() { return <style>{CSS}</style>; }
