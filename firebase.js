import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";

// ╔══════════════════════════════════════════════════════════════╗
// ║  ISTRUZIONI: Sostituisci i valori sotto con quelli del      ║
// ║  tuo progetto Firebase (vedi README.md per la guida)        ║
// ╚══════════════════════════════════════════════════════════════╝

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

export const vendorsCol = collection(db, "vendors");

// Ascolta i cambiamenti in tempo reale
export function subscribeVendors(callback) {
  return onSnapshot(vendorsCol, (snapshot) => {
    const vendors = [];
    snapshot.forEach((doc) => {
      vendors.push({ id: doc.id, ...doc.data() });
    });
    callback(vendors);
  });
}

// Salva/aggiorna un vendor
export async function saveVendor(vendor) {
  const { id, ...data } = vendor;
  await setDoc(doc(db, "vendors", id), data);
}

// Elimina un vendor
export async function removeVendor(id) {
  await deleteDoc(doc(db, "vendors", id));
}
