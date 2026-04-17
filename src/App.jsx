import { useState, useEffect } from "react";
import { subscribeVendors, saveVendor, removeVendor } from "./firebase.js";

const STATUSES1 = ["Conclusa", "Programmata", "Da Programmare"];
const STATUSES2 = ["Conclusa", "Programmata", "Da Programmare", "Non necessaria"];
const PARTS = ["BRM", "CEG", "PAS", "SAP", "GAV"];
const STEPS = [
  { key: "step1", label: "Step 1 – Call conoscitiva", short: "Step 1", sts: STATUSES1 },
  { key: "step2", label: "Step 2 – Call tecnica", short: "Step 2", sts: STATUSES2 },
  { key: "step3", label: "Step 3 – Demo 1", short: "Step 3", sts: STATUSES2 },
  { key: "step4", label: "Step 4 – Demo 2", short: "Step 4", sts: STATUSES2 },
];

const gid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const SC = {
  "Conclusa": { bg: "#D1FAE5", fg: "#065F46", bar: "#10B981" },
  "Programmata": { bg: "#DBEAFE", fg: "#1E40AF", bar: "#3B82F6" },
  "Da Programmare": { bg: "#FEF3C7", fg: "#92400E", bar: "#F59E0B" },
  "Non necessaria": { bg: "#F1F5F9", fg: "#64748B", bar: "#CBD5E1" },
};
const PC = {
  BRM: { bg: "#EDE9FE", fg: "#6D28D9" },
  CEG: { bg: "#FCE7F3", fg: "#BE185D" },
  PAS: { bg: "#DBEAFE", fg: "#1D4ED8" },
  SAP: { bg: "#D1FAE5", fg: "#047857" },
  GAV: { bg: "#FEF3C7", fg: "#B45309" },
};

const fix = (s) => (s || []).map(x => ({ ...x, responses: x.responses || {} }));

function makeEmpty() {
  return {
    id: gid(), name: "", crm: "",
    step1: { status: "Da Programmare", participants: [], notes: "" },
    step2: { status: "Da Programmare", participants: [], notes: "" },
    step3: { status: "Da Programmare", participants: [], notes: "" },
    step4: { status: "Da Programmare", participants: [], notes: "" },
    slots: [], availability: [],
  };
}

