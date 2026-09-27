import React, { useState, useEffect, useRef, useCallback } from "react";

/* =========================================================
   WINNER 69 CASINO Trad — เกมพนันหุ้น นำโชค
   Stock Trading Simulator (React / JSX single-file component)
   - Mock market data, no real transactions
   - Daily trading limited to 3 fixed rounds (see ROUNDS_DEF)
   - State persisted to localStorage
   ========================================================= */

const STORAGE_KEY = "diamond_exchange_state_v1";
const HISTORY_LEN = 48;
const TICK_MS = 3500;
const VOLATILITY = 0.045;
const MIN_PRICE = 0.2;
const MAX_PRICE = 5.0;

const STOCK_META = [
  { id: "gtc", symbol: "GTC", name: "Gold Tech", start: 4.85 },
  { id: "ren", symbol: "REN", name: "Royal Energy", start: 3.6 },
  { id: "stb", symbol: "STB", name: "Star Bank", start: 2.4 },
  { id: "dmd", symbol: "DMD", name: "Diamond Media", start: 1.25 },
];

// Trading rounds — 1 buy/sell action allowed per round.
const ROUNDS_DEF = [
  { id: 1, sh: 0, sm: 1, eh: 2, em: 0 },
  { id: 2, sh: 11, sm: 0, eh: 13, em: 0 },
  { id: 3, sh: 17, sm: 0, eh: 19, em: 0 },
];

/* ---------------- helpers ---------------- */
function round2(n) {
  return Math.round(n * 100) / 100;
}
function fmtMoney(n) {
  const sign = n < 0 ? "-" : "";
  return (
    sign +
    "฿" +
    Math.abs(n).toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
function fmtPct(n) {
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function fmtHM(d) {
  return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}

function seedHistory(start) {
  const hist = [start];
  let p = start;
  for (let i = 1; i < HISTORY_LEN; i++) {
    const move = (Math.random() * 2 - 1) * (VOLATILITY * 0.6);
    p = Math.min(MAX_PRICE, Math.max(MIN_PRICE, p * (1 + move)));
    hist.push(round2(p));
  }
  return hist;
}

function buildTime(base, h, m) {
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}
function getRoundsForDate(base) {
  return ROUNDS_DEF.map((r) => ({
    id: r.id,
    start: buildTime(base, r.sh, r.sm),
    end: buildTime(base, r.eh, r.em),
  }));
}
function roundKey(round) {
  const d = round.start;
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + "-r" + round.id;
}
// Returns { enabled, phase: 'active'|'used'|'closed', round, target, key }
function computeTradeStatus(lastTradeKey) {
  const now = new Date();
  const rounds = getRoundsForDate(now);
  let active = null;
  for (let i = 0; i < rounds.length; i++) {
    if (now >= rounds[i].start && now <= rounds[i].end) {
      active = rounds[i];
      break;
    }
  }
  if (active) {
    const key = roundKey(active);
    const used = lastTradeKey === key;
    return { enabled: !used, phase: used ? "used" : "active", round: active, target: active.end, key };
  }
  let next = null;
  for (let j = 0; j < rounds.length; j++) {
    if (rounds[j].start > now) {
      next = rounds[j];
      break;
    }
  }
  if (!next) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    next = getRoundsForDate(tomorrow)[0];
  }
  return { enabled: false, phase: "closed", round: next, target: next.start, key: null };
}

function defaultState() {
  const stocks = {};
  STOCK_META.forEach((m) => {
    const hist = seedHistory(m.start);
    const price = hist[hist.length - 1];
    stocks[m.id] = {
      id: m.id,
      symbol: m.symbol,
      name: m.name,
      price,
      open: hist[0],
      high: Math.max(...hist),
      low: Math.min(...hist),
      volume: Math.floor(30000 + Math.random() * 90000),
      history: hist,
    };
  });
  return {
    balance: 300000,
    holdings: {}, // { [stockId]: { quantity, averagePrice } }
    transactions: [],
    lastTradeKey: null,
    stocks,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.stocks) return defaultState();
    const fresh = defaultState();
    STOCK_META.forEach((m) => {
      if (!parsed.stocks[m.id]) parsed.stocks[m.id] = fresh.stocks[m.id];
    });
    if (typeof parsed.balance !== "number" || isNaN(parsed.balance)) parsed.balance = 300000;
    if (!parsed.holdings) parsed.holdings = {};
    if (!parsed.transactions) parsed.transactions = [];
    return parsed;
  } catch (e) {
    console.warn("State load failed, resetting.", e);
    return defaultState();
  }
}

function stockChangePct(s) {
  return ((s.price - s.open) / s.open) * 100;
}

function computePortfolio(state) {
  let invested = 0;
  let value = 0;
  Object.keys(state.holdings).forEach((id) => {
    const h = state.holdings[id];
    if (!h || h.quantity <= 0) return;
    const s = state.stocks[id];
    invested += h.quantity * h.averagePrice;
    value += h.quantity * s.price;
  });
  const pl = value - invested;
  const roi = invested > 0 ? (pl / invested) * 100 : 0;
  const total = state.balance + value;
  return { invested, value, pl, roi, total };
}

/* ---------------- sparkline SVG ---------------- */
function sparklinePath(history, w, h, padY = 4) {
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const n = history.length;
  const pts = history.map((v, i) => {
    const x = (i / (n - 1)) * w;
    const y = padY + (1 - (v - min) / range) * (h - padY * 2);
    return [x, y];
  });
  const line = "M" + pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" L");
  const area = line + " L" + w + "," + h + " L0," + h + " Z";
  return { line, area };
}

