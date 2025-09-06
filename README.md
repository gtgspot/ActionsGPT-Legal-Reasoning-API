# ActionsGPT — Legal Reasoning API

Minimal, typed FastAPI service for legal reasoning primitives: ingest, structure extraction, citation‑aware legislative mapping, AGLC4 citation synthesis, salience scoring, argument atoms, compliance checks, precedent search, and a small docs UI.

## Features

- Document ingest (text/URLs), offline‑safe helpers
- Extraction (parties, charges, issues, prelim. citations)
- Sequential mapping: document → cited statutes/rules (with pinpoints, provenance, and time facets)
- AGLC4 citation generation
- Salience scoring with simple explainability
- Argument atoms (IRAC/FIRAC) with admissibility focus
- Compliance checks (e.g., CPA 2009 (Vic), Evidence 2008 (Vic), MCCR 2019)
- Precedent search (best‑effort HTML parsing)
- Static docs site: landing, explorer, citations map, API docs, knowledge base
  - Chat Q&A page (simple chat UI backed by /chat)

## Quick Start (local)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export EXPECT_API_KEY=dev-key   # require X-API-Key header
make run-local                  # uvicorn app:app --reload --port 8000
```

Health (open):
```bash
curl http://localhost:8000/health
```

Secured endpoint (use your key):
```bash
curl -H 'X-API-Key: dev-key' \
     -H 'Content-Type: application/json' \
     -d '{"title":"Local Doc","raw_text":"Evidence Act 2008 (Vic) s 138"}' \
     http://localhost:8000/documents/ingest
```

## Makefile Targets

- `make dev`          create `.venv` only
- `make bootstrap`    install runtime + dev tools (uses requirements*.txt)
- `make run-local`    run uvicorn with `EXPECT_API_KEY` (defaults to `dev-key`)
- `make check`        ruff + black --check + mypy + pytest
- `make test`         run pytest
- `make docker-build` build Docker image
- `make docker-up`    run docker compose (ports 8000:8000)
- `make docker-down`  stop compose

## Docker

```bash
docker compose up --build
# or
make docker-up
```

Environment: `EXPECT_API_KEY` (defaults to `dev-key` in compose). Access `http://localhost:8000`.

## Tests & Tooling

```bash
source .venv/bin/activate
pip install -r requirements-dev.txt
ruff check .
black --check .
mypy .
pytest -q
```

## Docs Site (static)

Point the explorer to your API and build:

```bash
export PAGES_API_BASE=http://localhost:8000
python tools/generate_docs.py
python -m http.server -d site 8080
# open http://localhost:8080
# use Chat at /chat.html
```

Branding via repo variables (for CI/Pages): `PAGES_SITE_TITLE`, `PAGES_PRIMARY_COLOR`, `PAGES_ACCENT_COLOR`, `PAGES_API_BASE`. Custom domain: set `PAGES_CUSTOM_DOMAIN` and a matching DNS CNAME (e.g., `docs.legis.com.au` → `gtgspot.github.io`).

## OpenAPI & Security

- OpenAPI is served from the app with enriched metadata and `ApiKeyAuth` security scheme (header `X-API-Key`).
- Set `EXPECT_API_KEY` to enable key enforcement; unset to disable.

## License

Private repository — All rights reserved
