# Vendor Tracker – Guida al Deploy

App di gestione vendor con scheduling collaborativo. Accessibile da chiunque, senza account Claude.

---

## Prerequisiti

- **Node.js** installato (scaricalo da https://nodejs.org se non ce l'hai)
- Un account **Google** (per Firebase, gratuito)
- Un account **Vercel** (gratuito, registrati su https://vercel.com con GitHub)
- Un account **GitHub** (gratuito, https://github.com)

---

## Step 1: Crea il progetto Firebase (5 minuti)

1. Vai su https://console.firebase.google.com
2. Clicca **"Aggiungi progetto"** (o "Add project")
3. Dai un nome al progetto (es. "vendor-tracker")
4. Disattiva Google Analytics (non serve) → **Crea progetto**
5. Una volta creato, nel menu a sinistra clicca **"Firestore Database"**
6. Clicca **"Crea database"** (o "Create database")
7. Scegli **"Avvia in modalità test"** → Avanti → **Crea**
   - ⚠️ La modalità test dura 30 giorni. Poi dovrai aggiornare le regole (vedi sotto).

### Ottieni le credenziali Firebase:

1. Nel menu a sinistra, clicca l'icona ⚙️ → **Impostazioni progetto**
2. Scorri fino a **"Le tue app"** → clicca l'icona **</>** (Web)
3. Dai un nome all'app (es. "vendor-tracker-web") → **Registra app**
4. Copia il blocco `firebaseConfig` che ti viene mostrato
5. Apri il file `src/firebase.js` e **sostituisci** i valori del `firebaseConfig` con i tuoi

### Regole Firestore (da impostare dopo i 30 giorni):

Nella sezione Firestore → Regole, incolla:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /vendors/{document=**} {
      allow read, write: if true;
    }
  }
}
```

---

## Step 2: Testa in locale (2 minuti)

Apri il terminale nella cartella del progetto e esegui:

```bash
npm install
npm run dev
```

Si aprirà il browser su `http://localhost:5173`. Verifica che tutto funzioni:
- Crea un vendor
- Aggiungi slot nella sezione Scheduling
- Controlla che i pulsanti Sì/No funzionino

---

## Step 3: Pubblica su GitHub

1. Crea un nuovo repository su https://github.com/new (es. "vendor-tracker")
2. Nel terminale:

```bash
git init
git add .
git commit -m "Vendor Tracker v1"
git branch -M main
git remote add origin https://github.com/TUO-USERNAME/vendor-tracker.git
git push -u origin main
```

---

## Step 4: Deploy su Vercel (2 minuti)

1. Vai su https://vercel.com e accedi con GitHub
2. Clicca **"Add New" → "Project"**
3. Seleziona il repository "vendor-tracker"
4. Vercel rileverà automaticamente che è un progetto Vite
5. Clicca **"Deploy"**
6. In ~1 minuto avrai il tuo URL (es. `vendor-tracker-xyz.vercel.app`)

### URL personalizzato (opzionale):
- In Vercel → Settings → Domains puoi aggiungere un dominio personalizzato

---

## Come funziona

- **Tutti i colleghi** possono accedere allo stesso URL
- **I dati sono condivisi in tempo reale** via Firebase: se un collega aggiunge uno slot o esprime una preferenza, tutti lo vedono subito
- **Non serve nessun login** per usare l'app
- Funziona su desktop e mobile

---

## Struttura del progetto

```
vendor-tracker/
├── index.html          # Pagina HTML principale
├── package.json        # Dipendenze
├── vite.config.js      # Configurazione Vite
└── src/
    ├── main.jsx        # Entry point React
    ├── firebase.js     # Configurazione Firebase (modifica qui!)
    └── App.jsx         # Applicazione completa
```

---

## Costi

- **Firebase**: gratuito fino a 50.000 letture/giorno e 20.000 scritture/giorno (ampiamente sufficiente)
- **Vercel**: gratuito per progetti personali
- **Totale: €0**
