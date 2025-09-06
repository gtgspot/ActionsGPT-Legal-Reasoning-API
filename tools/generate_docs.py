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

    # Minimal ReDoc page
    html = f"""<!doctype html>
    <html>
      <head>
        <meta charset=\"utf-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
        <title>ActionsGPT — Legal Reasoning API</title>
        <link rel=\"icon\" href=\"data:,\" />
        <style>body {{ margin: 0; padding: 0; }} .wrap {{ height: 100vh; }}</style>
      </head>
      <body>
        <redoc spec-url=\"openapi.json\" class=\"wrap\"></redoc>
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
