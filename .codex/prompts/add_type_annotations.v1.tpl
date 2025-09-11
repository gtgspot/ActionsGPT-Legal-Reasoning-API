# Add Type Annotations

Goal: Add precise type annotations to the target path and fix type errors.

Constraints:
- Do not change runtime behavior.
- Prefer specific types over Any where feasible.
- Keep public APIs stable; introduce TypedDict/Protocol if useful.

Target: {path}

Deliverables:
- Annotated code with mypy passing.
- Notes on any unavoidable `type: ignore` with rationale.

