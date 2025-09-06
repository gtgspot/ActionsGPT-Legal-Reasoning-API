# ---- Python project helper ----
# Goals:
# - Local .venv (no sudo, no root pip)
# - Fast installs (reuse .venv)
# - One-liners: make dev | test | lint | format | typecheck | shell | clean | ci
# Works on macOS/Linux, zsh/bash. Requires python3 on PATH.

SHELL := /bin/bash
.ONESHELL:
.DEFAULT_GOAL := help

# ---- config ----
VENV_DIR := .venv
PY := python3
PYTHON := $(VENV_DIR)/bin/python
PIP := $(VENV_DIR)/bin/pip
RUFF := $(VENV_DIR)/bin/ruff
BLACK := $(VENV_DIR)/bin/black
MYPY := $(VENV_DIR)/bin/mypy
PYTEST := $(VENV_DIR)/bin/pytest

# ---- internal helpers ----
define ensure_venv
	@if [ ! -d "$(VENV_DIR)" ]; then \
		echo ">> creating $(VENV_DIR)"; \
		$(PY) -m venv "$(VENV_DIR)"; \
	fi
	@$(PYTHON) -m pip install --quiet --upgrade pip setuptools wheel
endef

define install_tools
	@$(PIP) install --quiet --upgrade ruff black mypy pytest
endef

define install_requirements
	@if [ -f requirements.txt ]; then \
		echo ">> Installing requirements.txt"; \
		$(PIP) install -r requirements.txt; \
	fi
	@if [ -f requirements-dev.txt ]; then \
		echo ">> Installing requirements-dev.txt"; \
		$(PIP) install -r requirements-dev.txt; \
	fi
endef

# ---- public targets ----
.PHONY: help
help:
	@echo "make dev        # create .venv, install deps, tools"
	@echo "make shell      # open a shell with the venv activated"
	@echo "make test       # run tests with pytest"
	@echo "make lint       # ruff + black --check"
	@echo "make format     # ruff --fix + black"
	@echo "make typecheck  # mypy"
	@echo "make run        # run app.py if present"
	@echo "make ci         # dev + lint + typecheck + test (non-interactive)"
	@echo "make clean      # drop caches; keep .venv"
	@echo "make clean-venv # remove .venv"

.PHONY: venv
venv:
	$(call ensure_venv)

.PHONY: dev
dev: venv  ## create .venv only; no installs
	@echo ">> .venv ready (no installs). Activate with: source $(VENV_DIR)/bin/activate"

.PHONY: bootstrap
bootstrap: venv  ## create .venv and install project + tools
	$(call install_requirements)
	$(call install_tools)
	@mkdir -p ~/.config/pip
	@if ! grep -q "require-virtualenv" ~/.config/pip/pip.conf 2>/dev/null; then \
		echo -e "[global]\nrequire-virtualenv = true" >> ~/.config/pip/pip.conf; \
		echo ">> pip guard enabled at ~/.config/pip/pip.conf"; \
	fi
	@echo ">> Done. Activate with: source $(VENV_DIR)/bin/activate"

.PHONY: shell
shell: venv
	@echo ">> Entering venv shell (type 'exit' to leave)…"
	@source "$(VENV_DIR)/bin/activate"; exec $$SHELL -i

.PHONY: test
test: venv
	@$(PYTEST) -q || (echo "Tip: add pytest to requirements-dev.txt"; exit 1)

.PHONY: lint
lint: venv
	@$(RUFF) check .
	@$(BLACK) --check .

.PHONY: format
format: venv
	@$(RUFF) check --fix .
	@$(BLACK) .

.PHONY: typecheck
typecheck: venv
	@$(MYPY) . || (echo "Tip: configure mypy in pyproject.toml"; exit 1)

.PHONY: run
run: venv
	@if [ -f app.py ]; then \
		$(PYTHON) app.py; \
	else \
		echo "No app.py found. Override 'run' target for your app entrypoint."; \
	fi

.PHONY: ci
ci:  ## mirror CI steps without installs
	@$(MAKE) lint
	@$(MAKE) typecheck
	@$(MAKE) test

.PHONY: check
check:  ## ruff + black --check + mypy + pytest
	@$(MAKE) lint
	@$(MAKE) typecheck
	@$(MAKE) test

.PHONY: clean
clean:
	@echo ">> Removing caches"
	@find . -type d -name "__pycache__" -exec rm -rf {} + || true
	@rm -rf .pytest_cache .mypy_cache .ruff_cache || true

.PHONY: clean-venv
clean-venv:
	@rm -rf "$(VENV_DIR)"
