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


class FakeAsyncClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def get(self, url):
        if "austlii" in url:
            # 3 results: 2 judgments (/cases/), 1 statute (/legis/)
            html = (
                '<html><body>'
                '<a href="https://www8.austlii.edu.au/cases/ABC">Case A</a>'
                '<a href="https://www8.austlii.edu.au/cases/DEF">Case B</a>'
                '<a href="https://www8.austlii.edu.au/legis/XYZ">Statute X</a>'
                '</body></html>'
            )
            return FakeResponse(200, html)
        else:
            # DuckDuckGo HTML with two results including snippets
            html = (
                '<div class="result">'
                '  <a class="result__a" href="https://example.com/one">One</a>'
                '  <div class="result__snippet">Snippet one</div>'
                '</div>'
                '<div class="result">'
                '  <a class="result__a" href="https://example.com/two">Two</a>'
                '  <div class="result__snippet">Snippet two</div>'
                '</div>'
            )
            return FakeResponse(200, html)


@pytest.fixture(autouse=True)
def patch_httpx(monkeypatch):
    import httpx

    monkeypatch.setattr(httpx, "AsyncClient", FakeAsyncClient)
    yield


def test_sources_search_filters_by_type_and_domain():
    # Filter to judgments on www8.austlii.edu.au only; DDG results are type=other -> excluded
    body = {
        "query": "evidence",
        "domains": ["www8.austlii.edu.au"],
        "content_types": ["judgment"],
        "page": 1,
        "per_page": 10,
        "include_snippets": True,
    }
    r = client.post("/sources/search", json=body)
    assert r.status_code == 200
    data = r.json()
    # Expect only the 2 /cases/ links (judgments)
    assert len(data.get("results", [])) == 2
    assert all(it.get("type") == "judgment" for it in data["results"])


def test_sources_search_pagination():
    # Ask for page=2 with per_page=1 to slice the austlii results
    body = {
        "query": "evidence",
        "domains": ["www8.austlii.edu.au"],
        "content_types": ["judgment"],
        "page": 2,
        "per_page": 1,
        "include_snippets": False,
    }
    r = client.post("/sources/search", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data.get("page") == 2
    assert data.get("per_page") == 1
    assert len(data.get("results", [])) == 1


def test_sources_fetch_authenticated_html(monkeypatch):
    html = "<html><body>Secret</body></html>"
    captured_headers = {}

    async def fake_fetch_url(url, auth_header):
        assert auth_header == "Bearer secret"
        return {
            "uri": url,
            "content_text": "stripped",
            "detected_type": "html",
            "captured_at": "2024-01-01T00:00:00Z",
        }

    class CaptureAsyncClient:
        def __init__(self, headers=None):
            captured_headers["headers"] = dict(headers or {})

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url):
            return FakeResponse(200, html)

    def fake_get_async_client(headers=None):
        return CaptureAsyncClient(headers)

    monkeypatch.setattr("api.routers.sources.fetch_url", fake_fetch_url)
    monkeypatch.setattr("api.routers.sources.get_async_client", fake_get_async_client)

    r = client.post(
        "/sources/fetch",
        json={"urls": ["https://example.com/private"], "strip_html": False},
        headers={"Authorization": "Bearer secret"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["items"][0]["content_text"] == html
    assert captured_headers["headers"].get("Authorization") == "Bearer secret"
