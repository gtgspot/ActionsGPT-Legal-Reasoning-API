
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
