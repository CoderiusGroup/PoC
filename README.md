# EN18031 Compliance Verification — PoC

Proof of Concept per la verifica automatizzata della conformità allo standard EN 18031
(Direttiva RED 2014/53/UE) — Progetto Coderius Group per Bluewind S.r.l.

## Stack

| Layer    | Tecnologia                             |
|----------|----------------------------------------|
| Backend  | Python 3.12 + Flask 3.x               |
| Frontend | React 19 + Vite 8 + Node.js 22        |
| Dati     | File JSON (no database)                |

## Avvio con Docker

    docker build -t en18031-poc .
    docker run -p 8080:8080 en18031-poc

Apri il browser su http://localhost:8080

## Avvio locale (sviluppo)

### Backend

    cd backend
    pip install flask
    python app.py

### Frontend

In un secondo terminale:

    cd frontend
    npm install
    npm run dev

Apri il browser su http://localhost:5173
(il proxy Vite inoltra le chiamate API a http://localhost:8080)

## Come si usa

1. Carica il file `backend/data/device_example.json` per avviare una nuova valutazione
2. Seleziona un requisito dalla lista e naviga il decision tree rispondendo Yes/No
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
