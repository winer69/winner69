// หวยไทย / หวยลาว / หวยด่วน - member page + admin panel.
// Everything that touches credits happens on the server (backend/src/lottery.js);
// these screens only show data and send requests. Needs VITE_API_URL.
import { useEffect, useMemo, useRef, useState } from "react";

const TYPE_ORDER = ["top3", "tod3", "top2", "bottom2", "runTop", "runBottom"];
const TYPE_LABEL = { top3: "3 ตัวบน", tod3: "3 ตัวโต๊ด", top2: "2 ตัวบน", bottom2: "2 ตัวล่าง", runTop: "วิ่งบน", runBottom: "วิ่งล่าง" };
const TYPE_DIGITS = { top3: 3, tod3: 3, top2: 2, bottom2: 2, runTop: 1, runBottom: 1 };
const ROUND_TYPE = { thai: "🇹🇭 หวยไทย", lao: "🇱🇦 หวยลาว", quick: "⚡ หวยด่วน" };
const STATUS_LABEL = { pending: "รอผล", won: "ถูกรางวัล", lost: "ไม่ถูก", cancelled: "ยกเลิก (คืนเครดิต)" };
const ERR = {
  round_closed: "งวดนี้ปิดรับแล้ว", blocked: "มีเลขที่ปิดรับ (เลขอั้น) อยู่ในโพย", bad_number: "เลขไม่ถูกต้อง",
  bad_amount: "จำนวนเงินต่อเลขไม่ถูกต้อง", bad_type: "ประเภทนี้ปิดรับอยู่", insufficient_balance: "เครดิตไม่พอ",
};

const fmt = (n) => Number(n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });
const fmtTime = (ms) => new Date(ms).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
function countdown(ms) {
  if (ms <= 0) return "ปิดรับแล้ว";
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return `${d} วัน ${h} ชม.`;
  if (h > 0) return `${h} ชม. ${m} นาที`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
// all orderings of a number, without repeats ("กลับเลข")
function permutations(str) {
  if (str.length <= 1) return [str];
  const out = new Set();
  str.split("").forEach((c, i) => permutations(str.slice(0, i) + str.slice(i + 1)).forEach((p) => out.add(c + p)));
  return [...out];
}
function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}
const badge = (bg, color = "#fff") => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: bg, color });
const box = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, marginBottom: 10 };
const ResultBalls = ({ result }) => result ? (
  <span style={{ display: "inline-flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
    <span>3 ตัวบน <b style={{ fontSize: 18, letterSpacing: 2, color: "var(--gold, #f4c542)" }}>{result.top3}</b></span>
    <span>2 ตัวล่าง <b style={{ fontSize: 18, letterSpacing: 2, color: "var(--gold, #f4c542)" }}>{result.bottom2}</b></span>
    {result.firstPrize && <span style={{ opacity: 0.7, fontSize: 12 }}>(รางวัลที่ 1: {result.firstPrize})</span>}
  </span>
) : null;

// Scoped styles: every input/select fills its own cell (fixes fields spilling out of their boxes)
const LOTTO_CSS = `
.lotto, .lotto * { box-sizing:border-box; }
.lotto label { display:block; min-width:0; }
.lotto .field-input { display:block; width:100%; min-width:0; margin-top:4px; }
.lotto .grid-auto { display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; }
.lotto .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.lotto .btn-row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
.lotto .btn-row > button { flex:1 1 auto; }
.lotto .seg { display:grid; grid-auto-flow:column; grid-auto-columns:1fr; gap:4px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:4px; }
.lotto .seg button { border:none; border-radius:9px; padding:10px 4px; font-family:Prompt,sans-serif; font-weight:700; font-size:13px; background:transparent; color:inherit; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lotto .seg button.on { background:var(--gold2, #e8c766); color:#1a1300; }
.lotto .step { display:flex; align-items:center; gap:8px; font-family:Prompt,sans-serif; font-weight:800; font-size:15px; margin:18px 0 8px; }
.lotto .step b { display:inline-grid; place-items:center; width:24px; height:24px; border-radius:50%; background:var(--gold2, #e8c766); color:#1a1300; font-size:13px; flex:0 0 auto; }
.lotto .pick { text-align:left; border:2px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.04); color:inherit; border-radius:12px; padding:10px; cursor:pointer; min-width:0; }
.lotto .pick.on { border-color:var(--gold2, #e8c766); background:rgba(232,199,102,0.12); }
.lotto .pick .big { font-family:Prompt,sans-serif; font-weight:800; font-size:15px; }
.lotto .pick .sub { font-size:11.5px; opacity:0.75; margin-top:2px; }
.lotto .digits { display:flex; justify-content:center; gap:8px; margin:6px 0 10px; }
.lotto .digit { width:52px; height:62px; border-radius:12px; display:grid; place-items:center; font-family:Prompt,sans-serif; font-weight:800; font-size:32px; background:rgba(0,0,0,0.35); border:2px solid rgba(255,255,255,0.12); }
.lotto .digit.fill { border-color:var(--gold2, #e8c766); color:var(--gold2, #e8c766); }
.lotto .keypad { display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; }
.lotto .keypad button { padding:13px 0; font-size:20px; font-weight:800; font-family:Prompt,sans-serif; border-radius:10px; border:1px solid rgba(255,255,255,0.10); background:rgba(255,255,255,0.06); color:inherit; cursor:pointer; }
.lotto .keypad button:active { transform:scale(0.96); }
.lotto .chips { display:grid; grid-template-columns:repeat(6, 1fr); gap:6px; }
.lotto .chips button { min-width:0; padding:9px 0; border-radius:9px; font-weight:700; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:inherit; cursor:pointer; }
.lotto .chips button.on { background:var(--gold2, #e8c766); color:#1a1300; border-color:transparent; }
.lotto .sticky-bar { position:sticky; bottom:0; z-index:5; padding:10px 0 calc(10px + env(safe-area-inset-bottom, 0px)); background:linear-gradient(180deg, rgba(10,16,36,0) 0%, var(--surface, #0a1024) 35%); }
.lotto .sec { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:14px; margin-bottom:12px; }
.lotto .sec-title { font-family:Prompt,sans-serif; font-weight:800; font-size:15px; margin-bottom:10px; }
.lotto .limit-row { border-top:1px dashed rgba(255,255,255,0.08); padding:8px 0; }
.lotto .limit-row:first-of-type { border-top:none; }
@media (max-width:380px) { .lotto .digit { width:44px; height:54px; font-size:26px; } .lotto .grid-2 { grid-template-columns:1fr; } }
`;
const LottoStyle = () => <style>{LOTTO_CSS}</style>;

const TYPE_HINT = { top3: "ตรง 3 ตัวท้ายรางวัลที่ 1", tod3: "3 ตัวสลับตำแหน่งได้", top2: "ตรง 2 ตัวท้ายของ 3 ตัวบน", bottom2: "ตรง 2 ตัวล่าง", runTop: "มีเลขนี้ใน 3 ตัวบน", runBottom: "มีเลขนี้ใน 2 ตัวล่าง" };
const AMOUNT_CHIPS = [5, 10, 20, 50, 100, 500];

// =====================================================================
// Member page - "ซื้อหวย / ช่องเก็บหวย" (paper-ticket design). Data and money still go
// through the server (rounds, rates, blocked numbers, results set by the admin).
// =====================================================================
const LT_C = {
  bg: "#1E0609", panel: "#350B12", panel2: "#4A111B", line: "#6E2A20",
  gold: "#F2C14E", goldDeep: "#B8862B", red: "#C8102E", redDeep: "#8E0B20",
  text: "#FBEBD0", mute: "#C9A98A", paperInk: "#3B0A10",
};
const LT_TYPE_STYLE = {
  top2: { tint: ["#FFF4DC", "#F2C2A0"], ink: "#C8102E" },
  bottom2: { tint: ["#FFF1E4", "#E7B4A4"], ink: "#7A1020" },
  top3: { tint: ["#FFF8E6", "#EBD08E"], ink: "#A87418" },
  tod3: { tint: ["#FFF3DA", "#E9BE7E"], ink: "#9E2B0E" },
  runTop: { tint: ["#F4FFE9", "#BFE3A0"], ink: "#2E7D32" },
  runBottom: { tint: ["#EAF6FF", "#A8CBEB"], ink: "#1F4FBF" },
};
const LT_TYPE_ORDER = ["top2", "bottom2", "top3", "tod3", "runTop", "runBottom"];
const LT_QUICK = [10, 20, 50, 100];
const LT_STAMP = { pending: { t: "รอผล", c: "#1565c0" }, won: { t: "ถูกรางวัล", c: "#2e7d32" }, lost: { t: "ไม่ถูก", c: "#6d6d6d" }, cancelled: { t: "ยกเลิก", c: "#6d4c41" } };
const ltSerial = (seed) => { let h = 2166136261; for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return String((h >>> 0) % 1e7).padStart(7, "0"); };
const ltBaht = (n) => Number(n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });

function LtLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="lt-wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE08A" /><stop offset="0.5" stopColor="#F2C14E" /><stop offset="1" stopColor="#B8862B" /></linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#lt-wg)" />
      <circle cx="32" cy="32" r="30" fill="none" stroke="#7A1020" strokeWidth="2" strokeDasharray="5 4" />
      <circle cx="32" cy="32" r="22" fill="#C8102E" stroke="#FFE08A" strokeWidth="2" />
      <text x="32" y="33" textAnchor="middle" fontFamily="Kanit, Prompt, sans-serif" fontWeight="700" fontSize="20" fill="#FFE08A">W</text>
      <text x="32" y="47" textAnchor="middle" fontFamily="Kanit, Prompt, sans-serif" fontWeight="700" fontSize="10" fill="#fff">69</text>
    </svg>
  );
}
function LtWordmark({ size = 20, color = LT_C.gold }) {
  return <span className="lt-wordmark" style={{ fontSize: size, color }}>WINNER<b>69</b></span>;
}

