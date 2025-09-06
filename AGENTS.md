# AGENTS.md — Codex Guidelines for this Repo

This file defines how Codex (the terminal coding assistant) should work within this repository, including conventions, boundaries, and which actions do and don’t require prior approval. These rules apply to the entire repository unless a more-specific AGENTS.md in a subdirectory overrides them.

## Scope and Priorities
- Stay surgical: make the smallest change that completely solves the task.
- Preserve existing style and structure; do not reformat unrelated code or files.
- Avoid driving broad refactors or dependency changes unless explicitly requested.
- Prefer clarity and maintainability over cleverness; fix root causes, not symptoms.

### Applicability
- These rules apply to all code in this repository, including any newly created files and modules.
- When adding new files, follow the conventions and command allowances below just as for existing files.

## Communication
- Preambles: briefly describe what commands you’re about to run and why.
- Plans: use the plan tool for multi-step or ambiguous work; skip it for obvious, single-step tasks.
- Progress: keep status updates short and relevant.
- Diffs only: when editing files, show patches, not full file contents, unless asked.

## Shell & File Access
- Use `rg` for searching and `rg --files` for file discovery when possible.
- Read files in chunks up to ~250 lines to keep output manageable.
- Treat paths and commands as case-sensitive and cross-shell safe.
- Do not attempt network access unless explicitly approved.

### Helpful Search/Inspect Commands
- `rg -n --no-heading <pattern> <path>` — fast code search with line numbers.
- `rg -S -n <pattern>` — case-sensitive, literal-ish search for symbols.
- `rg --files | sort` — list tracked files quickly.
- `sed -n '1,200p' <file>` — view file slices (keep under ~250 lines).
- `python3 -m compileall -q .` — quick syntax check without running code.

## Coding & Editing Rules
- Keep changes minimal and localized; avoid style-only edits unless requested.
- Follow existing naming and architectural patterns.
- Avoid adding new dependencies; if necessary, propose first.
- Do not add license headers or inline commentary unless asked.
- Prefer explicit error handling and clear return values.

### New Files & Modules
- Always use type hints and add a short module-level docstring stating intent.
- Prefer small, single-purpose modules under `api/` rather than growing `app.py`.
- For FastAPI endpoints, prefer `APIRouter` in `api/routers/*` and include them in the main app.
- Put non-HTTP logic in `api/services/*` and I/O wrappers (HTTP clients, parsers) in `api/integrations/*`.
- Define request/response bodies as Pydantic models rather than raw `Dict[str, Any]`.
- Keep constants/config in a dedicated module (e.g., `api/config.py`) with clear defaults and limits.

## Testing & Validation
- If the repo has tests or a build, run targeted checks for touched areas.
- Start specific (unit or file-level) before running broad test suites.
- Do not fix unrelated failing tests; report them briefly if they block progress.

### Project Tooling (detected)
- Python project with `pyproject.toml` configuring `black`, `ruff`, and `mypy`.
- Optional tests via `pytest` (use if present in the environment).
- A `makefile` exists, but some targets install dependencies (which requires approval).

### FastAPI/App Conventions (repo-specific)
- Do not start servers without approval; prefer import/syntax checks and type checks.
- Centralize outbound HTTP logic with an `httpx.AsyncClient` factory (timeouts, headers) to ease testing.
- Avoid network calls in tests; mock `httpx` and parse functions. Add markers for any networked tests.
- Keep per-request parsing bounds (e.g., 200k chars) as constants for easy tuning.

## Security & Privacy
- Never introduce secrets or tokens into the repo or logs.
- Do not exfiltrate data; keep analysis within the workspace.
- Be cautious with destructive operations; propose before acting.

## Git Hygiene
- Do not run `git commit`, create branches, or rewrite history unless explicitly requested by the user.

## What Codex Can Do Without Approval
The following actions are allowed without additional approval, provided they stay within the workspace and do not require network access or escalated privileges:
- Read and search files across the repository (e.g., `rg`, `ls`, `cat`).
- Create, edit, move, and delete files within this repository that are clearly in-scope for the current task.
- Run local, non-networked commands needed for the task (e.g., build, lint, test, type-check), as long as they do not modify system state outside the repo.
- Apply small, incremental refactors directly related to the task (renames, extractions, minor helpers).
- Update or add documentation, READMEs, and comments relevant to the change.
- Run code formatters and linters already configured in the repo, if they don’t change unrelated files en masse.