function fdt(d, t) {
  try {
    return new Date(d + "T" + t).toLocaleString("it-IT", {
      weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch { return d + " " + t; }
}

const label = { fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" };
const input = { padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, outline: "none", fontFamily: "inherit", background: "white", width: "100%", boxSizing: "border-box" };
const panel = { background: "white", borderRadius: 14, padding: 20, border: "1px solid #E2E8F0" };

export default function App() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("vendors");
  const [formVendor, setFormVendor] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [schedVid, setSchedVid] = useState(null);
  const [error, setError] = useState(null);

  // Subscribe to Firebase realtime updates
  useEffect(() => {
    try {
      const unsub = subscribeVendors((data) => {
        setVendors(data.map(v => ({ ...v, slots: fix(v.slots), availability: v.availability || [] })));
        setLoading(false);
      });
      return () => unsub();
    } catch (e) {
      setError("Errore di connessione a Firebase. Verifica la configurazione in src/firebase.js");
      setLoading(false);
    }
  }, []);

  async function save(vendor) {
    try { await saveVendor(vendor); } catch (e) { alert("Errore nel salvataggio: " + e.message); }
  }

  async function doSave(v) {
    await save(v);
    setFormVendor(null);
  }

  async function doDelete(id) {
    if (!confirm("Eliminare questo vendor e tutti i suoi dati?")) return;
    try { await removeVendor(id); } catch (e) { alert("Errore: " + e.message); }
    setFormVendor(null);
  }

  async function addSlot(vid, sl) {
    const v = vendors.find(x => x.id === vid);
    if (!v) return;
    await save({ ...v, slots: [...fix(v.slots), { ...sl, id: gid(), responses: {} }] });
  }

  async function rmSlot(vid, sid) {
    const v = vendors.find(x => x.id === vid);
    if (!v) return;
    await save({ ...v, slots: fix(v.slots).filter(s => s.id !== sid) });
  }

  async function setResp(vid, sid, who, val) {
    const v = vendors.find(x => x.id === vid);
    if (!v) return;
    await save({
      ...v,
      slots: fix(v.slots).map(s => {
        if (s.id !== sid) return s;
        const r = { ...s.responses };
        if (r[who] === val) delete r[who]; else r[who] = val;
        return { ...s, responses: r };
      }),
    });
  }

  async function addAv(vid, a) {
    const v = vendors.find(x => x.id === vid);
    if (!v) return;
    await save({ ...v, availability: [...(v.availability || []), { ...a, id: gid() }] });
  }

  async function rmAv(vid, aid) {
    const v = vendors.find(x => x.id === vid);
    if (!v) return;
    await save({ ...v, availability: (v.availability || []).filter(a => a.id !== aid) });
  }

  // Notifications
  const notifs = [];
  vendors.forEach(v => {
    fix(v.slots).forEach(s => {
      const so = STEPS.find(st => st.key === s.step);
      const tg = (v[s.step]?.participants?.length > 0) ? v[s.step].participants : [];
      tg.forEach(p => {
        if (!s.responses[p]) {
          notifs.push({ vid: v.id, vn: v.name, sl: so?.label || s.step, who: p, date: s.date, time: s.time });
        }
      });
    });
  });

  function goSched(vid) { setSchedVid(vid); setView("slots"); }

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'Outfit',sans-serif" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #E2E8F0", borderTopColor: "#6366F1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: "#94A3B8", marginTop: 12, fontSize: 14 }}>Connessione a Firebase...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'Outfit',sans-serif", padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#DC2626" }}>Errore di configurazione</h2>
      <p style={{ color: "#64748B", fontSize: 14, marginTop: 8, maxWidth: 500 }}>{error}</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'Outfit',sans-serif", color: "#0F172A" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}*{box-sizing:border-box}input,select,textarea,button{font-family:'Outfit',sans-serif}textarea{resize:vertical}`}</style>

      {/* TOP BAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", background: "#0F172A", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 20, fontWeight: 800 }}>V</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#F8FAFC" }}>Vendor Tracker</h1>
            <p style={{ margin: 0, fontSize: 12, color: "#64748B" }}>{vendors.length} vendor · {notifs.length} notifiche</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#1E293B", borderRadius: 10, padding: 4 }}>
          {[["vendors", "📋 Vendor"], ["gantt", "📊 Dashboard"], ["slots", "📅 Scheduling"]].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: view === k ? "#334155" : "transparent", color: view === k ? "#F8FAFC" : "#94A3B8", cursor: "pointer", fontSize: 13, fontWeight: 500, position: "relative" }}>
              {l}{k === "vendors" && notifs.length > 0 && <span style={{ position: "absolute", top: 2, right: 4, background: "#EF4444", color: "white", fontSize: 10, fontWeight: 700, borderRadius: 100, padding: "1px 5px" }}>{notifs.length}</span>}
            </button>
          ))}
        </div>
        <button onClick={() => setFormVendor(makeEmpty())} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#3B82F6,#6366F1)", color: "white", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>+ Nuovo Vendor</button>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 28px" }}>
        {view === "vendors" && <VendorList vendors={vendors} onEdit={(v) => setFormVendor(JSON.parse(JSON.stringify(v)))} expanded={expanded} setExpanded={setExpanded} notifs={notifs} goSched={goSched} />}
        {view === "gantt" && <GanttDash vendors={vendors} />}
        {view === "slots" && <Scheduling vendors={vendors} initVid={schedVid} clearInit={() => setSchedVid(null)} addSlot={addSlot} rmSlot={rmSlot} setResp={setResp} addAv={addAv} rmAv={rmAv} />}
      </div>

      {/* MODAL FORM */}
      {formVendor && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={() => setFormVendor(null)}>
          <div style={{ background: "white", borderRadius: 18, padding: 28, width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", position: "relative", boxShadow: "0 25px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setFormVendor(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94A3B8" }}>✕</button>
            <VendorForm
              vendor={formVendor}
              onChange={setFormVendor}
              onSave={() => { if (!formVendor.name) { alert("Inserisci il nome"); return; } doSave(formVendor); }}
              onDelete={vendors.find(x => x.id === formVendor.id) ? () => doDelete(formVendor.id) : null}
              isNew={!vendors.find(x => x.id === formVendor.id)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════ VENDOR FORM ═══════════════
function VendorForm({ vendor, onChange, onSave, onDelete, isNew }) {
  function updateField(f, val) { onChange({ ...vendor, [f]: val }); }
  function updateStep(sk, f, val) { onChange({ ...vendor, [sk]: { ...vendor[sk], [f]: val } }); }
  function toggleP(sk, p) {
    const cur = vendor[sk].participants || [];
    updateStep(sk, "participants", cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{isNew ? "Nuovo Vendor" : "Modifica Vendor"}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={label}>Nome Vendor *</span>
        <input style={input} value={vendor.name} onChange={e => updateField("name", e.target.value)} placeholder="Es. Acme Corp" autoFocus />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={label}>CRM</span>
        <input style={input} value={vendor.crm} onChange={e => updateField("crm", e.target.value)} placeholder="Riferimento CRM..." />
      </div>
      <div style={{ height: 1, background: "#E2E8F0" }} />
      {STEPS.map(step => (
        <div key={step.key} style={{ background: "#F8FAFC", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{step.label}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={label}>Stato</span>
            <select style={input} value={vendor[step.key].status} onChange={e => updateStep(step.key, "status", e.target.value)}>
              {step.sts.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={label}>Partecipanti</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PARTS.map(p => {
                const active = (vendor[step.key].participants || []).includes(p);
                return <button key={p} type="button" onClick={() => toggleP(step.key, p)} style={{ padding: "6px 14px", borderRadius: 100, cursor: "pointer", fontSize: 13, fontWeight: 600, border: "1.5px solid " + (active ? PC[p].fg + "33" : "#E2E8F0"), background: active ? PC[p].bg : "#F8FAFC", color: active ? PC[p].fg : "#94A3B8" }}>{p}</button>;
              })}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={label}>Note</span>
            <textarea style={{ ...input, minHeight: 48 }} value={vendor[step.key].notes} onChange={e => updateStep(step.key, "notes", e.target.value)} placeholder="Note..." />
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        {onDelete && <button type="button" onClick={onDelete} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#FEE2E2", color: "#DC2626", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Elimina</button>}
        <div style={{ flex: 1 }} />
        <button type="button" onClick={onSave} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#3B82F6,#6366F1)", color: "white", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{isNew ? "Crea Vendor" : "Salva"}</button>
      </div>
    </div>
  );
}

// ═══════════════ VENDOR LIST ═══════════════
function VendorList({ vendors, onEdit, expanded, setExpanded, notifs, goSched }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {notifs.length > 0 && (
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #FBBF24", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", background: "#FFFBEB", borderBottom: "1px solid #FEF3C7" }}>
            <span style={{ fontSize: 20 }}>🔔</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, flex: 1 }}>Azioni richieste</h3>
            <span style={{ background: "#F59E0B", color: "white", fontSize: 11, fontWeight: 700, borderRadius: 100, padding: "2px 8px" }}>{notifs.length}</span>
          </div>
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {notifs.map((n, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #F8FAFC", cursor: "pointer", gap: 12 }} onClick={() => goSched(n.vid)}>
                <span style={{ fontSize: 13, fontWeight: 700, padding: "5px 12px", borderRadius: 100, background: PC[n.who].bg, color: PC[n.who].fg }}>{n.who}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14 }}>Esprimi preferenza per call con <strong>{n.vn}</strong></div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Riferimento: {n.sl.split("–")[1]?.trim() || n.sl} · {fdt(n.date, n.time)}</div>
                </div>
                <span style={{ fontSize: 13, color: "#3B82F6", fontWeight: 600, whiteSpace: "nowrap" }}>Scheduling →</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {vendors.length === 0 && <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", textAlign: "center" }}><div style={{ fontSize: 52, marginBottom: 16 }}>📂</div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Nessun vendor</h2><p style={{ color: "#64748B", fontSize: 14, marginTop: 8 }}>Clicca "+ Nuovo Vendor" per iniziare.</p></div>}
      {vendors.map((v, i) => {
        const isE = expanded === v.id;
        const done = STEPS.filter(s => v[s.key].status === "Conclusa" || v[s.key].status === "Non necessaria").length;
        const pct = Math.round((done / 4) * 100);
        const vn = notifs.filter(n => n.vid === v.id).length;
        return (
          <div key={v.id} style={{ background: "white", borderRadius: 14, overflow: "hidden", border: "1px solid #E2E8F0", animation: `fadeIn 0.3s ease ${i * 0.05}s both` }}>
            <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", cursor: "pointer", gap: 16, flexWrap: "wrap" }} onClick={() => setExpanded(isE ? null : v.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 180, flex: "1 1 180px" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{v.name.charAt(0).toUpperCase()}</div>
                <div><div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{v.name}</h3>{vn > 0 && <span style={{ fontSize: 11, background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 100, fontWeight: 600 }}>{vn} pending</span>}</div><p style={{ margin: 0, fontSize: 12, color: "#64748B" }}>{v.crm || "—"}</p></div>
              </div>
              <div style={{ display: "flex", gap: 6, flex: "2 1 200px", flexWrap: "wrap" }}>{STEPS.map(s => <span key={s.key} style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: SC[v[s.key].status].bg, color: SC[v[s.key].status].fg }}>{s.short}: {v[s.key].status === "Non necessaria" ? "N/A" : v[s.key].status.substring(0, 4)}</span>)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 100 }}><div style={{ width: 60, height: 6, background: "#E2E8F0", borderRadius: 100, overflow: "hidden" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#3B82F6,#10B981)", borderRadius: 100, width: pct + "%", transition: "width 0.4s" }} /></div><span style={{ fontSize: 13, fontWeight: 700, minWidth: 32 }}>{pct}%</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4 }} onClick={e => { e.stopPropagation(); onEdit(v); }}>✏️</button>
                <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4 }} onClick={e => { e.stopPropagation(); goSched(v.id); }}>📅</button>
                <span style={{ fontSize: 14, color: "#94A3B8", transform: isE ? "rotate(180deg)" : "", transition: "transform 0.2s" }}>▼</span>
              </div>
            </div>
            {isE && <div style={{ padding: "0 20px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, borderTop: "1px solid #F1F5F9" }}>{STEPS.map(s => <div key={s.key} style={{ background: "#F8FAFC", borderRadius: 10, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{s.label}</span><span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100, background: SC[v[s.key].status].bg, color: SC[v[s.key].status].fg }}>{v[s.key].status}</span></div><div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}><span style={{ fontSize: 12, color: "#64748B" }}>Partecipanti:</span>{(v[s.key].participants || []).length === 0 && <span style={{ fontSize: 12, color: "#94A3B8" }}>—</span>}{(v[s.key].participants || []).map(p => <span key={p} style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: PC[p].bg, color: PC[p].fg }}>{p}</span>)}</div>{v[s.key].notes && <p style={{ fontSize: 13, color: "#475569", margin: "6px 0 0", lineHeight: 1.5 }}>{v[s.key].notes}</p>}</div>)}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════ GANTT ═══════════════
function GanttDash({ vendors }) {
  if (!vendors.length) return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", textAlign: "center" }}><div style={{ fontSize: 52, marginBottom: 16 }}>📊</div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Nessun dato</h2></div>;
  const tot = vendors.length * 4;
  const c = { a: 0, b: 0, c: 0, d: 0 };
  vendors.forEach(v => STEPS.forEach(s => { const st = v[s.key].status; if (st === "Conclusa") c.a++; else if (st === "Programmata") c.b++; else if (st === "Da Programmare") c.c++; else c.d++; }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[{ l: "Concluse", n: c.a, co: "#10B981", i: "✅" }, { l: "Programmate", n: c.b, co: "#3B82F6", i: "📅" }, { l: "Da Programmare", n: c.c, co: "#F59E0B", i: "⏳" }, { l: "Non necessarie", n: c.d, co: "#94A3B8", i: "➖" }].map((x, i) => (
          <div key={i} style={{ background: "white", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 14, border: "1px solid #E2E8F0", borderLeft: "4px solid " + x.co }}><div style={{ fontSize: 24 }}>{x.i}</div><div><div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{x.n}<span style={{ fontSize: 14, color: "#94A3B8", fontWeight: 400 }}>/{tot}</span></div><div style={{ fontSize: 13, color: "#64748B" }}>{x.l}</div></div></div>
        ))}
      </div>
      <div style={panel}><h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Avanzamento per Vendor</h3>
        {vendors.map((v, i) => { const done = STEPS.filter(s => v[s.key].status === "Conclusa" || v[s.key].status === "Non necessaria").length; const pct = Math.round((done / 4) * 100); return <div key={v.id} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F8FAFC", gap: 8 }}>
          <div style={{ width: 160, flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 28, height: 28, borderRadius: 7, background: "#6366F1", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{v.name.charAt(0).toUpperCase()}</div><span style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</span></div>
          {STEPS.map(s => { const st = v[s.key].status; const sc = SC[st]; return <div key={s.key} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", height: 32, background: "#F8FAFC", borderRadius: 6, overflow: "hidden" }}><div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 6, background: sc.bar, opacity: st === "Non necessaria" ? .3 : 1, width: st === "Conclusa" ? "100%" : st === "Programmata" ? "60%" : st === "Da Programmare" ? "20%" : "100%", transition: "width 0.5s" }} /><span style={{ fontSize: 11, color: sc.fg, fontWeight: 500, position: "relative", zIndex: 1 }}>{st === "Non necessaria" ? "N/A" : st.substring(0, 4)}</span></div>; })}
          <div style={{ width: 50, textAlign: "right" }}><span style={{ fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 100, background: pct === 100 ? "#D1FAE5" : pct >= 50 ? "#DBEAFE" : "#FEF3C7", color: pct === 100 ? "#065F46" : pct >= 50 ? "#1E40AF" : "#92400E" }}>{pct}%</span></div>
        </div>; })}
      </div>
    </div>
  );
}

// ═══════════════ SCHEDULING ═══════════════
function Scheduling({ vendors, initVid, clearInit, addSlot, rmSlot, setResp, addAv, rmAv }) {
  const [sel, setSel] = useState(initVid || vendors[0]?.id || "");
  const [ns, setNs] = useState({ date: "", time: "", step: "step1" });
  const [na, setNa] = useState({ date: "", timeFrom: "", timeTo: "" });
  useEffect(() => { if (initVid) { setSel(initVid); clearInit(); } }, [initVid]);

  const vendor = vendors.find(v => v.id === sel);
  const slots = fix(vendor?.slots);

  if (!vendors.length) return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", textAlign: "center" }}><div style={{ fontSize: 52, marginBottom: 16 }}>📅</div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Nessun vendor</h2></div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#64748B" }}>Vendor:</span>
        <select style={{ ...input, width: "auto", minWidth: 220 }} value={sel} onChange={e => setSel(e.target.value)}>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
      </div>
      {vendor && <>
        <div style={panel}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>📅 Slot proposti dal Vendor</h3>
          <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 16px" }}>Inserisci le date proposte. Ogni partecipante può indicare la propria disponibilità.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24, padding: 16, background: "#F8FAFC", borderRadius: 10, border: "1px dashed #CBD5E1" }}>
            <input type="date" style={{ ...input, flex: "1 1 130px" }} value={ns.date} onChange={e => setNs({ ...ns, date: e.target.value })} />
            <input type="time" style={{ ...input, flex: "1 1 100px" }} value={ns.time} onChange={e => setNs({ ...ns, time: e.target.value })} />
            <select style={{ ...input, flex: "1 1 120px" }} value={ns.step} onChange={e => setNs({ ...ns, step: e.target.value })}>{STEPS.map(s => <option key={s.key} value={s.key}>{s.short}</option>)}</select>
            <button style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#3B82F6", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" }} onClick={() => { if (!ns.date || !ns.time) return; addSlot(sel, ns); setNs({ date: "", time: "", step: "step1" }); }}>+ Aggiungi</button>
          </div>
          {slots.length === 0 && <p style={{ color: "#94A3B8", fontSize: 14, textAlign: "center", padding: 32 }}>Nessuno slot proposto.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {slots.map(s => {
              const sLabel = STEPS.find(st => st.key === s.step)?.label || s.step;
              const resp = s.responses || {};
              // Solo i partecipanti assegnati a questo step nel tab Vendor
              const stepParts = (vendor[s.step]?.participants?.length > 0) ? vendor[s.step].participants : [];
              const yC = stepParts.filter(p => resp[p] === "yes").length;
              const nC = stepParts.filter(p => resp[p] === "no").length;
              const pC = stepParts.filter(p => !resp[p]).length;
              return (
                <div key={s.id} style={{ borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", background: "linear-gradient(135deg,#EFF6FF,#F0F9FF)", borderBottom: "2px solid #DBEAFE", gap: 12 }}>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 18, fontWeight: 700 }}>{fdt(s.date, s.time)}</div><div style={{ fontSize: 13, color: "#3B82F6", marginTop: 2, fontWeight: 600 }}>{sLabel}</div></div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ background: "#D1FAE5", color: "#065F46", padding: "4px 12px", borderRadius: 100, fontSize: 13, fontWeight: 700 }}>✓ {yC}</span>
                      <span style={{ background: "#FEE2E2", color: "#991B1B", padding: "4px 12px", borderRadius: 100, fontSize: 13, fontWeight: 700 }}>✗ {nC}</span>
                      <span style={{ background: "#FEF3C7", color: "#92400E", padding: "4px 12px", borderRadius: 100, fontSize: 13, fontWeight: 700 }}>⏳ {pC}</span>
                    </div>
                    <button onClick={() => rmSlot(vendor.id, s.id)} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 20 }}>✕</button>
                  </div>
                  <div style={{ background: "white" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 120px", padding: "10px 20px", borderBottom: "1px solid #F1F5F9", background: "#FAFBFC" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>Chi</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", textAlign: "center" }}>Disponibile</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", textAlign: "center" }}>Non disp.</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", textAlign: "center" }}>Stato</span>
                    </div>
                    {stepParts.length === 0 && (
                      <div style={{ padding: "20px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
                        ⚠️ Nessun partecipante assegnato a questo step. Vai nel tab <strong>Vendor</strong> → modifica il vendor → assegna i partecipanti allo step corrispondente.
                      </div>
                    )}
                    {stepParts.map((p, pi) => {
                      const val = resp[p];
                      return (
                        <div key={p} style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 120px", alignItems: "center", padding: "12px 20px", borderBottom: pi < stepParts.length - 1 ? "1px solid #F8FAFC" : "none", background: val === "yes" ? "#F0FDF4" : val === "no" ? "#FFF5F5" : "white" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, padding: "5px 12px", borderRadius: 100, background: PC[p].bg, color: PC[p].fg, justifySelf: "start" }}>{p}</span>
                          <div style={{ display: "flex", justifyContent: "center" }}><button onClick={() => setResp(vendor.id, s.id, p, "yes")} style={{ padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", border: val === "yes" ? "2px solid #059669" : "1.5px solid #E2E8F0", background: val === "yes" ? "#D1FAE5" : "white", color: val === "yes" ? "#059669" : "#94A3B8" }}>✓ Sì</button></div>
                          <div style={{ display: "flex", justifyContent: "center" }}><button onClick={() => setResp(vendor.id, s.id, p, "no")} style={{ padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", border: val === "no" ? "2px solid #DC2626" : "1.5px solid #E2E8F0", background: val === "no" ? "#FEE2E2" : "white", color: val === "no" ? "#DC2626" : "#94A3B8" }}>✗ No</button></div>
                          <div style={{ textAlign: "center" }}>
                            {!val && <span style={{ fontSize: 12, color: "#F59E0B", fontWeight: 700, animation: "pulse 2s infinite" }}>⏳ In attesa</span>}
                            {val === "yes" && <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>✓ OK</span>}
                            {val === "no" && <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 700 }}>✗ No</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={panel}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>🕐 Disponibilità alternative</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, padding: 16, background: "#F0FDF4", borderRadius: 10, border: "1px dashed #86EFAC" }}>
            <input type="date" style={{ ...input, flex: "1 1 130px" }} value={na.date} onChange={e => setNa({ ...na, date: e.target.value })} />
            <input type="time" style={{ ...input, flex: "0 1 100px" }} value={na.timeFrom} onChange={e => setNa({ ...na, timeFrom: e.target.value })} />
            <span style={{ alignSelf: "center", color: "#64748B" }}>–</span>
            <input type="time" style={{ ...input, flex: "0 1 100px" }} value={na.timeTo} onChange={e => setNa({ ...na, timeTo: e.target.value })} />
            <button style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#10B981", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" }} onClick={() => { if (!na.date || !na.timeFrom || !na.timeTo) return; addAv(sel, na); setNa({ date: "", timeFrom: "", timeTo: "" }); }}>+ Aggiungi</button>
          </div>
          {(vendor.availability || []).length === 0 && <p style={{ color: "#94A3B8", fontSize: 14, textAlign: "center", padding: 20 }}>Nessuna disponibilità alternativa.</p>}
          {(vendor.availability || []).map(a => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#F0FDF4", borderRadius: 8, borderLeft: "3px solid #10B981", marginBottom: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{new Date(a.date + "T00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}</span>
              <span style={{ color: "#64748B", fontSize: 13 }}>{a.timeFrom} – {a.timeTo}</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => rmAv(vendor.id, a.id)} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}
