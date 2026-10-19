/* Deal Dhamaka Agent — dedicated Recipients tab.
   Add <script src="recipients-tab.js"></script> after the existing app scripts. */
(() => {
  "use strict";
  const KEY = "dealDhamakaAgentV2";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function data() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
      const products = Array.isArray(raw.products) ? raw.products : [];
      const shares = (Array.isArray(raw.shares) ? raw.shares : []).map(s => {
        const p = s.productId == null
          ? products.find(p => String(p.name || p.brand || "").trim() === String(s.productName || s.brand || "").trim() && String(p.productType || "").trim() === String(s.productType || "").trim())
          : products.find(p => String(p.id) === String(s.productId));
        if (s.productId != null && !p) return null;
        return p ? {...s, brand:p.brand || p.name || "", productType:p.productType || "", productName:p.name || p.brand || ""} : s;
      }).filter(Boolean);
      return shares;
    } catch (_) { return []; }
  }

  function setup() {
    if (!$('recipients')) {
      const page = document.createElement('section');
      page.id = 'recipients'; page.className = 'page';
      page.innerHTML = `
        <div class="sectionhead"><div><h2>Recipients</h2><p>Recipient-wise share details and order status</p></div><button class="secondary" id="refreshRecipients" type="button">Refresh</button></div>
        <div class="stats"><div class="stat"><b id="recipientShareTotal">0</b><span>Share Attempts</span></div><div class="stat"><b id="recipientOrderedTotal">0</b><span>Marked Ordered</span></div><div class="stat"><b id="recipientPendingTotal">0</b><span>Not Marked Ordered</span></div></div>
        <div class="card"><h3>Find Recipient Details</h3><input id="recipientSearch" class="search" placeholder="Search recipient, phone, brand or product" autocomplete="off"><select id="recipientOrderFilter"><option value="all">All statuses</option><option value="ordered">Product ordered</option><option value="pending">Not marked ordered</option></select><label>From date<input id="recipientFromDate" type="date"></label><label>To date<input id="recipientToDate" type="date"></label><button id="clearRecipientFilters" class="secondary full" type="button">Clear Filters</button></div>
        <div class="card"><h3>Recipient Details</h3><div id="recipientDetailsList"></div></div>`;
      const settings = $('settings');
      if (settings?.parentNode) settings.parentNode.insertBefore(page, settings);
      else document.querySelector('main').appendChild(page);
    }
    if (!document.querySelector('.tabbar [data-page="recipients"]')) {
      const tab = document.createElement('button'); tab.type = 'button'; tab.dataset.page = 'recipients'; tab.innerHTML = '♧<span>Recipients</span>';
      const settingsTab = document.querySelector('.tabbar [data-page="settings"]');
      if (settingsTab) settingsTab.insertAdjacentElement('beforebegin', tab); else document.querySelector('.tabbar').appendChild(tab);
      tab.addEventListener('click', () => { if (typeof window.showPage === 'function') window.showPage('recipients'); render(); });
    }
    const style = document.createElement('style');
    style.textContent = `
      .tabbar{grid-template-columns:repeat(9,minmax(0,1fr))!important}.tabbar button{min-width:0!important}
      #recipients .recipient-record{background:#fff;border-bottom:1px solid #e5e7eb;padding:16px 0}
      #recipients .recipient-record h3{font-size:17px;margin:0 0 10px;overflow-wrap:anywhere}
      #recipients .recipient-record p{color:#6b7280;font-size:13px;line-height:1.5;margin:5px 0;overflow-wrap:anywhere}
      #recipients .recipient-record .badge{font-size:12px;border-radius:20px;background:#f3f4f6;padding:5px 10px;display:inline-block;margin:2px 4px 2px 0}
      #recipients .ordered-toggle{display:flex;align-items:center;gap:10px;margin-top:12px;padding:14px;min-height:54px;border-radius:12px;background:#eaf7ee;color:#176534;font-weight:750}
      #recipients .ordered-toggle input{width:22px;height:22px;flex-shrink:0;accent-color:#218838;margin:0}
      @media(max-width:520px){.tabbar button span{font-size:8px!important}#recipients .recipient-record h3{font-size:15px}}
    `;
    document.head.appendChild(style);
    $('refreshRecipients').onclick = render;
    $('recipientSearch').oninput = render;
    $('recipientOrderFilter').onchange = render;
    $('recipientFromDate').onchange = render;
    $('recipientToDate').onchange = render;
    $('clearRecipientFilters').onclick = () => { $('recipientSearch').value=''; $('recipientOrderFilter').value='all'; $('recipientFromDate').value=''; $('recipientToDate').value=''; render(); };
    // Existing app navigation runs first; render after the tab becomes active.
    document.querySelectorAll('.tabbar [data-page="recipients"]').forEach(tab => tab.addEventListener('click', () => setTimeout(render, 0)));
    if (typeof window.toggleOrdered === 'function' && !window.toggleOrdered.__recipientRefresh) {
      const original = window.toggleOrdered;
      const wrapped = function(...args) { const result = original.apply(this,args); render(); return result; };
      wrapped.__recipientRefresh = true; window.toggleOrdered = wrapped;
    }
    render();
  }

  function render() {
    const list = $('recipientDetailsList'); if (!list) return;
    const shares = data();
    const ordered = shares.filter(s => !!s.ordered).length;
    $('recipientShareTotal').textContent = shares.length;
    $('recipientOrderedTotal').textContent = ordered;
    $('recipientPendingTotal').textContent = shares.length - ordered;
    const q = ($('recipientSearch').value || '').trim().toLowerCase();
    const status = $('recipientOrderFilter').value;
    const from = $('recipientFromDate').value ? new Date($('recipientFromDate').value+'T00:00:00').getTime() : 0;
    const to = $('recipientToDate').value ? new Date($('recipientToDate').value+'T23:59:59.999').getTime() : Infinity;
    const rows = shares.filter(s => [s.contactName,s.phone,s.productName,s.brand,s.productType,s.status].join(' ').toLowerCase().includes(q) && (status==='all' || (status==='ordered' && !!s.ordered) || (status==='pending' && !s.ordered)) && Number(s.time||0)>=from && Number(s.time||0)<=to).sort((a,b)=>Number(b.time||0)-Number(a.time||0));
    list.innerHTML = rows.length ? rows.map(s => `
      <article class="recipient-record"><h3>${esc(s.contactName || 'Unknown recipient')} ← ${esc(s.brand || s.productName || 'Unknown product')}</h3>
      <p><span class="badge">${esc(s.brand || 'No brand')}</span><span class="badge">${esc(s.productType || 'No type')}</span></p>
      <p>${s.time ? new Date(Number(s.time)).toLocaleString() : ''} · ${esc(s.phone || '')}</p><p>${esc(s.status || 'Share initiated; delivery not confirmed')}</p>
      <label class="ordered-toggle"><input type="checkbox" data-recipient-ordered="${esc(s.id)}" ${s.ordered?'checked':''}>Product Ordered</label></article>`).join('') : '<p class="report-empty">No recipient records match these filters.</p>';
    list.querySelectorAll('[data-recipient-ordered]').forEach(input => input.onchange = () => {
      if (typeof window.toggleOrdered === 'function') window.toggleOrdered(input.dataset.recipientOrdered,input.checked);
      else { try { const raw=JSON.parse(localStorage.getItem(KEY)||'{}'); const row=(raw.shares||[]).find(s=>String(s.id)===String(input.dataset.recipientOrdered)); if(row){row.ordered=input.checked;row.orderedAt=input.checked?(row.orderedAt||new Date().toISOString()):'';localStorage.setItem(KEY,JSON.stringify(raw));window.dispatchEvent(new CustomEvent("deal-dhamaka-data-updated"));} } catch(_){} }
      render();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, {once:true}); else setup();
})();