// one paper ticket = one number of a bill
function LtTicket({ t, big, fresh, onClick }) {
  const st = LT_TYPE_STYLE[t.type] || LT_TYPE_STYLE.top2;
  const pattern = `repeating-radial-gradient(circle at 10% 115%, ${st.tint[0]} 0 3px, ${st.tint[1]}70 3px 4px),
    repeating-radial-gradient(circle at 95% -25%, transparent 0 5px, ${st.tint[1]}55 5px 6px)`;
  const stamp = LT_STAMP[t.status];
  return (
    <button onClick={onClick} className={`lt-tk${fresh ? " lt-tk-in" : ""}`} style={{ background: st.tint[0], fontSize: big ? 18 : 16 }}
      aria-label={`ใบหวย ${TYPE_LABEL[t.type]} เลข ${t.number}`}>
      <div className="lt-tk-stub">
        <LtLogo size={26} />
        <span>{TYPE_LABEL[t.type]}</span>
        <small>No.{t.serial.slice(-3)}</small>
      </div>
      <div className="lt-tk-main" style={{ backgroundImage: pattern }}>
        <div className="lt-tk-head">
          <LtWordmark size={17} color={LT_C.redDeep} />
          <span>{t.roundTitle}</span>
        </div>
        <div className="lt-tk-digits">
          {t.number.split("").map((d, i) => <span key={i} style={{ color: st.ink }}>{d}</span>)}
          {stamp
            ? <div className="lt-tk-stamp" style={{ color: stamp.c, borderColor: stamp.c }}>{stamp.t}</div>
            : <div className="lt-tk-seal" aria-hidden="true"><LtLogo size={34} /></div>}
        </div>
        <div className="lt-tk-foot">
          <div>
            <div>ราคา <b>{ltBaht(t.amount)}</b> บาท</div>
            {t.win > 0
              ? <div className="lt-tk-win" style={{ color: "#2e7d32" }}>ได้รับ {ltBaht(t.win)} บาท</div>
              : <div className="lt-tk-win">ถูกรับ {ltBaht(t.amount * (t.rate || 0))} บาท{t.half ? " (จ่ายครึ่ง)" : ""}</div>}
          </div>
          <div className="lt-tk-code">
            <div className="lt-bars">
              {(t.serial + t.number).split("").map((d, i) => <i key={i} style={{ width: (Number(d) % 3) + 1, marginRight: (Number(d) % 2) + 1 }} />)}
            </div>
            <small>{t.serial}</small>
          </div>
        </div>
      </div>
    </button>
  );
}

