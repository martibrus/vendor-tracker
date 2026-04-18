import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, addDoc, query, orderBy, limit, getDocs, writeBatch } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBFGAz8Qw8cU-t724D0uEueHfV_mcxgzGY",
  authDomain: "crm---selezione-vendor.firebaseapp.com",
  projectId: "crm---selezione-vendor",
  storageBucket: "crm---selezione-vendor.firebasestorage.app",
  messagingSenderId: "1035242593496",
  appId: "1:1035242593496:web:4dff0c605399e8a10a0bad"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── VENDORS ──
export function subscribeVendors(cb) { return onSnapshot(collection(db, "vendors"), s => { const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); cb(a); }); }
export async function saveVendor(v) { const { id, ...d } = v; await setDoc(doc(db, "vendors", id), d); }
export async function removeVendor(id) { await deleteDoc(doc(db, "vendors", id)); }

// ── GANTT TASKS ──
export function subscribeGantt(cb) { return onSnapshot(collection(db, "gantt_tasks"), s => { const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); cb(a); }); }
export async function saveGanttTask(t) { const { id, ...d } = t; await setDoc(doc(db, "gantt_tasks", id), d); }
export async function removeGanttTask(id) { await deleteDoc(doc(db, "gantt_tasks", id)); }

// ── SETTINGS ──
export function subscribeSettings(cb) { return onSnapshot(doc(db, "settings", "tab_visibility"), s => { cb(s.exists() ? s.data() : { vendors: true, gantt: true, calendar: true, timeline: true, slots: true }); }); }
export async function saveSettings(d) { await setDoc(doc(db, "settings", "tab_visibility"), d); }

// ── ACTIVITY LOG ──
const logsCol = collection(db, "activity_logs");
export async function logActivity(user, action, details) { try { await addDoc(logsCol, { user, action, details: details || "", timestamp: new Date().toISOString() }); } catch (e) { console.error("Log error:", e); } }
export function subscribeLogs(cb, maxItems = 200) { const q = query(logsCol, orderBy("timestamp", "desc"), limit(maxItems)); return onSnapshot(q, s => { const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); cb(a); }); }
export async function deleteLog(id) { await deleteDoc(doc(db, "activity_logs", id)); }
export async function clearAllLogs() {
  const snap = await getDocs(logsCol);
  const batch = writeBatch(db);
  snap.forEach(d => batch.delete(d.ref));
  await batch.commit();
}
