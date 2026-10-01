// หวยไทย / หวยลาว / หวยด่วน - member page + admin panel.
// Everything that touches credits happens on the server (backend/src/lottery.js);
// these screens only show data and send requests. Needs VITE_API_URL.
import { useEffect, useMemo, useState } from "react";
import LOTTERY_COVER from "./assets/lottery-cover.jpg";

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
// Member page
// =====================================================================
export function LotteryPage({ onBack, api, balance, topBar }) {
  const now = useNow();
  const [tab, setTab] = useState("bet");
  const [data, setData] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [roundId, setRoundId] = useState(null);
  const [type, setType] = useState("top2");
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState(10);
  const [reverse, setReverse] = useState(false);
  const [lines, setLines] = useState([]);
  const [msg, setMsg] = useState(null);
  const [sending, setSending] = useState(false);

  const load = () => api.get("/api/lottery/rounds")
    .then((r) => { setData(r); setLoadError(""); setRoundId((cur) => (cur && r.open.some((x) => x.id === cur) ? cur : r.open[0]?.id || null)); })
    .catch(() => setLoadError("โหลดข้อมูลหวยไม่ได้ ลองใหม่อีกครั้ง"));
  const loadTickets = () => api.member("/api/lottery/my-tickets").then((r) => setTickets(r.tickets || [])).catch(() => {});
  useEffect(() => {
    load(); loadTickets();
    const t = setInterval(() => { if (!document.hidden) { load(); loadTickets(); } }, 15000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const round = data?.open.find((r) => r.id === roundId) || null;
  const rates = data?.rates || {};
  const types = TYPE_ORDER.filter((t) => rates[t] > 0);
  useEffect(() => { if (types.length && !types.includes(type)) setType(types[0]); }, [types.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = lines.reduce((a, l) => a + l.amount, 0);
  const closesIn = round ? round.closeAt - now : 0;
  const digits = TYPE_DIGITS[type];
  const canReverse = digits > 1 && type !== "tod3";
  const amt = Math.floor(Number(amount)) || 0;
  const previewNums = number.length === digits ? (reverse && canReverse ? permutations(number) : [number]) : [];
  const winIfHit = amt * (rates[type] || 0);

  function press(k) {
    setMsg(null);
    if (k === "del") setNumber((n) => n.slice(0, -1));
    else if (k === "clr") setNumber("");
    else setNumber((n) => (n.length < digits ? n + k : n));
  }
  function addLines() {
    setMsg(null);
    if (!new RegExp(`^[0-9]{${digits}}$`).test(number)) { setMsg({ bad: true, text: `กรอกเลขให้ครบ ${digits} หลัก` }); return; }
    if (!(amt >= 1) || (data && amt > data.maxPerLine)) { setMsg({ bad: true, text: `จำนวนเงินต่อเลข 1 - ${fmt(data?.maxPerLine)} B` }); return; }
    const nums = reverse && canReverse ? permutations(number) : [number];
    const blocked = round?.blocked?.[type] || [];
    const ok = nums.filter((x) => !blocked.includes(x));
    if (ok.length < nums.length) setMsg({ bad: true, text: `เลข ${nums.filter((x) => blocked.includes(x)).join(", ")} ปิดรับ (เลขอั้น)` });
    else setMsg({ bad: false, text: `ใส่ลงโพยแล้ว ${ok.length} เลข` });
    setLines((ls) => [...ls, ...ok.map((x) => ({ key: Math.random().toString(36).slice(2), type, number: x, amount: amt }))].slice(0, 200));
    setNumber("");
  }
  async function submit() {
    if (!round || !lines.length || sending) return;
    if (total > balance) { setMsg({ bad: true, text: "เครดิตไม่พอ" }); return; }
    setSending(true); setMsg(null);
    try {
      const id = "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      await api.action("/api/lottery/tickets", { id, roundId: round.id, lines: lines.map(({ type: t, number: n, amount: a }) => ({ type: t, number: n, amount: a })) });
      setLines([]);
      setMsg({ bad: false, text: `✅ ส่งโพยแล้ว ${fmt(total)} B — ดูได้ที่แท็บ "โพยของฉัน"` });
      loadTickets();
    } catch (e) {
      setMsg({ bad: true, text: ERR[e && e.message] || "ส่งโพยไม่สำเร็จ ลองใหม่อีกครั้ง" });
      load();
    } finally { setSending(false); }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (tab !== "bet" || !round) return;
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
      else if (e.key === "Enter") addLines();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="game-wrap lotto" data-wm="🎟️">
      <LottoStyle />
      {topBar}
      <div className="panel" style={{ maxWidth: 520, marginBottom: 12, padding: 0, overflow: "hidden" }}>
        <img src={LOTTERY_COVER} alt="หวยไทย หวยลาว" style={{ display: "block", width: "100%", aspectRatio: "2 / 1", objectFit: "cover", objectPosition: "center 14%" }} />
        <div style={{ padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>เครดิตเสมือน (B) · หวยไทย/ลาวออกผลตามงวดจริง · หวยด่วนสุ่มผลอัตโนมัติ</div>
            <div style={{ fontWeight: 800 }}>เครดิต <span style={{ color: "var(--gold2, #e8c766)" }}>{fmt(balance)} B</span></div>
          </div>
          <div className="seg">
            {[["bet", "🎯 แทงหวย"], ["tickets", `🧾 โพยของฉัน${tickets.filter((t) => t.status === "pending").length ? ` (${tickets.filter((t) => t.status === "pending").length})` : ""}`], ["results", "🏆 ผลรางวัล"]].map(([k, l]) => (
              <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {loadError && <div className="panel" style={{ maxWidth: 520, color: "var(--red, #ef5350)" }}>{loadError}</div>}

      {tab === "bet" && (
        <div className="panel" style={{ maxWidth: 520 }}>
          {!data ? <div>กำลังโหลด…</div> : data.open.length === 0 ? (
            <div style={{ opacity: 0.8, textAlign: "center", padding: 20 }}>ยังไม่มีงวดที่เปิดรับตอนนี้ {data.waiting.length > 0 && `(รอออกผล ${data.waiting.length} งวด)`}</div>
          ) : (<>
            <div className="step" style={{ marginTop: 0 }}><b>1</b> เลือกงวด</div>
            <div className="grid-2">
              {data.open.map((r) => (
                <button key={r.id} className={`pick${r.id === roundId ? " on" : ""}`} onClick={() => { setRoundId(r.id); setLines([]); setMsg(null); }}>
                  <div className="sub" style={{ marginTop: 0 }}>{ROUND_TYPE[r.type]}</div>
                  <div className="big">{r.title}</div>
                  <div className="sub">⏱ ปิดรับใน <b style={{ color: r.closeAt - now < 3600000 ? "var(--red, #ef5350)" : undefined }}>{countdown(r.closeAt - now)}</b></div>
                </button>
              ))}
            </div>

            {round && (<>
              <div className="step"><b>2</b> เลือกประเภท <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.7 }}>(แทง 1 B ได้กี่ B)</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                {types.map((t) => (
                  <button key={t} className={`pick${t === type ? " on" : ""}`} onClick={() => { setType(t); setNumber(""); setMsg(null); }}>
                    <div className="big">{TYPE_LABEL[t]}</div>
                    <div style={{ fontWeight: 800, color: "var(--gold2, #e8c766)" }}>จ่าย ×{fmt(rates[t])}</div>
                    <div className="sub">{TYPE_HINT[t]}</div>
                  </button>
                ))}
              </div>

              <div className="step"><b>3</b> กดเลข {digits} หลัก</div>
              <div className="digits">
                {Array.from({ length: digits }).map((_, i) => (
                  <div key={i} className={`digit${number[i] ? " fill" : ""}`}>{number[i] || "–"}</div>
                ))}
              </div>
              <div className="keypad">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => <button key={k} onClick={() => press(k)}>{k}</button>)}
                <button onClick={() => press("clr")} style={{ fontSize: 14 }}>ล้าง</button>
                <button onClick={() => press("0")}>0</button>
                <button onClick={() => press("del")} style={{ fontSize: 16 }}>⌫</button>
              </div>
              {canReverse && (
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginTop: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} style={{ width: 18, height: 18 }} />
                  กลับเลข (ใส่ทุกแบบที่สลับตำแหน่ง{previewNums.length > 1 ? ` = ${previewNums.length} เลข: ${previewNums.join(", ")}` : ""})
                </label>
              )}

              <div className="step"><b>4</b> แทงเลขละกี่บาท</div>
              <div className="chips">
                {AMOUNT_CHIPS.map((a) => <button key={a} className={amt === a ? "on" : ""} onClick={() => setAmount(a)}>{a}</button>)}
              </div>
              <input className="field-input" type="number" inputMode="numeric" min={1} placeholder="หรือพิมพ์จำนวนเอง" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ marginTop: 8 }} />
              {amt > 0 && rates[type] > 0 && (
                <div style={{ fontSize: 13, marginTop: 8, opacity: 0.9 }}>
                  ถ้าถูก {TYPE_LABEL[type]} ได้ <b style={{ color: "var(--teal, #35d0a0)" }}>{fmt(winIfHit)} B</b> ต่อเลข
                  {(round.half?.[type] || []).includes(number) && <span style={{ ...badge("#8d6e00"), marginLeft: 6 }}>เลขนี้จ่ายครึ่ง</span>}
                </div>
              )}
              {(round.half?.[type] || []).length > 0 && <div style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>🔸 จ่ายครึ่ง: {round.half[type].join(", ")}</div>}
              {(round.blocked?.[type] || []).length > 0 && <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>⛔ ปิดรับ (เลขอั้น): {round.blocked[type].join(", ")}</div>}
              <button className="primary-btn" style={{ marginTop: 12 }} disabled={number.length !== digits || amt < 1} onClick={addLines}>
                ➕ ใส่ลงโพย {number.length === digits ? `(${previewNums.length} เลข × ${fmt(amt)} B)` : ""}
              </button>
              {msg && <div style={{ marginTop: 10, fontSize: 13, textAlign: "center", color: msg.bad ? "var(--red, #ef5350)" : "var(--teal, #35d0a0)" }}>{msg.text}</div>}

              <div className="step"><b>5</b> ตรวจโพยแล้วกดส่ง</div>
              {lines.length === 0 ? (
                <div style={{ ...box, textAlign: "center", opacity: 0.65, fontSize: 13 }}>ยังไม่มีเลขในโพย — กดเลขแล้วกด "ใส่ลงโพย"</div>
              ) : (
                <div style={box}>
                  {lines.map((l) => (
                    <div key={l.key} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: "1px dashed rgba(255,255,255,0.08)" }}>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 12, opacity: 0.75 }}>{TYPE_LABEL[l.type]}</span>{" "}
                        <b style={{ letterSpacing: 2, fontSize: 17 }}>{l.number}</b>
                        {(round.half?.[l.type] || []).includes(l.number) && <span style={{ ...badge("#8d6e00"), marginLeft: 6 }}>จ่ายครึ่ง</span>}
                        <div style={{ fontSize: 11, opacity: 0.6 }}>ถ้าถูกได้ {fmt(l.amount * (rates[l.type] || 0))} B</div>
                      </span>
                      <b>{fmt(l.amount)} B</b>
                      <button className="chip-btn" style={{ padding: "4px 9px" }} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="ลบ">✕</button>
                    </div>
                  ))}
                  <button className="chip-btn" style={{ marginTop: 8, width: "100%" }} onClick={() => setLines([])}>🗑 ล้างโพยทั้งหมด</button>
                </div>
              )}
              <div className="sticky-bar">
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span>{lines.length} เลข · เครดิตคงเหลือ {fmt(balance)} B</span>
                  <b>รวม {fmt(total)} B</b>
                </div>
                <button className="primary-btn" disabled={!lines.length || sending || closesIn <= 0 || total > balance} onClick={submit}>
                  {sending ? "กำลังส่งโพย…" : closesIn <= 0 ? "งวดนี้ปิดรับแล้ว" : total > balance ? "เครดิตไม่พอ" : `✅ ส่งโพย ${fmt(total)} B`}
                </button>
              </div>
            </>)}
          </>)}
        </div>
      )}

      {tab === "tickets" && (
        <div className="panel" style={{ maxWidth: 520 }}>
          {tickets.length === 0 ? <div style={{ opacity: 0.8 }}>ยังไม่มีโพย</div> : tickets.map((t) => (
            <div key={t.id} style={box}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <b style={{ minWidth: 0 }}>{t.round ? t.round.title : "งวดที่ถูกลบ"}</b>
                <span style={{ ...badge(t.status === "won" ? "#2e7d32" : t.status === "lost" ? "#555" : t.status === "cancelled" ? "#6d4c41" : "#1565c0"), flexShrink: 0 }}>{STATUS_LABEL[t.status]}</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{fmtTime(t.time)} · แทง {fmt(t.total)} B{t.payout > 0 && <> · <b style={{ color: "var(--teal, #35d0a0)" }}>ได้ {fmt(t.payout)} B</b></>}</div>
              {t.round?.result && <div style={{ fontSize: 13, marginTop: 4 }}><ResultBalls result={t.round.result} /></div>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {t.lines.map((l, i) => (
                  <span key={i} style={{ fontSize: 12, padding: "3px 8px", borderRadius: 8, background: l.win > 0 ? "rgba(53,208,160,0.15)" : "rgba(255,255,255,0.05)", color: l.win > 0 ? "var(--teal, #35d0a0)" : undefined }}>
                    {TYPE_LABEL[l.type]} <b>{l.number}</b> × {fmt(l.amount)}{l.win > 0 ? ` ✓ +${fmt(l.win)}` : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "results" && (
        <div className="panel" style={{ maxWidth: 520 }}>
          {data?.waiting?.length > 0 && data.waiting.map((r) => (
            <div key={r.id} style={box}><b>{r.title}</b> <span style={badge("#1565c0")}>รอออกผล {fmtTime(r.drawAt)}</span></div>
          ))}
          {!data?.settled?.length ? <div style={{ opacity: 0.8 }}>ยังไม่มีผลรางวัล</div> : data.settled.map((r) => (
            <div key={r.id} style={box}>
              <div style={{ fontSize: 11, opacity: 0.8 }}>{ROUND_TYPE[r.type]} · {fmtTime(r.drawAt)}</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{r.title}</div>
              <ResultBalls result={r.result} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
    action: (path, body) => deps.serverAction(path, body),
    admin: (path, opts = {}) => deps.apiFetch(path, { ...opts, headers: { ...(opts.headers || {}), "x-admin-key": deps.readAdminKey() } }),
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
}
