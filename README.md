# EN18031 Compliance Verification — PoC

Proof of Concept per la verifica automatizzata della conformità allo standard EN 18031
(Direttiva RED 2014/53/UE) — Progetto Coderius Group per Bluewind S.r.l.

## Stack

| Layer    | Tecnologia              |
|----------|-------------------------|
| Backend  | Python 3.x + Flask 3    |
| Frontend | React 18 + Vite 5       |
| Dati     | File JSON (no database) |

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

1. Carica il file backend/data/device_esempio.json
2. Per ogni asset naviga il decision tree rispondendo Si/No
3. Visualizza il riepilogo PASS/FAIL/NOT APPLICABLE
4. Clicca Scarica report per ottenere il file .txt
5. Torna alla home per riprendere sessioni salvate

## Struttura

    backend/
      app.py
      pyproject.toml
      data/
        device_esempio.json
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
| GET    | /api/decision-trees         | Lista DT disponibili           |
| GET    | /api/decision-trees/<id>    | Nodi di un DT specifico        |
| GET    | /api/sessions               | Lista sessioni salvate         |
| POST   | /api/sessions               | Salva una sessione             |
| GET    | /api/sessions/<id>/report   | Scarica report .txt            |

---

Coderius Group — Università degli Studi di Padova — A.A. 2025/2026

