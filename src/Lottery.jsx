// หวยไทย / หวยลาว / หวยด่วน - member page + admin panel.
// Everything that touches credits happens on the server (backend/src/lottery.js);
// these screens only show data and send requests. Needs VITE_API_URL.
import { useEffect, useMemo, useState } from "react";

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

  function addLines() {
    setMsg(null);
    const digits = TYPE_DIGITS[type];
    const n = number.trim();
    if (!new RegExp(`^[0-9]{${digits}}$`).test(n)) { setMsg({ bad: true, text: `กรอกเลข ${digits} หลัก` }); return; }
    const amt = Math.floor(Number(amount));
    if (!(amt >= 1) || (data && amt > data.maxPerLine)) { setMsg({ bad: true, text: `จำนวนเงินต่อเลข 1 - ${fmt(data?.maxPerLine)} B` }); return; }
    const nums = reverse && digits > 1 && type !== "tod3" ? permutations(n) : [n];
    const blocked = round?.blocked?.[type] || [];
    const ok = nums.filter((x) => !blocked.includes(x));
    if (ok.length < nums.length) setMsg({ bad: true, text: `เลข ${nums.filter((x) => blocked.includes(x)).join(", ")} ปิดรับ (เลขอั้น)` });
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
      setMsg({ bad: false, text: `ส่งโพยแล้ว ${fmt(total)} B — ดูได้ที่แท็บ "โพยของฉัน"` });
      loadTickets();
    } catch (e) {
      setMsg({ bad: true, text: ERR[e && e.message] || "ส่งโพยไม่สำเร็จ ลองใหม่อีกครั้ง" });
      load();
    } finally { setSending(false); }
  }

  return (
    <div className="game-wrap" data-wm="🎟️">
      {topBar}
      <div className="panel" style={{ maxWidth: 520, marginBottom: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>🎟️ หวยไทย · หวยลาว · หวยด่วน</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>ใช้เครดิตเสมือน (B) · ผลหวยไทย/ลาวกรอกโดยแอดมินตามงวดจริง · หวยด่วนระบบสุ่มผลเอง</div>
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {[["bet", "แทงหวย"], ["tickets", "โพยของฉัน"], ["results", "ผลรางวัล"]].map(([k, l]) => (
            <button key={k} className="chip-btn" onClick={() => setTab(k)} style={tab === k ? { background: "var(--gold, #f4c542)", color: "#111" } : undefined}>{l}</button>
          ))}
        </div>
      </div>

      {loadError && <div className="panel" style={{ maxWidth: 520, color: "var(--red, #ef5350)" }}>{loadError}</div>}

      {tab === "bet" && (
        <div className="panel" style={{ maxWidth: 520 }}>
          {!data ? <div>กำลังโหลด…</div> : data.open.length === 0 ? (
            <div style={{ opacity: 0.8 }}>ยังไม่มีงวดที่เปิดรับตอนนี้ {data.waiting.length > 0 && `(รอออกผล ${data.waiting.length} งวด)`}</div>
          ) : (<>
            <div className="field-label">เลือกงวด</div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 10 }}>
              {data.open.map((r) => (
                <button key={r.id} onClick={() => { setRoundId(r.id); setLines([]); setMsg(null); }}
                  style={{ ...box, marginBottom: 0, minWidth: 150, textAlign: "left", cursor: "pointer", color: "inherit", borderColor: r.id === roundId ? "var(--gold, #f4c542)" : box.border.split(" ").pop() }}>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>{ROUND_TYPE[r.type]}</div>
                  <div style={{ fontWeight: 700 }}>{r.title}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>ปิดรับใน <b>{countdown(r.closeAt - now)}</b></div>
                </button>
              ))}
            </div>
            {round && (<>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>ออกผล {fmtTime(round.drawAt)} · ปิดรับ {fmtTime(round.closeAt)}</div>
              <div className="field-label">ประเภท (อัตราจ่ายต่อ 1 B)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {types.map((t) => (
                  <button key={t} className="chip-btn" onClick={() => { setType(t); setNumber(""); }} style={t === type ? { background: "var(--gold, #f4c542)", color: "#111" } : undefined}>
                    {TYPE_LABEL[t]} ×{rates[t]}
                  </button>
                ))}
              </div>
              <div className="field-row" style={{ gap: 6 }}>
                <input className="field-input" inputMode="numeric" maxLength={TYPE_DIGITS[type]} placeholder={`เลข ${TYPE_DIGITS[type]} หลัก`} value={number}
                  onChange={(e) => setNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, TYPE_DIGITS[type]))} onKeyDown={(e) => e.key === "Enter" && addLines()} />
                <input className="field-input" type="number" min={1} placeholder="บาท" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ maxWidth: 110 }} />
                <button className="chip-btn" onClick={addLines}>เพิ่ม</button>
              </div>
              {TYPE_DIGITS[type] > 1 && type !== "tod3" && (
                <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, marginTop: 8 }}>
                  <input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} /> กลับเลข (เพิ่มทุกรูปแบบสลับตำแหน่ง)
                </label>
              )}
              {(round.half?.[type] || []).length > 0 && <div style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>จ่ายครึ่ง: {round.half[type].join(", ")}</div>}
              {(round.blocked?.[type] || []).length > 0 && <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>ปิดรับ: {round.blocked[type].join(", ")}</div>}

              {lines.length > 0 && (
                <div style={{ ...box, marginTop: 12 }}>
                  {lines.map((l) => (
                    <div key={l.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px dashed rgba(255,255,255,0.08)" }}>
                      <span>{TYPE_LABEL[l.type]} <b style={{ letterSpacing: 2 }}>{l.number}</b>{(round.half?.[l.type] || []).includes(l.number) && <span style={{ ...badge("#8d6e00"), marginLeft: 6 }}>จ่ายครึ่ง</span>}</span>
                      <span>{fmt(l.amount)} B <button className="chip-btn" style={{ marginLeft: 6, padding: "2px 8px" }} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>✕</button></span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontWeight: 700 }}>
                    <span>{lines.length} รายการ</span><span>รวม {fmt(total)} B</span>
                  </div>
                </div>
              )}
              {msg && <div style={{ marginTop: 10, fontSize: 13, color: msg.bad ? "var(--red, #ef5350)" : "var(--teal, #26a69a)" }}>{msg.text}</div>}
              <button className="primary-btn" style={{ marginTop: 12 }} disabled={!lines.length || sending || closesIn <= 0 || total > balance} onClick={submit}>
                {sending ? "กำลังส่งโพย…" : closesIn <= 0 ? "งวดนี้ปิดรับแล้ว" : total > balance ? "เครดิตไม่พอ" : `ส่งโพย (${fmt(total)} B)`}
              </button>
              {lines.length > 0 && <button className="chip-btn" style={{ marginTop: 8 }} onClick={() => setLines([])}>ล้างโพย</button>}
            </>)}
          </>)}
        </div>
      )}

      {tab === "tickets" && (
        <div className="panel" style={{ maxWidth: 520 }}>
          {tickets.length === 0 ? <div style={{ opacity: 0.8 }}>ยังไม่มีโพย</div> : tickets.map((t) => (
            <div key={t.id} style={box}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <b>{t.round ? t.round.title : "งวดที่ถูกลบ"}</b>
                <span style={badge(t.status === "won" ? "#2e7d32" : t.status === "lost" ? "#555" : t.status === "cancelled" ? "#6d4c41" : "#1565c0")}>{STATUS_LABEL[t.status]}</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{fmtTime(t.time)} · แทง {fmt(t.total)} B{t.payout > 0 && <> · <b style={{ color: "var(--teal, #26a69a)" }}>ได้ {fmt(t.payout)} B</b></>}</div>
              {t.round?.result && <div style={{ fontSize: 13, marginTop: 4 }}><ResultBalls result={t.round.result} /></div>}
              <div style={{ fontSize: 13, marginTop: 6 }}>
                {t.lines.map((l, i) => (
                  <span key={i} style={{ display: "inline-block", marginRight: 10, color: l.win > 0 ? "var(--teal, #26a69a)" : undefined }}>
                    {TYPE_LABEL[l.type]} {l.number} × {fmt(l.amount)}{l.win > 0 ? ` ✓ +${fmt(l.win)}` : ""}
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
      say("✅ สร้างงวดแล้ว"); setForm((f) => ({ ...f, title: "" })); load();
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

  if (err) return <div className="panel" style={{ color: "var(--red, #ef5350)" }}>{err}</div>;
  if (!data || !rateDraft) return <div className="panel">กำลังโหลด…</div>;
  const inp = (key, props = {}) => <input className="field-input" value={rateDraft[key]} onChange={(e) => setRateDraft({ ...rateDraft, [key]: e.target.value })} {...props} />;

  return (<>
    {note && <div className="panel" style={{ fontSize: 13 }}>{note}</div>}

    <div className="panel">
      <div className="field-label" style={{ fontSize: 15 }}>⚙️ อัตราจ่าย (ต่อ 1 B · ใส่ 0 = ปิดประเภทนั้น)</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8 }}>
        {TYPE_ORDER.map((t) => <label key={t} style={{ fontSize: 12 }}>{TYPE_LABEL[t]}{inp(t, { type: "number", min: 0, step: "0.1" })}</label>)}
        <label style={{ fontSize: 12 }}>สูงสุดต่อเลข (B){inp("maxPerLine", { type: "number", min: 1 })}</label>
      </div>
      <div className="field-label" style={{ fontSize: 15, marginTop: 14 }}>⚡ หวยด่วน (ระบบสุ่มผลเองอัตโนมัติ)</div>
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
        <input type="checkbox" checked={!!rateDraft.enabled} onChange={(e) => setRateDraft({ ...rateDraft, enabled: e.target.checked })} /> เปิดหวยด่วน
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
        <label style={{ fontSize: 12 }}>ออกผลทุก (นาที){inp("everyMin", { type: "number", min: 1 })}</label>
        <label style={{ fontSize: 12 }}>ปิดรับก่อนออกผล (วินาที){inp("closeBeforeSec", { type: "number", min: 0 })}</label>
      </div>
      <button className="primary-btn" style={{ marginTop: 10 }} onClick={saveSettings}>บันทึกตั้งค่าหวย</button>
    </div>

    <div className="panel">
      <div className="field-label" style={{ fontSize: 15 }}>➕ สร้างงวดใหม่</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ fontSize: 12 }}>ประเภท
          <select className="field-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="thai">หวยไทย</option><option value="lao">หวยลาว</option><option value="quick">หวยด่วน</option>
          </select>
        </label>
        <label style={{ fontSize: 12 }}>วิธีออกผล
          <select className="field-input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
            <option value="manual">แอดมินกรอกผลตามงวดจริง</option><option value="auto">ระบบสุ่มผลเองตามเวลา</option>
          </select>
        </label>
      </div>
      <label style={{ fontSize: 12, display: "block", marginTop: 8 }}>ชื่องวด<input className="field-input" placeholder="เช่น หวยไทย งวด 16 ต.ค." value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        <label style={{ fontSize: 12 }}>ปิดรับ<input className="field-input" type="datetime-local" value={form.closeAt} onChange={(e) => setForm({ ...form, closeAt: e.target.value })} /></label>
        <label style={{ fontSize: 12 }}>ออกผล<input className="field-input" type="datetime-local" value={form.drawAt} onChange={(e) => setForm({ ...form, drawAt: e.target.value })} /></label>
      </div>
      <button className="primary-btn" style={{ marginTop: 10 }} onClick={createRound}>สร้างงวด</button>
    </div>

    <div className="panel">
      <div className="field-label" style={{ fontSize: 15 }}>📋 งวดทั้งหมด</div>
      {data.rounds.length === 0 && <div style={{ opacity: 0.8 }}>ยังไม่มีงวด</div>}
      {data.rounds.map((r) => (
        <div key={r.id} style={box}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div><div style={{ fontSize: 11, opacity: 0.8 }}>{ROUND_TYPE[r.type]} · {r.mode === "auto" ? "สุ่มผลอัตโนมัติ" : "กรอกผลเอง"}</div><b>{r.title}</b></div>
            <span style={badge(r.status === "settled" ? "#2e7d32" : r.status === "cancelled" ? "#6d4c41" : Date.now() < r.closeAt ? "#1565c0" : "#ef6c00")}>
              {r.status === "settled" ? "ออกผลแล้ว" : r.status === "cancelled" ? "ยกเลิก" : Date.now() < r.closeAt ? "เปิดรับ" : "ปิดรับ รอผล"}
            </span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>ปิดรับ {fmtTime(r.closeAt)} · ออกผล {fmtTime(r.drawAt)}</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>โพย {r.tickets} · ยอดแทง {fmt(r.stake)} B · จ่าย {fmt(r.paid)} B</div>
          {r.result && <div style={{ marginTop: 4 }}><ResultBalls result={r.result} /></div>}
          {r.status !== "cancelled" && <button className="chip-btn" style={{ marginTop: 8 }} onClick={() => { setOpen(open === r.id ? null : r.id); setSummary(null); setLimitDraft({}); }}>{open === r.id ? "ปิด" : "จัดการ"}</button>}

          {open === r.id && (
            <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10 }}>
              <div className="field-label">{r.status === "settled" ? "แก้ผลที่กรอกผิด" : "กรอกผลรางวัล"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <label style={{ fontSize: 11 }}>รางวัลที่ 1 (6 หลัก, หวยไทย)<input className="field-input" inputMode="numeric" maxLength={6} value={resultDraft.firstPrize} onChange={(e) => setResultDraft({ ...resultDraft, firstPrize: e.target.value.replace(/\D/g, "") })} /></label>
                <label style={{ fontSize: 11 }}>หรือ 3 ตัวบน<input className="field-input" inputMode="numeric" maxLength={3} value={resultDraft.top3} onChange={(e) => setResultDraft({ ...resultDraft, top3: e.target.value.replace(/\D/g, "") })} /></label>
                <label style={{ fontSize: 11 }}>2 ตัวล่าง<input className="field-input" inputMode="numeric" maxLength={2} value={resultDraft.bottom2} onChange={(e) => setResultDraft({ ...resultDraft, bottom2: e.target.value.replace(/\D/g, "") })} /></label>
              </div>
              <button className="primary-btn" style={{ marginTop: 8 }} onClick={() => submitResult(r)}>{r.status === "settled" ? "แก้ผลและจ่ายใหม่" : "ยืนยันผลและจ่ายรางวัล"}</button>

              {r.status === "open" && (<>
                <div className="field-label" style={{ marginTop: 12 }}>เลขอั้น (คั่นด้วยจุลภาค)</div>
                {TYPE_ORDER.map((t) => (
                  <div key={t} style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr", gap: 6, alignItems: "center", marginBottom: 4, fontSize: 12 }}>
                    <span>{TYPE_LABEL[t]}</span>
                    <input className="field-input" placeholder="ปิดรับ" value={limitDraft["b_" + t] ?? listToText(r.blocked, t)} onChange={(e) => setLimitDraft({ ...limitDraft, ["b_" + t]: e.target.value })} />
                    <input className="field-input" placeholder="จ่ายครึ่ง" value={limitDraft["h_" + t] ?? listToText(r.half, t)} onChange={(e) => setLimitDraft({ ...limitDraft, ["h_" + t]: e.target.value })} />
                  </div>
                ))}
                <button className="chip-btn" onClick={() => saveLimits(r)}>บันทึกเลขอั้น</button>
                <button className="chip-btn" style={{ marginLeft: 6 }} onClick={() => showSummary(r)}>ดูยอดแทงรายเลข</button>
                <button className="chip-btn" style={{ marginLeft: 6, color: "var(--red, #ef5350)" }} onClick={() => cancelRound(r)}>ยกเลิกงวด (คืนเครดิต)</button>
              </>)}
              {summary && summary.id === r.id && (
                <div style={{ ...box, marginTop: 8, fontSize: 12 }}>
                  {summary.numbers.length === 0 ? "ยังไม่มีโพย" : summary.numbers.map((n) => (
                    <div key={n.type + n.number} style={{ display: "flex", justifyContent: "space-between" }}>
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
  </>);
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
