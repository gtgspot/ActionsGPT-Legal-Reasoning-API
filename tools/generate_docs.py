#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path


def main() -> None:
    # Ensure repo root on sys.path for 'import app'
    repo_root = Path(__file__).resolve().parents[1]
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))
    from app import app

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
    api_base = os.environ.get("PAGES_API_BASE", "")

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
.container {{ max-width: 1200px; margin: 0 auto; padding: 0 18px; }}
.header {{ display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--border); background: #0d1117; position: sticky; top: 0; z-index: 5; backdrop-filter: saturate(140%) blur(6px); }}
.brand {{ font-weight: 600; letter-spacing: 0.2px; }}
.brand a {{ color: var(--text); text-decoration: none; }}
.btns {{ display: flex; gap: 8px; }}
.btn {{ appearance: none; border: 1px solid var(--border); background: var(--panel); color: var(--text); padding: 8px 10px; border-radius: 8px; cursor: pointer; transition: transform .08s ease, filter .15s ease; }}
.btn.primary {{ background: var(--brand-primary); border-color: var(--brand-primary); color: white; }}
.btn:hover {{ filter: brightness(1.08); transform: translateY(-1px); }}
.btn:active {{ transform: translateY(0); }}
.layout {{ display: grid; grid-template-rows: auto 1fr; min-height: 100vh; }}
.content {{ display: grid; grid-template-columns: 1fr; }}
.hero {{ padding: 48px 18px; border-bottom: 1px solid var(--border); background: linear-gradient(180deg, rgba(31,111,235,0.10), transparent 60%); }}
.hero h1 {{ margin: 0 0 12px 0; font-size: 28px; }}
.hero p {{ margin: 0; color: var(--muted); max-width: 70ch; }}
.grid {{ display: grid; gap: 14px; grid-template-columns: 1fr; padding: 18px; }}
@media (min-width: 900px) {{ .grid {{ grid-template-columns: repeat(3, 1fr); }} }}
.card {{ background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }}
.card h3 {{ margin: 0 0 6px; font-size: 16px; }}
.muted {{ color: var(--muted); }}
.input {{ width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: #0d1117; color: var(--text); }}
.list {{ display: grid; gap: 10px; margin-top: 14px; }}
.item {{ border: 1px solid var(--border); border-radius: 10px; padding: 10px; background: #0d1117; }}
.item a {{ color: var(--brand-primary); text-decoration: none; }}
.item .tag {{ font-size: 12px; color: var(--muted); }}
.links a {{ color: var(--brand-primary); text-decoration: none; }}
.links a:hover {{ text-decoration: underline; }}
.api {{ height: calc(100vh - 120px); }}
@media (min-width: 1000px) {{ .api {{ height: calc(100vh - 80px); }} }}
"""
    (assets / "styles.css").write_text(css)

    # Runtime config
    config_js = f"window.__CONFIG__ = {{ apiBase: '{api_base}' }};"
    (assets / "config.js").write_text(config_js)

    # App JS
    app_js = """
(() => {
  const API_BASE = (window.__CONFIG__ && window.__CONFIG__.apiBase) || '';
  const api = (p, opts={}) => fetch((API_BASE||'') + p, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));

  async function searchSources(q, opts={}) {
    const body = Object.assign({ query:q, per_page: 10, include_snippets: true }, opts);
    const r = await api('/sources/search', { method:'POST', body: JSON.stringify(body) });
    return await r.json();
  }

  async function loadMap() {
    const r = await api('/map/legislation', { method:'POST', body: JSON.stringify({ doc_id: 'preview' })});
    return await r.json();
  }
  async function loadMapDoc(id){
    const r = await api('/map/citations/'+encodeURIComponent(id));
    return await r.json();
  }
  async function listRecentDocs(){
    const r = await api('/documents/recent');
    return await r.json();
  }

  function h(tag, attrs={}, ...children){
    const el = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs||{})) {
      if (k === 'class') el.className = v; else if (k==='html') el.innerHTML = v; else el.setAttribute(k,v);
    }
    children.forEach(c => { if (c==null) return; el.appendChild(typeof c==='string'?document.createTextNode(c):c); });
    return el;
  }

  function renderList(container, items){
    container.innerHTML='';
    if (!items || !items.results || !items.results.length) { container.appendChild(h('div',{class:'muted'},'No results')); return; }
    const list = h('div',{class:'list'});
    for (const it of items.results){
      const row = h('div',{class:'item'},
        h('div',{}, h('a',{href:it.uri, target:'_blank', rel:'noopener'}, it.title || it.uri)),
        it.snippet ? h('div',{class:'muted'}, it.snippet) : null,
        h('div',{class:'tag'}, `${it.type||'other'} • score ${it.score??''}`)
      );
      list.appendChild(row);
    }
    container.appendChild(list);
  }

  function initExplorer(){
    const form = document.querySelector('#explorer-form');
    const input = document.querySelector('#explorer-input');
    const out = document.querySelector('#explorer-out');
    const domainInput = document.querySelector('#explorer-domain');
    const typeInput = document.querySelector('#explorer-type');
    const pager = document.querySelector('#explorer-pager');
    let page = 1;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      out.innerHTML = '<div class="muted">Searching…</div>';
      const domains = domainInput.value.trim() ? domainInput.value.trim().split(',').map(s=>s.trim()).filter(Boolean) : undefined;
      const content_types = typeInput.value ? [typeInput.value] : undefined;
      page = 1;
      try { const data = await searchSources(input.value.trim(), { domains, content_types, page }); renderList(out, data); renderPager(pager, data, (p)=>doPage(p)); }
      catch (err) { out.innerHTML = '<div class="muted">Error performing search.</div>'; }
    });

    async function doPage(p){
      page = p;
      out.innerHTML = '<div class="muted">Loading…</div>';
      const domains = domainInput.value.trim() ? domainInput.value.trim().split(',').map(s=>s.trim()).filter(Boolean) : undefined;
      const content_types = typeInput.value ? [typeInput.value] : undefined;
      const data = await searchSources(input.value.trim(), { domains, content_types, page });
      renderList(out, data); renderPager(pager, data, (p)=>doPage(p));
    }
  }

  function renderPager(container, data, onGo){
    container.innerHTML='';
    if (!data || !data.total) return;
    const { total, page, per_page } = data;
    const pages = Math.ceil(total / per_page);
    const bar = h('div', { class:'btns' });
    const mk = (p,label=String(p))=> h('button',{ class:'btn'+(p===page?' primary':''), onclick:()=>onGo(p) }, label);
    const start = Math.max(1, page-2);
    const end = Math.min(pages, page+2);
    if (page>1) bar.appendChild(mk(page-1,'‹'));
    for (let p=start;p<=end;p++) bar.appendChild(mk(p));
    if (page<pages) bar.appendChild(mk(page+1,'›'));
    container.appendChild(bar);
  }

  // theme toggle
  function initTheme(){
    const key='theme';
    const root=document.documentElement;
    const saved=localStorage.getItem(key);
    if (saved) root.setAttribute('data-theme', saved);
    const tgl=document.getElementById('theme-tgl');
    tgl?.addEventListener('change', (e)=>{
      const next = e.target.checked? 'light':'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem(key, next);
    });
  }

  async function initMap(){
    const container = document.getElementById('graph');
    const picker = document.getElementById('doc-picker');
    if (!container) return;
    // Populate recent docs
    try {
      const recent = await listRecentDocs();
      const items = (recent.items||[]);
      if (picker && items.length){
        picker.innerHTML = '';
        items.forEach(it=>{
          const opt=document.createElement('option'); opt.value=it.doc_id; opt.textContent = `${it.title} (${(it.doc_id||'').slice(0,8)})`; picker.appendChild(opt);
        });
      }
    } catch {}
    // Render graph helper
    async function render(data){
      try {
        window.cytoscape({
          container,
          boxSelectionEnabled: false,
          style: [
            { selector: 'node', style: { 'label': 'data(title)', 'background-color': 'var(--brand-primary)', 'color':'#fff', 'text-valign':'center', 'text-halign':'center', 'font-size':'10px', 'width': 'label', 'height':'label', 'padding':'8px', 'shape':'round-rectangle' } },
            { selector: 'edge', style: { 'curve-style':'bezier', 'target-arrow-shape':'triangle', 'line-color':'#6ea8fe55', 'target-arrow-color':'#6ea8fe55' } }
          ],
          elements: {
            nodes: (data.nodes||[]).map(n => ({ data: n })),
            edges: (data.edges||[]).map(e => ({ data: { id: `${e.from}->${e.to}`, source: e.from, target: e.to } }))
          },
          layout: { name: 'cose', animate: false }
        });
      } catch { container.innerHTML = '<div class="muted">Failed to load graph.</div>'; }
    }
    // Initial
    try { const data = await loadMap(); await render(data); } catch { container.innerHTML = '<div class="muted">No preview available.</div>'; }
    // React to picker
    picker?.addEventListener('change', async (e)=>{
      container.innerHTML = '<div class="muted">Loading…</div>';
      const id = e.target.value; const data = await loadMapDoc(id); await render(data);
    });
  }

  async function chat(doc_id, messages){
    const r = await api('/chat', { method:'POST', body: JSON.stringify({ doc_id, messages })});
    return await r.json();
  }

  function initChat(){
    const log=document.getElementById('chat-log');
    const form=document.getElementById('chat-form');
    const inp=document.getElementById('chat-input');
    const doc=document.getElementById('chat-doc');
    if (!form || !log || !inp || !doc) return; // no chat page
    let history=[];
    function append(role,content){const b=document.createElement('div');b.className='item';b.innerText=(role==='assistant'?'AI: ':'You: ')+content;log.appendChild(b);log.scrollTop=log.scrollHeight;}
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const q=inp.value.trim(); if(!q||!doc.value.trim()) return;
      append('user', q); history.push({role:'user', content:q}); inp.value='';
      try{const data=await chat(doc.value.trim(), history); const msg=(data.messages&&data.messages[0])?data.messages[0].content:'(no reply)'; append('assistant', msg); history.push({role:'assistant', content:msg});}
      catch{append('assistant','(error)');}
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initExplorer();
    initMap();
    initChat();
  });
})();
"""
    (assets / "app.js").write_text(app_js)

    # Landing page
    landing = f"""<!doctype html>
    <html lang=\"en\">
      <head>
        <meta charset=\"utf-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
        <title>{title}</title>
        <link rel=\"icon\" href=\"data:,\" />
        <link rel=\"stylesheet\" href=\"assets/styles.css\" />
        <script defer src=\"assets/config.js\"></script>
        <script defer src=\"assets/app.js\"></script>
      </head>
      <body>
        <div class=\"layout\">
          <header class=\"header\">
            <div class=\"brand\"><a href=\"./\">{title}</a></div>
            <nav class=\"btns\">
              <a class=\"btn\" href=\"api.html\">API Docs</a>
              <a class=\"btn\" href=\"explorer.html\">Explorer</a>
              <a class=\"btn primary\" href=\"map.html\">Citations Map</a>
              <a class="btn" href="kb.html">Knowledge Base</a>
              <span class="theme-toggle"><input id="theme-tgl" type="checkbox" /><label for="theme-tgl"><span class="dot"></span> Light</label></span>
            </nav>
          </header>
          <section class=\"hero\">
            <div class=\"container\">
              <h1>Next‑Gen Legal Reasoning Interface</h1>
              <p>Minimal, readable, and fast. Backed by a citation‑aware memory core designed for verifiability and iterative analysis. Explore sources, map legislation, and integrate via OpenAPI.</p>
            </div>
          </section>
          <section class=\"container\" style=\"padding:18px\">
            <div class=\"grid\">
              <div class=\"card\">
                <h3>Structured Retrieval</h3>
                <div class=\"muted\">Key‑less meta‑search across allowlisted legal sources with graceful fallbacks.</div>
              </div>
              <div class=\"card\">
                <h3>Citation Mapping</h3>
                <div class=\"muted\">Visualize Acts, Regulations, and Rules with directional relations.</div>
              </div>
              <div class=\"card\">
                <h3>Typed Contracts</h3>
                <div class=\"muted\">Strongly‑typed requests and responses for predictable integrations.</div>
              </div>
            </div>
          </section>
        </div>
      </body>
    </html>"""
    (site / "index.html").write_text(landing)

    # Explorer page
    explorer = f"""<!doctype html>
    <html lang=\"en\">
      <head>
        <meta charset=\"utf-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
        <title>{title} — Explorer</title>
        <link rel=\"stylesheet\" href=\"assets/styles.css\" />
        <script defer src=\"assets/config.js\"></script>
        <script defer src=\"assets/app.js\"></script>
      </head>
      <body>
        <div class=\"layout\">
          <header class=\"header\">
            <div class=\"brand\"><a href=\"./\">{title}</a></div>
            <nav class=\"btns\">
              <a class=\"btn\" href=\"api.html\">API Docs</a>
              <a class=\"btn primary\" href=\"explorer.html\">Explorer</a>
              <a class=\"btn\" href=\"map.html\">Citations Map</a>
            </nav>
          </header>
          <section class=\"container\" style=\"padding:18px\">\n            <div class=\"grid\" style=\"grid-template-columns: 1fr; gap: 16px;\">\n              <div class=\"card\">\n                <h3>Legal Sources Explorer</h3>\n                <form id=\"explorer-form\">\n                  <input id=\"explorer-input\" class=\"input\" placeholder=\"Search e.g. Evidence Act s 138\" />\n                </form>\n                <div id=\"explorer-out\" style=\"margin-top: 10px;\"></div>\n              </div>\n              <div class=\"card\">\n                <h3>Package Registries</h3>\n                <form id=\"registries-form\" class=\"grid\" style=\"grid-template-columns: 1fr 1fr; gap:10px;\">\n                  <select id=\"registries-lang\" class=\"input\">\n                    <option value=\"python\">Python (PyPI)</option>\n                    <option value=\"node\">Node (npm/Yarn)</option>\n                    <option value=\"java\">Java (Maven)</option>\n                    <option value=\"go\">Go (pkg.go.dev)</option>\n                    <option value=\"rust\">Rust (crates.io)</option>\n                    <option value=\"ruby\">Ruby (RubyGems)</option>\n                    <option value=\"php\">PHP (Packagist)</option>\n                    <option value=\"dotnet\">.NET (NuGet)</option>\n                  </select>\n                  <input id=\"registries-name\" class=\"input\" placeholder=\"package (or vendor/name)\" />\n                  <input id=\"registries-group\" class=\"input\" placeholder=\"maven group (optional)\" />\n                  <input id=\"registries-artifact\" class=\"input\" placeholder=\"maven artifact (optional)\" />\n                  <label><input id=\"registries-fetch\" type=\"checkbox\" /> include fetch</label>\n                  <button class=\"btn primary\" type=\"submit\">Resolve</button>\n                </form>\n                <div id=\"registries-out\" class=\"list\" style=\"margin-top:10px\"></div>\n              </div>\n            </div>\n          </section>
        </div>
      </body>
    </html>"""
    (site / "explorer.html").write_text(explorer)

    # Map page
    map_page = f"""<!doctype html>
    <html lang=\"en\">
      <head>
        <meta charset=\"utf-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
        <title>{title} — Citations Map</title>
        <link rel=\"stylesheet\" href=\"assets/styles.css\" />
        <script defer src=\"assets/config.js\"></script>
        <script defer src=\"assets/app.js\"></script>
        <script src=\"https://unpkg.com/cytoscape@3.28.1/dist/cytoscape.umd.min.js\"></script>
      </head>
      <body>
        <div class=\"layout\">
          <header class=\"header\">
            <div class=\"brand\"><a href=\"./\">{title}</a></div>
            <nav class=\"btns\">
              <a class=\"btn\" href=\"api.html\">API Docs</a>
              <a class=\"btn\" href=\"explorer.html\">Explorer</a>
              <a class=\"btn primary\" href=\"map.html\">Citations Map</a>
            </nav>
          </header>
          <section class=\"container\" style=\"padding:12px\">
            <div id=\"graph\" style=\"height: calc(100vh - 120px); border:1px solid var(--border); border-radius: 12px; background:#0d1117;\"></div>
          </section>
        </div>
      </body>
    </html>"""
    (site / "map.html").write_text(map_page)

    # API docs page (ReDoc)
    api_html = f"""<!doctype html>
    <html lang=\"en\">\n      <head>\n        <meta charset=\"utf-8\" />\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n        <title>{title} — API</title>\n        <link rel=\"icon\" href=\"data:,\" />\n        <link rel=\"stylesheet\" href=\"assets/styles.css\" />\n      </head>\n      <body>\n        <div class=\"layout\">\n          <header class=\"header\">\n            <div class=\"brand\"><a href=\"./\">{title}</a></div>\n            <nav class=\"btns\">\n              <a class=\"btn primary\" href=\"api.html\">API Docs</a>\n              <a class=\"btn\" href=\"explorer.html\">Explorer</a>\n              <a class=\"btn\" href=\"map.html\">Citations Map</a>\n            </nav>\n          </header>\n          <section class=\"content\">\n            <redoc spec-url=\"openapi.json\" class=\"api\"></redoc>\n          </section>\n        </div>\n\n        <script src=\"https://cdn.jsdelivr.net/npm/redoc/bundles/redoc.standalone.js\"></script>\n      </body>\n    </html>"""
    (site / "api.html").write_text(api_html)

    # Chat page
    chat_html = """<!doctype html>
    <html lang=\"en\">
      <head>
        <meta charset=\"utf-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
        <title>{title} — Chat</title>
        <link rel=\"stylesheet\" href=\"assets/styles.css\" />
        <script defer src=\"assets/config.js\"></script>
        <script defer src=\"assets/app.js\"></script>
      </head>
      <body>
        <div class=\"layout\">
          <header class=\"header\">
            <div class=\"brand\"><a href=\"./\">Chat</a></div>
            <nav class=\"btns\">
              <a class=\"btn\" href=\"api.html\">API Docs</a>
              <a class=\"btn\" href=\"explorer.html\">Explorer</a>
              <a class=\"btn\" href=\"map.html\">Citations Map</a>
              <a class=\"btn\" href=\"kb.html\">Knowledge Base</a>
              <span class=\"theme-toggle\"><input id=\"theme-tgl\" type=\"checkbox\" /><label for=\"theme-tgl\"><span class=\"dot\"></span> Light</label></span>
            </nav>
          </header>
          <section class=\"container\" style=\"padding:18px\">\n            <div class=\"grid\" style=\"grid-template-columns: 1fr; gap:10px;\">\n              <input id=\"chat-doc\" class=\"input\" placeholder=\"doc_id (required)\"/>\n              <div id=\"chat-log\" class=\"list\" style=\"max-height: calc(100vh - 280px); overflow:auto;\"></div>\n              <form id=\"chat-form\" class=\"grid\" style=\"grid-template-columns: 1fr auto; gap:10px;\">\n                <input id=\"chat-input\" class=\"input\" placeholder=\"Ask a question…\" />\n                <button class=\"btn primary\" type=\"submit\">Send</button>\n              </form>\n            </div>\n          </section>
        </div>
        <script>
        (()=>{
          const API_BASE=(window.__CONFIG__&&window.__CONFIG__.apiBase)||'';
          const log=document.getElementById('chat-log');
          const form=document.getElementById('chat-form');
          const inp=document.getElementById('chat-input');
          const doc=document.getElementById('chat-doc');
          let history=[];
          function append(role,content){const b=document.createElement('div');b.className='item';b.innerText=(role==='assistant'?'AI: ':'You: ')+content;log.appendChild(b);log.scrollTop=log.scrollHeight;}
          form.addEventListener('submit',async(e)=>{
            e.preventDefault();
            const q=inp.value.trim(); if(!q||!doc.value.trim()) return;
            append('user',q); history.push({role:'user',content:q}); inp.value='';
            try{
              const r=await fetch(API_BASE+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({doc_id:doc.value.trim(),messages:history})});
              const data=await r.json();
              const msg=(data.messages&&data.messages[0])?data.messages[0].content:'(no reply)';
              append('assistant',msg); history.push({role:'assistant',content:msg});
            }catch{append('assistant','(error)');}
          });
        })();
        </script>
      </body>
    </html>"""
    (site / "chat.html").write_text(chat_html)

    # Optional custom domain support: write CNAME if provided
    custom_domain = os.environ.get("PAGES_CUSTOM_DOMAIN")
    if custom_domain:
        (site / "CNAME").write_text(custom_domain.strip() + "\n")

    print("Wrote site with landing, explorer, map, api docs")


if __name__ == "__main__":
    main()
