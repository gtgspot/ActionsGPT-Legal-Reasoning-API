from typing import Any, Dict

from .config import DOCS_MAX_ITEMS, DOCS_TTL_SECONDS


def prune_docs_store(store: Dict[str, Dict[str, Any]]) -> None:
    """Prune expired docs and enforce max item count by created_at descending.

    Keeps the most recent items (by created_at). TTL uses ISO timestamps.
    """
    if not store:
        return
    # TTL pruning
    if DOCS_TTL_SECONDS and DOCS_TTL_SECONDS > 0:
        import datetime as _dt

        now = _dt.datetime.now(_dt.UTC)
        to_delete = []
        for k, v in store.items():
            ts = v.get("created_at")
            if not isinstance(ts, str):
                continue
            try:
                dt = _dt.datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except Exception:
                continue
            age = (now - dt).total_seconds()
            if age > DOCS_TTL_SECONDS:
                to_delete.append(k)
        for k in to_delete:
            store.pop(k, None)
    # Max items pruning
    if DOCS_MAX_ITEMS and DOCS_MAX_ITEMS > 0 and len(store) > DOCS_MAX_ITEMS:
        items = list(store.items())
        items.sort(key=lambda kv: kv[1].get("created_at") or "", reverse=True)
        # keep first N
        keep = {k for k, _ in items[:DOCS_MAX_ITEMS]}
        for k in list(store.keys()):
            if k not in keep:
                store.pop(k, None)

# In-memory store for document chunks and metadata
DOCS: Dict[str, Dict[str, Any]] = {}
