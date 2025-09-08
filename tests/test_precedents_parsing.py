import pytest
from fastapi.testclient import TestClient

from app import app

client = TestClient(app, headers={"X-API-Key": "test-key"})


class FakeResponse:
    def __init__(self, status_code=200, text="", headers=None):
        self.status_code = status_code
        self.text = text
        self.headers = headers or {"content-type": "text/html"}

    def raise_for_status(self):
        return None


LIST_HTML = (
    '<a href="https://www8.austlii.edu.au/cgi-bin/viewdoc/au/cases/vic/VSCA/2021/123.html">[2021] VSCA 123</a>'
)

CASE_HTML = (
    "<html><body>Judges: Smith JA; Lee AJA<br>"
    "[45] This is the ratio holding of the Court. It addresses the legal issue."
    "... more paragraphs ..."
    "[70] This paragraph reflects obiter dicta."
    "</body></html>"
)


class FakeAsyncClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get(self, url):
        if "sinosrch.cgi" in url:
            return FakeResponse(200, LIST_HTML)
        return FakeResponse(200, CASE_HTML)


@pytest.fixture(autouse=True)
def patch_httpx(monkeypatch):
    import httpx

    # Patch the AsyncClient used by the app via our factory
    monkeypatch.setattr(httpx, "AsyncClient", FakeAsyncClient)
    yield


def test_precedents_search_enriches_case_meta_with_panel_and_ratio():
    r = client.post("/precedents/search", json={"query": "test", "jurisdiction_hint": "VIC"})
    assert r.status_code == 200
    items = r.json().get("results", [])
    assert items
    meta = items[0].get("meta")
    assert meta and meta.get("panel") and "Smith" in ", ".join(meta.get("panel"))
    assert "ratio_excerpt" in meta and "[45]" in meta["ratio_excerpt"]
    assert "obiter_excerpt" in meta and "[70]" in meta["obiter_excerpt"]
