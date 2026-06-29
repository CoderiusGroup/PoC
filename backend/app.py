import json
import os
from flask import Flask, jsonify, request, send_from_directory

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="")

@app.after_request
def add_cors_headers(response):
    # lascia passare le richieste dal frontend React, che gira su una porta diversa
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
    return response

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")
DT_DIR   = os.path.join(DATA_DIR, "decision_trees")


# ── helpers ──────────────────────────────────────────────────────────────────

def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ── 1. Load device from JSON file ────────────────────────────────────────────

@app.route("/api/session/load", methods=["POST"])
def load_device():
    # controlla che il device abbia i campi giusti e lo restituisce al frontend
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data received"}), 400

    for field in ["id", "name", "assets"]:
        # un campo mancante blocca subito con un messaggio chiaro
        if field not in data:
            return jsonify({"error": f"Required field missing: '{field}'"}), 400

    if not isinstance(data["assets"], list) or len(data["assets"]) == 0:
        return jsonify({"error": "The device must have at least one asset"}), 400

    for asset in data["assets"]:
        # se un asset non ha requirements espliciti, gli aggiungiamo una lista vuota
        asset.setdefault("requirements", [])

    return jsonify({"ok": True, "device": data})


# ── 2. Decision trees ─────────────────────────────────────────────────────────

@app.route("/api/decision-trees/<dt_id>", methods=["GET"])
def get_decision_tree(dt_id):
    # legge il file JSON dell'albero dal disco e lo passa al frontend
    path = os.path.join(DT_DIR, f"{dt_id}.json")
    if not os.path.exists(path):
        return jsonify({"error": f"Decision tree '{dt_id}' not found"}), 404
    return jsonify(load_json(path))


# ── 3. Serve frontend (production build) ─────────────────────────────────────

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path and os.path.exists(os.path.join(STATIC_DIR, path)):
        return send_from_directory(STATIC_DIR, path)
    return send_from_directory(STATIC_DIR, "index.html")


# ── startup ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
