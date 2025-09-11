# Generate Unit Tests

Goal: Write focused, offline-safe unit tests for the target path.

Constraints:
- Do not hit network. Mock httpx/requests and filesystem effects.
- Prefer small, deterministic, readable tests.

Target: {path}

Deliverables:
- New tests under `tests/` that cover core logic, edge cases, and error paths.
- Brief notes on any gaps left for later.

