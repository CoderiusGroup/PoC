import json
import os
import uuid
from datetime import datetime
from flask import Flask, jsonify, request, Response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")
DT_DIR   = os.path.join(DATA_DIR, "decision_trees")
SESSIONS_FILE = os.path.join(DATA_DIR, "sessions.json")


# ── helpers ──────────────────────────────────────────────────────────────────

def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_sessions():
    if not os.path.exists(SESSIONS_FILE):
        return {}
    return load_json(SESSIONS_FILE)

def save_sessions(sessions):
    save_json(SESSIONS_FILE, sessions)


# ── 1. Load device from JSON file ────────────────────────────────────────────

@app.route("/api/session/load", methods=["POST"])
def load_device():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data received"}), 400

    required = ["id", "name", "assets"]
    for field in required:
        if field not in data:
            return jsonify({"error": f"Required field missing: '{field}'"}), 400

    if not isinstance(data["assets"], list) or len(data["assets"]) == 0:
        return jsonify({"error": "The device must have at least one asset"}), 400

    for asset in data["assets"]:
        asset.setdefault("requirements", [])

    return jsonify({"ok": True, "device": data})


# ── 2. Decision trees ─────────────────────────────────────────────────────────

@app.route("/api/decision-trees", methods=["GET"])
def list_decision_trees():
    trees = []
    for filename in sorted(os.listdir(DT_DIR)):
        if filename.endswith(".json"):
            dt = load_json(os.path.join(DT_DIR, filename))
            trees.append({
                "id": dt["id"],
                "name": dt["name"],
                "description": dt.get("description", ""),
                "standard": dt.get("standard", ""),
            })
    return jsonify(trees)


@app.route("/api/decision-trees/<dt_id>", methods=["GET"])
def get_decision_tree(dt_id):
    path = os.path.join(DT_DIR, f"{dt_id}.json")
    if not os.path.exists(path):
        return jsonify({"error": f"Decision tree '{dt_id}' not found"}), 404
    return jsonify(load_json(path))


# ── 3. Sessions ───────────────────────────────────────────────────────────────

@app.route("/api/sessions", methods=["GET"])
def list_sessions():
    sessions = load_sessions()
    return jsonify(list(sessions.values()))


@app.route("/api/sessions", methods=["POST"])
def save_session():
    data = request.get_json()
    if not data or "device" not in data or "results" not in data:
        return jsonify({"error": "Invalid session data"}), 400

    sessions = load_sessions()
    session_id = data.get("session_id") or str(uuid.uuid4())
    session = {
        "session_id": session_id,
        "saved_at": datetime.now().isoformat(),
        "device": data["device"],
        "results": data["results"],
        "completed": data.get("completed", False),
    }
    sessions[session_id] = session
    save_sessions(sessions)
    return jsonify({"ok": True, "session_id": session_id})


@app.route("/api/sessions/<session_id>", methods=["GET"])
def get_session(session_id):
    sessions = load_sessions()
    if session_id not in sessions:
        return jsonify({"error": "Session not found"}), 404
    return jsonify(sessions[session_id])


# ── 4. Downloadable report ────────────────────────────────────────────────────

@app.route("/api/sessions/<session_id>/report", methods=["GET"])
def download_report(session_id):
    sessions = load_sessions()
    if session_id not in sessions:
        return jsonify({"error": "Session not found"}), 404

    s = sessions[session_id]
    device = s["device"]
    results = s["results"]

    lines = [
        "=" * 60,
        "EN 18031 COMPLIANCE REPORT",
        "=" * 60,
        f"Device      : {device.get('name', 'N/A')}",
        f"Model       : {device.get('model', 'N/A')}",
        f"OS          : {device.get('os', 'N/A')}",
        f"Date        : {s['saved_at'][:10]}",
        "=" * 60,
        "",
        "RESULTS BY ASSET:",
        "",
    ]

    by_asset = {}
    for r in results:
        aid = r.get("asset_id", "unknown")
        by_asset.setdefault(aid, []).append(r)

    for asset in device.get("assets", []):
        aid = asset["id"]
        lines.append(f"  Asset: {asset['name']} ({asset.get('type','').upper()})")
        asset_results = by_asset.get(aid, [])
        if not asset_results:
            lines.append("    No evaluations performed.")
        for r in asset_results:
            outcome = r.get("outcome", "?")
            req     = r.get("requirement_id", "?")
            icon    = {"PASS": "✅", "FAIL": "❌", "NOT_APPLICABLE": "➖"}.get(outcome, "❓")
            lines.append(f"    {icon} {req}: {outcome}")
        lines.append("")

    outcomes = [r.get("outcome") for r in results]
    total    = len(outcomes)
    passed   = outcomes.count("PASS")
    failed   = outcomes.count("FAIL")
    na       = outcomes.count("NOT_APPLICABLE")

    lines += [
        "=" * 60,
        "SUMMARY",
        "=" * 60,
        f"  Total evaluations  : {total}",
        f"  ✅ PASS            : {passed}",
        f"  ❌ FAIL            : {failed}",
        f"  ➖ NOT APPLICABLE  : {na}",
        "",
        "Generated by: EN18031 Compliance PoC — Coderius Group",
        "=" * 60,
    ]

    report_text = "\n".join(lines)
    filename = f"report_{device.get('id','device')}_{s['saved_at'][:10]}.txt"

    return Response(
        report_text,
        mimetype="text/plain",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ── startup ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5000)
