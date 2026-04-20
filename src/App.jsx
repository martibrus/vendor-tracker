import { useState, useEffect, useMemo } from "react";
import { subscribeVendors, saveVendor, removeVendor, subscribeGantt, saveGanttTask, removeGanttTask, subscribeSettings, saveSettings, logActivity, subscribeLogs, deleteLog, clearAllLogs } from "./firebase.js";

const STATUSES1 = ["Conclusa", "Programmata", "Slot da confermare", "Da Programmare"];
const STATUSES2 = ["Conclusa", "Programmata", "Slot da confermare", "Da Programmare", "Non necessaria"];
const PARTS = ["BRM", "CEG", "PAS", "SAP", "GAV"];
const ADMIN = "BRM";
const STEPS = [
  { key: "step1", label: "Step 1 – Call conoscitiva", short: "Step 1", sts: STATUSES1, color: "#10B981", bg: "#D1FAE5" },
  { key: "step2", label: "Step 2 – Call tecnica", short: "Step 2", sts: STATUSES2, color: "#3B82F6", bg: "#DBEAFE" },
  { key: "step3", label: "Step 3 – Demo 1", short: "Step 3", sts: STATUSES2, color: "#8B5CF6", bg: "#EDE9FE" },
  { key: "step4", label: "Step 4 – Demo 2", short: "Step 4", sts: STATUSES2, color: "#F59E0B", bg: "#FEF3C7" },
];
const ALL_TABS = [
  { key: "vendors", label: "📋 Vendor" }, { key: "gantt", label: "📊 Riepilogo" },
  { key: "calendar", label: "🗓️ Calendario" }, { key: "timeline", label: "📐 Gantt" },
  { key: "slots", label: "📅 Scheduling" },
];
const gid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const SC = { "Conclusa": { bg: "#D1FAE5", fg: "#065F46", bar: "#10B981" }, "Programmata": { bg: "#DBEAFE", fg: "#1E40AF", bar: "#3B82F6" }, "Slot da confermare": { bg: "#BFDBFE", fg: "#1E3A8A", bar: "#2563EB" }, "Da Programmare": { bg: "#FEF3C7", fg: "#92400E", bar: "#F59E0B" }, "Non necessaria": { bg: "#F1F5F9", fg: "#64748B", bar: "#CBD5E1" } };
const PC = { BRM: { bg: "#EDE9FE", fg: "#6D28D9" }, CEG: { bg: "#FCE7F3", fg: "#BE185D" }, PAS: { bg: "#DBEAFE", fg: "#1D4ED8" }, SAP: { bg: "#D1FAE5", fg: "#047857" }, GAV: { bg: "#FEF3C7", fg: "#B45309" } };
const GCOL = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#06B6D4","#F97316"];
const fix = (s) => (s||[]).map(x => ({ ...x, responses: x.responses||{} }));
function makeEmpty() { return { id:gid(),name:"",crm:"",step1:{status:"Da Programmare",participants:[],notes:""},step2:{status:"Da Programmare",participants:[],notes:""},step3:{status:"Da Programmare",participants:[],notes:""},step4:{status:"Da Programmare",participants:[],notes:""},slots:[],availability:[] }; }
function fdt(d,t){try{return new Date(d+"T"+t).toLocaleString("it-IT",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});}catch{return d+" "+t;}}
function timeAgo(iso){const diff=Date.now()-new Date(iso).getTime();const m=Math.floor(diff/60000),h=Math.floor(diff/3600000),d=Math.floor(diff/86400000);if(m<1)return"adesso";if(m<60)return m+" min fa";if(h<24)return h+" ore fa";if(d<7)return d+"g fa";return new Date(iso).toLocaleDateString("it-IT",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});}

