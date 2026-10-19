/* Deal Dhamaka Agent V2 — additive CRM enhancements.
   Keeps the existing storage key and business workflows; no network dependencies. */
(() => {
  "use strict";
  const KEY = "dealDhamakaAgentV2";
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money = v => new Intl.NumberFormat("en-IN", {style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(v)||0);
  const dateValue = s => { const n=Number(s?.time); if(Number.isFinite(n)&&n>0)return n; const d=Date.parse(s?.time||s?.sharedAt||""); return Number.isFinite(d)?d:0; };
  const dateText = v => v ? new Date(v).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "Date unavailable";
  const records = () => (typeof state !== "undefined" && Array.isArray(state.shares)) ? state.shares : [];
  const contacts = () => (typeof state !== "undefined" && Array.isArray(state.contacts)) ? state.contacts : [];
  const products = () => (typeof state !== "undefined" && Array.isArray(state.products)) ? state.products : [];
  const productFor = s => products().find(p => String(p.id)===String(s.productId)) || products().find(p => String(p.name||p.brand||"").trim().toLowerCase()===String(s.productName||s.brand||"").trim().toLowerCase());
  const contactFor = s => contacts().find(c => String(c.id)===String(s.contactId)) || contacts().find(c => String(c.phone||"").replace(/\D/g,"")===String(s.phone||"").replace(/\D/g,""));
  const productLabel = s => { const p=productFor(s); return p?.name || s.productName || p?.brand || s.brand || "Product"; };
  const phone = s => String(s.phone||s.whatsapp||contactFor(s)?.phone||"").replace(/\D/g,"");
  const css = document.createElement("style");
  css.textContent = `
  .enh-card{background:linear-gradient(145deg,#121d30,#0e1727);border:1px solid #2c3d56;border-radius:17px;padding:14px;margin:12px 0;color:#edf4ff;box-shadow:0 8px 22px #0002;min-width:0}
  .enh-card h3{margin:0 0 5px;color:#f8fafc;font-size:15px}.enh-sub{color:#aab8ce;font-size:11px;line-height:1.5;margin:0 0 12px}
  .enh-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.enh-kpi{border:1px solid #31445f;border-radius:12px;padding:10px;background:#17243a;min-width:0}.enh-kpi span{display:block;color:#b8c7dc;font-size:10px;font-weight:800}.enh-kpi b{display:block;color:#fff;font-size:20px;margin-top:5px;overflow-wrap:anywhere}
  .enh-row{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #26374f;min-width:0}.enh-row:last-child{border-bottom:0}.enh-row-main{min-width:0;flex:1}.enh-row strong{display:block;color:#f3f7ff;font-size:12px;overflow-wrap:anywhere}.enh-row small{display:block;color:#aab8ce;font-size:10px;line-height:1.45;margin-top:3px}.enh-pill{display:inline-flex;padding:5px 8px;border-radius:20px;background:#203653;color:#cfe3ff;font-size:10px;font-weight:800;white-space:nowrap}.enh-pill.good{background:#123d32;color:#75efc2}.enh-pill.warn{background:#443516;color:#ffdc78}.enh-btn{border:1px solid #3c5578;background:#1e3554;color:#f4f8ff;border-radius:10px;padding:9px 11px;font-weight:800;font-size:11px}.enh-btn.primary{background:#315fba;border-color:#4b7bd6;color:#fff}.enh-btn.danger{background:#442331;border-color:#81445a;color:#ffd4df}.enh-bars{display:grid;gap:10px}.enh-bar-label{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#e5edfb}.enh-track{height:7px;background:#293950;border-radius:10px;overflow:hidden;margin-top:5px}.enh-fill{height:100%;border-radius:10px;background:linear-gradient(90deg,#60a5fa,#818cf8)}.enh-empty{padding:12px;border:1px dashed #40516a;border-radius:12px;color:#aab8ce;font-size:11px;line-height:1.5}.enh-controls{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}.enh-card input,.enh-card select,.enh-card textarea{box-sizing:border-box;width:100%;background:#0c1627;color:#f3f7ff;border:1px solid #405572;border-radius:10px;padding:10px;font:inherit;font-size:12px}.enh-card label{display:block;color:#c8d5e8;font-size:11px;font-weight:800;margin:8px 0 5px}.enh-table-wrap{overflow-x:auto}.enh-table{border-collapse:collapse;width:100%;min-width:560px;font-size:11px}.enh-table th,.enh-table td{text-align:left;padding:9px 8px;border-bottom:1px solid #2a3a52}.enh-table th{color:#c6d7ef;background:#19263b}.enh-table td{color:#e3ecfa}.enh-template-item{padding:9px;border:1px solid #31445f;border-radius:11px;margin:7px 0;background:#162238}.enh-template-item strong{color:#f8fafc}.enh-template-item small{display:block;color:#aab8ce;margin:4px 0 8px;white-space:pre-wrap;overflow-wrap:anywhere}
  .contact-product-stats .contact-pending-count{background:#3d3018;color:#ffdc78;border:1px solid #695326}
  @media(min-width:650px){.enh-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.enh-controls{grid-template-columns:repeat(3,minmax(0,1fr))}}
  `;
  document.head.appendChild(css);

  function ensureActivityAndTemplates(){
    if(typeof state!=="undefined") { if(!Array.isArray(state.activity))state.activity=[]; if(!Array.isArray(state.templates))state.templates=[]; }
  }
  let activitySnapshot = new Map();
  function appendEvent(type, s, detail){
    ensureActivityAndTemplates(); if(typeof state==="undefined")return;
    state.activity.push({id:`evt-${Date.now()}-${Math.random().toString(16).slice(2,7)}`,type,shareId:String(s.id||""),contactId:s.contactId||"",contactName:s.contactName||contactFor(s)?.name||"Unknown recipient",phone:s.phone||contactFor(s)?.phone||"",productId:s.productId||"",productName:s.productName||productLabel(s),at:Date.now(),detail});
    if(state.activity.length>500)state.activity=state.activity.slice(-500);
  }
  function installActivityCapture(){
    if(typeof save!=="function"||save.__enhActivityWrapped)return;
    activitySnapshot=new Map(records().map(s=>[String(s.id),{ordered:!!s.ordered,refunded:!!s.refunded,orderedAt:s.orderedAt||"",refundAmount:s.refundAmount}]));
    const original=save;
    const wrapped=function(...args){
      ensureActivityAndTemplates();
      const current=records(), now=new Map(current.map(s=>[String(s.id),s]));
      current.forEach(s=>{const id=String(s.id),old=activitySnapshot.get(id);if(!old){appendEvent("shared",s,"Share record created");return;}if(old.ordered!==!!s.ordered){appendEvent("order-status",s,s.ordered?"Marked ordered":"Order status changed to pending");}if(old.refunded!==!!s.refunded||old.refundAmount!==s.refundAmount){appendEvent("refund",s,s.refunded?`Refund recorded${s.refundAmount!=null?": "+money(s.refundAmount):""}`:"Refund status updated");}});
      activitySnapshot=new Map(current.map(s=>[String(s.id),{ordered:!!s.ordered,refunded:!!s.refunded,orderedAt:s.orderedAt||"",refundAmount:s.refundAmount}]));
      const result=original.apply(this,args); renderAll(); return result;
    };
    wrapped.__enhActivityWrapped=true; save=wrapped;
  }

  function ensurePanel(parent, id, title, subtitle){
    let el=$(id); if(!el){el=document.createElement("section");el.id=id;el.className="enh-card";el.innerHTML=`<h3>${title}</h3><p class="enh-sub">${subtitle||""}</p><div class="enh-body"></div>`;parent.appendChild(el);} return el;
  }
  function renderScoreboard(){
    const host=$("advancedDashboard"); if(!host)return;
    let panel=$("enhScoreboard"); if(!panel){panel=ensurePanel(host,"enhScoreboard","🏆 Deal Performance Scoreboard","Ranked from saved share records. Order status reflects what you marked in the app."); const shell=host.querySelector(".dashboard-shell"); if(shell&&panel.parentElement===host)host.insertBefore(panel,shell.nextSibling);}
    const rows=records().map(s=>({...s,_product:productFor(s),_name:productLabel(s),_brand:productFor(s)?.brand||s.brand||"Unbranded"}));
    const rank=(key)=>{const map=new Map();rows.forEach(s=>{const k=key(s)||"Unspecified";const v=map.get(k)||{name:k,shared:0,ordered:0};v.shared++;if(s.ordered)v.ordered++;map.set(k,v);});return [...map.values()].map(x=>({...x,rate:x.shared?Math.round(x.ordered/x.shared*100):0})).sort((a,b)=>b.ordered-a.ordered||b.rate-a.rate||b.shared-a.shared).slice(0,5);};
    const brands=rank(s=>s._brand), prods=rank(s=>s._name);
    const bars=list=>list.length?`<div class="enh-bars">${list.map((x,i)=>`<div><div class="enh-bar-label"><span>${i+1}. ${esc(x.name)}</span><span>${x.ordered}/${x.shared} · ${x.rate}%</span></div><div class="enh-track"><div class="enh-fill" style="width:${x.rate}%"></div></div></div>`).join("")}</div>`:`<div class="enh-empty">No share records to rank yet.</div>`;
    panel.querySelector(".enh-body").innerHTML=`<div class="enh-grid"><div class="enh-kpi"><span>SHARE RECORDS</span><b>${rows.length}</b></div><div class="enh-kpi"><span>MARKED ORDERED</span><b>${rows.filter(x=>x.ordered).length}</b></div><div class="enh-kpi"><span>PENDING STATUS</span><b>${rows.filter(x=>!x.ordered).length}</b></div><div class="enh-kpi"><span>RECORDED ORDER RATE</span><b>${rows.length?Math.round(rows.filter(x=>x.ordered).length/rows.length*100):0}%</b></div></div><div class="enh-controls"><div><h3>Top brands</h3>${bars(brands)}</div><div><h3>Top products</h3>${bars(prods)}</div></div>`;
  }

  function renderInventory(){
    const page=$("products"), list=$("productsList"); if(!page||!list)return;
    const panel=ensurePanel(page,"enhInventory","📦 Inventory Intelligence","Allotted quantity compared with saved share records. Remaining = allotted − shared, minimum zero.");
    const stats=products().map(p=>{const rows=records().filter(s=>String(s.productId)===String(p.id)||(!s.productId&&String(s.productName||s.brand||"").toLowerCase()===String(p.name||p.brand||"").toLowerCase()));const shared=rows.length,ordered=rows.filter(s=>s.ordered).length,allotted=Math.max(0,Number(p.allottedQty)||0);return {p,shared,ordered,pending:shared-ordered,allotted,remaining:Math.max(0,allotted-shared),shortage:Math.max(0,shared-allotted)};});
    panel.querySelector(".enh-body").innerHTML=stats.length?`<div class="enh-table-wrap"><table class="enh-table"><thead><tr><th>Product</th><th>Allotted</th><th>Shared</th><th>Ordered</th><th>Pending</th><th>Remaining</th></tr></thead><tbody>${stats.map(x=>`<tr><td><strong>${esc(x.p.name||x.p.brand||"Product")}</strong><small>${esc(x.p.brand||"")} · ${esc(x.p.dealStatus||"active")}</small>${x.shortage?`<small style="color:#fda4af">Over-allocation: ${x.shortage}</small>`:""}</td><td>${x.allotted} ${esc(x.p.quantityUnit||"units")}</td><td>${x.shared}</td><td>${x.ordered}</td><td>${x.pending}</td><td><span class="enh-pill ${x.remaining?"good":"warn"}">${x.remaining}</span></td></tr>`).join("")}</tbody></table></div>`:`<div class="enh-empty">Add products to see inventory intelligence.</div>`;
    if(panel.previousElementSibling!==list && list.parentElement===page) page.insertBefore(panel,list);
  }

  function pendingRows(){
    const seen=new Set(); return records().filter(s=>!s.ordered&&phone(s)).map(s=>({...s,_product:productFor(s),_contact:contactFor(s)})).filter(s=>s._product).sort((a,b)=>dateValue(a)-dateValue(b)).filter(s=>{const key=phone(s)+"|"+String(s.productId||s.productName);if(seen.has(key))return false;seen.add(key);return true;});
  }
  function renderFollowupCentre(){
    const page=$("tracking"), anchor=page?.querySelector(".stats.four");if(!page||!anchor)return;
    const panel=ensurePanel(page,"enhFollowupCentre","⏰ Follow-up Command Centre","Oldest pending share records first. Select a product to load the existing WhatsApp follow-up workflow.");
    if(panel.previousElementSibling!==anchor)anchor.insertAdjacentElement("afterend",panel);
    const rows=pendingRows(); panel.querySelector(".enh-body").innerHTML=rows.length?`<div class="enh-grid"><div class="enh-kpi"><span>PENDING RECIPIENT-PRODUCTS</span><b>${rows.length}</b></div><div class="enh-kpi"><span>OLDEST SHARE</span><b style="font-size:13px">${esc(dateText(dateValue(rows[0])))}</b></div></div><div>${rows.slice(0,12).map(s=>`<div class="enh-row"><div class="enh-row-main"><strong>${esc(s.contactName||s._contact?.name||"Recipient")} · ${esc(s._product.name||s.productName||"Product")}</strong><small>${esc(s._product.brand||s.brand||"")} · Shared ${esc(dateText(dateValue(s)))} · ${esc(phone(s))}</small></div><button class="enh-btn" type="button" data-enh-follow-product="${esc(s._product.id)}">Follow up</button></div>`).join("")}</div>${rows.length>12?`<p class="enh-sub">Showing 12 oldest items of ${rows.length}. Use Tracking filters for the complete list.</p>`:""}`:`<div class="enh-empty">No pending records with a valid recipient and current product were found.</div>`;
    panel.querySelectorAll("[data-enh-follow-product]").forEach(btn=>btn.onclick=()=>{const p=$("bulkFollowupProduct"),m=$("bulkFollowupMode"),card=$("bulkFollowupCard");if(!p||!m||!card){alert("Open Tracking and wait for the WhatsApp follow-up panel to load, then try again.");return;}p.value=btn.dataset.enhFollowProduct;m.value="pending";p.dispatchEvent(new Event("change",{bubbles:true}));m.dispatchEvent(new Event("change",{bubbles:true}));card.scrollIntoView({behavior:"smooth",block:"start"});});
  }

  function renderActivity(){
    const page=$("history"), list=$("historyList");if(!page||!list)return;
    const panel=ensurePanel(page,"enhActivityTimeline","🧾 Activity Timeline","New share, order-status and refund changes are recorded here. Earlier history is reconstructed from saved records where possible.");
    if(panel.previousElementSibling!==list)list.insertAdjacentElement("afterend",panel);
    const events=(Array.isArray(state.activity)?state.activity:[]).map(e=>({...e,_at:Number(e.at)||Date.parse(e.at)||0}));
    const ids=new Set(events.map(e=>String(e.shareId)+"|"+e.type));
    records().forEach(s=>{const sid=String(s.id||"");if(!ids.has(sid+"|shared"))events.push({id:"derived-share-"+sid,type:"shared",shareId:sid,contactName:s.contactName,productName:s.productName||productLabel(s),at:dateValue(s),detail:"Share record saved",_at:dateValue(s),derived:true});if(s.ordered&&!ids.has(sid+"|order-status"))events.push({id:"derived-order-"+sid,type:"order-status",shareId:sid,contactName:s.contactName,productName:s.productName||productLabel(s),at:s.orderedAt||dateValue(s),detail:"Currently marked ordered",_at:Date.parse(s.orderedAt)||dateValue(s),derived:true});if(s.refunded&&!ids.has(sid+"|refund"))events.push({id:"derived-refund-"+sid,type:"refund",shareId:sid,contactName:s.contactName,productName:s.productName||productLabel(s),at:s.refundedAt||dateValue(s),detail:"Currently marked refunded",_at:Date.parse(s.refundedAt)||dateValue(s),derived:true});});
    events.sort((a,b)=>(b._at||0)-(a._at||0));
    panel.querySelector(".enh-body").innerHTML=events.length?events.slice(0,50).map(e=>`<div class="enh-row"><div class="enh-row-main"><strong>${esc(e.contactName||"Recipient")} · ${esc(e.productName||"Product")}</strong><small>${esc(dateText(e._at))} · ${esc(e.detail||e.type)}</small></div><span class="enh-pill ${e.type==="order-status"?"good":e.type==="refund"?"warn":""}">${e.type==="order-status"?"ORDER":e.type==="refund"?"REFUND":"SHARE"}</span></div>`).join(""):`<div class="enh-empty">Activity will appear here as records are shared or updated.</div>`;
  }

  function renderSafety(){
    const page=$("settings"), base=page?.querySelector(".card");if(!page||!base)return;
    const panel=ensurePanel(page,"enhSafety","🛡️ Data Safety Centre","Validate backups and inspect duplicate contacts/share records before making changes.");
    if(panel.previousElementSibling!==base)base.insertAdjacentElement("afterend",panel);
    const dupContacts=()=>{const seen=new Map(),out=[];contacts().forEach(c=>{const k=String(c.phone||"").replace(/\D/g,"");if(k&&seen.has(k))out.push(`${seen.get(k).name||"Contact"} / ${c.name||"Contact"} · ${k}`);else if(k)seen.set(k,c);});return out;};
    const dupShares=()=>{const seen=new Map(),out=[];records().forEach(s=>{const k=String(s.contactId||s.phone||s.contactName||"").replace(/\D/g,"") + "|" + String(s.productId||s.productName||"").toLowerCase();if(k!=="|"&&seen.has(k))out.push(`${s.contactName||s.phone||"Recipient"} · ${s.productName||s.brand||"Product"}`);else seen.set(k,s);});return out;};
    const dc=dupContacts(),ds=dupShares();
    panel.querySelector(".enh-body").innerHTML=`<div class="enh-grid"><div class="enh-kpi"><span>CONTACTS</span><b>${contacts().length}</b></div><div class="enh-kpi"><span>PRODUCTS</span><b>${products().length}</b></div><div class="enh-kpi"><span>SHARE RECORDS</span><b>${records().length}</b></div><div class="enh-kpi"><span>BACKUP CONTENT</span><b>${(state.activity||[]).length+(state.templates||[]).length} extra</b></div></div><p class="enh-sub" style="margin-top:10px">Potential duplicate contacts: <strong>${dc.length}</strong> · Potential duplicate share pairs: <strong>${ds.length}</strong>. Review before deleting; repeated shares may be intentional.</p><div class="enh-controls"><button class="enh-btn" id="enhValidateBackup">Validate selected JSON backup</button><button class="enh-btn" id="enhExportActivity">Export activity CSV</button></div><div id="enhSafetyResult" class="enh-empty">No records are changed by these checks.</div>`;
    $("enhValidateBackup").onclick=()=>$("importData")?.click();
    $("enhExportActivity").onclick=()=>{const csv=[['Date','Type','Recipient','Phone','Product','Detail'],...(state.activity||[]).map(e=>[dateText(Number(e.at)||Date.parse(e.at)),e.type,e.contactName,e.phone,e.productName,e.detail])].map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(',')).join('\r\n');downloadFile("deal-dhamaka-activity.csv",csv,"text/csv;charset=utf-8");};
  }
  function downloadFile(name,content,type){const a=document.createElement("a"),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

  function renderTemplates(){
    const page=$("settings"), safety=$("enhSafety");if(!page||!safety)return;
    const panel=ensurePanel(page,"enhTemplates","💬 WhatsApp Template Manager","Save reusable messages using [name] and [product]. Applying a template fills the existing message editor; sending remains manual in WhatsApp.");
    if(panel.previousElementSibling!==safety) safety.insertAdjacentElement("afterend",panel);
    const templates=Array.isArray(state.templates)?state.templates:[];
    panel.querySelector(".enh-body").innerHTML=`<label for="enhTemplateSelect">Saved templates</label><select id="enhTemplateSelect"><option value="">Choose a saved template</option>${templates.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("")}</select><label for="enhTemplateName">Template name</label><input id="enhTemplateName" maxlength="60" placeholder="e.g. Pending order reminder"><label for="enhTemplateText">Message text</label><textarea id="enhTemplateText" rows="4" placeholder="Hi [name]! Your [product]..."></textarea><div class="enh-controls"><button class="enh-btn primary" id="enhSaveTemplate">Save template</button><button class="enh-btn" id="enhApplyTemplate">Apply to follow-ups</button><button class="enh-btn" id="enhApplySendTemplate">Apply to Send message</button><button class="enh-btn danger" id="enhDeleteTemplate">Delete selected</button></div><div class="enh-empty" id="enhTemplatePreview">Preview: Hi recipient — placeholders will be replaced by the existing follow-up workflow.</div>`;
    const sel=$("enhTemplateSelect"),name=$("enhTemplateName"),text=$("enhTemplateText"),preview=$("enhTemplatePreview");
    const updatePreview=()=>{preview.textContent="Preview: "+(text.value||"").replace(/\[name\]/gi,"Alex").replace(/\[product\]/gi,"Example product");};
    sel.onchange=()=>{const t=templates.find(x=>String(x.id)===sel.value);if(t){name.value=t.name||"";text.value=t.text||"";updatePreview();}};text.oninput=updatePreview;
    $("enhSaveTemplate").onclick=()=>{const n=name.value.trim(),v=text.value.trim();if(!n||!v){alert("Enter a template name and message.");return;}const old=templates.find(t=>String(t.id)===sel.value);if(old){old.name=n;old.text=v;}else{const id="tpl-"+Date.now();state.templates.push({id,name:n,text:v,updatedAt:new Date().toISOString()});sel.value=id;}save();renderTemplates();};
    $("enhApplyTemplate").onclick=()=>{if(!text.value.trim()){alert("Choose or enter a template first.");return;}const target=$("bulkFollowupMessage");if(!target){alert("Open Tracking first so the follow-up editor can load.");return;}target.value=text.value;target.dataset.edited="true";target.dispatchEvent(new Event("input",{bubbles:true}));alert("Template applied to the existing follow-up editor.");};
    $("enhApplySendTemplate").onclick=()=>{if(!text.value.trim()){alert("Choose or enter a template first.");return;}const target=$("message");if(target){target.value=text.value;target.dispatchEvent(new Event("input",{bubbles:true}));if(typeof showPage==="function")showPage("send");}};
    $("enhDeleteTemplate").onclick=()=>{if(!sel.value)return;const t=templates.find(x=>String(x.id)===sel.value);if(!t||!confirm(`Delete template “${t.name}”?`))return;state.templates=templates.filter(x=>String(x.id)!==sel.value);save();renderTemplates();};
  }

  function renderReports(){
    const page=$("tracking"), details=$("trackingDetails");if(!page||!details)return;
    const panel=ensurePanel(page,"enhReports","📈 Reports & Export","Export share, order and refund records to CSV. Reports include daily and monthly summaries based on saved record dates.");
    const exportBtn=$("exportTrackingCsv");if(exportBtn&&panel.previousElementSibling!==exportBtn.parentElement)details.parentElement.insertBefore(panel,exportBtn);
    const rows=records().map(s=>({...s,_at:dateValue(s)}));const now=new Date();const today=rows.filter(s=>s._at&&new Date(s._at).toDateString()===now.toDateString());const month=rows.filter(s=>s._at&&new Date(s._at).getFullYear()===now.getFullYear()&&new Date(s._at).getMonth()===now.getMonth());
    const csvFor=items=>[['Date','Recipient','Phone','Product','Brand','Product type','Status','Ordered','Refunded','Refund amount'],...items.map(s=>[s._at?new Date(s._at).toISOString():"",s.contactName,s.phone,s.productName,s.brand,s.productType,s.status,s.ordered?"Yes":"No",s.refunded?"Yes":"No",s.refundAmount??""])].map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(',')).join('\r\n');
    panel.querySelector(".enh-body").innerHTML=`<div class="enh-grid"><div class="enh-kpi"><span>TODAY</span><b>${today.length}</b><small>Share records</small></div><div class="enh-kpi"><span>THIS MONTH</span><b>${month.length}</b><small>Share records</small></div><div class="enh-kpi"><span>MONTH ORDER RATE</span><b>${month.length?Math.round(month.filter(s=>s.ordered).length/month.length*100):0}%</b><small>Marked ordered</small></div><div class="enh-kpi"><span>REFUNDED</span><b>${rows.filter(s=>s.refunded).length}</b><small>Marked refunded</small></div></div><div class="enh-controls"><button class="enh-btn primary" id="enhExportFiltered">Export current filtered CSV</button><button class="enh-btn" id="enhExportAll">Export all records CSV</button><button class="enh-btn" id="enhExportToday">Export today</button><button class="enh-btn" id="enhExportMonth">Export this month</button></div><p class="enh-sub">Current filtered export uses the visible tracking detail rows when available; all-record exports include historical records. “Ordered” and “Refunded” are app-recorded statuses.</p>`;
    const filtered=()=>{const checked=id=>[...($(id)?.querySelectorAll('input[type="checkbox"]:checked')||[])].map(x=>x.value);const brands=checked("filterBrand"),types=checked("filterType"),recips=checked("filterRecipient"),status=$("filterOrderStatus")?.value||"all",from=$("filterFrom")?.value,to=$("filterTo")?.value;return rows.filter(s=>{const d=s._at?new Date(s._at).toISOString().slice(0,10):"";return (!brands.length||brands.includes(s.brand||""))&&(!types.length||types.includes(s.productType||""))&&(!recips.length||recips.includes(s.contactName||""))&&(status==="all"||(status==="ordered"&&s.ordered)||(status==="pending"&&!s.ordered))&&(!from||d>=from)&&(!to||d<=to);});};
    $("enhExportFiltered").onclick=()=>downloadFile("deal-dhamaka-filtered-report.csv",csvFor(filtered()),"text/csv;charset=utf-8");$("enhExportAll").onclick=()=>downloadFile("deal-dhamaka-all-records.csv",csvFor(rows),"text/csv;charset=utf-8");$("enhExportToday").onclick=()=>downloadFile("deal-dhamaka-daily-summary.csv",csvFor(today),"text/csv;charset=utf-8");$("enhExportMonth").onclick=()=>downloadFile("deal-dhamaka-monthly-summary.csv",csvFor(month),"text/csv;charset=utf-8");
  }
  function renderAll(){
    ensureActivityAndTemplates();
    renderScoreboard();renderInventory();renderFollowupCentre();renderActivity();renderSafety();renderTemplates();renderReports();
  }
  function installBackupValidation(){
    const input=$("importData"); if(!input||input.__enhValidationWrapped)return;
    const original=input.onchange;
    input.onchange=async function(e){
      const file=e.target.files&&e.target.files[0]; if(!file){if(original) return original.call(this,e);return;}
      try{
        const parsed=JSON.parse(await file.text());
        if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("Backup root must be a JSON object.");
        const keys=["contacts","products","shares","activity","templates"];
        const present=keys.filter(k=>Object.prototype.hasOwnProperty.call(parsed,k));
        if(!present.length)throw new Error("No recognised Deal Dhamaka data arrays were found.");
        for(const k of present){if(!Array.isArray(parsed[k]))throw new Error(`The ${k} field must be an array.`);if(parsed[k].some(row=>!row||typeof row!=="object"||Array.isArray(row)))throw new Error(`The ${k} array contains an invalid record.`);}
        const duplicates=keys.reduce((sum,k)=>sum+(Array.isArray(parsed[k])?parsed[k].length-new Set(parsed[k].map(x=>String(x.id||"")).filter(Boolean)).size:0),0);
        const summary=present.map(k=>`${k}: ${parsed[k].length}`).join(" · ");
        alert(`Backup structure validated. ${summary}${duplicates?`\nWarning: ${duplicates} duplicate ID(s) inside the file; matching IDs will be merged/replaced.`:"\nNo duplicate record IDs detected in the supplied arrays."}`);
        if(typeof original==="function")return await original.call(this,e);
      }catch(err){alert(`Backup validation failed: ${err.message||"Invalid JSON"}. Existing data was not changed.`);e.target.value="";}
    };
    input.__enhValidationWrapped=true;
  }
  function syncExternalData(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY)||"{}");
      const incoming=Array.isArray(raw.shares)?raw.shares:[];
      const oldMap=new Map(records().map(s=>[String(s.id),s]));
      incoming.forEach(s=>{const old=oldMap.get(String(s.id));if(old&&!!old.ordered!==!!s.ordered)appendEvent("order-status",s,s.ordered?"Marked ordered":"Order status changed to pending");if(old&&(!!old.refunded!==!!s.refunded||old.refundAmount!==s.refundAmount))appendEvent("refund",s,s.refunded?`Refund recorded${s.refundAmount!=null?": "+money(s.refundAmount):""}`:"Refund status updated");});
      if(typeof state!=="undefined"){state.contacts=Array.isArray(raw.contacts)?raw.contacts:[];state.products=Array.isArray(raw.products)?raw.products:[];state.shares=incoming;state.activity=Array.isArray(raw.activity)?raw.activity.concat(state.activity||[]).filter((x,i,a)=>a.findIndex(y=>String(y.id)===String(x.id))===i):state.activity||[];state.templates=Array.isArray(raw.templates)?raw.templates:state.templates||[];}
      activitySnapshot=new Map(incoming.map(s=>[String(s.id),{ordered:!!s.ordered,refunded:!!s.refunded,orderedAt:s.orderedAt||"",refundAmount:s.refundAmount}]));
      localStorage.setItem(KEY,JSON.stringify(state));renderAll();
    }catch(_){}
  }
  function init(){ensureActivityAndTemplates();installActivityCapture();installBackupValidation();renderAll();
    window.addEventListener("deal-dhamaka-data-updated",syncExternalData);
    const dashboard=$("advancedDashboard");if(dashboard){const mo=new MutationObserver(()=>{if(!$("enhScoreboard"))renderScoreboard();});mo.observe(dashboard,{childList:true});}
    document.querySelectorAll('.tabbar button[data-page]').forEach(b=>b.addEventListener('click',()=>setTimeout(renderAll,30)));
    window.addEventListener("storage",e=>{if(e.key===KEY){try{const x=JSON.parse(localStorage.getItem(KEY)||"{}");if(typeof state!=="undefined"){state.contacts=x.contacts||[];state.products=x.products||[];state.shares=x.shares||[];state.activity=x.activity||[];state.templates=x.templates||[];}renderAll();}catch(_){}}});
    // Rebuild dependent panels when built-in page renderers finish.
    if(typeof renderTracking==="function"&&!renderTracking.__enhWrapped){const orig=renderTracking;const wrapped=function(...a){const r=orig.apply(this,a);setTimeout(renderAll,0);return r;};wrapped.__enhWrapped=true;renderTracking=wrapped;}
    if(typeof renderContacts==="function"&&!renderContacts.__enhWrapped){const orig=renderContacts;const wrapped=function(...a){const r=orig.apply(this,a);setTimeout(renderContactPending,0);return r;};wrapped.__enhWrapped=true;renderContacts=wrapped;}
    renderContactPending();
  }
  function renderContactPending(){
    document.querySelectorAll(".contact-list-item").forEach(item=>{const stats=item.querySelector(".contact-product-stats");if(!stats||stats.querySelector(".contact-pending-count"))return;const title=item.querySelector("h3")?.textContent||"";const contact=contacts().find(c=>String(c.name||"")===title);if(!contact)return;const rows=records().filter(s=>String(s.contactId||"")===String(contact.id)||(!s.contactId&&phone(s)===String(contact.phone||"").replace(/\D/g,"")));const pending=rows.filter(s=>!s.ordered).length;const span=document.createElement("span");span.className="contact-pending-count";span.innerHTML=`<strong>${pending}</strong><small>Pending</small>`;stats.appendChild(span);});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
