# ── Stage 1: build frontend ──────────────────────────────────────────────────

FROM node:22-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: backend + serve ─────────────────────────────────────────────────

FROM python:3.12-slim-bookworm

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/pyproject.toml ./
RUN pip install --no-cache-dir flask

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./static

EXPOSE 8080

CMD ["python", "app.py"]