const lb={fontSize:12,fontWeight:600,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.5px"};
const inp={padding:"10px 12px",borderRadius:8,border:"1px solid #E2E8F0",fontSize:14,outline:"none",fontFamily:"inherit",background:"white",width:"100%",boxSizing:"border-box"};
const pnl={background:"white",borderRadius:14,padding:20,border:"1px solid #E2E8F0"};
const ACTION_ICONS={"preferenza":"🗳️","vendor_creato":"➕","vendor_modificato":"✏️","vendor_eliminato":"🗑️","slot_aggiunto":"📅","slot_rimosso":"❌","disponibilita_aggiunta":"🕐","disponibilita_rimossa":"🕐","gantt_creato":"📐","gantt_modificato":"📐","gantt_eliminato":"🗑️","tab_modificati":"⚙️","login":"🔑"};

export default function App(){
  const [currentUser,setCurrentUser]=useState(()=>{try{return localStorage.getItem("vt_user")||null}catch{return null}});
  const [vendors,setVendors]=useState([]);const [ganttTasks,setGanttTasks]=useState([]);
  const [tabVis,setTabVis]=useState({vendors:true,gantt:true,calendar:true,timeline:true,slots:true});
  const [logs,setLogs]=useState([]);const [loading,setLoading]=useState(true);
  const [view,setView]=useState("vendors");const [formVendor,setFormVendor]=useState(null);
  const [expanded,setExpanded]=useState(null);const [schedVid,setSchedVid]=useState(null);const [showAdmin,setShowAdmin]=useState(false);

  useEffect(()=>{try{
    const u1=subscribeVendors(d=>{setVendors(d.map(v=>({...v,slots:fix(v.slots),availability:v.availability||[]}))); setLoading(false);});
    const u2=subscribeGantt(d=>setGanttTasks(d));const u3=subscribeSettings(d=>setTabVis(p=>({...p,...d})));
    const u4=subscribeLogs(d=>setLogs(d),200);return()=>{u1();u2();u3();u4();};
  }catch{setLoading(false);}},[]);

  function selectUser(u){setCurrentUser(u);try{localStorage.setItem("vt_user",u)}catch{} logActivity(u,"login",u+" ha effettuato l'accesso");}
  const isAdmin=currentUser===ADMIN;
  const visibleTabs=ALL_TABS.filter(t=>tabVis[t.key]||isAdmin);
  useEffect(()=>{if(visibleTabs.length>0&&!visibleTabs.find(t=>t.key===view))setView(visibleTabs[0].key);},[tabVis,view]);

  async function sv(vendor){try{await saveVendor(vendor)}catch(e){alert("Errore: "+e.message)}}
  async function doSave(v){const ex=vendors.find(x=>x.id===v.id);await sv(v);logActivity(currentUser,ex?"vendor_modificato":"vendor_creato",currentUser+(ex?" ha modificato":" ha creato")+" il vendor "+v.name);setFormVendor(null);}
  async function doDel(id){if(!confirm("Eliminare?"))return;const v=vendors.find(x=>x.id===id);try{await removeVendor(id)}catch(e){alert("Errore: "+e.message)} logActivity(currentUser,"vendor_eliminato",currentUser+" ha eliminato "+( v?.name||id));setFormVendor(null);}
  async function addSlot(vid,sl){const v=vendors.find(x=>x.id===vid);if(!v)return;await sv({...v,slots:[...fix(v.slots),{...sl,id:gid(),responses:{}}]});logActivity(currentUser,"slot_aggiunto",currentUser+" ha aggiunto slot per "+v.name+" – "+(STEPS.find(s=>s.key===sl.step)?.label||sl.step));}
  async function rmSlot(vid,sid){const v=vendors.find(x=>x.id===vid);if(!v)return;await sv({...v,slots:fix(v.slots).filter(s=>s.id!==sid)});logActivity(currentUser,"slot_rimosso",currentUser+" ha rimosso slot per "+v.name);}
  async function setResp(vid,sid,who,val){const v=vendors.find(x=>x.id===vid);if(!v)return;const slot=fix(v.slots).find(s=>s.id===sid);const prev=slot?.responses?.[who];const nv=prev===val?undefined:val;await sv({...v,slots:fix(v.slots).map(s=>{if(s.id!==sid)return s;const r={...s.responses};if(r[who]===val)delete r[who];else r[who]=val;return{...s,responses:r};})});if(slot){const sL=STEPS.find(st=>st.key===slot.step)?.label||slot.step;logActivity(who,"preferenza",who+" ha espresso preferenza per call con "+v.name+" – "+sL+": "+(nv==="yes"?"disponibile":nv==="no"?"non disponibile":"rimosso"));}}
  async function addAv(vid,a){const v=vendors.find(x=>x.id===vid);if(!v)return;await sv({...v,availability:[...(v.availability||[]),{...a,id:gid()}]});logActivity(currentUser,"disponibilita_aggiunta",currentUser+" ha aggiunto disponibilità per "+v.name);}
  async function rmAv(vid,aid){const v=vendors.find(x=>x.id===vid);if(!v)return;await sv({...v,availability:(v.availability||[]).filter(a=>a.id!==aid)});logActivity(currentUser,"disponibilita_rimossa",currentUser+" ha rimosso disponibilità per "+v.name);}

  const notifs=[];vendors.forEach(v=>{fix(v.slots).forEach(s=>{const so=STEPS.find(st=>st.key===s.step);const tg=(v[s.step]?.participants?.length>0)?v[s.step].participants:[];tg.forEach(p=>{if(!s.responses[p])notifs.push({vid:v.id,vn:v.name,sl:so?.label||s.step,who:p,date:s.date,time:s.time});});});});
  function goS(vid){setSchedVid(vid);setView("slots");}

  if(!currentUser)return(<div style={{minHeight:"100vh",background:"#0F172A",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Outfit',sans-serif"}}><style>{css}</style><div style={{background:"white",borderRadius:20,padding:40,maxWidth:420,width:"100%",textAlign:"center"}}><div style={{width:56,height:56,borderRadius:14,background:"linear-gradient(135deg,#3B82F6,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:28,fontWeight:800,margin:"0 auto 20px"}}>V</div><h1 style={{margin:"0 0 8px",fontSize:24,fontWeight:800}}>Vendor Tracker</h1><p style={{margin:"0 0 28px",color:"#64748B",fontSize:15}}>Seleziona il tuo profilo.</p><div style={{display:"flex",flexDirection:"column",gap:10}}>{PARTS.map(p=><button key={p} onClick={()=>selectUser(p)} style={{padding:"14px 20px",borderRadius:12,border:"2px solid "+PC[p].fg+"22",background:PC[p].bg,color:PC[p].fg,fontSize:16,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>{p} {p===ADMIN&&<span style={{fontSize:11,background:PC[p].fg,color:"white",padding:"2px 8px",borderRadius:100}}>Admin</span>}</button>)}</div></div></div>);
  if(loading)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"'Outfit',sans-serif"}}><style>{css}</style><div style={{width:32,height:32,border:"3px solid #E2E8F0",borderTopColor:"#6366F1",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div>;

  return(<div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:"'Outfit',sans-serif",color:"#0F172A"}}><style>{css}</style>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 28px",background:"#0F172A",flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}><div style={{width:36,height:36,borderRadius:9,background:"linear-gradient(135deg,#3B82F6,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:18,fontWeight:800}}>V</div><h1 style={{margin:0,fontSize:16,fontWeight:700,color:"#F8FAFC"}}>Vendor Tracker</h1></div>
      <div style={{display:"flex",gap:4,background:"#1E293B",borderRadius:10,padding:4}}>{visibleTabs.map(t=><button key={t.key} onClick={()=>setView(t.key)} style={{padding:"7px 14px",borderRadius:8,border:"none",background:view===t.key?"#334155":"transparent",color:view===t.key?"#F8FAFC":"#94A3B8",cursor:"pointer",fontSize:13,fontWeight:500,position:"relative",opacity:(!tabVis[t.key]&&isAdmin)?.4:1}}>{t.label}{t.key==="vendors"&&notifs.length>0&&<span style={{position:"absolute",top:1,right:3,background:"#EF4444",color:"white",fontSize:9,fontWeight:700,borderRadius:100,padding:"1px 4px"}}>{notifs.length}</span>}{!tabVis[t.key]&&isAdmin&&<span style={{fontSize:9,color:"#EF4444",marginLeft:4}}>nascosto</span>}</button>)}</div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{...(PC[currentUser]||{}),padding:"5px 12px",borderRadius:100,fontSize:13,fontWeight:700,cursor:"pointer"}} onClick={()=>{if(confirm("Cambiare utente?")){try{localStorage.removeItem("vt_user")}catch{}setCurrentUser(null)}}}>{currentUser}</span>
        {isAdmin&&<button onClick={()=>setShowAdmin(true)} style={{background:"none",border:"none",color:"#94A3B8",cursor:"pointer",fontSize:18,padding:4}}>⚙️</button>}
        <button onClick={()=>setFormVendor(makeEmpty())} style={{padding:"8px 16px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#3B82F6,#6366F1)",color:"white",fontWeight:600,fontSize:13,cursor:"pointer"}}>+ Vendor</button>
      </div>
    </div>
    <div style={{maxWidth:1200,margin:"0 auto",padding:"24px 28px"}}>
      {view==="vendors"&&<VendorList vendors={vendors} onEdit={v=>setFormVendor(JSON.parse(JSON.stringify(v)))} expanded={expanded} setExpanded={setExpanded} notifs={notifs} goS={goS}/>}
      {view==="gantt"&&<GanttDash vendors={vendors}/>}
      {view==="calendar"&&<CalendarView vendors={vendors} ganttTasks={ganttTasks} isAdmin={isAdmin}/>}
      {view==="timeline"&&<GanttTimeline tasks={ganttTasks} vendors={vendors} currentUser={currentUser}/>}
      {view==="slots"&&<Scheduling vendors={vendors} initVid={schedVid} clearInit={()=>setSchedVid(null)} addSlot={addSlot} rmSlot={rmSlot} setResp={setResp}/>}
    </div>
    {formVendor&&<Modal onClose={()=>setFormVendor(null)}><VendorForm vendor={formVendor} onChange={setFormVendor} onSave={()=>{if(!formVendor.name){alert("Inserisci il nome");return;}doSave(formVendor);}} onDel={vendors.find(x=>x.id===formVendor.id)?()=>doDel(formVendor.id):null} isNew={!vendors.find(x=>x.id===formVendor.id)}/></Modal>}
    {showAdmin&&isAdmin&&<Modal onClose={()=>setShowAdmin(false)}><AdminPanel tabVis={tabVis} logs={logs} onSave={async tv=>{await saveSettings(tv);logActivity(currentUser,"tab_modificati","BRM ha modificato la visibilità dei tab");setShowAdmin(false);}}/></Modal>}
  </div>);
}

// ===================== CALENDAR VIEW =====================
function CalendarView({ vendors, ganttTasks, isAdmin }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [selectedDay, setSelectedDay] = useState(null);
  // Filter states — admin controls what's visible
  const [showVendors, setShowVendors] = useState(() => {
    const m = {}; vendors.forEach(v => { m[v.id] = true; }); return m;
  });
  const [showSteps, setShowSteps] = useState(() => {
    const m = {}; STEPS.forEach(s => { m[s.key] = true; }); return m;
  });
  const [showGantt, setShowGantt] = useState(true);

  // Keep vendor filters in sync if new vendors appear
  useEffect(() => {
    setShowVendors(prev => {
      const m = { ...prev };
      vendors.forEach(v => { if (!(v.id in m)) m[v.id] = true; });
      return m;
    });
  }, [vendors]);

  const DAYS_IT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  const MONTHS_IT = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

  const events = useMemo(() => {
    const ev = [];
    vendors.forEach(v => {
      if (!showVendors[v.id]) return;
      fix(v.slots).forEach(s => {
        if (!showSteps[s.step]) return;
        const step = STEPS.find(st => st.key === s.step);
        ev.push({ date: s.date, type: "slot", vendor: v.name, label: step?.short || s.step, stepKey: s.step, color: step?.color || "#3B82F6", bg: step?.bg || "#DBEAFE", time: s.time, status: v[s.step]?.status || "", participants: v[s.step]?.participants || [] });
      });
    });
    if (showGantt) {
      ganttTasks.forEach(t => {
        if (!t.start || !t.end) return;
        const s = new Date(t.start), e = new Date(t.end);
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
          ev.push({ date: d.toISOString().slice(0, 10), type: "gantt", label: t.name, vendor: t.vendor || "", color: t.color || "#6366F1", bg: t.color ? t.color + "22" : "#EEF2FF", assignee: t.assignee || "", isStart: d.toISOString().slice(0, 10) === t.start, isEnd: d.toISOString().slice(0, 10) === t.end });
        }
      });
    }
    return ev;
  }, [vendors, ganttTasks, showVendors, showSteps, showGantt]);

  const firstDay = new Date(month.year, month.month, 1);
  const lastDay = new Date(month.year, month.month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  const weeks = Math.ceil((startPad + totalDays) / 7);
  const today = new Date().toISOString().slice(0, 10);

  function prev() { setMonth(m => m.month === 0 ? { year: m.year - 1, month: 11 } : { ...m, month: m.month - 1 }); setSelectedDay(null); }
  function next() { setMonth(m => m.month === 11 ? { year: m.year + 1, month: 0 } : { ...m, month: m.month + 1 }); setSelectedDay(null); }
  function getDateStr(day) { return `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; }
  function eventsForDay(day) { return events.filter(e => e.date === getDateStr(day)); }
  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  function toggleAllVendors(val) { const m = {}; vendors.forEach(v => { m[v.id] = val; }); setShowVendors(m); }
  function toggleAllSteps(val) { const m = {}; STEPS.forEach(s => { m[s.key] = val; }); setShowSteps(m); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* ── LEFT SIDEBAR: FILTERS (admin only can toggle, others see read-only) ── */}
        <div style={{ flex: "0 0 220px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Vendor filter */}
          <div style={pnl}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#334155" }}>📋 Vendor</h4>
              {isAdmin && <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => toggleAllVendors(true)} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid #E2E8F0", background: "white", cursor: "pointer", color: "#10B981", fontWeight: 600 }}>Tutti</button>
                <button onClick={() => toggleAllVendors(false)} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid #E2E8F0", background: "white", cursor: "pointer", color: "#EF4444", fontWeight: 600 }}>Nessuno</button>
              </div>}
            </div>
            {vendors.map(v => (
              <label key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: isAdmin ? "pointer" : "default", fontSize: 13, color: showVendors[v.id] ? "#0F172A" : "#CBD5E1" }}>
                <input type="checkbox" checked={!!showVendors[v.id]} onChange={() => isAdmin && setShowVendors(p => ({ ...p, [v.id]: !p[v.id] }))} disabled={!isAdmin} style={{ accentColor: "#6366F1", cursor: isAdmin ? "pointer" : "default" }} />
                <span style={{ fontWeight: 600 }}>{v.name}</span>
              </label>
            ))}
            {vendors.length === 0 && <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>Nessun vendor</p>}
          </div>

          {/* Step filter */}
          <div style={pnl}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#334155" }}>📅 Step</h4>
              {isAdmin && <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => toggleAllSteps(true)} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid #E2E8F0", background: "white", cursor: "pointer", color: "#10B981", fontWeight: 600 }}>Tutti</button>
                <button onClick={() => toggleAllSteps(false)} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid #E2E8F0", background: "white", cursor: "pointer", color: "#EF4444", fontWeight: 600 }}>Nessuno</button>
              </div>}
            </div>
            {STEPS.map(s => (
              <label key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: isAdmin ? "pointer" : "default", fontSize: 13, color: showSteps[s.key] ? "#0F172A" : "#CBD5E1" }}>
                <input type="checkbox" checked={!!showSteps[s.key]} onChange={() => isAdmin && setShowSteps(p => ({ ...p, [s.key]: !p[s.key] }))} disabled={!isAdmin} style={{ accentColor: s.color, cursor: isAdmin ? "pointer" : "default" }} />
                <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>{s.short}</span>
              </label>
            ))}
          </div>

          {/* Gantt filter */}
          <div style={pnl}>
            <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#334155" }}>📐 Attività Gantt</h4>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: isAdmin ? "pointer" : "default", fontSize: 13, color: showGantt ? "#0F172A" : "#CBD5E1" }}>
              <input type="checkbox" checked={showGantt} onChange={() => isAdmin && setShowGantt(!showGantt)} disabled={!isAdmin} style={{ accentColor: "#6366F1", cursor: isAdmin ? "pointer" : "default" }} />
              <div style={{ width: 10, height: 10, borderRadius: 3, background: "#6366F1", flexShrink: 0 }} />
              <span style={{ fontWeight: 600 }}>Mostra Gantt</span>
            </label>
            {!isAdmin && <p style={{ fontSize: 11, color: "#94A3B8", margin: "8px 0 0" }}>Solo l'admin può modificare i filtri.</p>}
          </div>
        </div>

        {/* ── CENTER: CALENDAR GRID ── */}
        <div style={{ ...pnl, flex: "3 1 500px", padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "#0F172A" }}>
            <button onClick={prev} style={{ background: "none", border: "none", color: "white", fontSize: 20, cursor: "pointer", padding: "4px 12px" }}>‹</button>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "white" }}>{MONTHS_IT[month.month]} {month.year}</h3>
            <button onClick={next} style={{ background: "none", border: "none", color: "white", fontSize: 20, cursor: "pointer", padding: "4px 12px" }}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid #E2E8F0" }}>
            {DAYS_IT.map((d, i) => <div key={d} style={{ padding: "10px 4px", textAlign: "center", fontSize: 12, fontWeight: 700, color: i >= 5 ? "#CBD5E1" : "#64748B", background: "#FAFBFC" }}>{d}</div>)}
          </div>
          {Array.from({ length: weeks }).map((_, w) => (
            <div key={w} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
              {Array.from({ length: 7 }).map((_, d) => {
                const dayNum = w * 7 + d - startPad + 1;
                const isValid = dayNum >= 1 && dayNum <= totalDays;
                const dateStr = isValid ? getDateStr(dayNum) : "";
                const dayEvents = isValid ? eventsForDay(dayNum) : [];
                const isToday = dateStr === today;
                const isSel = selectedDay === dayNum;
                const isWe = d >= 5;
                return (
                  <div key={d} onClick={() => isValid && setSelectedDay(isSel ? null : dayNum)} style={{ minHeight: 80, padding: "4px 6px", borderRight: "1px solid #F1F5F9", borderBottom: "1px solid #F1F5F9", background: isSel ? "#EFF6FF" : isWe ? "#FAFBFC" : "white", cursor: isValid ? "pointer" : "default" }}>
                    {isValid && <>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: isToday ? 800 : 500, color: isToday ? "white" : isWe ? "#CBD5E1" : "#334155", background: isToday ? "#3B82F6" : "transparent", width: isToday ? 26 : "auto", height: isToday ? 26 : "auto", borderRadius: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>{dayNum}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {dayEvents.slice(0, 3).map((ev, i) => <div key={i} style={{ fontSize: 10, fontWeight: 600, padding: "2px 4px", borderRadius: 4, background: ev.bg, color: ev.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderLeft: "3px solid " + ev.color }}>{ev.type === "slot" ? ev.vendor : ev.label}</div>)}
                        {dayEvents.length > 3 && <span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600, paddingLeft: 4 }}>+{dayEvents.length - 3}</span>}
                      </div>
                    </>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── RIGHT SIDEBAR: DAY DETAIL ── */}
        <div style={{ ...pnl, flex: "1 1 260px", minWidth: 260 }}>
          {selectedDay ? <>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>{selectedDay} {MONTHS_IT[month.month]} {month.year}</h3>
            {selectedEvents.length === 0 && <p style={{ color: "#94A3B8", fontSize: 14, textAlign: "center", padding: 20 }}>Nessuna attività.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {selectedEvents.map((ev, i) => <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: ev.bg, borderLeft: "4px solid " + ev.color }}>
                {ev.type === "slot" ? <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: ev.color }}>{ev.vendor}</div>
                  <div style={{ fontSize: 13, color: "#334155", marginTop: 2 }}>{ev.label} · {ev.time}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Stato: <strong>{ev.status}</strong></div>
                  {ev.participants.length > 0 && <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>{ev.participants.map(p => <span key={p} style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 100, background: PC[p]?.bg || "#F1F5F9", color: PC[p]?.fg || "#64748B" }}>{p}</span>)}</div>}
                </> : <>
                  <div style={{ fontSize: 14, fontWeight: 700, color: ev.color }}>{ev.label}</div>
                  {ev.vendor && <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{ev.vendor}</div>}
                  {ev.assignee && <div style={{ fontSize: 12, marginTop: 4, color: PC[ev.assignee]?.fg || "#64748B", fontWeight: 600 }}>{ev.assignee}</div>}
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{ev.isStart ? "▶ Inizio" : ev.isEnd ? "■ Fine" : "━ In corso"}</div>
                </>}
              </div>)}
            </div>
          </> : <div style={{ textAlign: "center", padding: 20, color: "#94A3B8" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👈</div>
            <p style={{ fontSize: 14, margin: 0 }}>Clicca su un giorno per il dettaglio.</p>
          </div>}
        </div>
      </div>
    </div>
  );
}

// ===================== ADMIN PANEL =====================
function AdminPanel({tabVis,logs,onSave}){
  const [local,setLocal]=useState({...tabVis});const [at,setAt]=useState("tabs");const [lf,setLf]=useState("all");
  const fl=lf==="all"?logs:logs.filter(l=>l.user===lf);
  const [deleting,setDeleting]=useState(false);

  async function handleDeleteLog(id){
    try{await deleteLog(id);}catch(e){alert("Errore: "+e.message);}
  }
  async function handleClearAll(){
    if(!confirm("Eliminare TUTTE le attività dallo storico? Questa azione è irreversibile."))return;
    setDeleting(true);
    try{await clearAllLogs();}catch(e){alert("Errore: "+e.message);}
    setDeleting(false);
  }

  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <h2 style={{margin:0,fontSize:20,fontWeight:700}}>⚙️ Pannello Admin</h2>
      <div style={{display:"flex",gap:4,background:"#F1F5F9",borderRadius:10,padding:4}}>
        <button onClick={()=>setAt("tabs")} style={{flex:1,padding:"8px 14px",borderRadius:8,border:"none",background:at==="tabs"?"white":"transparent",color:at==="tabs"?"#0F172A":"#64748B",cursor:"pointer",fontSize:13,fontWeight:600,boxShadow:at==="tabs"?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>🔒 Gestione Tab</button>
        <button onClick={()=>setAt("logs")} style={{flex:1,padding:"8px 14px",borderRadius:8,border:"none",background:at==="logs"?"white":"transparent",color:at==="logs"?"#0F172A":"#64748B",cursor:"pointer",fontSize:13,fontWeight:600,boxShadow:at==="logs"?"0 1px 3px rgba(0,0,0,0.1)":"none"}}>📜 Storico attività</button>
      </div>

      {at==="tabs"&&<>
        <p style={{margin:0,color:"#64748B",fontSize:14}}>Scegli quali tab rendere visibili.</p>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {ALL_TABS.map(t=><div key={t.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:local[t.key]?"#F0FDF4":"#FFF5F5",borderRadius:10,border:"1px solid "+(local[t.key]?"#A7F3D0":"#FECACA")}}>
            <span style={{fontSize:15,fontWeight:600}}>{t.label}</span>
            <button onClick={()=>setLocal({...local,[t.key]:!local[t.key]})} style={{padding:"8px 20px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,background:local[t.key]?"#D1FAE5":"#FEE2E2",color:local[t.key]?"#059669":"#DC2626"}}>{local[t.key]?"✓ Visibile":"✗ Nascosto"}</button>
          </div>)}
        </div>
        <button onClick={()=>onSave(local)} style={{padding:"12px 24px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#3B82F6,#6366F1)",color:"white",fontWeight:700,fontSize:15,cursor:"pointer"}}>Salva impostazioni</button>
      </>}

      {at==="logs"&&<>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:13,color:"#64748B",fontWeight:600}}>Filtra:</span>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              <button onClick={()=>setLf("all")} style={{padding:"5px 12px",borderRadius:100,border:"1px solid "+(lf==="all"?"#3B82F6":"#E2E8F0"),background:lf==="all"?"#DBEAFE":"white",color:lf==="all"?"#1E40AF":"#64748B",fontSize:12,fontWeight:600,cursor:"pointer"}}>Tutti</button>
              {PARTS.map(p=><button key={p} onClick={()=>setLf(p)} style={{padding:"5px 12px",borderRadius:100,border:"1px solid "+(lf===p?PC[p].fg+"44":"#E2E8F0"),background:lf===p?PC[p].bg:"white",color:lf===p?PC[p].fg:"#94A3B8",fontSize:12,fontWeight:600,cursor:"pointer"}}>{p}</button>)}
            </div>
          </div>
          <button onClick={handleClearAll} disabled={deleting} style={{padding:"6px 14px",borderRadius:8,border:"none",background:"#FEE2E2",color:"#DC2626",fontSize:12,fontWeight:700,cursor:deleting?"wait":"pointer",opacity:deleting?.5:1}}>
            {deleting?"Eliminando...":"🗑️ Cancella tutto"}
          </button>
        </div>

        <div style={{maxHeight:420,overflowY:"auto",display:"flex",flexDirection:"column",gap:2}}>
          {fl.length===0&&<p style={{textAlign:"center",color:"#94A3B8",fontSize:14,padding:32}}>Nessuna attività.</p>}
          {fl.map((l,i)=><div key={l.id||i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",background:i%2===0?"#FAFBFC":"white",borderRadius:8}}>
            <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{ACTION_ICONS[l.action]||"📌"}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                <span style={{fontSize:12,fontWeight:700,padding:"2px 8px",borderRadius:100,background:PC[l.user]?.bg||"#F1F5F9",color:PC[l.user]?.fg||"#64748B"}}>{l.user}</span>
                <span style={{fontSize:11,color:"#94A3B8"}}>{timeAgo(l.timestamp)}</span>
              </div>
              <p style={{margin:"3px 0 0",fontSize:13,color:"#334155",lineHeight:1.4}}>{l.details}</p>
            </div>
            <button onClick={()=>handleDeleteLog(l.id)} title="Elimina" style={{background:"none",border:"none",cursor:"pointer",color:"#CBD5E1",fontSize:14,padding:2,flexShrink:0,marginTop:2}}>✕</button>
          </div>)}
        </div>
      </>}
    </div>
  );
}

// ===================== VENDOR FORM =====================
function VendorForm({vendor,onChange,onSave,onDel,isNew}){
  function uf(f,val){onChange({...vendor,[f]:val})}function us(sk,f,val){onChange({...vendor,[sk]:{...vendor[sk],[f]:val}})}function tp(sk,p){const c=vendor[sk].participants||[];us(sk,"participants",c.includes(p)?c.filter(x=>x!==p):[...c,p])}
  return(<div style={{display:"flex",flexDirection:"column",gap:20}}>
    <h2 style={{margin:0,fontSize:20,fontWeight:700}}>{isNew?"Nuovo Vendor":"Modifica Vendor"}</h2>
    <div style={{display:"flex",flexDirection:"column",gap:4}}><span style={lb}>Nome Vendor *</span><input style={inp} value={vendor.name} onChange={e=>uf("name",e.target.value)} placeholder="Es. Acme Corp" autoFocus/></div>
    <div style={{display:"flex",flexDirection:"column",gap:4}}><span style={lb}>CRM</span><input style={inp} value={vendor.crm} onChange={e=>uf("crm",e.target.value)} placeholder="Riferimento CRM..."/></div>
    <div style={{height:1,background:"#E2E8F0"}}/>
    {STEPS.map(step=>(<div key={step.key} style={{background:"#F8FAFC",borderRadius:12,padding:16,display:"flex",flexDirection:"column",gap:10}}>
      <h3 style={{margin:0,fontSize:15,fontWeight:700}}>{step.label}</h3>
      <div style={{display:"flex",flexDirection:"column",gap:4}}><span style={lb}>Stato</span><select style={inp} value={vendor[step.key].status} onChange={e=>us(step.key,"status",e.target.value)}>{step.sts.map(st=><option key={st} value={st}>{st}</option>)}</select></div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}><span style={lb}>Partecipanti</span><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{PARTS.map(p=>{const a=(vendor[step.key].participants||[]).includes(p);return<button key={p} type="button" onClick={()=>tp(step.key,p)} style={{padding:"6px 14px",borderRadius:100,cursor:"pointer",fontSize:13,fontWeight:600,border:"1.5px solid "+(a?PC[p].fg+"33":"#E2E8F0"),background:a?PC[p].bg:"#F8FAFC",color:a?PC[p].fg:"#94A3B8"}}>{p}</button>})}</div></div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}><span style={lb}>Note</span><textarea style={{...inp,minHeight:48}} value={vendor[step.key].notes} onChange={e=>us(step.key,"notes",e.target.value)} placeholder="Note..."/></div>
    </div>))}
    <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>{onDel&&<button type="button" onClick={onDel} style={{padding:"10px 20px",borderRadius:10,border:"none",background:"#FEE2E2",color:"#DC2626",fontWeight:600,fontSize:14,cursor:"pointer"}}>Elimina</button>}<div style={{flex:1}}/><button type="button" onClick={onSave} style={{padding:"10px 24px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#3B82F6,#6366F1)",color:"white",fontWeight:600,fontSize:14,cursor:"pointer"}}>{isNew?"Crea Vendor":"Salva"}</button></div>
  </div>);
}

// ===================== VENDOR LIST =====================
function VendorList({vendors,onEdit,expanded,setExpanded,notifs,goS}){
  return(<div style={{display:"flex",flexDirection:"column",gap:20}}>
    {notifs.length>0&&<div style={{background:"white",borderRadius:14,border:"1px solid #FBBF24",overflow:"hidden"}}><div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 20px",background:"#FFFBEB",borderBottom:"1px solid #FEF3C7"}}><span style={{fontSize:20}}>🔔</span><h3 style={{margin:0,fontSize:16,fontWeight:700,flex:1}}>Azioni richieste</h3><span style={{background:"#F59E0B",color:"white",fontSize:11,fontWeight:700,borderRadius:100,padding:"2px 8px"}}>{notifs.length}</span></div><div style={{maxHeight:280,overflowY:"auto"}}>{notifs.map((n,i)=><div key={i} style={{display:"flex",alignItems:"center",padding:"12px 20px",borderBottom:"1px solid #F8FAFC",cursor:"pointer",gap:12}} onClick={()=>goS(n.vid)}><span style={{fontSize:13,fontWeight:700,padding:"5px 12px",borderRadius:100,background:PC[n.who].bg,color:PC[n.who].fg}}>{n.who}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:14}}>Esprimi preferenza per call con <strong>{n.vn}</strong></div><div style={{fontSize:12,color:"#64748B",marginTop:2}}>Rif: {n.sl.split("–")[1]?.trim()||n.sl} · {fdt(n.date,n.time)}</div></div><span style={{fontSize:13,color:"#3B82F6",fontWeight:600,whiteSpace:"nowrap"}}>Scheduling →</span></div>)}</div></div>}
    {vendors.length===0&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"50vh",textAlign:"center"}}><div style={{fontSize:52,marginBottom:16}}>📂</div><h2 style={{margin:0,fontSize:22,fontWeight:700}}>Nessun vendor</h2><p style={{color:"#64748B",fontSize:14,marginTop:8}}>Clicca "+ Vendor".</p></div>}
    {vendors.map((v,i)=>{const isE=expanded===v.id,done=STEPS.filter(s=>v[s.key].status==="Conclusa"||v[s.key].status==="Non necessaria").length,pct=Math.round((done/4)*100),vn=notifs.filter(n=>n.vid===v.id).length;
      return<div key={v.id} style={{background:"white",borderRadius:14,overflow:"hidden",border:"1px solid #E2E8F0",animation:`fadeIn 0.3s ease ${i*0.05}s both`}}>
        <div style={{display:"flex",alignItems:"center",padding:"16px 20px",cursor:"pointer",gap:16,flexWrap:"wrap"}} onClick={()=>setExpanded(isE?null:v.id)}>
          <div style={{display:"flex",alignItems:"center",gap:12,minWidth:180,flex:"1 1 180px"}}><div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#6366F1,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:16,flexShrink:0}}>{v.name.charAt(0).toUpperCase()}</div><div><div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><h3 style={{margin:0,fontSize:16,fontWeight:700}}>{v.name}</h3>{vn>0&&<span style={{fontSize:11,background:"#FEF3C7",color:"#92400E",padding:"2px 8px",borderRadius:100,fontWeight:600}}>{vn}</span>}</div><p style={{margin:0,fontSize:12,color:"#64748B"}}>{v.crm||"—"}</p></div></div>
          <div style={{display:"flex",gap:6,flex:"2 1 200px",flexWrap:"wrap"}}>{STEPS.map(s=><span key={s.key} style={{fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:6,background:SC[v[s.key].status].bg,color:SC[v[s.key].status].fg}}>{s.short}: {v[s.key].status==="Non necessaria"?"N/A":v[s.key].status==="Slot da confermare"?"Slot":v[s.key].status.substring(0,4)}</span>)}</div>
          <div style={{display:"flex",alignItems:"center",gap:8,minWidth:100}}><div style={{width:60,height:6,background:"#E2E8F0",borderRadius:100,overflow:"hidden"}}><div style={{height:"100%",background:"linear-gradient(90deg,#3B82F6,#10B981)",borderRadius:100,width:pct+"%",transition:"width 0.4s"}}/></div><span style={{fontSize:13,fontWeight:700,minWidth:32}}>{pct}%</span></div>
          <div style={{display:"flex",alignItems:"center",gap:6}}><button style={{background:"none",border:"none",cursor:"pointer",fontSize:16,padding:4}} onClick={e=>{e.stopPropagation();onEdit(v)}}>✏️</button><button style={{background:"none",border:"none",cursor:"pointer",fontSize:16,padding:4}} onClick={e=>{e.stopPropagation();goS(v.id)}}>📅</button><span style={{fontSize:14,color:"#94A3B8",transform:isE?"rotate(180deg)":"",transition:"transform 0.2s"}}>▼</span></div>
        </div>
        {isE&&<div style={{padding:"0 20px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,borderTop:"1px solid #F1F5F9"}}>{STEPS.map(s=><div key={s.key} style={{background:"#F8FAFC",borderRadius:10,padding:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{fontSize:13,fontWeight:700,color:"#334155"}}>{s.label}</span><span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:100,background:SC[v[s.key].status].bg,color:SC[v[s.key].status].fg}}>{v[s.key].status}</span></div><div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}><span style={{fontSize:12,color:"#64748B"}}>Partecipanti:</span>{(v[s.key].participants||[]).length===0&&<span style={{fontSize:12,color:"#94A3B8"}}>—</span>}{(v[s.key].participants||[]).map(p=><span key={p} style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:100,background:PC[p].bg,color:PC[p].fg}}>{p}</span>)}</div>{v[s.key].notes&&<p style={{fontSize:13,color:"#475569",margin:"6px 0 0",lineHeight:1.5}}>{v[s.key].notes}</p>}</div>)}</div>}
      </div>;
    })}
  </div>);
}

// ===================== GANTT DASHBOARD =====================
function GanttDash({vendors}){if(!vendors.length)return<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"50vh",textAlign:"center"}}><div style={{fontSize:52,marginBottom:16}}>📊</div><h2 style={{margin:0,fontSize:22,fontWeight:700}}>Nessun dato</h2></div>;const tot=vendors.length*4,c={a:0,b:0,e:0,c:0,d:0};vendors.forEach(v=>STEPS.forEach(s=>{const st=v[s.key].status;if(st==="Conclusa")c.a++;else if(st==="Programmata")c.b++;else if(st==="Slot da confermare")c.e++;else if(st==="Da Programmare")c.c++;else c.d++;}));return(<div style={{display:"flex",flexDirection:"column",gap:24}}><div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12}}>{[{l:"Concluse",n:c.a,co:"#10B981",i:"✅"},{l:"Programmate",n:c.b,co:"#3B82F6",i:"📅"},{l:"Slot conf.",n:c.e,co:"#2563EB",i:"🔵"},{l:"Da Progr.",n:c.c,co:"#F59E0B",i:"⏳"},{l:"Non nec.",n:c.d,co:"#94A3B8",i:"➖"}].map((x,i)=>(<div key={i} style={{background:"white",borderRadius:12,padding:14,display:"flex",alignItems:"center",gap:12,border:"1px solid #E2E8F0",borderLeft:"4px solid "+x.co}}><div style={{fontSize:22}}>{x.i}</div><div><div style={{fontSize:24,fontWeight:800,lineHeight:1}}>{x.n}<span style={{fontSize:13,color:"#94A3B8",fontWeight:400}}>/{tot}</span></div><div style={{fontSize:12,color:"#64748B"}}>{x.l}</div></div></div>))}</div><div style={pnl}><h3 style={{margin:"0 0 16px",fontSize:16,fontWeight:700}}>Avanzamento per Vendor</h3>{vendors.map(v=>{const done=STEPS.filter(s=>v[s.key].status==="Conclusa"||v[s.key].status==="Non necessaria").length,pct=Math.round((done/4)*100);return<div key={v.id} style={{display:"flex",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #F8FAFC",gap:8}}><div style={{width:160,flexShrink:0,display:"flex",alignItems:"center",gap:10}}><div style={{width:28,height:28,borderRadius:7,background:"#6366F1",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{v.name.charAt(0).toUpperCase()}</div><span style={{fontSize:14,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.name}</span></div>{STEPS.map(s=>{const st=v[s.key].status,sc=SC[st];return<div key={s.key} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",height:32,background:"#F8FAFC",borderRadius:6,overflow:"hidden"}}><div style={{position:"absolute",left:0,top:0,height:"100%",borderRadius:6,background:sc.bar,opacity:st==="Non necessaria"?.3:1,width:st==="Conclusa"?"100%":st==="Programmata"?"60%":st==="Slot da confermare"?"40%":st==="Da Programmare"?"20%":"100%",transition:"width 0.5s"}}/><span style={{fontSize:11,color:sc.fg,fontWeight:500,position:"relative",zIndex:1}}>{st==="Non necessaria"?"N/A":st==="Slot da confermare"?"Slot":st.substring(0,4)}</span></div>})}<div style={{width:50,textAlign:"right"}}><span style={{fontSize:12,fontWeight:700,padding:"3px 8px",borderRadius:100,background:pct===100?"#D1FAE5":pct>=50?"#DBEAFE":"#FEF3C7",color:pct===100?"#065F46":pct>=50?"#1E40AF":"#92400E"}}>{pct}%</span></div></div>})}</div></div>);}

// ===================== GANTT TIMELINE =====================
function GanttTimeline({tasks,vendors,currentUser}){const [form,setForm]=useState({name:"",vendor:"",start:"",end:"",color:GCOL[0],assignee:""});const [editId,setEditId]=useState(null);const sorted=useMemo(()=>[...tasks].sort((a,b)=>(a.start||"").localeCompare(b.start||"")),[tasks]);const allD=sorted.flatMap(t=>[t.start,t.end]).filter(Boolean);const minD=allD.length>0?allD.reduce((a,b)=>a<b?a:b):new Date().toISOString().slice(0,10);const maxD=allD.length>0?allD.reduce((a,b)=>a>b?a:b):new Date().toISOString().slice(0,10);const sMs=new Date(minD).getTime()-86400000,eMs=new Date(maxD).getTime()+86400000*2;const tD=Math.max(Math.ceil((eMs-sMs)/86400000),7);function days(){const l=[];for(let i=0;i<tD;i++){const d=new Date(sMs+i*86400000);l.push({label:d.toLocaleDateString("it-IT",{day:"numeric",month:"short"}),isWe:d.getDay()===0||d.getDay()===6});}return l;}function bs(t){const s=new Date(t.start).getTime(),e=new Date(t.end).getTime();return{left:((s-sMs)/(eMs-sMs)*100)+"%",width:Math.max(((e-s)/(eMs-sMs)*100),1)+"%"};}async function handleSave(){if(!form.name||!form.start||!form.end){alert("Compila nome, inizio e fine");return;}const t={...form,id:editId||gid()};try{await saveGanttTask(t);logActivity(currentUser,editId?"gantt_modificato":"gantt_creato",currentUser+(editId?" ha modificato":" ha creato")+" attività: "+form.name)}catch(e){alert("Errore: "+e.message)}setForm({name:"",vendor:"",start:"",end:"",color:GCOL[0],assignee:""});setEditId(null);}async function handleDel(id,name){if(!confirm("Eliminare?"))return;try{await removeGanttTask(id);logActivity(currentUser,"gantt_eliminato",currentUser+" ha eliminato: "+name)}catch(e){alert("Errore: "+e.message)}}const dl=days();return(<div style={{display:"flex",flexDirection:"column",gap:24}}><div style={pnl}><h3 style={{margin:"0 0 16px",fontSize:16,fontWeight:700}}>{editId?"✏️ Modifica":"📐 Nuova attività"}</h3><div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}><input style={{...inp,flex:"2 1 180px"}} placeholder="Nome *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><select style={{...inp,flex:"1 1 140px"}} value={form.vendor} onChange={e=>setForm({...form,vendor:e.target.value})}><option value="">— Vendor —</option>{vendors.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select><select style={{...inp,flex:"1 1 100px"}} value={form.assignee} onChange={e=>setForm({...form,assignee:e.target.value})}><option value="">— Assegnato —</option>{PARTS.map(p=><option key={p} value={p}>{p}</option>)}</select></div><div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}><div style={{display:"flex",flexDirection:"column",gap:2,flex:"1 1 130px"}}><span style={{fontSize:11,color:"#94A3B8",fontWeight:600}}>INIZIO</span><input type="date" style={inp} value={form.start} onChange={e=>setForm({...form,start:e.target.value})}/></div><div style={{display:"flex",flexDirection:"column",gap:2,flex:"1 1 130px"}}><span style={{fontSize:11,color:"#94A3B8",fontWeight:600}}>FINE</span><input type="date" style={inp} value={form.end} onChange={e=>setForm({...form,end:e.target.value})}/></div><div style={{display:"flex",flexDirection:"column",gap:2}}><span style={{fontSize:11,color:"#94A3B8",fontWeight:600}}>COLORE</span><div style={{display:"flex",gap:4}}>{GCOL.map(c=><div key={c} onClick={()=>setForm({...form,color:c})} style={{width:28,height:28,borderRadius:6,background:c,cursor:"pointer",border:form.color===c?"3px solid #0F172A":"2px solid transparent"}}/>)}</div></div><div style={{flex:1}}/>{editId&&<button onClick={()=>{setForm({name:"",vendor:"",start:"",end:"",color:GCOL[0],assignee:""});setEditId(null)}} style={{padding:"10px 18px",borderRadius:8,border:"1px solid #E2E8F0",background:"white",color:"#64748B",fontWeight:600,fontSize:13,cursor:"pointer"}}>Annulla</button>}<button onClick={handleSave} style={{padding:"10px 18px",borderRadius:8,border:"none",background:"#3B82F6",color:"white",fontWeight:600,fontSize:13,cursor:"pointer"}}>{editId?"Salva":"+ Aggiungi"}</button></div></div>{sorted.length===0?<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"30vh",textAlign:"center"}}><div style={{fontSize:52,marginBottom:16}}>📐</div><h2 style={{margin:0,fontSize:22,fontWeight:700}}>Nessuna attività</h2></div>:<div style={{...pnl,padding:0,overflow:"hidden"}}><div style={{padding:"16px 20px",borderBottom:"1px solid #E2E8F0"}}><h3 style={{margin:0,fontSize:16,fontWeight:700}}>📐 Timeline</h3></div><div style={{overflowX:"auto"}}><div style={{minWidth:Math.max(tD*40,600)}}><div style={{display:"flex",borderBottom:"1px solid #E2E8F0",position:"sticky",top:0,background:"#FAFBFC",zIndex:2}}><div style={{width:220,flexShrink:0,padding:"8px 16px",fontSize:12,fontWeight:700,color:"#64748B",borderRight:"1px solid #E2E8F0"}}>Attività</div><div style={{flex:1,display:"flex"}}>{dl.map((d,i)=><div key={i} style={{flex:"1 0 0",padding:"6px 2px",fontSize:10,fontWeight:600,color:d.isWe?"#CBD5E1":"#94A3B8",textAlign:"center",borderRight:"1px solid #F1F5F9",background:d.isWe?"#F8FAFC":"transparent"}}>{d.label}</div>)}</div></div>{sorted.map(t=>{const b=bs(t);return<div key={t.id} style={{display:"flex",borderBottom:"1px solid #F8FAFC",minHeight:44}}><div style={{width:220,flexShrink:0,padding:"8px 16px",display:"flex",alignItems:"center",gap:8,borderRight:"1px solid #E2E8F0"}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name}</div><div style={{fontSize:11,color:"#94A3B8"}}>{t.vendor&&<span>{t.vendor}</span>}{t.vendor&&t.assignee&&" · "}{t.assignee&&<span style={{color:PC[t.assignee]?.fg||"#64748B"}}>{t.assignee}</span>}</div></div><button onClick={()=>{setForm({name:t.name,vendor:t.vendor||"",start:t.start,end:t.end,color:t.color||GCOL[0],assignee:t.assignee||""});setEditId(t.id)}} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,padding:2}}>✏️</button><button onClick={()=>handleDel(t.id,t.name)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,padding:2}}>🗑️</button></div><div style={{flex:1,position:"relative",display:"flex",alignItems:"center"}}>{dl.map((d,i)=>d.isWe&&<div key={i} style={{position:"absolute",left:(i/tD*100)+"%",width:(100/tD)+"%",top:0,bottom:0,background:"#F8FAFC"}}/>)}<div style={{position:"absolute",...b,height:28,borderRadius:6,background:t.color||"#3B82F6",opacity:.85,display:"flex",alignItems:"center",paddingLeft:8,overflow:"hidden"}}><span style={{fontSize:11,fontWeight:600,color:"white",whiteSpace:"nowrap",textShadow:"0 1px 2px rgba(0,0,0,0.3)"}}>{t.name}</span></div></div></div>})}</div></div></div>}</div>);}

// ===================== SCHEDULING =====================
function Scheduling({vendors,initVid,clearInit,addSlot,rmSlot,setResp}){
  const [visV, setVisV] = useState(() => { const m = {}; vendors.forEach(v => { m[v.id] = true; }); return m; });
  const [ns, setNs] = useState({ date: "", time: "", step: "step1", vendorId: vendors[0]?.id || "" });

  useEffect(() => { setVisV(prev => { const m = { ...prev }; vendors.forEach(v => { if (!(v.id in m)) m[v.id] = true; }); return m; }); }, [vendors]);
  useEffect(() => { if (initVid) { setVisV(prev => ({ ...prev, [initVid]: true })); clearInit(); } }, [initVid]);

  const shownVendors = vendors.filter(v => visV[v.id]);

  if (!vendors.length) return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", textAlign: "center" }}><div style={{ fontSize: 52, marginBottom: 16 }}>📅</div><h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Nessun vendor</h2></div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Horizontal vendor checkboxes */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "14px 20px", background: "white", borderRadius: 12, border: "1px solid #E2E8F0" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#64748B", marginRight: 4 }}>Vendor:</span>
        {vendors.map(v => (
          <label key={v.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "5px 12px", borderRadius: 8, background: visV[v.id] ? "#EEF2FF" : "#F8FAFC", border: "1.5px solid " + (visV[v.id] ? "#6366F1" + "44" : "#E2E8F0"), transition: "all 0.15s" }}>
            <input type="checkbox" checked={!!visV[v.id]} onChange={() => setVisV(p => ({ ...p, [v.id]: !p[v.id] }))} style={{ accentColor: "#6366F1", cursor: "pointer", width: 15, height: 15 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: visV[v.id] ? "#4338CA" : "#94A3B8" }}>{v.name}</span>
          </label>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <button onClick={() => { const m = {}; vendors.forEach(v => { m[v.id] = true; }); setVisV(m); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid #E2E8F0", background: "white", cursor: "pointer", color: "#10B981", fontWeight: 700 }}>Tutti</button>
          <button onClick={() => { const m = {}; vendors.forEach(v => { m[v.id] = false; }); setVisV(m); }} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid #E2E8F0", background: "white", cursor: "pointer", color: "#EF4444", fontWeight: 700 }}>Nessuno</button>
        </div>
      </div>

      {/* All visible vendors stacked */}
      {shownVendors.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}><p style={{ fontSize: 14 }}>Seleziona almeno un vendor.</p></div>}

      {shownVendors.map(vendor => {
        const activeSteps = STEPS.filter(s => vendor[s.key].status !== "Conclusa" && vendor[s.key].status !== "Non necessaria");
        const slots = fix(vendor.slots).filter(s => {
          const st = vendor[s.step]?.status;
          return st !== "Conclusa" && st !== "Non necessaria";
        });
        const firstActiveStep = activeSteps[0]?.key || "step1";
        return (
          <div key={vendor.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Vendor header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#6366F1,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 14 }}>{vendor.name.charAt(0).toUpperCase()}</div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{vendor.name}</h3>
              <span style={{ fontSize: 12, color: "#94A3B8" }}>{slots.length} slot</span>
              {activeSteps.length === 0 && <span style={{ fontSize: 11, background: "#D1FAE5", color: "#065F46", padding: "3px 10px", borderRadius: 100, fontWeight: 700 }}>✅ Tutti gli step completati</span>}
            </div>

            {/* Add slot — only if there are active steps */}
            {activeSteps.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "12px 16px", background: "#F8FAFC", borderRadius: 10, border: "1px dashed #CBD5E1" }}>
              <input type="date" style={{ ...inp, flex: "1 1 130px" }} value={ns.vendorId === vendor.id ? ns.date : ""} onChange={e => setNs({ ...ns, date: e.target.value, vendorId: vendor.id })} />
              <input type="time" style={{ ...inp, flex: "1 1 100px" }} value={ns.vendorId === vendor.id ? ns.time : ""} onChange={e => setNs({ ...ns, time: e.target.value, vendorId: vendor.id })} />
              <select style={{ ...inp, flex: "1 1 120px" }} value={ns.vendorId === vendor.id ? ns.step : firstActiveStep} onChange={e => setNs({ ...ns, step: e.target.value, vendorId: vendor.id })}>{activeSteps.map(s => <option key={s.key} value={s.key}>{s.short}</option>)}</select>
              <button style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#3B82F6", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer" }} onClick={() => { if (!ns.date || !ns.time || ns.vendorId !== vendor.id) return; addSlot(vendor.id, { date: ns.date, time: ns.time, step: ns.step || firstActiveStep }); setNs({ date: "", time: "", step: firstActiveStep, vendorId: vendor.id }); }}>+ Aggiungi</button>
            </div>}

            {/* Slots */}
            {slots.length === 0 && <p style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", padding: 12 }}>Nessuno slot proposto.</p>}
            {slots.map(s => {
              const sLabel = STEPS.find(st => st.key === s.step)?.label || s.step;
              const resp = s.responses || {};
              const stepParts = (vendor[s.step]?.participants?.length > 0) ? vendor[s.step].participants : [];
              const yC = stepParts.filter(p => resp[p] === "yes").length, nC = stepParts.filter(p => resp[p] === "no").length, pC = stepParts.filter(p => !resp[p]).length;
              return (
                <div key={s.id} style={{ borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", padding: "12px 18px", background: "linear-gradient(135deg,#EFF6FF,#F0F9FF)", borderBottom: "2px solid #DBEAFE", gap: 10 }}>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{fdt(s.date, s.time)}</div><div style={{ fontSize: 12, color: "#3B82F6", marginTop: 1, fontWeight: 600 }}>{sLabel}</div></div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ background: "#D1FAE5", color: "#065F46", padding: "3px 10px", borderRadius: 100, fontSize: 12, fontWeight: 700 }}>✓{yC}</span>
                      <span style={{ background: "#FEE2E2", color: "#991B1B", padding: "3px 10px", borderRadius: 100, fontSize: 12, fontWeight: 700 }}>✗{nC}</span>
                      <span style={{ background: "#FEF3C7", color: "#92400E", padding: "3px 10px", borderRadius: 100, fontSize: 12, fontWeight: 700 }}>⏳{pC}</span>
                    </div>
                    <button onClick={() => rmSlot(vendor.id, s.id)} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", fontSize: 18 }}>✕</button>
                  </div>
                  <div style={{ background: "white" }}>
                    {stepParts.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 120px", padding: "8px 18px", borderBottom: "1px solid #F1F5F9", background: "#FAFBFC" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>Chi</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", textAlign: "center" }}>Disponibile</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", textAlign: "center" }}>Non disp.</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", textAlign: "center" }}>Stato</span>
                    </div>}
                    {stepParts.length === 0 && <div style={{ padding: 14, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>⚠️ Nessun partecipante assegnato.</div>}
                    {stepParts.map((p, pi) => { const val = resp[p]; return (
                      <div key={p} style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 120px", alignItems: "center", padding: "10px 18px", borderBottom: pi < stepParts.length - 1 ? "1px solid #F8FAFC" : "none", background: val === "yes" ? "#F0FDF4" : val === "no" ? "#FFF5F5" : "white" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, padding: "4px 10px", borderRadius: 100, background: PC[p].bg, color: PC[p].fg, justifySelf: "start" }}>{p}</span>
                        <div style={{ display: "flex", justifyContent: "center" }}><button onClick={() => setResp(vendor.id, s.id, p, "yes")} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", border: val === "yes" ? "2px solid #059669" : "1.5px solid #E2E8F0", background: val === "yes" ? "#D1FAE5" : "white", color: val === "yes" ? "#059669" : "#94A3B8" }}>✓ Sì</button></div>
                        <div style={{ display: "flex", justifyContent: "center" }}><button onClick={() => setResp(vendor.id, s.id, p, "no")} style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", border: val === "no" ? "2px solid #DC2626" : "1.5px solid #E2E8F0", background: val === "no" ? "#FEE2E2" : "white", color: val === "no" ? "#DC2626" : "#94A3B8" }}>✗ No</button></div>
                        <div style={{ textAlign: "center" }}>{!val && <span style={{ fontSize: 12, color: "#F59E0B", fontWeight: 700, animation: "pulse 2s infinite" }}>⏳</span>}{val === "yes" && <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>✓</span>}{val === "no" && <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 700 }}>✗</span>}</div>
                      </div>
                    ); })}
                  </div>
                </div>
              );
            })}

            {/* Divider */}
            <div style={{ height: 2, background: "linear-gradient(90deg, #E2E8F0, transparent)", margin: "4px 0" }} />
          </div>
        );
      })}
    </div>
  );
}

function Modal({children,onClose}){return<div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(4px)"}} onClick={onClose}><div style={{background:"white",borderRadius:18,padding:28,width:"100%",maxWidth:600,maxHeight:"92vh",overflowY:"auto",position:"relative",boxShadow:"0 25px 60px rgba(0,0,0,0.2)"}} onClick={e=>e.stopPropagation()}><button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#94A3B8"}}>✕</button>{children}</div></div>}
const css=`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}*{box-sizing:border-box}input,select,textarea,button{font-family:'Outfit',sans-serif}textarea{resize:vertical}`;
