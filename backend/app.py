import io
import json
import os
import uuid
from datetime import datetime
from flask import Flask, jsonify, request, Response
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
    return response

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")
DT_DIR   = os.path.join(DATA_DIR, "decision_trees")
SESSIONS_FILE = os.path.join(DATA_DIR, "sessions.json")

OUTCOME_LABEL = {
    "PASS":           "PASS",
    "FAIL":           "FAIL",
    "NOT_APPLICABLE": "Not Applicable",
    "SKIPPED":        "SKIPPED",
}

OUTCOME_COLOR = {
    "PASS":           colors.HexColor("#2ea043"),
    "FAIL":           colors.HexColor("#da3633"),
    "NOT_APPLICABLE": colors.HexColor("#8b949e"),
    "SKIPPED":        colors.HexColor("#8b949e"),
}


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

    for field in ["id", "name", "assets"]:
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
                "id":          dt["id"],
                "name":        dt["name"],
                "description": dt.get("description", ""),
                "standard":    dt.get("standard", ""),
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
    return jsonify(list(load_sessions().values()))


@app.route("/api/sessions", methods=["POST"])
def save_session():
    data = request.get_json()
    if not data or "device" not in data or "results" not in data:
        return jsonify({"error": "Invalid session data"}), 400

    sessions   = load_sessions()
    session_id = data.get("session_id") or str(uuid.uuid4())
    sessions[session_id] = {
        "session_id": session_id,
        "saved_at":   datetime.now().isoformat(),
        "device":     data["device"],
        "results":    data["results"],
        "completed":  data.get("completed", False),
    }
    save_sessions(sessions)
    return jsonify({"ok": True, "session_id": session_id})


@app.route("/api/sessions/<session_id>", methods=["GET"])
def get_session(session_id):
    sessions = load_sessions()
    if session_id not in sessions:
        return jsonify({"error": "Session not found"}), 404
    return jsonify(sessions[session_id])


# ── 4. PDF report ─────────────────────────────────────────────────────────────

def _build_pdf(s):
    device  = s["device"]
    results = s["results"]

    buf    = io.BytesIO()
    doc    = SimpleDocTemplate(buf, pagesize=A4,
                               leftMargin=20*mm, rightMargin=20*mm,
                               topMargin=20*mm, bottomMargin=20*mm)
    styles = getSampleStyleSheet()
    W      = A4[0] - 40*mm

    title_style = ParagraphStyle("title", parent=styles["Normal"],
                                 fontSize=14, fontName="Helvetica-Bold", spaceAfter=4)
    meta_style  = ParagraphStyle("meta",  parent=styles["Normal"],
                                 fontSize=9,  fontName="Helvetica", textColor=colors.HexColor("#555555"))
    section_style = ParagraphStyle("section", parent=styles["Normal"],
                                   fontSize=10, fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4)
    footer_style  = ParagraphStyle("footer", parent=styles["Normal"],
                                   fontSize=8, fontName="Helvetica",
                                   textColor=colors.HexColor("#888888"), spaceBefore=14)

    story = []

    # — header —
    story.append(Paragraph("EN 18031 COMPLIANCE REPORT", title_style))
    story.append(Paragraph(
        f"Device: <b>{device.get('name','N/A')}</b> &nbsp;|&nbsp; "
        f"Model: {device.get('model','N/A')} &nbsp;|&nbsp; "
        f"OS: {device.get('os','N/A')} &nbsp;|&nbsp; "
        f"Date: {s['saved_at'][:10]}",
        meta_style))
    story.append(Spacer(1, 6*mm))

    # — results by asset —
    by_asset = {}
    for r in results:
        by_asset.setdefault(r.get("asset_id", "unknown"), []).append(r)

    for asset in device.get("assets", []):
        aid          = asset["id"]
        asset_results = by_asset.get(aid, [])
        story.append(Paragraph(
            f"{asset['name']} <font size='8' color='#888888'>({asset.get('type','').upper()})</font>",
            section_style))

        if not asset_results:
            story.append(Paragraph("No evaluations performed.", meta_style))
            continue

        table_data = [["Requirement", "Outcome", "Answers"]]
        for r in asset_results:
            outcome    = r.get("outcome", "?")
            label      = OUTCOME_LABEL.get(outcome, outcome)
            col        = OUTCOME_COLOR.get(outcome, colors.black)
            req_para   = Paragraph(f"<font name='Courier' size='8'>{r.get('requirement_id','?')}</font>",
                                   styles["Normal"])
            out_para   = Paragraph(f"<font color='{col.hexval()}'><b>{label}</b></font>",
                                   styles["Normal"])
            ans_count  = str(len(r.get("answers", [])) or "—")
            table_data.append([req_para, out_para, ans_count])

        col_widths = [W * 0.40, W * 0.40, W * 0.20]
        t = Table(table_data, colWidths=col_widths)
        t.setStyle(TableStyle([
            ("FONTNAME",     (0, 0), (-1, 0),  "Helvetica-Bold"),
            ("FONTSIZE",     (0, 0), (-1, -1), 9),
            ("TEXTCOLOR",    (0, 0), (-1, 0),  colors.HexColor("#555555")),
            ("BACKGROUND",   (0, 0), (-1, 0),  colors.HexColor("#f0f0f0")),
            ("LINEBELOW",    (0, 0), (-1, 0),  0.5, colors.HexColor("#cccccc")),
            ("LINEBELOW",    (0, 1), (-1, -1), 0.3, colors.HexColor("#e0e0e0")),
            ("TOPPADDING",   (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
            ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(t)
        story.append(Spacer(1, 4*mm))

    # — summary —
    outcomes = [r.get("outcome") for r in results]
    total  = len(outcomes)
    passed = outcomes.count("PASS")
    failed = outcomes.count("FAIL")
    na     = sum(1 for o in outcomes if o in ("NOT_APPLICABLE", "SKIPPED"))

    story.append(Spacer(1, 4*mm))
    summary_data = [
        ["Total", "PASS", "FAIL", "N/A"],
        [str(total),
         Paragraph(f"<font color='#2ea043'><b>{passed}</b></font>", styles["Normal"]),
         Paragraph(f"<font color='#da3633'><b>{failed}</b></font>", styles["Normal"]),
         Paragraph(f"<font color='#8b949e'>{na}</font>",            styles["Normal"])],
    ]
    st = Table(summary_data, colWidths=[W*0.25]*4)
    st.setStyle(TableStyle([
        ("FONTNAME",     (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, -1), 9),
        ("TEXTCOLOR",    (0, 0), (-1, 0),  colors.HexColor("#555555")),
        ("BACKGROUND",   (0, 0), (-1, 0),  colors.HexColor("#f0f0f0")),
        ("LINEBELOW",    (0, 0), (-1, 0),  0.5, colors.HexColor("#cccccc")),
        ("TOPPADDING",   (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
        ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
    ]))
    story.append(Paragraph("SUMMARY", section_style))
    story.append(st)

    story.append(Paragraph(
        "Generated by: EN18031 Compliance PoC — Coderius Group",
        footer_style))

    doc.build(story)
    buf.seek(0)
    return buf


@app.route("/api/sessions/<session_id>/report", methods=["GET"])
def download_report(session_id):
    sessions = load_sessions()
    if session_id not in sessions:
        return jsonify({"error": "Session not found"}), 404

    s        = sessions[session_id]
    device   = s["device"]
    filename = f"report_{device.get('id','device')}_{s['saved_at'][:10]}.pdf"

    pdf_buf = _build_pdf(s)
    return Response(
        pdf_buf,
        mimetype="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ── startup ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5000)