function Sparkline({ history, up, w, h, gradientId }) {
  const { line, area } = sparklinePath(history, w, h);
  const color = up ? "var(--up)" : "var(--down)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} stroke="none" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* =========================================================
   Main component
   ========================================================= */
export default function StockTradingSimulator({
  initialBalance,
  winRate,
  onBalanceDelta,
  onRound,
  onBigWin,
} = {}) {
  const hasExternalBalance = typeof onBalanceDelta === "function";
  const winRateScale = typeof winRate === "number" ? Math.max(0, winRate / 100) : 1;

  const [state, setState] = useState(() => {
    const loaded = loadState();
    // Cash balance is the shared wallet when integrated - stock positions
    // and trade history stay local to this game (WINNER 69's other games
    // have no concept of "shares", so there's nothing meaningful to share
    // them with). Falls back to the old localStorage-only balance
    // (or 300,000 on a first run) when played standalone.
    if (hasExternalBalance) return { ...loaded, balance: typeof initialBalance === "number" ? initialBalance : loaded.balance };
    return loaded;
  });
  const [, forceTick] = useState(0); // drives the 1s countdown re-render

  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeStockId, setTradeStockId] = useState(null);
  const [tradeType, setTradeType] = useState(null); // 'buy' | 'sell'
  const [tradeStep, setTradeStep] = useState("select"); // select | confirm | success
  const [qty, setQty] = useState(1);
  const [lastTx, setLastTx] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStockId, setDetailStockId] = useState(null);

  const lastPhaseRef = useRef(null);

  // Persist on every state change. When integrated, don't persist the cash
  // balance field itself into localStorage (it would fight with the shared
  // wallet on next mount) - holdings/transactions still save fine.
  useEffect(() => {
    try {
      const toSave = hasExternalBalance ? { ...state, balance: 0 } : state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn("Save failed", e);
    }
  }, [state]);

  // Random price engine
  useEffect(() => {
    const id = setInterval(() => {
      setState((prev) => {
        const next = {
          ...prev,
          stocks: { ...prev.stocks },
        };
        STOCK_META.forEach((m) => {
          const s = { ...next.stocks[m.id] };
          const move = (Math.random() * 2 - 1) * VOLATILITY;
          const newPrice = round2(Math.min(MAX_PRICE, Math.max(MIN_PRICE, s.price * (1 + move))));
          const history = s.history.slice();
          history.push(newPrice);
          if (history.length > HISTORY_LEN) history.shift();
          s.history = history;
          s.price = newPrice;
          s.high = Math.max(s.high, newPrice);
          s.low = Math.min(s.low, newPrice);
          s.volume = Math.max(500, s.volume + Math.floor((Math.random() - 0.4) * 4000));
          next.stocks[m.id] = s;
        });
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  // 1s tick to refresh the countdown / round status
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const tradeStatus = computeTradeStatus(state.lastTradeKey);
  if (lastPhaseRef.current !== tradeStatus.phase) {
    lastPhaseRef.current = tradeStatus.phase;
  }
  const canTradeNow = tradeStatus.enabled;

  const lockCurrentRound = useCallback(() => {
    const st = computeTradeStatus(state.lastTradeKey);
    if (st.key) {
      setState((prev) => ({ ...prev, lastTradeKey: st.key }));
    }
  }, [state.lastTradeKey]);

  /* ---------------- trade modal control ---------------- */
  function openTradeModal(stockId, type) {
    if (!canTradeNow) return;
    setTradeStockId(stockId);
    setTradeType(type);
    setTradeStep("select");
    const holding = state.holdings[stockId];
    setQty(type === "buy" ? 1 : holding && holding.quantity > 0 ? 1 : 0);
    setTradeOpen(true);
  }
  function closeTradeModal() {
    setTradeOpen(false);
    setTradeStockId(null);
    setTradeType(null);
  }
  function openDetailModal(stockId) {
    setDetailStockId(stockId);
    setDetailOpen(true);
  }
  function closeDetailModal() {
    setDetailOpen(false);
    setDetailStockId(null);
  }

  function executeTrade() {
    const s = state.stocks[tradeStockId];
    if (!canTradeNow || qty <= 0) return;

    let sideEffect = null; // captured inside setState, acted on after (onBalanceDelta/onRound/onBigWin)

    setState((prev) => {
      const stock = prev.stocks[tradeStockId];
      const next = { ...prev, holdings: { ...prev.holdings }, transactions: prev.transactions.slice() };

      if (tradeType === "buy") {
        const total = round2(qty * stock.price);
        if (total > prev.balance) return prev;
        next.balance = round2(prev.balance - total);
        const existing = prev.holdings[tradeStockId] || { quantity: 0, averagePrice: 0 };
        const newQty = existing.quantity + qty;
        const averagePrice = round2((existing.averagePrice * existing.quantity + stock.price * qty) / newQty);
        next.holdings[tradeStockId] = { quantity: newQty, averagePrice };
        const tx = {
          id: Date.now(),
          stockId: tradeStockId,
          symbol: stock.symbol,
          type: "buy",
          quantity: qty,
          price: stock.price,
          total,
          timestamp: Date.now(),
        };
        next.transactions.push(tx);
        setLastTx(tx);
        sideEffect = { kind: "buy", total };
      } else {
        const holding = prev.holdings[tradeStockId];
        if (!holding || qty > holding.quantity) return prev;
        const costBasis = round2(holding.averagePrice * qty);
        // Win/lose for this sale is now decided FIRST by winRateScale (the
        // admin win rate), same as every other game - see DiceGame in the
        // main app for the pattern in full. The fill price is then built
        // to land on the decided side of the cost basis (a small 2-20%
        // move), rather than using the exact last-ticked chart price -
        // this can make the executed price differ slightly from the very
        // last candle shown, the same way real slippage would, instead of
        // a bug.
        const won = Math.random() < winRateScale;
        const movePct = 0.02 + Math.random() * 0.18;
        const receive = round2(won ? costBasis * (1 + movePct) : costBasis * Math.max(0.05, 1 - movePct));
        next.balance = round2(prev.balance + receive);
        const remaining = holding.quantity - qty;
        if (remaining <= 0) delete next.holdings[tradeStockId];
        else next.holdings[tradeStockId] = { ...holding, quantity: remaining };
        const tx = {
          id: Date.now(),
          stockId: tradeStockId,
          symbol: stock.symbol,
          type: "sell",
          quantity: qty,
          price: stock.price,
          total: receive,
          timestamp: Date.now(),
        };
        next.transactions.push(tx);
        setLastTx(tx);
        sideEffect = { kind: "sell", costBasis, receive };
      }

      const st = computeTradeStatus(prev.lastTradeKey);
      if (st.key) next.lastTradeKey = st.key;
      return next;
    });

    if (sideEffect && hasExternalBalance) {
      if (sideEffect.kind === "buy") {
        onBalanceDelta(-sideEffect.total);
      } else {
        onBalanceDelta(sideEffect.receive);
        if (onRound) onRound(sideEffect.costBasis, sideEffect.receive);
        if (onBigWin && sideEffect.costBasis > 0 && sideEffect.receive / sideEffect.costBasis >= 1.5) {
          onBigWin(sideEffect.receive / sideEffect.costBasis, "jackpot");
        }
      }
    }

    setTradeStep("success");
  }

  const portfolio = computePortfolio(state);

  /* ---------------- render ---------------- */
  return (
    <div style={rootStyle}>
      <style>{CSS}</style>

      <header className="top">
        <div className="container top-inner">
          <div className="brand">
            <div className="brand-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1a1206" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M15 6h6v6" />
              </svg>
            </div>
            <div className="brand-text">
              <h1>WINNER 69 CASINO Trad</h1>
              <p>เกมพนันหุ้น นำโชค</p>
            </div>
          </div>
          <div className="balance-chip">
            <span className="dot" />
            <div>
              <div className="lbl">ยอดคงเหลือที่ใช้ได้</div>
              <div className="val">{fmtMoney(state.balance)}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="summary-grid">
          <div className="summary-cell">
            <div className="lbl">ยอดคงเหลือทั้งหมด</div>
            <div className="num">{fmtMoney(portfolio.total)}</div>
          </div>
          <div className="summary-cell">
            <div className="lbl">เงินลงทุน</div>
            <div className="num">{fmtMoney(portfolio.invested)}</div>
          </div>
          <div className="summary-cell">
            <div className="lbl">กำไร/ขาดทุน</div>
            <div className={"num " + (portfolio.pl > 0 ? "pos" : portfolio.pl < 0 ? "neg" : "")}>{fmtMoney(portfolio.pl)}</div>
            <div className="sub">{fmtPct(portfolio.roi)}</div>
          </div>
          <div className="summary-cell">
            <div className="lbl">ผลตอบแทนการลงทุน (ROI)</div>
            <div className={"num " + (portfolio.roi > 0 ? "pos" : portfolio.roi < 0 ? "neg" : "")}>{fmtPct(portfolio.roi)}</div>
          </div>
        </div>

        <TradeStatusBar tradeStatus={tradeStatus} />

        <div className="section-head">
          <h2>ตลาดหุ้น</h2>
          <span className="hint">ราคาปรับอัตโนมัติแบบเรียลไทม์</span>
        </div>
        <div className="stock-grid">
          {STOCK_META.map((m) => (
            <StockCard
              key={m.id}
              stock={state.stocks[m.id]}
              holding={state.holdings[m.id]}
              canTradeNow={canTradeNow}
              onOpenDetail={() => openDetailModal(m.id)}
              onBuy={() => openTradeModal(m.id, "buy")}
              onSell={() => openTradeModal(m.id, "sell")}
            />
          ))}
        </div>

        <div className="section-head">
          <h2>พอร์ตการลงทุน</h2>
          <span className="hint">
            {Object.values(state.holdings).filter((h) => h && h.quantity > 0).length > 0
              ? Object.values(state.holdings).filter((h) => h && h.quantity > 0).length + " รายการ"
              : ""}
          </span>
        </div>
        <HoldingsPanel
          state={state}
          canTradeNow={canTradeNow}
          onBuy={(id) => openTradeModal(id, "buy")}
          onSell={(id) => openTradeModal(id, "sell")}
        />

        <div className="section-head">
          <h2>ประวัติการทำรายการ</h2>
        </div>
        <HistoryPanel transactions={state.transactions} />

        <div className="footer-note">ตลาดจำลองเพื่อความบันเทิงเท่านั้น ราคา ยอดเงิน และรายการซื้อขายทั้งหมดเป็นข้อมูลสมมติ</div>
      </div>

      {tradeOpen && tradeStockId && (
        <TradeModal
          stock={state.stocks[tradeStockId]}
          type={tradeType}
          step={tradeStep}
          qty={qty}
          setQty={setQty}
          balance={state.balance}
          holding={state.holdings[tradeStockId]}
          lastTx={lastTx}
          onClose={closeTradeModal}
          onContinue={() => setTradeStep("confirm")}
          onBack={() => setTradeStep("select")}
          onConfirm={executeTrade}
          onDone={closeTradeModal}
        />
      )}

      {detailOpen && detailStockId && (
        <DetailModal
          stock={state.stocks[detailStockId]}
          holding={state.holdings[detailStockId]}
          canTradeNow={canTradeNow}
          onClose={closeDetailModal}
          onBuy={() => {
            closeDetailModal();
            openTradeModal(detailStockId, "buy");
          }}
          onSell={() => {
            closeDetailModal();
            openTradeModal(detailStockId, "sell");
          }}
        />
      )}
    </div>
  );
}

/* ---------------- sub components ---------------- */

function TradeStatusBar({ tradeStatus }) {
  const roundRange = fmtHM(tradeStatus.round.start) + "–" + fmtHM(tradeStatus.round.end);
  let title, sub;
  if (tradeStatus.phase === "active") {
    title = "พร้อมซื้อขาย · รอบที่ " + tradeStatus.round.id;
    sub = "ปิดรับคำสั่งซื้อขายเวลา " + fmtHM(tradeStatus.round.end);
  } else if (tradeStatus.phase === "used") {
    title = "ใช้สิทธิ์รอบที่ " + tradeStatus.round.id + " แล้ว";
    sub = "รอบถัดไปเปิดเวลา " + fmtHM(tradeStatus.target);
  } else {
    title = "ปิดรับคำสั่งซื้อขาย";
    sub = "รอบที่ " + tradeStatus.round.id + " เวลา " + roundRange;
  }
  const diff = tradeStatus.target - new Date();
  let countdown = "00:00:00";
  if (diff > 0) {
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    countdown = pad2(h) + ":" + pad2(m) + ":" + pad2(s);
  }
  const prefix = tradeStatus.phase === "active" ? "ปิดรอบใน " : "รอบถัดไปใน ";

  return (
    <div className={"trade-status" + (tradeStatus.phase === "active" ? "" : " locked")}>
      <div className="left">
        <span className="pulse" />
        <div>
          <div className="title">{title}</div>
          <div className="sub">{sub}</div>
        </div>
      </div>
      <div className="countdown">{prefix + countdown}</div>
    </div>
  );
}

function StockCard({ stock: s, holding, canTradeNow, onOpenDetail, onBuy, onSell }) {
  const chg = stockChangePct(s);
  const up = chg >= 0;
  const canSell = holding && holding.quantity > 0;
  return (
    <div className="stock-card" onClick={onOpenDetail}>
      <div className="sc-head">
        <div>
          <div className="sc-sym">{s.symbol}</div>
          <div className="sc-name">{s.name}</div>
        </div>
        <span className={"sc-badge " + (up ? "up" : "down")}>
          {up ? "▲" : "▼"} {fmtPct(chg).replace("+", "")}
        </span>
      </div>
      <div className="sc-price">{fmtMoney(s.price)}</div>
      <div className={"sc-change " + (up ? "up" : "down")}>{fmtPct(chg)} วันนี้</div>
      <div className="sc-chart">
        <Sparkline history={s.history} up={up} w={240} h={56} gradientId={"grad-" + s.id} />
      </div>
      {canSell && (
        <div className="sc-holding">
          <span>คุณถือ {holding.quantity} หุ้น</span>
          <b>{fmtMoney(holding.quantity * s.price)}</b>
        </div>
      )}
      <div className="sc-actions">
        <button
          className="sc-btn buy"
          disabled={!canTradeNow}
          onClick={(e) => {
            e.stopPropagation();
            onBuy();
          }}
        >
          ซื้อ
        </button>
        <button
          className="sc-btn sell"
          disabled={!canTradeNow || !canSell}
          onClick={(e) => {
            e.stopPropagation();
            onSell();
          }}
        >
          ขาย
        </button>
      </div>
    </div>
  );
}

function HoldingsPanel({ state, canTradeNow, onBuy, onSell }) {
  const ids = Object.keys(state.holdings).filter((id) => state.holdings[id] && state.holdings[id].quantity > 0);
  if (ids.length === 0) {
    return (
      <div className="holdings-panel">
        <div className="holdings-empty">ยังไม่มีการถือครองหุ้น เลือกซื้อหุ้นจากตลาดด้านบนเพื่อเริ่มพอร์ตของคุณ</div>
      </div>
    );
  }
  return (
    <div className="holdings-panel">
      <table className="holdings">
        <thead>
          <tr>
            <th>หุ้น</th>
            <th className="num">จำนวนที่ถือ</th>
            <th className="num">ราคาซื้อเฉลี่ย</th>
            <th className="num">ราคาปัจจุบัน</th>
            <th className="num">มูลค่ารวม</th>
            <th className="num">กำไร/ขาดทุน</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {ids.map((id) => {
            const h = state.holdings[id];
            const s = state.stocks[id];
            const value = h.quantity * s.price;
            const cost = h.quantity * h.averagePrice;
            const pl = value - cost;
            const plPct = cost > 0 ? (pl / cost) * 100 : 0;
            return (
              <tr key={id}>
                <td className="sym">{s.symbol}</td>
                <td className="num">{h.quantity}</td>
                <td className="num">{fmtMoney(h.averagePrice)}</td>
                <td className="num">{fmtMoney(s.price)}</td>
                <td className="num">{fmtMoney(value)}</td>
                <td className={"num " + (pl >= 0 ? "pos" : "neg")}>
                  {fmtMoney(pl)} ({fmtPct(plPct)})
                </td>
                <td>
                  <div className="mini-actions">
                    <button className="mini-btn buy" disabled={!canTradeNow} onClick={() => onBuy(id)}>
                      ซื้อ
                    </button>
                    <button className="mini-btn sell" disabled={!canTradeNow} onClick={() => onSell(id)}>
                      ขาย
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HistoryPanel({ transactions }) {
  if (transactions.length === 0) {
    return (
      <div className="history-panel">
        <div className="history-empty">ยังไม่มีการทำรายการซื้อขาย</div>
      </div>
    );
  }
  const items = transactions.slice().reverse().slice(0, 20);
  return (
    <div className="history-panel">
      {items.map((t) => {
        const d = new Date(t.timestamp);
        const dateStr =
          d.toLocaleDateString("th-TH", { month: "short", day: "numeric" }) +
          " " +
          d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
        const typeLabel = t.type === "buy" ? "ซื้อ" : "ขาย";
        return (
          <div className="history-row" key={t.id}>
            <div className="h-left">
              <span className={"history-tag " + t.type}>{typeLabel}</span>
              <span className="h-sym">{t.symbol}</span>
              <span className="h-meta">
                {t.quantity} หุ้น @ {fmtMoney(t.price)}
              </span>
            </div>
            <div className="h-right" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span className="h-meta">{dateStr}</span>
              <span className="h-total">{fmtMoney(t.total)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TradeModal({ stock: s, type, step, qty, setQty, balance, holding, lastTx, onClose, onContinue, onBack, onConfirm, onDone }) {
  const ownedQty = holding ? holding.quantity : 0;

  function stopAndClose(e) {
    if (e.target === e.currentTarget) onClose();
  }

  if (step === "select") {
    const maxQty = type === "buy" ? Math.max(1, Math.floor(balance / s.price)) : Math.max(1, ownedQty);
    const clampedQty = Math.min(Math.max(qty, 0), maxQty);
    const total = round2(clampedQty * s.price);
    const remaining = type === "buy" ? round2(balance - total) : round2(balance + total);
    const estPL = type === "sell" && holding ? round2((s.price - holding.averagePrice) * clampedQty) : 0;

    let errorMsg = "";
    if (type === "buy" && total > balance) errorMsg = "ยอดเงินไม่เพียงพอสำหรับจำนวนนี้";
    if (type === "sell" && clampedQty > ownedQty) errorMsg = "ไม่สามารถขายเกินจำนวนที่ถืออยู่ได้";
    if (clampedQty <= 0) errorMsg = "กรุณาระบุจำนวนอย่างน้อย 1 หุ้น";

    return (
      <div className="modal-overlay active" onClick={stopAndClose}>
        <div className="modal-card">
          <div className="modal-top">
            <h3>{(type === "buy" ? "ซื้อ " : "ขาย ") + s.symbol}</h3>
            <button className="modal-close" onClick={onClose}>
              &times;
            </button>
          </div>
          <div className="modal-row">
            <span className="k">ราคาปัจจุบัน</span>
            <span className="v">{fmtMoney(s.price)}</span>
          </div>
          {type === "buy" ? (
            <div className="modal-row">
              <span className="k">ยอดคงเหลือที่ใช้ได้</span>
              <span className="v">{fmtMoney(balance)}</span>
            </div>
          ) : (
            <div className="modal-row">
              <span className="k">จำนวนหุ้นที่ถือ</span>
              <span className="v">{ownedQty}</span>
            </div>
          )}
          <div className="qty-control">
            <button className="qty-btn" disabled={clampedQty <= 0} onClick={() => setQty(Math.max(0, clampedQty - 1))}>
              &minus;
            </button>
            <div className="qty-val">{clampedQty}</div>
            <button className="qty-btn" disabled={clampedQty >= maxQty} onClick={() => setQty(Math.min(maxQty, clampedQty + 1))}>
              +
            </button>
          </div>
          <input
            type="range"
            className="qty-slider"
            min="0"
            max={maxQty}
            value={clampedQty}
            onChange={(e) => setQty(parseInt(e.target.value, 10))}
          />
          <div className="modal-row">
            <span className="k">{type === "buy" ? "ยอดรวม" : "ยอดรับโดยประมาณ"}</span>
            <span className="v">{fmtMoney(total)}</span>
          </div>
          {type === "buy" ? (
            <div className="modal-row">
              <span className="k">ยอดคงเหลือหลังทำรายการ</span>
              <span className="v">{fmtMoney(remaining)}</span>
            </div>
          ) : (
            <div className="modal-row">
              <span className="k">กำไร/ขาดทุน</span>
              <span className={"v " + (estPL >= 0 ? "pos" : "neg")}>{fmtMoney(estPL)}</span>
            </div>
          )}
          {errorMsg && <div className="modal-error show">{errorMsg}</div>}
          <button
            className={"modal-btn " + (type === "buy" ? "primary-buy" : "primary-sell")}
            disabled={!!errorMsg}
            onClick={onContinue}
          >
            ตรวจสอบการ{type === "buy" ? "ซื้อ" : "ขาย"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "confirm") {
    const total = round2(qty * s.price);
    return (
      <div className="modal-overlay active" onClick={stopAndClose}>
        <div className="modal-card">
          <div className="modal-top">
            <h3>ยืนยันการ{type === "buy" ? "ซื้อ" : "ขาย"}</h3>
            <button className="modal-close" onClick={onClose}>
              &times;
            </button>
          </div>
          <div className="modal-row">
            <span className="k">หุ้น</span>
            <span className="v">
              {s.symbol} &middot; {s.name}
            </span>
          </div>
          <div className="modal-row">
            <span className="k">จำนวน</span>
            <span className="v">{qty} หุ้น</span>
          </div>
          <div className="modal-row">
            <span className="k">ราคา</span>
            <span className="v">{fmtMoney(s.price)}</span>
          </div>
          <div className="modal-row">
            <span className="k">ยอดรวม</span>
            <span className="v">{fmtMoney(total)}</span>
          </div>
          <div className="modal-row">
            <span className="k">สิทธิ์การซื้อขาย</span>
            <span className="v">1 ครั้งต่อรอบ</span>
          </div>
          <button className={"modal-btn " + (type === "buy" ? "primary-buy" : "primary-sell")} onClick={onConfirm}>
            ยืนยัน{type === "buy" ? "ซื้อ" : "ขาย"}
          </button>
          <button className="modal-btn secondary" onClick={onBack}>
            ย้อนกลับ
          </button>
        </div>
      </div>
    );
  }

  // step === "success"
  const t = lastTx;
  const typeLabel = t && t.type === "buy" ? "ซื้อ" : "ขาย";
  return (
    <div className="modal-overlay active" onClick={stopAndClose}>
      <div className="modal-card">
        <div className="success-wrap">
          <div className="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#0b2e1c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div className="success-title">ทำรายการสำเร็จ</div>
          <div className="success-sub">การซื้อขายของคุณเสร็จสมบูรณ์แล้ว</div>
        </div>
        {t && (
          <>
            <div className="modal-row">
              <span className="k">หุ้น</span>
              <span className="v">{t.symbol}</span>
            </div>
            <div className="modal-row">
              <span className="k">ประเภท</span>
              <span className="v">{typeLabel}</span>
            </div>
            <div className="modal-row">
              <span className="k">จำนวน</span>
              <span className="v">{t.quantity} หุ้น</span>
            </div>
            <div className="modal-row">
              <span className="k">ยอดรวม</span>
              <span className="v">{fmtMoney(t.total)}</span>
            </div>
          </>
        )}
        <button className="modal-btn primary-buy" onClick={onDone}>
          เสร็จสิ้น
        </button>
      </div>
    </div>
  );
}

function DetailModal({ stock: s, holding, canTradeNow, onClose, onBuy, onSell }) {
  const chg = stockChangePct(s);
  const up = chg >= 0;
  const canSell = holding && holding.quantity > 0;

  function stopAndClose(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-overlay active" onClick={stopAndClose}>
      <div className="modal-card" style={{ maxWidth: 460 }}>
        <div className="modal-top">
          <div>
            <h3>{s.symbol}</h3>
            <div style={{ fontSize: ".8rem", color: "var(--text-2)" }}>{s.name}</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="sc-price">{fmtMoney(s.price)}</div>
        <div className={"sc-change " + (up ? "up" : "down")}>{fmtPct(chg)} วันนี้</div>
        <div className="detail-chart">
          <Sparkline history={s.history} up={up} w={400} h={150} gradientId={"grad-detail-" + s.id} />
        </div>
        <div className="detail-stats">
          <div className="detail-stat">
            <div className="k">เปิด</div>
            <div className="v">{fmtMoney(s.open)}</div>
          </div>
          <div className="detail-stat">
            <div className="k">สูงสุด</div>
            <div className="v">{fmtMoney(s.high)}</div>
          </div>
          <div className="detail-stat">
            <div className="k">ต่ำสุด</div>
            <div className="v">{fmtMoney(s.low)}</div>
          </div>
          <div className="detail-stat">
            <div className="k">ปริมาณ</div>
            <div className="v">{s.volume.toLocaleString()}</div>
          </div>
        </div>
        {canSell && (
          <>
            <div className="modal-row">
              <span className="k">ถืออยู่</span>
              <span className="v">{holding.quantity} หุ้น</span>
            </div>
            <div className="modal-row">
              <span className="k">ราคาซื้อเฉลี่ย</span>
              <span className="v">{fmtMoney(holding.averagePrice)}</span>
            </div>
            <div className="modal-row">
              <span className="k">กำไร/ขาดทุน</span>
              <span className={"v " + (s.price - holding.averagePrice >= 0 ? "pos" : "neg")}>
                {fmtMoney((s.price - holding.averagePrice) * holding.quantity)}
              </span>
            </div>
          </>
        )}
        <div className="detail-actions">
          <button className="sc-btn buy" disabled={!canTradeNow} onClick={onBuy}>
            ซื้อ
          </button>
          <button className="sc-btn sell" disabled={!canTradeNow || !canSell} onClick={onSell}>
            ขาย
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- styles ---------------- */
const rootStyle = { minHeight: "100vh" };

const CSS = `
:root{
  --bg-0:#0a0806; --bg-1:#120d09;
  --bg-panel: rgba(255,255,255,0.035);
  --gold-1:#f4d160; --gold-2:#d4af37; --gold-3:#8b6914;
  --gold-line: rgba(212,175,55,0.35);
  --up:#3ecf8e; --up-glow: rgba(62,207,142,0.35);
  --down:#e9596b; --down-glow: rgba(233,89,107,0.35);
  --text-0:#f5ecd8; --text-1:#c9bda0; --text-2:#8c8170;
  --radius-lg:18px; --radius-md:12px; --radius-sm:8px;
  --font-display:'Cormorant Garamond','Noto Serif Thai',serif;
  --font-mono:'IBM Plex Mono','Noto Sans Thai',ui-monospace,monospace;
  --font-body:'Inter','Noto Sans Thai',-apple-system,'Segoe UI',sans-serif;
}
*{box-sizing:border-box;}
.container{max-width:1180px;margin:0 auto;padding:0 1.5rem;}
@media (max-width:640px){.container{padding:0 1rem;}}
body,.st-root{background:radial-gradient(1200px 700px at 15% -10%, rgba(212,175,55,0.10), transparent 60%),radial-gradient(900px 600px at 100% 0%, rgba(139,105,20,0.08), transparent 55%),var(--bg-0);color:var(--text-0);font-family:var(--font-body);}
header.top{border-bottom:1px solid var(--gold-line);background:linear-gradient(180deg, rgba(20,15,8,0.9), rgba(10,8,6,0.4));backdrop-filter:blur(6px);position:sticky;top:0;z-index:40;}
.top-inner{display:flex;align-items:center;justify-content:space-between;padding:1.1rem 0;}
.brand{display:flex;align-items:center;gap:.65rem;}
.brand-mark{width:38px;height:38px;border-radius:50%;background:conic-gradient(from 220deg, var(--gold-3), var(--gold-1), var(--gold-2), var(--gold-3));display:flex;align-items:center;justify-content:center;box-shadow:0 0 18px rgba(212,175,55,0.35), inset 0 0 8px rgba(0,0,0,0.4);flex-shrink:0;}
.brand-mark svg{width:19px;height:19px;}
.brand-text h1{font-family:var(--font-display);font-weight:600;font-size:1.5rem;margin:0;letter-spacing:.02em;background:linear-gradient(135deg, var(--gold-1), #fff5da 40%, var(--gold-2));-webkit-background-clip:text;background-clip:text;color:transparent;}
.brand-text p{margin:0;font-size:.72rem;color:var(--text-2);}
.balance-chip{display:flex;align-items:center;gap:.9rem;background:var(--bg-panel);border:1px solid var(--gold-line);border-radius:999px;padding:.55rem 1.1rem .55rem .8rem;}
.balance-chip .dot{width:8px;height:8px;border-radius:50%;background:var(--up);box-shadow:0 0 8px var(--up-glow);flex-shrink:0;}
.balance-chip .lbl{font-size:.68rem;color:var(--text-2);}
.balance-chip .val{font-family:var(--font-mono);font-size:1.05rem;font-weight:600;color:var(--gold-1);}
.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--gold-line);border:1px solid var(--gold-line);border-radius:var(--radius-lg);overflow:hidden;margin:1.75rem 0 1.5rem;}
@media (max-width:760px){.summary-grid{grid-template-columns:repeat(2,1fr);}}
.summary-cell{background:linear-gradient(180deg, rgba(24,18,10,0.9), rgba(14,10,6,0.9));padding:1.1rem 1.25rem;}
.summary-cell .lbl{font-size:.7rem;color:var(--text-2);margin-bottom:.4rem;}
.summary-cell .num{font-family:var(--font-mono);font-size:1.4rem;font-weight:600;color:var(--text-0);}
.summary-cell .num.pos{color:var(--up);} .summary-cell .num.neg{color:var(--down);}
.summary-cell .sub{font-size:.72rem;color:var(--text-2);margin-top:.25rem;}
.trade-status{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem;background:var(--bg-panel);border:1px solid var(--gold-line);border-radius:var(--radius-md);padding:.85rem 1.25rem;margin-bottom:1.75rem;}
.trade-status .left{display:flex;align-items:center;gap:.6rem;}
.trade-status .pulse{width:9px;height:9px;border-radius:50%;background:var(--up);box-shadow:0 0 10px var(--up-glow);animation:pulse 2s ease-in-out infinite;}
.trade-status.locked .pulse{background:var(--text-2);box-shadow:none;animation:none;}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
.trade-status .title{font-size:.92rem;font-weight:500;}
.trade-status .sub{font-size:.78rem;color:var(--text-2);}
.trade-status .countdown{font-family:var(--font-mono);font-size:.95rem;color:var(--gold-1);background:rgba(212,175,55,0.08);border:1px solid var(--gold-line);padding:.35rem .75rem;border-radius:999px;}
.section-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:1rem;}
.section-head h2{font-family:var(--font-display);font-size:1.5rem;font-weight:600;margin:0;color:var(--text-0);}
.section-head .hint{font-size:.78rem;color:var(--text-2);}
.stock-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2.25rem;}
@media (max-width:980px){.stock-grid{grid-template-columns:repeat(2,1fr);}}
@media (max-width:560px){.stock-grid{grid-template-columns:1fr;}}
.stock-card{position:relative;background:linear-gradient(155deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015));border:1px solid var(--gold-line);border-radius:var(--radius-lg);padding:1.15rem 1.15rem 1rem;cursor:pointer;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease;overflow:hidden;}
.stock-card:hover{transform:translateY(-3px);border-color:rgba(244,209,96,0.55);box-shadow:0 14px 30px rgba(0,0,0,0.35);}
.stock-card .sc-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:.7rem;}
.stock-card .sc-name{font-size:.82rem;color:var(--text-1);font-weight:500;}
.stock-card .sc-sym{font-family:var(--font-display);font-size:1.3rem;font-weight:700;color:var(--text-0);letter-spacing:.02em;}
.stock-card .sc-badge{font-size:.7rem;padding:.2rem .5rem;border-radius:999px;border:1px solid;flex-shrink:0;}
.sc-badge.up{color:var(--up);border-color:rgba(62,207,142,0.4);background:rgba(62,207,142,0.08);}
.sc-badge.down{color:var(--down);border-color:rgba(233,89,107,0.4);background:rgba(233,89,107,0.08);}
.stock-card .sc-price{font-family:var(--font-mono);font-size:1.65rem;font-weight:600;color:var(--text-0);margin-bottom:.1rem;}
.stock-card .sc-change{font-size:.85rem;font-weight:500;margin-bottom:.75rem;}
.sc-change.up{color:var(--up);} .sc-change.down{color:var(--down);}
.sc-chart{width:100%;height:56px;margin-bottom:.85rem;display:block;}
.sc-holding{font-size:.72rem;color:var(--text-2);margin-bottom:.7rem;display:flex;justify-content:space-between;border-top:1px dashed rgba(255,255,255,0.08);padding-top:.55rem;}
.sc-holding b{color:var(--gold-1);font-family:var(--font-mono);font-weight:600;}
.sc-actions{display:flex;gap:.55rem;}
.sc-btn{flex:1;padding:.55rem 0;border-radius:var(--radius-sm);border:1px solid;font-size:.82rem;font-weight:600;cursor:pointer;transition:filter .15s ease,transform .1s ease,opacity .15s ease;}
.sc-btn:active{transform:scale(0.97);}
.sc-btn.buy{background:linear-gradient(135deg, var(--gold-1), var(--gold-2));color:#241a05;border-color:var(--gold-2);}
.sc-btn.buy:hover{filter:brightness(1.08);}
.sc-btn.sell{background:transparent;color:var(--text-0);border-color:rgba(255,255,255,0.18);}
.sc-btn.sell:hover{border-color:rgba(233,89,107,0.55);color:var(--down);}
.sc-btn:disabled{opacity:.35;cursor:not-allowed;filter:none !important;}
.holdings-panel{background:var(--bg-panel);border:1px solid var(--gold-line);border-radius:var(--radius-lg);padding:.25rem;margin-bottom:2rem;}
.holdings-empty{padding:2.5rem 1rem;text-align:center;color:var(--text-2);font-size:.88rem;}
table.holdings{width:100%;border-collapse:collapse;}
table.holdings th{text-align:left;font-size:.72rem;color:var(--text-2);padding:.9rem 1.1rem .6rem;font-weight:500;}
table.holdings td{padding:.85rem 1.1rem;font-size:.88rem;border-top:1px solid rgba(255,255,255,0.06);}
table.holdings td.sym{font-family:var(--font-display);font-weight:700;font-size:1.05rem;}
table.holdings td.num{font-family:var(--font-mono);}
table.holdings td.pos{color:var(--up);} table.holdings td.neg{color:var(--down);}
table.holdings th.num,table.holdings td.num{text-align:right;}
.mini-actions{display:flex;gap:.4rem;justify-content:flex-end;}
.mini-btn{padding:.3rem .65rem;border-radius:999px;font-size:.72rem;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.15);background:transparent;color:var(--text-1);}
.mini-btn.buy{color:var(--gold-1);border-color:var(--gold-line);}
.mini-btn.sell{color:var(--down);border-color:rgba(233,89,107,0.3);}
.mini-btn:disabled{opacity:.3;cursor:not-allowed;}
.history-panel{background:var(--bg-panel);border:1px solid var(--gold-line);border-radius:var(--radius-lg);padding:1.1rem 1.1rem 0.3rem;margin-bottom:2rem;}
.history-row{display:flex;align-items:center;justify-content:space-between;padding:.7rem 0;border-top:1px solid rgba(255,255,255,0.06);font-size:.85rem;}
.history-row:first-of-type{border-top:none;}
.history-row .h-left{display:flex;align-items:center;gap:.65rem;}
.history-tag{font-size:.68rem;padding:.18rem .5rem;border-radius:5px;font-weight:700;}
.history-tag.buy{background:rgba(244,209,96,0.12);color:var(--gold-1);}
.history-tag.sell{background:rgba(233,89,107,0.1);color:var(--down);}
.history-row .h-sym{font-family:var(--font-display);font-weight:700;}
.history-row .h-meta{color:var(--text-2);font-size:.78rem;}
.history-row .h-total{font-family:var(--font-mono);}
.history-empty{padding:2rem 0;text-align:center;color:var(--text-2);font-size:.85rem;}
.modal-overlay{position:fixed;inset:0;background:rgba(4,3,2,0.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100;padding:1rem;}
.modal-card{width:100%;max-width:420px;background:linear-gradient(165deg, #171009, #0d0a06);border:1px solid var(--gold-line);border-radius:var(--radius-lg);padding:1.5rem;box-shadow:0 30px 60px rgba(0,0,0,0.55);max-height:88vh;overflow-y:auto;}
.modal-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.1rem;}
.modal-top h3{font-family:var(--font-display);font-size:1.5rem;margin:0;font-weight:700;}
.modal-close{background:none;border:none;color:var(--text-2);font-size:1.3rem;cursor:pointer;line-height:1;padding:.2rem;}
.modal-close:hover{color:var(--text-0);}
.modal-row{display:flex;justify-content:space-between;align-items:center;padding:.6rem 0;border-top:1px solid rgba(255,255,255,0.07);font-size:.86rem;}
.modal-row:first-of-type{border-top:none;}
.modal-row .k{color:var(--text-2);}
.modal-row .v{font-family:var(--font-mono);font-weight:600;}
.modal-row .v.pos{color:var(--up);} .modal-row .v.neg{color:var(--down);}
.qty-control{display:flex;align-items:center;justify-content:center;gap:1rem;margin:1.1rem 0;}
.qty-btn{width:42px;height:42px;border-radius:50%;border:1px solid var(--gold-line);background:rgba(255,255,255,0.03);color:var(--gold-1);font-size:1.3rem;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.qty-btn:hover{background:rgba(244,209,96,0.1);}
.qty-btn:disabled{opacity:.3;cursor:not-allowed;}
.qty-val{font-family:var(--font-mono);font-size:1.7rem;font-weight:700;min-width:70px;text-align:center;}
.qty-slider{width:100%;margin:.2rem 0 1rem;accent-color:var(--gold-2);}
.modal-error{font-size:.8rem;color:var(--down);background:rgba(233,89,107,0.08);border:1px solid rgba(233,89,107,0.3);border-radius:var(--radius-sm);padding:.55rem .75rem;margin-top:.6rem;}
.modal-btn{width:100%;padding:.85rem 0;border-radius:var(--radius-sm);border:1px solid;font-size:.92rem;font-weight:700;cursor:pointer;margin-top:1.2rem;}
.modal-btn.primary-buy{background:linear-gradient(135deg, var(--gold-1), var(--gold-2));color:#241a05;border-color:var(--gold-2);}
.modal-btn.primary-sell{background:linear-gradient(135deg, #f07a86, var(--down));color:#2b0a0d;border-color:var(--down);}
.modal-btn.secondary{background:transparent;color:var(--text-1);border-color:rgba(255,255,255,0.18);margin-top:.6rem;}
.modal-btn:disabled{opacity:.4;cursor:not-allowed;}
.success-wrap{text-align:center;padding:.5rem 0 .25rem;}
.success-icon{width:56px;height:56px;border-radius:50%;margin:0 auto .9rem;background:radial-gradient(circle at 35% 30%, var(--up), #146b45);display:flex;align-items:center;justify-content:center;box-shadow:0 0 24px var(--up-glow);}
.success-icon svg{width:26px;height:26px;}
.success-title{font-family:var(--font-display);font-size:1.4rem;font-weight:700;margin:0 0 .3rem;}
.success-sub{color:var(--text-2);font-size:.85rem;margin-bottom:1rem;}
.detail-chart{width:100%;height:150px;margin:.8rem 0 1rem;}
.detail-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin-bottom:1rem;}
.detail-stat{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:var(--radius-sm);padding:.55rem .4rem;text-align:center;}
.detail-stat .k{font-size:.66rem;color:var(--text-2);margin-bottom:.2rem;}
.detail-stat .v{font-family:var(--font-mono);font-size:.86rem;font-weight:600;}
.detail-actions{display:flex;gap:.6rem;margin-top:1rem;}
.detail-actions .sc-btn{padding:.7rem 0;}
.footer-note{text-align:center;color:var(--text-2);font-size:.74rem;margin-top:2.5rem;}
@media (prefers-reduced-motion: reduce){*{animation:none !important;transition:none !important;}}
`;
