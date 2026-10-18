/* Refund register: additive feature using existing dealDhamakaAgentV2 records. */
(function(){
  const host=()=>document.getElementById('refundsApp');
  const escR=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const moneyR=n=>'₹'+(Number(n)||0).toLocaleString('en-IN',{maximumFractionDigits:2});
  let chosenContact='', searchText='', productFilter='all', statusFilter='all';
  function productFor(share){return state.products.find(p=>String(p.id)===String(share.productId))||{};}
  function contactFor(share){return state.contacts.find(c=>String(c.id)===String(share.contactId))||{};}
  function priceFor(s){const p=productFor(s);return Math.max(0,Number(s.priceSnapshot ?? p.price)||0);}
  function refundValue(s){return s.refunded ? Math.max(0,Number(s.refundAmount ?? priceFor(s))||0):0;}
  function saveRefund(share, checked){share.refunded=checked;share.refundedAt=checked?(share.refundedAt||new Date().toISOString()):'';share.refundAmount=checked?priceFor(share):0;save();renderRefunds();}
  function renderRefunds(){
    const root=host(); if(!root||typeof state==='undefined')return;
    const products=[...state.products].sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    const contacts=[...state.contacts].sort((a,b)=>(a.name||'').localeCompare(b.name||'',undefined,{sensitivity:'base'}));
    const shares=state.shares;
    const totalRefund=shares.reduce((n,s)=>n+refundValue(s),0), eligible=shares.filter(s=>s.ordered).length, refunded=shares.filter(s=>s.refunded).length;
    if(!chosenContact && contacts.length) chosenContact=String(contacts[0].id);
    const visibleContacts=contacts.filter(c=>(`${c.name||''} ${c.phone||''} ${c.category||''}`).toLowerCase().includes(searchText.toLowerCase()));
    if(chosenContact && !contacts.some(c=>String(c.id)===chosenContact))chosenContact='';
    const selected=contacts.find(c=>String(c.id)===chosenContact);
    const rows=selected?shares.filter(s=>String(s.contactId)===String(selected.id)).filter(s=>productFilter==='all'||String(s.productId)===productFilter).filter(s=>statusFilter==='all'||(statusFilter==='ordered'?!!s.ordered:statusFilter==='pending'?!s.ordered:statusFilter==='refunded'?!!s.refunded:!s.refunded)):[];
    rows.sort((a,b)=>(Number(b.time)||0)-(Number(a.time)||0));
    root.innerHTML=`
      <div class="dashboard-overview-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
        <div class="card"><small>Refunded amount</small><h2>${moneyR(totalRefund)}</h2></div>
        <div class="card"><small>Refunded records</small><h2>${refunded}</h2></div>
        <div class="card"><small>Ordered eligible</small><h2>${eligible}</h2></div>
      </div>
      <div class="card"><h3>Bulk mark refunded</h3><p class="hint">Choose a product to mark every recipient's matching share record as refunded. Only records marked ordered are changed.</p>
        <div class="formrow"><label for="refundBulkProduct">Product</label><select id="refundBulkProduct"><option value="">Select product</option>${products.map(p=>`<option value="${escR(p.id)}">${escR(p.name)}</option>`).join('')}</select></div>
        <button type="button" class="primary full" id="refundBulkApply">Mark all ordered contacts refunded</button>
      </div>
      <div class="card"><h3>Contacts <span class="hint">(${contacts.length})</span></h3>
        <input id="refundContactSearch" class="search" placeholder="Search contact name or number" value="${escR(searchText)}">
        <div class="refund-contact-list">${visibleContacts.map(c=>`<button type="button" class="refund-contact ${String(c.id)===chosenContact?'active':''}" data-refund-contact="${escR(c.id)}"><span>${escR(c.name||'Unnamed')}</span><small>${escR(c.phone||'')}</small><b>${shares.filter(s=>String(s.contactId)===String(c.id)).length} deals</b></button>`).join('')||'<p class="empty">No matching contacts.</p>'}</div>
      </div>
      <div class="card"><h3>${selected?escR(selected.name||'Contact')+' · Deals & refunds':'Select a contact'}</h3>
        ${selected?`<p class="hint">${escR(selected.phone||'')} · ${escR(selected.category||'')}</p>
        <div class="formrow"><label for="refundProductFilter">Product</label><select id="refundProductFilter"><option value="all">All products</option>${products.map(p=>`<option value="${escR(p.id)}" ${productFilter===String(p.id)?'selected':''}>${escR(p.name)}</option>`).join('')}</select></div>
        <div class="formrow"><label for="refundStatusFilter">Status</label><select id="refundStatusFilter"><option value="all" ${statusFilter==='all'?'selected':''}>All records</option><option value="ordered" ${statusFilter==='ordered'?'selected':''}>Ordered</option><option value="pending" ${statusFilter==='pending'?'selected':''}>Pending order</option><option value="refunded" ${statusFilter==='refunded'?'selected':''}>Refunded</option><option value="notrefunded" ${statusFilter==='notrefunded'?'selected':''}>Not refunded</option></select></div>
        <div class="refund-table-wrap"><table class="refund-table"><thead><tr><th>Product</th><th>Shared</th><th>Ordered</th><th>Amount refunded</th></tr></thead><tbody>${rows.map(s=>{const p=productFor(s);return `<tr><td><b>${escR(s.productName||p.name||'Unknown product')}</b><small>${moneyR(priceFor(s))} per share</small></td><td><span class="refund-pill yes">Yes</span></td><td><span class="refund-pill ${s.ordered?'yes':'no'}">${s.ordered?'Yes':'Pending'}</span></td><td><label class="refund-check"><input type="checkbox" data-refund-share="${escR(s.id)}" ${s.refunded?'checked':''} ${!s.ordered?'disabled':''}><span>${s.refunded?moneyR(refundValue(s)):'Mark refunded'}</span></label></td></tr>`}).join('')||'<tr><td colspan="4">No product share records match these filters.</td></tr>'}</tbody></table></div>`:'<p class="hint">Choose a contact above to view their product share and refund records.</p>'}
      </div>`;
    const search=root.querySelector('#refundContactSearch'); if(search)search.addEventListener('input',e=>{searchText=e.target.value;const pos=e.target.selectionStart;renderRefunds();const next=root.querySelector('#refundContactSearch');next.focus();next.setSelectionRange(pos,pos);});
    root.querySelectorAll('[data-refund-contact]').forEach(b=>b.addEventListener('click',()=>{chosenContact=String(b.dataset.refundContact);productFilter='all';statusFilter='all';renderRefunds();}));
    const pf=root.querySelector('#refundProductFilter');if(pf)pf.addEventListener('change',e=>{productFilter=e.target.value;renderRefunds();});
    const sf=root.querySelector('#refundStatusFilter');if(sf)sf.addEventListener('change',e=>{statusFilter=e.target.value;renderRefunds();});
    root.querySelectorAll('[data-refund-share]').forEach(input=>input.addEventListener('change',()=>{const share=state.shares.find(s=>String(s.id)===String(input.dataset.refundShare));if(share)saveRefund(share,input.checked);}));
    const bulk=root.querySelector('#refundBulkApply');if(bulk)bulk.addEventListener('click',()=>{const pid=root.querySelector('#refundBulkProduct').value;if(!pid){alert('Please select a product first.');return;}const eligibleShares=state.shares.filter(s=>String(s.productId)===String(pid)&&s.ordered&&!s.refunded);if(!eligibleShares.length){alert('No unrefunded ordered records found for this product.');return;}if(!confirm(`Mark ${eligibleShares.length} ordered recipient record(s) as refunded? Each record will use its saved unit price, or current product price if no snapshot exists.`))return;eligibleShares.forEach(s=>{s.refunded=true;s.refundedAt=new Date().toISOString();s.refundAmount=priceFor(s);});save();renderRefunds();});
  }
  window.renderRefunds=renderRefunds;
  function addRefundKpi(){const host=document.getElementById('advancedDashboard');if(!host)return;const grid=host.querySelector('.dashboard-overview-grid');if(!grid)return;let k=grid.querySelector('[data-refund-kpi]');if(!k){k=document.createElement('div');k.className='dash-kpi';k.dataset.refundKpi='1';grid.appendChild(k);}const total=state.shares.reduce((n,s)=>n+(s.refunded?Math.max(0,Number(s.refundAmount ?? priceFor(s))||0):0),0);k.innerHTML=`<div class="dash-kpi-label">AMOUNT REFUNDED</div><div class="dash-kpi-value">${moneyR(total)}</div><div class="dash-kpi-note">${state.shares.filter(s=>s.refunded).length} refunded record(s) · <button type="button" data-open-refunds>Manage refunds →</button></div>`;k.querySelector('[data-open-refunds]').onclick=()=>typeof showPage==='function'&&showPage('refunds');}
  const mo=new MutationObserver(()=>addRefundKpi());document.addEventListener('DOMContentLoaded',()=>{const h=document.getElementById('advancedDashboard');if(h)mo.observe(h,{childList:true});addRefundKpi();});
  window.addEventListener('storage',e=>{if(e.key==='dealDhamakaAgentV2'){renderRefunds();addRefundKpi();}});
})();
