#!/usr/bin/env bash
set -euo pipefail

echo "Sandbox starting..."
echo "Python: $(python -V)"
echo "Running codex orchestrator help"
python codex_orchestrator.py --help || true
echo "Done."

