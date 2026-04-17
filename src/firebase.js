import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, getDoc } from "firebase/firestore";

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
export function subscribeVendors(callback) {
  return onSnapshot(collection(db, "vendors"), (snap) => {
    const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); callback(arr);
  });
}
export async function saveVendor(v) { const { id, ...data } = v; await setDoc(doc(db, "vendors", id), data); }
export async function removeVendor(id) { await deleteDoc(doc(db, "vendors", id)); }

// ── GANTT TASKS ──
export function subscribeGantt(callback) {
  return onSnapshot(collection(db, "gantt_tasks"), (snap) => {
    const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); callback(arr);
  });
}
export async function saveGanttTask(t) { const { id, ...data } = t; await setDoc(doc(db, "gantt_tasks", id), data); }
export async function removeGanttTask(id) { await deleteDoc(doc(db, "gantt_tasks", id)); }

// ── SETTINGS (tab visibility) ──
export function subscribeSettings(callback) {
  return onSnapshot(doc(db, "settings", "tab_visibility"), (snap) => {
    if (snap.exists()) callback(snap.data());
    else callback({ vendors: true, gantt: true, timeline: true, slots: true });
  });
}
export async function saveSettings(data) {
  await setDoc(doc(db, "settings", "tab_visibility"), data);
}
