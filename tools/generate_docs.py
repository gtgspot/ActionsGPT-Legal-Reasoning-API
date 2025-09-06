#!/usr/bin/env python3
import json
import os
from pathlib import Path


def main() -> None:
    # Import app after path setup
    from app import app  # type: ignore

    site = Path("site")
    site.mkdir(parents=True, exist_ok=True)

    # Write OpenAPI schema
    openapi = app.openapi()
    (site / "openapi.json").write_text(json.dumps(openapi, indent=2))

    # Assets
    assets = site / "assets"
    assets.mkdir(exist_ok=True)

    primary = os.environ.get("PAGES_PRIMARY_COLOR", "#1f6feb")
    accent = os.environ.get("PAGES_ACCENT_COLOR", "#0969da")
    title = os.environ.get("PAGES_SITE_TITLE", "ActionsGPT — Legal Reasoning API")

    css = f""":root {{
  --brand-primary: {primary};
  --brand-accent: {accent};
  --bg: #0b0c10;
  --panel: #111317;
  --text: #e6edf3;
  --muted: #9aa7b2;
  --border: #23262e;
}}

* {{ box-sizing: border-box; }}
html, body {{ height: 100%; margin: 0; }}
body {{ font: 14px/1.5 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: var(--bg); color: var(--text); }}
.header {{ display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--border); background: #0d1117; position: sticky; top: 0; z-index: 5; }}
.brand {{ font-weight: 600; letter-spacing: 0.2px; }}
.brand a {{ color: var(--text); text-decoration: none; }}
.btns {{ display: flex; gap: 8px; }}
.btn {{ appearance: none; border: 1px solid var(--border); background: var(--panel); color: var(--text); padding: 8px 10px; border-radius: 8px; cursor: pointer; }}
.btn.primary {{ background: var(--brand-primary); border-color: var(--brand-primary); color: white; }}
.btn:hover {{ filter: brightness(1.05); }}
.layout {{ display: grid; grid-template-rows: auto 1fr; min-height: 100vh; }}
.content {{ display: grid; grid-template-columns: 1fr; }}
.hero {{ padding: 18px; border-bottom: 1px solid var(--border); background: linear-gradient(180deg, rgba(31,111,235,0.10), transparent 60%); }}
.links a {{ color: var(--brand-primary); text-decoration: none; }}
.links a:hover {{ text-decoration: underline; }}
.api {{ height: calc(100vh - 120px); }}
@media (min-width: 1000px) {{ .api {{ height: calc(100vh - 80px); }} }}
"""
    (assets / "styles.css").write_text(css)

    # Enhanced ReDoc page with header and quick links
    html = f"""<!doctype html>
    <html lang=\"en\">
      <head>
        <meta charset=\"utf-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
        <title>{title}</title>
        <link rel=\"icon\" href=\"data:,\" />
        <link rel=\"stylesheet\" href=\"assets/styles.css\" />
      </head>
      <body>
        <div class=\"layout\">
          <header class=\"header\">
            <div class=\"brand\"><a href=\"./\">{title}</a></div>
            <nav class=\"btns\">
              <a class=\"btn\" href=\"openapi.json\" target=\"_blank\" rel=\"noopener\">OpenAPI JSON</a>
              <a class=\"btn primary\" href=\"#\" onclick=\"document.querySelector('redoc').scrollIntoView({{behavior:'smooth'}});return false;\">View API</a>
            </nav>
          </header>
          <section class=\"hero\">
            <div class=\"links\">Fast, typed FastAPI endpoints for legal ingestion and lightweight research. Explore the API below or fetch the <a href=\"openapi.json\">OpenAPI schema</a>.</div>
          </section>
          <section class=\"content\">
            <redoc spec-url=\"openapi.json\" class=\"api\"></redoc>
          </section>
        </div>

        <script src=\"https://cdn.jsdelivr.net/npm/redoc/bundles/redoc.standalone.js\"></script>
      </body>
    </html>"""
    (site / "index.html").write_text(html)

    # Optional custom domain support: write CNAME if provided
    custom_domain = os.environ.get("PAGES_CUSTOM_DOMAIN")
    if custom_domain:
        (site / "CNAME").write_text(custom_domain.strip() + "\n")

    print("Wrote site/openapi.json and site/index.html")


if __name__ == "__main__":
    main()