export function LotteryPage({ onBack, api, balance, topBar }) {
  const now = useNow();
  const [tab, setTab] = useState("buy");
  const [data, setData] = useState(null);
  const [bills, setBills] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [roundId, setRoundId] = useState(null);
  const [typeId, setTypeId] = useState("top2");
  const [digits, setDigits] = useState("");
  const [amount, setAmount] = useState(10);
  const [reverse, setReverse] = useState(false);
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);
  const [freshIds, setFreshIds] = useState([]);
  const [opened, setOpened] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [sending, setSending] = useState(false);
  const rollTimer = useRef(null);

  const load = () => api.get("/api/lottery/rounds")
    .then((r) => { setData(r); setLoadError(""); setRoundId((cur) => (cur && r.open.some((x) => x.id === cur) ? cur : r.open[0]?.id || null)); })
    .catch(() => setLoadError("โหลดข้อมูลหวยไม่ได้ ลองใหม่อีกครั้ง"));
  const loadTickets = () => api.member("/api/lottery/my-tickets").then((r) => setBills(r.tickets || [])).catch(() => {});
  useEffect(() => {
    load(); loadTickets();
    const t = setInterval(() => { if (!document.hidden) { load(); loadTickets(); } }, 15000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearInterval(rollTimer.current), []);

  const round = data?.open.find((r) => r.id === roundId) || null;
  const rates = data?.rates || {};
  const types = LT_TYPE_ORDER.filter((t) => rates[t] > 0);
  useEffect(() => { if (types.length && !types.includes(typeId)) setTypeId(types[0]); }, [types.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const nDigits = TYPE_DIGITS[typeId] || 2;
  const canReverse = nDigits > 1 && typeId !== "tod3";
  const cartTotal = cart.reduce((s, c) => s + c.amount, 0);
  const closesIn = round ? round.closeAt - now : 0;

  // every number of every bill becomes one paper ticket in the vault
  const tickets = useMemo(() => bills.flatMap((b) => b.lines.map((l, i) => ({
    id: `${b.id}-${i}`, billId: b.id, line: i, hidden: (b.hidden || []).includes(i), status: b.status === "won" ? (l.win > 0 ? "won" : "lost") : b.status,
    type: l.type, number: l.number, amount: l.amount, win: l.win || 0, rate: rates[l.type] || 0,
    serial: ltSerial(`${b.id}-${i}`), roundTitle: b.round ? b.round.title : "งวดที่ถูกลบ",
    drawAt: b.round ? b.round.drawAt : b.time, result: b.round ? b.round.result : null, time: b.time,
  }))).filter((t) => t.status === "pending" || !t.hidden), [bills, rates]);
  const groups = useMemo(() => {
    const g = new Map();
    tickets.forEach((t) => { const k = t.roundTitle; if (!g.has(k)) g.set(k, { title: k, drawAt: t.drawAt, result: t.result, list: [] }); g.get(k).list.push(t); });
    return [...g.values()];
  }, [tickets]);
  const pendingCount = tickets.filter((t) => t.status === "pending").length;
  const drawnCount = tickets.length - pendingCount;
  const [confirmDel, setConfirmDel] = useState("");
  async function removeTickets(body, key) {
    if (confirmDel !== key) { setConfirmDel(key); setTimeout(() => setConfirmDel((k) => (k === key ? "" : k)), 3000); return; }
    setConfirmDel("");
    try {
      await api.memberPost("/api/lottery/my-tickets/hide", body);
      setBills((bs) => bs.map((b) => {
        if (b.status === "pending") return b;
        const all = b.lines.map((_, i) => i);
        const hit = body.all || (body.ids && body.ids.includes(b.id)) || body.id === b.id;
        if (!hit) return b;
        const add = body.line !== undefined && body.id === b.id ? [body.line] : all;
        return { ...b, hidden: [...new Set([...(b.hidden || []), ...add])] };
      }));
      setOpened(null); flash("ลบใบหวยแล้ว");
      loadTickets();
    } catch (e) { flash("ลบไม่สำเร็จ ลองใหม่อีกครั้ง", "err"); }
  }

  const flash = (msg, kind = "ok") => { setToast({ msg, kind, k: Date.now() }); setTimeout(() => setToast(null), 2200); };
  const press = (d) => { if (!rolling) setDigits((p) => (p.length < nDigits ? p + d : p)); };
  const backspace = () => setDigits((p) => p.slice(0, -1));
  const randomDigits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
  function randomize() {
    if (rolling) return;
    setRolling(true);
    let ticks = 0;
    rollTimer.current = setInterval(() => {
      ticks += 1;
      setDigits(randomDigits(nDigits));
      if (ticks >= 12) { clearInterval(rollTimer.current); setRolling(false); }
    }, 55);
  }
  const changeType = (id) => { if (rolling) return; setTypeId(id); setDigits((p) => p.slice(0, TYPE_DIGITS[id])); };

  function addToCart() {
    if (rolling) return;
    if (!round) return flash("ยังไม่มีงวดที่เปิดรับ", "err");
    if (digits.length !== nDigits) return flash(`ใส่เลขให้ครบ ${nDigits} หลัก`, "err");
    if (!amount || amount < 1) return flash("ใส่จำนวนเงินอย่างน้อย 1 บาท", "err");
    if (data && amount > data.maxPerLine) return flash(`สูงสุดเลขละ ${ltBaht(data.maxPerLine)} บาท`, "err");
    const nums = reverse && canReverse ? permutations(digits) : [digits];
    const blocked = round.blocked?.[typeId] || [];
    const ok = nums.filter((n) => !blocked.includes(n));
    if (!ok.length) return flash(`เลข ${nums.join(", ")} ปิดรับ (เลขอั้น)`, "err");
    setCart((c) => [...c, ...ok.map((n) => ({ key: Math.random().toString(36).slice(2), typeId, number: n, amount }))].slice(0, 200));
    flash(ok.length < nums.length ? `เพิ่ม ${ok.length} รายการ (ข้ามเลขอั้น ${nums.length - ok.length})` : `เพิ่ม ${ok.length} รายการลงโพยแล้ว`);
    setDigits("");
  }

  async function buy() {
    if (!cart.length || sending) return;
    if (!round) return flash("ยังไม่มีงวดที่เปิดรับ", "err");
    if (closesIn <= 0) return flash("งวดนี้ปิดรับแล้ว", "err");
    if (cartTotal > balance) return flash(`เครดิตไม่พอ ขาดอีก ${ltBaht(cartTotal - balance)} บาท`, "err");
    setSending(true);
    try {
      const id = "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      await api.action("/api/lottery/tickets", { id, roundId: round.id, lines: cart.map((c) => ({ type: c.typeId, number: c.number, amount: c.amount })) });
      const n = cart.length;
      setCart([]);
      setFreshIds(Array.from({ length: n }, (_, i) => `${id}-${i}`));
      setTimeout(() => setFreshIds([]), 1600);
      await loadTickets();
      setTab("vault");
      flash(`ซื้อแล้ว ${n} ใบ เก็บไว้ในช่องเก็บหวย`);
    } catch (e) {
      flash(ERR[e && e.message] || "ซื้อไม่สำเร็จ ลองใหม่อีกครั้ง", "err");
      load();
    } finally { setSending(false); }
  }

  useEffect(() => {
    if (tab !== "buy") return undefined;
    const onKey = (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Enter") addToCart();
      else if (e.key.toLowerCase() === "r") randomize();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="game-wrap" data-wm="🎟️">
      {topBar}
      <div className="lt">
        <style>{LT_CSS}</style>
        <header className="lt-top">
          <div className="lt-brand">
            <LtLogo size={46} />
            <div>
              <LtWordmark size={24} />
              <div className="lt-brand-sub">{round ? `${ROUND_TYPE[round.type] || ""} · ${round.title}` : "หวยไทย · หวยลาว · หวยด่วน"}</div>
            </div>
          </div>
          <div className="lt-wallet"><small>เครดิต</small><b>{ltBaht(balance)}</b></div>
        </header>

        <main className="lt-body">
          {loadError && <div className="lt-panel lt-err">{loadError}</div>}
          {tab === "buy" ? (
            !data ? <div className="lt-panel lt-empty">กำลังโหลด…</div> : data.open.length === 0 ? (
              <div className="lt-panel lt-empty-vault">
                <LtLogo size={64} />
                <p>ยังไม่มีงวดที่เปิดรับตอนนี้{data.waiting.length > 0 ? ` (รอออกผล ${data.waiting.length} งวด)` : ""}</p>
                <button className="lt-primary" onClick={() => setTab("vault")}>ดูช่องเก็บหวย</button>
              </div>
            ) : (<>
              <section className="lt-panel">
                {data.open.length > 1 && (
                  <div className="lt-rounds">
                    {data.open.map((r) => (
                      <button key={r.id} className={`lt-round${r.id === roundId ? " on" : ""}`} onClick={() => { setRoundId(r.id); setCart([]); }}>
                        <small>{ROUND_TYPE[r.type]}</small><b>{r.title}</b>
                      </button>
                    ))}
                  </div>
                )}
                {round && (
                  <div className="lt-close">
                    งวด <b>{round.title}</b> · ปิดรับใน <b className={closesIn < 3600000 ? "hot" : ""}>{countdown(closesIn)}</b>
                  </div>
                )}
                <div className="lt-types">
                  {types.map((t) => (
                    <button key={t} onClick={() => changeType(t)} className={`lt-type${t === typeId ? " on" : ""}`}>
                      <span>{TYPE_LABEL[t]}</span>
                      <small>บาทละ {ltBaht(rates[t])}</small>
                    </button>
                  ))}
                </div>

                <div className="lt-slots" aria-live="polite">
                  {Array.from({ length: nDigits }).map((_, i) => (
                    <div key={i} className={`lt-slot${i === digits.length && !rolling ? " cur" : ""}${digits[i] ? " filled" : ""}${rolling ? " rolling" : ""}`}>{digits[i] || ""}</div>
                  ))}
                </div>
                <button className="lt-random" onClick={randomize} disabled={rolling}>{rolling ? "กำลังสุ่ม..." : `สุ่มเลข ${TYPE_LABEL[typeId]}`}</button>

                <div className="lt-pad">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => <button key={n} onClick={() => press(n)}>{n}</button>)}
                  <button className="soft" onClick={() => setDigits("")}>ล้าง</button>
                  <button onClick={() => press("0")}>0</button>
                  <button className="soft" onClick={backspace} aria-label="ลบ">⌫</button>
                </div>

                <div className="lt-amount-row">
                  <label htmlFor="lt-amt">ราคาต่อเลข</label>
                  <div className="lt-amt-box">
                    <input id="lt-amt" type="number" min="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value || "0", 10)))} />
                    <span>บาท</span>
                  </div>
                </div>
                <div className="lt-chips">
                  {LT_QUICK.map((q) => <button key={q} className={amount === q ? "on" : ""} onClick={() => setAmount(q)} aria-label={`${q} บาท`}>{q}</button>)}
                </div>

                {canReverse && (
                  <label className="lt-rev">
                    <input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} />
                    <span>กลับเลข (ซื้อทุกตำแหน่งของเลขชุดนี้)</span>
                  </label>
                )}
                {round && (round.blocked?.[typeId] || []).length > 0 && <div className="lt-note">⛔ เลขอั้น (ปิดรับ): {round.blocked[typeId].join(", ")}</div>}
                {round && (round.half?.[typeId] || []).length > 0 && <div className="lt-note">🔸 จ่ายครึ่ง: {round.half[typeId].join(", ")}</div>}

                <button className="lt-primary" onClick={addToCart}>เพิ่มลงโพย</button>
              </section>

              <section className="lt-panel">
                <div className="lt-row-between">
                  <h2>โพยของฉัน</h2>
                  {cart.length > 0 && <button className="lt-link" onClick={() => setCart([])}>ล้างโพย</button>}
                </div>
                {cart.length === 0 ? (
                  <p className="lt-empty">ยังไม่มีเลขในโพย เลือกประเภท กดเลข แล้วเพิ่มลงโพย</p>
                ) : (
                  <ul className="lt-cart">
                    {cart.map((c) => (
                      <li key={c.key}>
                        <span className="lt-tag">{TYPE_LABEL[c.typeId]}</span>
                        <b className="lt-num">{c.number}</b>
                        {(round?.half?.[c.typeId] || []).includes(c.number) && <span className="lt-half">จ่ายครึ่ง</span>}
                        <span className="lt-amt">{ltBaht(c.amount)} ฿</span>
                        <button className="lt-x" aria-label="ลบรายการ" onClick={() => setCart((x) => x.filter((y) => y.key !== c.key))}>×</button>
                      </li>
                    ))}
                  </ul>
                )}
                {cart.length > 0 && (
                  <div className="lt-checkout">
                    <div><small>{cart.length} รายการ</small><b>{ltBaht(cartTotal)} บาท</b></div>
                    <button className="lt-gold" onClick={buy} disabled={sending || closesIn <= 0}>{sending ? "กำลังซื้อ…" : closesIn <= 0 ? "ปิดรับแล้ว" : "ยืนยันซื้อ"}</button>
                  </div>
                )}
              </section>
            </>)
          ) : (
            <section>
              <div className="lt-vault-sum">
                <div><small>ใบหวยทั้งหมด</small><b>{tickets.length} ใบ</b></div>
                <div><small>ยอดซื้อรวม</small><b>{ltBaht(tickets.reduce((s, t) => s + t.amount, 0))} บาท</b></div>
              </div>
              {drawnCount > 0 && (
                <button className={`lt-del-all${confirmDel === "all" ? " sure" : ""}`} onClick={() => removeTickets({ all: true }, "all")}>
                  {confirmDel === "all" ? `แตะอีกครั้งเพื่อลบ ${drawnCount} ใบ` : `🗑 ลบใบที่ออกผลแล้วทั้งหมด (${drawnCount})`}
                </button>
              )}
              {tickets.length === 0 ? (
                <div className="lt-panel lt-empty-vault">
                  <LtLogo size={64} />
                  <p>ช่องเก็บหวยยังว่าง ซื้อเลขแรกแล้วใบหวยจะมาอยู่ที่นี่</p>
                  <button className="lt-primary" onClick={() => setTab("buy")}>ไปซื้อหวย</button>
                </div>
              ) : groups.map((g) => (
                <div key={g.title} className="lt-group">
                  <h3>
                    <span>{g.title} <small>ออกผล {fmtTime(g.drawAt)}</small></span>
                    {g.list.some((t) => t.status !== "pending") && (
                      <button className={`lt-del${confirmDel === "g:" + g.title ? " sure" : ""}`}
                        onClick={() => removeTickets({ ids: [...new Set(g.list.filter((t) => t.status !== "pending").map((t) => t.billId))] }, "g:" + g.title)}>
                        {confirmDel === "g:" + g.title ? "ยืนยันลบ" : "🗑 ลบงวดนี้"}
                      </button>
                    )}
                  </h3>
                  {g.result && (
                    <div className="lt-result">
                      <span>3 ตัวบน <b>{g.result.top3}</b></span>
                      <span>2 ตัวล่าง <b>{g.result.bottom2}</b></span>
                      {g.result.firstPrize && <span className="lt-first">รางวัลที่ 1 {g.result.firstPrize}</span>}
                    </div>
                  )}
                  <div className="lt-stack">
                    {g.list.map((t) => <LtTicket key={t.id} t={t} fresh={freshIds.includes(t.id)} onClick={() => setOpened(t)} />)}
                  </div>
                </div>
              ))}
            </section>
          )}
        </main>

        <nav className="lt-nav">
          <button className={tab === "buy" ? "on" : ""} onClick={() => setTab("buy")}>
            ซื้อหวย{cart.length > 0 && <em>{cart.length}</em>}
          </button>
          <button className={tab === "vault" ? "on" : ""} onClick={() => setTab("vault")}>
            ช่องเก็บหวย{pendingCount > 0 && <em>{pendingCount}</em>}
          </button>
        </nav>

        {opened && (
          <div className="lt-overlay" onClick={() => setOpened(null)}>
            <div className="lt-sheet" onClick={(e) => e.stopPropagation()}>
              <LtTicket t={opened} big />
              <dl>
                <div><dt>ประเภท</dt><dd>{TYPE_LABEL[opened.type]}</dd></div>
                <div><dt>เลข</dt><dd>{opened.number}</dd></div>
                <div><dt>งวด</dt><dd>{opened.roundTitle}</dd></div>
                <div><dt>สถานะ</dt><dd>{(LT_STAMP[opened.status] || {}).t || opened.status}{opened.win > 0 ? ` · ได้ ${ltBaht(opened.win)} บาท` : ""}</dd></div>
                <div><dt>เลขที่บิล</dt><dd>{opened.billId}</dd></div>
                <div><dt>ซื้อเมื่อ</dt><dd>{new Date(opened.time).toLocaleString("th-TH")}</dd></div>
              </dl>
              {opened.status !== "pending" && (
                <button className={`lt-del-one${confirmDel === "t:" + opened.id ? " sure" : ""}`}
                  onClick={() => removeTickets({ id: opened.billId, line: opened.line }, "t:" + opened.id)}>
                  {confirmDel === "t:" + opened.id ? "แตะอีกครั้งเพื่อยืนยันการลบ" : "🗑 ลบใบหวยนี้"}
                </button>
              )}
              <button className="lt-primary" onClick={() => setOpened(null)}>ปิด</button>
            </div>
          </div>
        )}

        {toast && <div key={toast.k} className={`lt-toast ${toast.kind}`} role="status">{toast.msg}</div>}
      </div>
    </div>
  );
}

const LT_GOLD = "linear-gradient(180deg,#FFE08A 0%,#F2C14E 45%,#B8862B 100%)";
const C = LT_C;
const LT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700;800&display=swap');
.lt{width:100%;max-width:440px;margin:0 auto;color:${C.text};position:relative;padding-bottom:76px;border-radius:20px;overflow:hidden;
  font-family:'Sarabun','Leelawadee UI','Thonburi',sans-serif;background-color:${C.bg};
  background-image:radial-gradient(ellipse at 50% -10%, rgba(200,16,46,.55), transparent 60%),
    linear-gradient(45deg, rgba(242,193,78,.05) 25%, transparent 25%, transparent 75%, rgba(242,193,78,.05) 75%),
    linear-gradient(45deg, rgba(242,193,78,.05) 25%, transparent 25%, transparent 75%, rgba(242,193,78,.05) 75%);
  background-size:100% 420px, 28px 28px, 28px 28px;background-position:0 0, 0 0, 14px 14px;background-repeat:no-repeat, repeat, repeat}
.lt *{box-sizing:border-box}
.lt button{font-family:inherit;cursor:pointer}
.lt button:focus-visible,.lt input:focus-visible{outline:3px solid ${C.gold};outline-offset:2px}
.lt-wordmark{font-family:'Kanit','Prompt',sans-serif;font-weight:800;letter-spacing:.04em;line-height:1;font-style:italic}
.lt-wordmark b{color:${C.red};-webkit-text-stroke:1px ${C.gold};margin-left:1px}
.lt-top{padding:18px 18px 46px;display:flex;justify-content:space-between;align-items:center;gap:10px;
  border-bottom:2px solid ${C.goldDeep};border-radius:0 0 28px 28px;background:linear-gradient(180deg,${C.red},${C.redDeep})}
.lt-brand{display:flex;gap:10px;align-items:center;min-width:0}
.lt-brand .lt-wordmark{background:${LT_GOLD};-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 0 rgba(0,0,0,.35))}
.lt-brand .lt-wordmark b{-webkit-text-fill-color:#fff;-webkit-text-stroke:0}
.lt-brand-sub{font-size:13px;color:#FFD9C2;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px}
.lt-wallet{background:rgba(0,0,0,.28);border:1px solid ${C.gold};border-radius:14px;padding:6px 14px;text-align:right;flex-shrink:0}
.lt-wallet small{display:block;font-size:12px;color:${C.mute}}
.lt-wallet b{font-family:'Kanit','Prompt',sans-serif;font-size:20px;color:${C.gold}}
.lt-body{padding:0 14px;margin-top:-30px;display:flex;flex-direction:column;gap:14px}
.lt-panel{background:${C.panel};border-radius:20px;padding:16px;border:1px solid ${C.goldDeep};box-shadow:inset 0 1px 0 rgba(255,224,138,.15),0 12px 24px -16px rgba(0,0,0,.8)}
.lt-err{color:#ffb4a8}
.lt h2{font-family:'Kanit','Prompt',sans-serif;font-size:18px;font-weight:600;margin:0;color:${C.gold}}
.lt-rounds{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:10px}
.lt-round{flex:0 0 auto;min-width:130px;text-align:left;border:1px solid ${C.line};background:${C.panel2};border-radius:12px;padding:8px 10px;color:${C.text};display:flex;flex-direction:column}
.lt-round small{font-size:11px;color:${C.mute}} .lt-round b{font-family:'Kanit','Prompt',sans-serif;font-weight:600}
.lt-round.on{border:2px solid ${C.gold};background:linear-gradient(180deg,${C.red},${C.redDeep})}
.lt-close{font-size:13px;color:${C.mute};margin-bottom:12px} .lt-close b{color:${C.text}} .lt-close b.hot{color:#ff8a7a}
.lt-types{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.lt-type{border:1px solid ${C.line};background:${C.panel2};border-radius:14px;padding:10px;display:flex;flex-direction:column;align-items:flex-start;color:${C.text}}
.lt-type span{font-family:'Kanit','Prompt',sans-serif;font-weight:600;font-size:17px}
.lt-type small{font-size:12px;color:${C.mute}}
.lt-type.on{background:linear-gradient(180deg,${C.red},${C.redDeep});border:2px solid ${C.gold};box-shadow:0 0 0 3px rgba(242,193,78,.18)}
.lt-type.on small{color:#FFD9C2}
.lt-slots{display:flex;justify-content:center;gap:12px;margin:22px 0 18px}
.lt-slot{width:62px;height:76px;border:2px solid ${C.line};border-radius:14px;display:grid;place-items:center;
  font-family:'Kanit','Prompt',sans-serif;font-weight:700;font-size:42px;background:#14040A;color:${C.gold};box-shadow:inset 0 4px 10px rgba(0,0,0,.6)}
.lt-slot.cur{border-style:dashed;border-color:${C.gold}}
.lt-slot.filled{border-color:${C.gold};text-shadow:0 0 12px rgba(242,193,78,.6)}
.lt-slot.rolling{animation:lt-spin .11s linear infinite}
@keyframes lt-spin{0%{transform:translateY(-3px);filter:blur(1px)}50%{transform:translateY(3px);filter:blur(1.5px)}100%{transform:translateY(-3px);filter:blur(1px)}}
.lt-random{display:block;margin:0 auto 16px;padding:9px 22px;border-radius:999px;border:1.5px solid ${C.gold};background:rgba(242,193,78,.08);color:${C.gold};font-family:'Kanit','Prompt',sans-serif;font-weight:600;font-size:15px}
.lt-random:active{background:${LT_GOLD};color:${C.paperInk}}
.lt-random:disabled{opacity:.7;cursor:default}
.lt-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.lt-pad button{height:52px;border:1px solid ${C.line};border-radius:14px;background:${C.panel2};font-family:'Kanit','Prompt',sans-serif;font-size:22px;color:${C.text}}
.lt-pad button:active{background:${C.red};border-color:${C.gold}}
.lt-pad .soft{font-size:16px;color:${C.mute};background:transparent}
.lt-amount-row{display:flex;justify-content:space-between;align-items:center;margin-top:18px}
.lt-amount-row label{font-weight:600}
.lt-amt-box{display:flex;align-items:center;gap:6px;border:1px solid ${C.goldDeep};border-radius:12px;padding:4px 10px;background:#14040A}
.lt-amt-box input{width:80px;border:none;font-family:'Kanit','Prompt',sans-serif;font-size:20px;text-align:right;background:transparent;color:${C.gold};outline:none}
.lt-chips{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}
.lt-chips button{height:44px;border:1px solid ${C.line};border-radius:12px;background:${C.panel2};color:${C.text};font-family:'Kanit','Prompt',sans-serif;font-weight:600;font-size:17px}
.lt-chips button.on{background:${LT_GOLD};border-color:${C.gold};color:${C.paperInk};box-shadow:0 2px 0 #7A5410}
.lt-rev{display:flex;gap:8px;align-items:center;margin:16px 0 4px;font-size:14px;color:${C.mute}}
.lt-rev input{width:18px;height:18px;accent-color:${C.gold}}
.lt-note{font-size:12.5px;color:${C.mute};margin-top:8px}
.lt-primary{width:100%;margin-top:14px;border:1px solid ${C.gold};border-radius:14px;background:linear-gradient(180deg,${C.red},${C.redDeep});color:#fff;padding:13px;font-family:'Kanit','Prompt',sans-serif;font-size:17px;font-weight:600}
.lt-gold{border:none;border-radius:14px;background:${LT_GOLD};color:${C.paperInk};padding:12px 22px;font-family:'Kanit','Prompt',sans-serif;font-size:17px;font-weight:700;box-shadow:0 3px 0 #7A5410}
.lt-gold:disabled{opacity:.6;cursor:default}
.lt-row-between{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.lt-link{border:none;background:none;color:${C.mute};text-decoration:underline}
.lt-empty{color:${C.mute};font-size:14px;margin:4px 0 0}
.lt-cart{list-style:none;margin:0;padding:0}
.lt-cart li{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid ${C.line}}
.lt-tag{font-size:12px;padding:3px 8px;border-radius:8px;font-weight:600;background:${C.red};color:#fff;white-space:nowrap}
.lt-num{font-family:'Kanit','Prompt',sans-serif;font-size:22px;letter-spacing:2px;flex:1;color:${C.gold}}
.lt-half{font-size:11px;padding:2px 6px;border-radius:6px;background:#8d6e00;color:#fff}
.lt-amt{font-weight:600;white-space:nowrap}
.lt-x{border:none;background:${C.panel2};width:28px;height:28px;border-radius:50%;color:${C.mute};font-size:18px;line-height:1}
.lt-checkout{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:2px dashed ${C.line}}
.lt-checkout small{display:block;color:${C.mute};font-size:13px}
.lt-checkout b{font-family:'Kanit','Prompt',sans-serif;font-size:22px;color:${C.gold}}
.lt-vault-sum{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
.lt-vault-sum div{background:${C.panel};border:1px solid ${C.goldDeep};border-radius:16px;padding:10px 14px}
.lt-vault-sum small{display:block;color:${C.mute};font-size:13px}
.lt-vault-sum b{font-family:'Kanit','Prompt',sans-serif;font-size:20px;color:${C.gold}}
.lt-empty-vault{text-align:center}
.lt-empty-vault p{color:${C.mute}}
.lt-group h3{font-family:'Kanit','Prompt',sans-serif;font-weight:500;font-size:15px;color:${C.gold};margin:4px 2px 8px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.lt-del{flex-shrink:0;border:1px solid ${C.goldDeep};background:rgba(0,0,0,.35);color:${C.mute};font-family:'Prompt',sans-serif;font-size:12px;padding:5px 10px;border-radius:999px}
.lt-del.sure,.lt-del-all.sure,.lt-del-one.sure{background:#b3141c;color:#fff;border-color:#ff8a80}
.lt-del-all{width:100%;margin:0 0 12px;border:1px dashed ${C.goldDeep};background:rgba(0,0,0,.3);color:${C.mute};font-family:'Prompt',sans-serif;font-size:13px;padding:9px;border-radius:12px}
.lt-del-one{width:100%;margin-top:4px;border:1px solid #ff8a80;background:transparent;color:#ff8a80;font-family:'Kanit','Prompt',sans-serif;font-size:15px;padding:11px;border-radius:14px}
.lt-group h3 small{font-size:12px;color:${C.mute};font-weight:400;margin-left:6px}
.lt-result{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin:0 2px 10px;padding:8px 12px;border-radius:12px;background:rgba(0,0,0,.3);border:1px solid ${C.goldDeep};font-size:13px;color:${C.mute}}
.lt-result b{font-family:'Kanit','Prompt',sans-serif;font-size:18px;letter-spacing:2px;color:${C.gold};margin-left:4px}
.lt-first{font-size:12px}
.lt-stack{display:flex;flex-direction:column;gap:9px;margin-bottom:14px}
.lt-tk{position:relative;display:flex;width:100%;text-align:left;border:2px solid ${C.goldDeep};padding:0;border-radius:14px;overflow:hidden;color:${C.paperInk};box-shadow:0 0 0 1px #FFE08A inset,0 12px 22px -12px rgba(0,0,0,.9)}
.lt-tk::before,.lt-tk::after{content:'';position:absolute;left:52px;width:16px;height:16px;border-radius:50%;background:${C.bg};border:2px solid ${C.goldDeep};z-index:2}
.lt-tk::before{top:-10px}.lt-tk::after{bottom:-10px}
.lt-tk-stub{width:60px;flex-shrink:0;color:#FFE08A;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-right:2px dashed rgba(255,224,138,.8);padding:5px 3px;background:linear-gradient(180deg,${C.red},${C.redDeep})}
.lt-tk-stub span{font-family:'Kanit','Prompt',sans-serif;font-weight:600;font-size:.72em;line-height:1.1;text-align:center}
.lt-tk-stub small{font-size:.65em;color:#FFD9C2}
.lt-tk-main{flex:1;min-width:0;padding:6px 12px 6px 16px;position:relative}
.lt-tk-head{display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:.8em;border-bottom:1px solid rgba(184,134,43,.5);padding-bottom:4px}
.lt-tk-head span:last-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lt-tk-digits{position:relative;display:flex;gap:6px;margin:6px 0;align-items:center}
.lt-tk-digits span{width:2.1em;height:2.2em;background:#fff;border:2px solid ${C.goldDeep};border-radius:10px;display:grid;place-items:center;font-family:'Kanit','Prompt',sans-serif;font-weight:800;font-size:1.35em;line-height:1;box-shadow:inset 0 -3px 0 rgba(184,134,43,.25)}
.lt-tk-seal{margin-left:auto;opacity:.9;transform:rotate(-12deg)}
.lt-tk-stamp{margin-left:auto;flex-shrink:0;white-space:nowrap;transform:rotate(-12deg);padding:2px 8px;border:2.5px solid;border-radius:8px;font-family:'Kanit','Prompt',sans-serif;font-weight:800;font-size:.8em;background:rgba(255,255,255,.75);letter-spacing:.04em}
.lt-tk-foot{display:flex;justify-content:space-between;align-items:flex-end;font-size:.78em;gap:8px}
.lt-tk-win{color:${C.red};font-weight:600}
.lt-tk-code{text-align:right}
.lt-bars{display:flex;height:22px;justify-content:flex-end}
.lt-bars i{display:block;background:${C.paperInk};height:100%}
.lt-tk-code small{letter-spacing:2px;font-size:.85em}
.lt-tk-in{animation:lt-drop .7s cubic-bezier(.2,.9,.3,1.3) both}
@keyframes lt-drop{from{opacity:0;transform:translateY(-24px) rotate(-2deg)}to{opacity:1;transform:none}}
.lt-nav{position:fixed;bottom:0;left:0;right:0;z-index:40;background:linear-gradient(180deg,#8f0c1a 0%,#6e0814 55%,#4a0610 100%);border-top:2px solid #c8962b;box-shadow:0 -6px 20px rgba(0,0,0,.55);
  display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px max(10px, calc(50% - 220px)) calc(8px + env(safe-area-inset-bottom,0px))}
.lt-nav button{position:relative;border:none;background:transparent;display:flex;align-items:center;justify-content:center;gap:8px;height:48px;border-radius:12px;
  font-family:'Prompt','Kanit',sans-serif;font-weight:700;font-size:16px;color:#e7c3b8}
.lt-nav button.on{color:#f6c453;background:rgba(255,255,255,.10)}
.lt-nav em{background:#f6c453;color:#2a0a0c;font-style:normal;font-size:12px;min-width:24px;height:24px;border-radius:999px;display:grid;place-items:center;padding:0 6px;font-weight:800}
.lt-overlay{position:fixed;inset:0;background:rgba(10,0,3,.7);display:flex;align-items:flex-end;justify-content:center;z-index:60}
.lt-sheet{background:${C.bg};width:100%;max-width:440px;border-radius:24px 24px 0 0;border-top:2px solid ${C.gold};padding:20px 16px calc(20px + env(safe-area-inset-bottom,0px));max-height:90vh;overflow-y:auto}
.lt-sheet dl{background:${C.panel};border:1px solid ${C.goldDeep};border-radius:16px;padding:6px 14px;margin:14px 0}
.lt-sheet dl div{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid ${C.line}}
.lt-sheet dl div:last-child{border:none}
.lt-sheet dt{color:${C.mute}}.lt-sheet dd{margin:0;font-weight:600;color:${C.gold};text-align:right}
.lt-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:84px;background:${LT_GOLD};color:${C.paperInk};padding:10px 18px;border-radius:999px;font-size:14px;font-weight:600;z-index:70;white-space:nowrap;box-shadow:0 6px 16px rgba(0,0,0,.5)}
.lt-toast.err{background:#fff;color:${C.red};border:2px solid ${C.red}}
@media (prefers-reduced-motion:reduce){.lt-tk-in{animation:none}.lt-slot.rolling{animation:none}}
`;

// =====================================================================
// Admin panel
// =====================================================================
const toLocalInput = (ms) => { const d = new Date(ms); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const listToText = (map, t) => ((map || {})[t] || []).join(", ");
const textToList = (s) => s.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);

export function AdminLottery({ api, onLog }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [view, setView] = useState("rounds");
  const [rateDraft, setRateDraft] = useState(null);
  const [form, setForm] = useState(() => ({ type: "thai", title: "", mode: "manual", closeAt: toLocalInput(Date.now() + 86400000), drawAt: toLocalInput(Date.now() + 86400000 + 1800000) }));
  const [open, setOpen] = useState(null); // round id being managed
  const [resultDraft, setResultDraft] = useState({ firstPrize: "", top3: "", bottom2: "" });
  const [limitDraft, setLimitDraft] = useState({});
  const [summary, setSummary] = useState(null);

  const load = () => api.admin("/api/admin/lottery").then((r) => { setData(r); setErr(""); setRateDraft((d) => d || { ...r.settings.rates, maxPerLine: r.settings.maxPerLine, ...r.settings.quick }); })
    .catch((e) => setErr(e && e.status === 403 ? "เข้าแอดมินด้วยรหัสที่ถูกต้องก่อน" : "โหลดข้อมูลหวยไม่ได้"));
  useEffect(() => { load(); const t = setInterval(() => { if (!document.hidden) load(); }, 15000); return () => clearInterval(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const say = (text) => { setNote(text); setTimeout(() => setNote(""), 4000); };
  const fail = (e) => say("❌ " + ((e && e.message) || "ไม่สำเร็จ"));

  async function saveSettings() {
    const d = rateDraft;
    try {
      await api.admin("/api/admin/lottery/settings", { method: "PUT", body: JSON.stringify({
        rates: Object.fromEntries(TYPE_ORDER.map((t) => [t, Number(d[t])])), maxPerLine: Number(d.maxPerLine),
        quick: { enabled: !!d.enabled, everyMin: Number(d.everyMin), closeBeforeSec: Number(d.closeBeforeSec) },
      }) });
      onLog && onLog("ปรับตั้งค่าหวย (อัตราจ่าย/หวยด่วน)");
      say("✅ บันทึกตั้งค่าหวยแล้ว"); load();
    } catch (e) { fail(e); }
  }
  async function createRound() {
    if (!form.title.trim()) { say("❌ ใส่ชื่องวด"); return; }
    try {
      await api.admin("/api/admin/lottery/rounds", { method: "POST", body: JSON.stringify({ ...form, closeAt: new Date(form.closeAt).getTime(), drawAt: new Date(form.drawAt).getTime() }) });
      onLog && onLog(`สร้างงวดหวย ${form.title}`);
      say("✅ สร้างงวดแล้ว"); setForm((f) => ({ ...f, title: "" })); setView("rounds"); load();
    } catch (e) { fail(e.message === "bad_times" ? { message: "เวลาไม่ถูกต้อง (ปิดรับต้องอยู่ในอนาคต และออกผลต้องไม่ก่อนปิดรับ)" } : e); }
  }
  async function submitResult(r) {
    const d = resultDraft;
    const first = d.firstPrize.trim();
    const top3 = /^\d{6}$/.test(first) ? first.slice(3) : d.top3.trim();
    if (!/^\d{3}$/.test(top3) || !/^\d{2}$/.test(d.bottom2.trim())) { say("❌ กรอก 3 ตัวบน (หรือรางวัลที่ 1 หกหลัก) และ 2 ตัวล่างให้ครบ"); return; }
    const verb = r.status === "settled" ? "แก้ผล (ระบบจะดึงเงินรางวัลเดิมคืนแล้วจ่ายใหม่)" : "ยืนยันผล";
    if (!window.confirm(`${verb}\n${r.title}\n\n3 ตัวบน: ${top3}\n2 ตัวล่าง: ${d.bottom2.trim()}\n\nตรวจตัวเลขให้ถูกก่อนกดตกลง`)) return;
    try {
      const out = await api.admin(`/api/admin/lottery/rounds/${r.id}/result`, { method: "POST", body: JSON.stringify(/^\d{6}$/.test(first) ? { firstPrize: first, bottom2: d.bottom2.trim() } : { top3, bottom2: d.bottom2.trim() }) });
      onLog && onLog(`${r.status === "settled" ? "แก้ผล" : "ออกผล"}หวย ${r.title}: ${top3} / ${d.bottom2.trim()}`);
      say(`✅ ออกผลแล้ว · จ่าย ${fmt(out.paid)} B จากยอดแทง ${fmt(out.stake)} B${out.shortfall > 0 ? ` · ดึงคืนไม่ครบ ${fmt(out.shortfall)} B (สมาชิกใช้เครดิตไปแล้ว)` : ""}`);
      setResultDraft({ firstPrize: "", top3: "", bottom2: "" }); load();
    } catch (e) { fail(e); }
  }
  async function cancelRound(r) {
    if (!window.confirm(`ยกเลิกงวด "${r.title}" และคืนเครดิตทุกโพย?`)) return;
    try { const out = await api.admin(`/api/admin/lottery/rounds/${r.id}/cancel`, { method: "POST" }); onLog && onLog(`ยกเลิกงวดหวย ${r.title}`); say(`✅ ยกเลิกแล้ว คืน ${fmt(out.refunded)} B`); load(); }
    catch (e) { fail(e); }
  }
  async function saveLimits(r) {
    const blocked = {}, half = {};
    TYPE_ORDER.forEach((t) => { blocked[t] = textToList(limitDraft["b_" + t] ?? listToText(r.blocked, t)); half[t] = textToList(limitDraft["h_" + t] ?? listToText(r.half, t)); });
    try { await api.admin(`/api/admin/lottery/rounds/${r.id}`, { method: "PATCH", body: JSON.stringify({ blocked, half }) }); onLog && onLog(`แก้เลขอั้นงวด ${r.title}`); say("✅ บันทึกเลขอั้นแล้ว"); setLimitDraft({}); load(); }
    catch (e) { fail(e); }
  }
  async function showSummary(r) {
    try { const out = await api.admin(`/api/admin/lottery/rounds/${r.id}/summary`); setSummary({ id: r.id, numbers: out.numbers }); } catch (e) { fail(e); }
  }

  if (err) return <div className="lotto"><LottoStyle /><div className="sec" style={{ color: "var(--red, #ef5350)" }}>{err}</div></div>;
  if (!data || !rateDraft) return <div className="lotto"><LottoStyle /><div className="sec">กำลังโหลด…</div></div>;
  const inp = (key, props = {}) => <input className="field-input" value={rateDraft[key]} onChange={(e) => setRateDraft({ ...rateDraft, [key]: e.target.value })} {...props} />;
  const openCount = data.rounds.filter((r) => r.status === "open").length;

  return (
    <div className="lotto">
      <LottoStyle />
      <div className="seg" style={{ marginBottom: 12 }}>
        {[["rounds", `📋 งวด${openCount ? ` (${openCount})` : ""}`], ["create", "➕ สร้างงวด"], ["settings", "⚙️ ตั้งค่า"]].map(([k, l]) => (
          <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}>{l}</button>
        ))}
      </div>
      {note && <div className="sec" style={{ fontSize: 13 }}>{note}</div>}

      {view === "settings" && (
        <div className="sec">
          <div className="sec-title">⚙️ อัตราจ่าย <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.7 }}>(ต่อ 1 B · ใส่ 0 = ปิดประเภทนั้น)</span></div>
          <div className="grid-auto">
            {TYPE_ORDER.map((t) => <label key={t} style={{ fontSize: 12 }}>{TYPE_LABEL[t]}{inp(t, { type: "number", min: 0, step: "0.1" })}</label>)}
            <label style={{ fontSize: 12 }}>สูงสุดต่อเลข (B){inp("maxPerLine", { type: "number", min: 1 })}</label>
          </div>
          <div className="sec-title" style={{ marginTop: 16 }}>⚡ หวยด่วน <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.7 }}>(ระบบสุ่มผลเองอัตโนมัติ)</span></div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={!!rateDraft.enabled} onChange={(e) => setRateDraft({ ...rateDraft, enabled: e.target.checked })} style={{ width: 18, height: 18 }} /> เปิดหวยด่วน
          </label>
          <div className="grid-2" style={{ marginTop: 8 }}>
            <label style={{ fontSize: 12 }}>ออกผลทุก (นาที){inp("everyMin", { type: "number", min: 1 })}</label>
            <label style={{ fontSize: 12 }}>ปิดรับก่อนออกผล (วินาที){inp("closeBeforeSec", { type: "number", min: 0 })}</label>
          </div>
          <button className="primary-btn" style={{ marginTop: 12 }} onClick={saveSettings}>💾 บันทึกตั้งค่าหวย</button>
        </div>
      )}

      {view === "create" && (
        <div className="sec">
          <div className="sec-title">➕ สร้างงวดใหม่</div>
          <div className="grid-2">
            <label style={{ fontSize: 12 }}>ประเภท
              <select className="field-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="thai">หวยไทย</option><option value="lao">หวยลาว</option><option value="quick">หวยด่วน</option>
              </select>
            </label>
            <label style={{ fontSize: 12 }}>วิธีออกผล
              <select className="field-input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                <option value="manual">กรอกผลเอง</option><option value="auto">สุ่มผลอัตโนมัติ</option>
              </select>
            </label>
          </div>
          <label style={{ fontSize: 12, marginTop: 8 }}>ชื่องวด<input className="field-input" placeholder="เช่น หวยไทย งวด 16 ต.ค." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <div className="grid-2" style={{ marginTop: 8 }}>
            <label style={{ fontSize: 12 }}>ปิดรับ<input className="field-input" type="datetime-local" value={form.closeAt} onChange={(e) => setForm({ ...form, closeAt: e.target.value })} /></label>
            <label style={{ fontSize: 12 }}>ออกผล<input className="field-input" type="datetime-local" value={form.drawAt} onChange={(e) => setForm({ ...form, drawAt: e.target.value })} /></label>
          </div>
          <button className="primary-btn" style={{ marginTop: 12 }} onClick={createRound}>สร้างงวด</button>
        </div>
      )}

      {view === "rounds" && (
        <div>
          {data.rounds.length === 0 && <div className="sec" style={{ opacity: 0.8, textAlign: "center" }}>ยังไม่มีงวด — กด "➕ สร้างงวด"</div>}
          {data.rounds.map((r) => (
            <div key={r.id} className="sec">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>{ROUND_TYPE[r.type]} · {r.mode === "auto" ? "สุ่มผลอัตโนมัติ" : "กรอกผลเอง"}</div>
                  <b style={{ wordBreak: "break-word" }}>{r.title}</b>
                </div>
                <span style={{ ...badge(r.status === "settled" ? "#2e7d32" : r.status === "cancelled" ? "#6d4c41" : Date.now() < r.closeAt ? "#1565c0" : "#ef6c00"), flexShrink: 0 }}>
                  {r.status === "settled" ? "ออกผลแล้ว" : r.status === "cancelled" ? "ยกเลิก" : Date.now() < r.closeAt ? "เปิดรับ" : "ปิดรับ รอผล"}
                </span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>ปิดรับ {fmtTime(r.closeAt)} · ออกผล {fmtTime(r.drawAt)}</div>
              <div className="grid-auto" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: 8, fontSize: 12, textAlign: "center" }}>
                <div style={{ ...box, marginBottom: 0, padding: 8 }}>โพย<div style={{ fontWeight: 800, fontSize: 14 }}>{fmt(r.tickets)}</div></div>
                <div style={{ ...box, marginBottom: 0, padding: 8 }}>ยอดแทง<div style={{ fontWeight: 800, fontSize: 14 }}>{fmt(r.stake)}</div></div>
                <div style={{ ...box, marginBottom: 0, padding: 8 }}>จ่าย<div style={{ fontWeight: 800, fontSize: 14 }}>{fmt(r.paid)}</div></div>
              </div>
              {r.result && <div style={{ marginTop: 6 }}><ResultBalls result={r.result} /></div>}
              {r.status !== "cancelled" && <button className="chip-btn" style={{ marginTop: 8, width: "100%" }} onClick={() => { setOpen(open === r.id ? null : r.id); setSummary(null); setLimitDraft({}); }}>{open === r.id ? "▲ ปิด" : "▼ จัดการงวดนี้"}</button>}

              {open === r.id && (
                <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10 }}>
                  <div className="field-label">{r.status === "settled" ? "แก้ผลที่กรอกผิด" : "กรอกผลรางวัล"}</div>
                  <label style={{ fontSize: 12 }}>รางวัลที่ 1 (6 หลัก — หวยไทย)<input className="field-input" inputMode="numeric" maxLength={6} placeholder="เว้นว่างได้ถ้ากรอก 3 ตัวบน" value={resultDraft.firstPrize} onChange={(e) => setResultDraft({ ...resultDraft, firstPrize: e.target.value.replace(/\D/g, "") })} /></label>
                  <div className="grid-2" style={{ marginTop: 8 }}>
                    <label style={{ fontSize: 12 }}>หรือ 3 ตัวบน<input className="field-input" inputMode="numeric" maxLength={3} value={resultDraft.top3} onChange={(e) => setResultDraft({ ...resultDraft, top3: e.target.value.replace(/\D/g, "") })} /></label>
                    <label style={{ fontSize: 12 }}>2 ตัวล่าง<input className="field-input" inputMode="numeric" maxLength={2} value={resultDraft.bottom2} onChange={(e) => setResultDraft({ ...resultDraft, bottom2: e.target.value.replace(/\D/g, "") })} /></label>
                  </div>
                  <button className="primary-btn" style={{ marginTop: 10 }} onClick={() => submitResult(r)}>{r.status === "settled" ? "แก้ผลและจ่ายใหม่" : "ยืนยันผลและจ่ายรางวัล"}</button>

                  {r.status === "open" && (<>
                    <div className="field-label" style={{ marginTop: 16 }}>เลขอั้น <span style={{ fontWeight: 400, opacity: 0.7 }}>(คั่นด้วยจุลภาค เช่น 12, 21)</span></div>
                    {TYPE_ORDER.map((t) => (
                      <div key={t} className="limit-row">
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{TYPE_LABEL[t]}</div>
                        <div className="grid-2">
                          <label style={{ fontSize: 11, opacity: 0.85 }}>⛔ ปิดรับ<input className="field-input" value={limitDraft["b_" + t] ?? listToText(r.blocked, t)} onChange={(e) => setLimitDraft({ ...limitDraft, ["b_" + t]: e.target.value })} /></label>
                          <label style={{ fontSize: 11, opacity: 0.85 }}>🔸 จ่ายครึ่ง<input className="field-input" value={limitDraft["h_" + t] ?? listToText(r.half, t)} onChange={(e) => setLimitDraft({ ...limitDraft, ["h_" + t]: e.target.value })} /></label>
                        </div>
                      </div>
                    ))}
                    <div className="btn-row">
                      <button className="chip-btn" onClick={() => saveLimits(r)}>💾 บันทึกเลขอั้น</button>
                      <button className="chip-btn" onClick={() => showSummary(r)}>📊 ยอดแทงรายเลข</button>
                      <button className="chip-btn" style={{ color: "var(--red, #ef5350)" }} onClick={() => cancelRound(r)}>ยกเลิกงวด (คืนเครดิต)</button>
                    </div>
                  </>)}
                  {summary && summary.id === r.id && (
                    <div style={{ ...box, marginTop: 8, fontSize: 12 }}>
                      {summary.numbers.length === 0 ? "ยังไม่มีโพย" : summary.numbers.map((n) => (
                        <div key={n.type + n.number} style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", padding: "3px 0" }}>
                          <span>{TYPE_LABEL[n.type]} <b>{n.number}</b></span><span>แทง {fmt(n.amount)} · ถ้าออกจ่าย {fmt(n.risk)} B</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function useLotteryApi(deps) {
  // deps: { apiFetch, memberFetch, readAdminKey, serverAction }
  return useMemo(() => ({
    get: (path) => deps.apiFetch(path),
    member: (path) => deps.memberFetch(path),
    memberPost: (path, body) => deps.memberFetch(path, { method: "POST", body: JSON.stringify(body || {}) }),
    action: (path, body) => deps.serverAction(path, body),
    admin: (path, opts = {}) => deps.apiFetch(path, { ...opts, headers: { ...(opts.headers || {}), "x-admin-key": deps.readAdminKey() } }),
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
}
