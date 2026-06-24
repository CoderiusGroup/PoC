# EN18031 Compliance Verification — PoC

Proof of Concept per la verifica automatizzata della conformità allo standard EN 18031
(Direttiva RED 2014/53/UE) — Progetto Coderius Group per Bluewind S.r.l.

## Stack

| Layer    | Tecnologia                             |
|----------|----------------------------------------|
| Backend  | Python 3.9.6 + Flask 3.1.3             |
| Frontend | React 19.2.7 + Vite 8.0.16 + Node.js 26|
| Dati     | File JSON (no database)                |

## Avvio rapido

### Backend

    cd backend
    pip3 install flask flask-cors
    python3 app.py

### Frontend

In un secondo terminale:

    cd frontend
    npm install
    npm run dev

Apri il browser su http://localhost:5173

## Come si usa

1. Carica il file `backend/data/device_example.json` per avviare una nuova valutazione
2. Per ogni asset naviga il decision tree rispondendo Yes/No
3. In qualsiasi momento clicca "Save & Exit" per salvare la sessione su file e riprenderla in seguito
4. A valutazione completata visualizza il riepilogo PASS/FAIL/Not Applicable
5. Clicca "Download Report" per ottenere il report in formato .json
6. Per riprendere una sessione salvata, caricala dalla home nella sezione "Resume saved session"

## Struttura

    backend/
      app.py
      pyproject.toml
      data/
        device_example.json
        decision_trees/
          AUM-5-1.json
          ACM-1-1.json
    frontend/
      src/
        App.jsx
        index.css
        pages/
          LandingPage.jsx
          EvaluationPage.jsx
          ResultsPage.jsx
      vite.config.js
      package.json

## Endpoint API

| Metodo | Endpoint                    | Descrizione                    |
|--------|-----------------------------|--------------------------------|
| POST   | /api/session/load           | Valida e carica un device JSON |
| GET    | /api/decision-trees/<id>    | Nodi di un DT specifico        |

---

Coderius Group — Università degli Studi di Padova — A.A. 2025/2026