### Approved Commands (No Approval Needed)
- Search/inspect: `rg …`, `sed -n …`, `head`, `tail`, `wc -l`.
- Python introspection: `python3 -V`, `python3 -m pip -V` (no installs), `python3 -m compileall -q .`.
- If tools are already available in `.venv` or on PATH, you may run:
  - `.venv/bin/ruff check .` (or `ruff check .`)
  - `.venv/bin/black --check .` (or `black --check .`)
  - `.venv/bin/black .` only to format files you changed as part of the task.
  - `.venv/bin/mypy .` (or `mypy .`)
  - `.venv/bin/pytest -q` (or `pytest -q`) for targeted tests that do not hit network.
- App sanity checks that do not start servers or hit network:
  - `python3 -c 'import app; print("loaded")'`
  - `python3 - <<'PY'\nimport importlib; importlib.import_module("api.models"); print("ok")\nPY`

### Per-File Checks (New and Existing Files)
- Lint specific files: `ruff check app.py api/models.py path/to/new_file.py`.
- Format only touched files: `black app.py path/to/new_file.py` (when part of the task).
- Type check touched modules: `mypy app.py api/ path/to/new_package`.
- Quick syntax: `python3 -m py_compile app.py path/to/new_file.py` or `python3 -m compileall -q path`.

Notes
- Prefer direct tool binaries over `make` targets to avoid implicit installs.
- If a command would attempt to install or download anything, stop and request approval.

## Actions That Require Prior Approval
Request approval before attempting any of the following:
- Any command requiring network access (e.g., installing packages, fetching dependencies, API calls).
- Any command requiring escalated privileges or writing outside the workspace.
- Destructive operations beyond the immediate scope (e.g., mass deletes/moves, cleaning large directories).
- Changing dependency versions, adding/removing dependencies, or modifying lockfiles.
- Running or modifying database migrations, seeding, or external services.
- Large-scale reformatting, project-wide renames, or structural reorganizations.
- Running long-lived servers or background processes that bind to ports.
- Committing to Git, creating branches, or tagging releases.

### Commands Requiring Approval (Examples)
- Dependency and env management:
  - `pip install …`, `pip install -r requirements*.txt`, `pip-sync`, `poetry install`, `uv pip …`.
  - `make dev`, `make ci`, `make lint|format|typecheck|test` (these may install/upgrade tools).
- Networked execution or external calls:
  - `uvicorn app:app …`, `python -m uvicorn …`, `fastapi run` if it binds to ports.
  - Any command that triggers HTTP calls (including tests that reach external sites).
- System- or repo-wide changes:
  - Mass `black .` or `ruff --fix .` outside the files you changed for the task.
  - Deleting/moving many files or directories.
  - Git operations: `git commit`, `git push`, `git tag`, `git branch`.

## Recommendations from Inspecting `app.py`
- Introduce Pydantic models for endpoints currently accepting `Dict[str, Any]` (e.g., `/sources/search`, `/arguments/build`, `/salience/score`) to validate input and document schemas.
- Extract outbound HTTP logic to a helper (e.g., `api/integrations/http.py`) with a reusable `AsyncClient` (timeouts, UA, follow_redirects) and optional domain allowlist enforcement.
- Move route groups into routers under `api/routers/` and include them in `app.py` to keep `app.py` slim and focused on application assembly.
- Add unit tests for internal helpers (`now_iso`, `domain_allowed`, `html_to_text`, `digest_text`, `guess_citations`) that run offline.
- Guard scraping and parsing with explicit limits (already truncating at ~200k chars); elevate these to constants in a config module.
- Avoid duplicate or invalid dependency pins in `requirements.txt`; propose a cleanup in a separate, approved change since it involves dependency management.

## Quality Bar Checklist (use before finishing)
- Does the change solve the stated problem with minimal surface area?
- Are tests/builds for the touched area passing locally (when available)?
- Are docs, comments, and error messages updated as needed?
- Have you avoided incidental reformatting and unrelated edits?
- Is the rationale clear from commit/patch context and messages?

## Repository-Specific Notes
- This repository is an API project; keep interfaces stable when possible. If breaking changes are necessary, surface them explicitly and suggest a migration path.
- Favor deterministic behavior and explicit validation/typing consistent with the existing codebase.

If any of the above conflicts with direct user instructions, follow the user instructions. If there are multiple AGENTS.md files in nested directories, the one closest to the edited files takes precedence.
