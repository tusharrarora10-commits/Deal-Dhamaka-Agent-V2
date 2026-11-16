/* Deal Dhamaka payment import and UPI queue. Payments are stored in the app's
   existing activity array so the existing backup/cloud bridge can carry them. */
(() => {
"use strict";
const DATA_KEY="dealDhamakaAgentV2", $=id=>document.getElementById(id);
const norm=v=>String(v??"").trim().toLowerCase().replace(/\s+/g," ");
const money=v=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(v)||0);
// Campaign support charge is applied once per imported payment row (one brand line).
function campaignCharge(amount){const n=Number(amount)||0;return n>=1&&n<=500?5:n>500&&n<=1000?10:n>1000?20:0;}
// Pending rows require explicit opt-in; legacy paid rows retain their historical charge unless a saved amount exists.
function rowCharge(x){if(x.status==="Paid"&&Number.isFinite(Number(x.appliedCharge)))return Number(x.appliedCharge);const enabled=x.chargeEnabled===undefined?x.status==="Paid":x.chargeEnabled===true;return enabled?campaignCharge(x.amount):0;}
function paymentBreakdown(items){const gross=items.reduce((a,x)=>a+Number(x.amount||0),0),charges=items.reduce((a,x)=>a+rowCharge(x),0);return {gross,brandCount:items.length,charges,net:gross-charges};}

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let selected=new Set();
function data(){try{return JSON.parse(localStorage.getItem(DATA_KEY)||"{}")}catch(_){return {}}}
function rows(){return (data().activity||[]).filter(a=>a?.type==="dd_payment"&&a.payment).map(a=>a.payment)}
function contacts(){return data().contacts||[]}
function persist(list){
 const d=data(), other=(d.activity||[]).filter(a=>a?.type!=="dd_payment");
 d.activity=other.concat(list.map(x=>({id:"payment-"+x.id,type:"dd_payment",payment:x,time:Date.now()})));
 localStorage.setItem(DATA_KEY,JSON.stringify(d));
 window.dispatchEvent(new Event("deal-dhamaka-data-updated"));
}
function render(){
 const all=rows(), filter=$("paymentFilter")?.value||"all", query=norm($("paymentSearch")?.value), dateFilter=$("paymentDateFilter")?.value||"", contactFilter=$("paymentContactFilter")?.value||"";
 const pending=all.filter(x=>x.status!=="Paid"), paid=all.filter(x=>x.status==="Paid");
 const pb=paymentBreakdown(pending), paidB=paymentBreakdown(paid), allB=paymentBreakdown(all);
 const master=$("paymentChargeMaster");if(master){master.checked=pending.length>0&&pending.every(x=>x.chargeEnabled===true);master.indeterminate=pending.some(x=>x.chargeEnabled===true)&&!master.checked;}
 const brands=[...new Set(pending.map(x=>String(x.brandName||x.productName||"Unspecified brand").trim()))].sort((a,b)=>a.localeCompare(b));
 const brandBox=$("paymentBrandCharges");if(brandBox){brandBox.innerHTML=brands.length?brands.map(brand=>{const items=pending.filter(x=>String(x.brandName||x.productName||"Unspecified brand").trim()===brand),checked=items.every(x=>x.chargeEnabled===true),mixed=items.some(x=>x.chargeEnabled===true)&&!checked;return `<label class="payment-brand-choice"><input type="checkbox" data-charge-brand="${esc(brand)}" ${checked?'checked':''} data-mixed="${mixed}"><span><b>${esc(brand)}</b><small>${items.length} pending · potential charge ${money(items.reduce((sum,x)=>sum+campaignCharge(x.amount),0))}</small></span></label>`;}).join(""):'<p class="hint">Import payment rows to select charges brand-wise.</p>';brandBox.querySelectorAll('[data-charge-brand]').forEach(input=>{input.indeterminate=input.dataset.mixed==='true';input.onchange=()=>{const brand=input.dataset.chargeBrand;persist(rows().map(x=>x.status!=="Paid"&&String(x.brandName||x.productName||"Unspecified brand").trim()===brand?{...x,chargeEnabled:input.checked}:x));render();};});}
 $("paymentPendingTotal").textContent=money(pb.gross);
 $("paymentPendingCount").textContent=pending.length;
 $("paymentPaidTotal").textContent=money(paidB.net);
 if($("paymentCampaignCharges"))$("paymentCampaignCharges").textContent=money(allB.charges);
 if($("paymentNetPayable"))$("paymentNetPayable").textContent=money(pb.net);
 $("paymentUnmatchedCount").textContent=all.filter(x=>!x.contactId).length;
 const contactSelect=$("paymentContactFilter");if(contactSelect){const current=contactSelect.value;const options=[...new Map(all.filter(x=>x.contactId).map(x=>[String(x.contactId),x.contactName])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));contactSelect.innerHTML='<option value="">All contacts</option>'+options.map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join("");contactSelect.value=current;}
 const list=all.filter(x=>{
  const match=filter==="all"||(filter==="pending"&&x.status!=="Paid")||(filter==="paid"&&x.status==="Paid")||(filter==="unmatched"&&!x.contactId);
  const day=String(x.paidAt||x.importedAt||"").slice(0,10);
  return match&&(!query||norm([x.contactName,x.brandName,x.productName,x.remarks].join(" ")).includes(query))&&(!dateFilter||day===dateFilter)&&(!contactFilter||String(x.contactId)===contactFilter);
 });
 $("paymentQueue").innerHTML=list.length?list.map(x=>{
  const dt=new Date(x.paidAt||x.importedAt||Date.now()),date=dt.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
  return `<div class="item payment-row payment-row-compact">
   <div class="payment-row-main">
    <label class="payment-select"><input type="checkbox" data-pay-select="${esc(x.id)}" ${selected.has(x.id)?"checked":""}></label>
    <div class="payment-row-info"><b>${esc(x.contactName)}</b><span>${esc(x.brandName||x.productName||"Payment")} · ${money(x.amount)}</span><small>${date} · ${esc(x.status)} · Net ${money(Number(x.amount)-rowCharge(x))}</small></div>
    <button class="mini payment-detail-toggle" type="button" data-payment-details="${esc(x.id)}">Details</button>
   </div>
   <div class="payment-row-details" data-payment-detail-panel="${esc(x.id)}" hidden>
    <small>UPI: ${esc(x.upiId||"Missing — edit contact")}</small>
    <small>Product amount: ${money(x.amount)} · Campaign support Charges: ${money(rowCharge(x))}</small>
    ${x.paidAt?`<small>Paid: ${esc(new Date(x.paidAt).toLocaleString("en-IN"))}</small>`:""}
   </div>
   <div class="payment-actions">
    ${x.status!=="Paid"?`<button class="primary" type="button" data-pay-one="${esc(x.id)}" ${!x.upiId?"disabled":""}>Pay with CRED</button><button class="secondary" type="button" data-pay-other="${esc(x.id)}" ${!x.upiId?"disabled":""}>Other UPI</button><button class="secondary" type="button" data-mark-paid="${esc(x.id)}">Mark paid</button>`:`<small>Paid</small>`}
   </div>
  </div>`;
 }).join(""):'<p class="hint">No payment rows match this filter.</p>';
$("paymentQueue").querySelectorAll("[data-payment-details]").forEach(e=>e.onclick=()=>{const panel=$("paymentQueue").querySelector(`[data-payment-detail-panel="${CSS.escape(e.dataset.paymentDetails)}"]`);if(panel){panel.hidden=!panel.hidden;e.textContent=panel.hidden?"Details":"Hide";}});
$("paymentQueue").querySelectorAll("[data-pay-select]").forEach(e=>e.onchange=()=>{e.checked?selected.add(e.dataset.paySelect):selected.delete(e.dataset.paySelect);});
 $("paymentQueue").querySelectorAll("[data-pay-one]").forEach(e=>e.onclick=()=>pay([e.dataset.payOne]));
 $("paymentQueue").querySelectorAll("[data-pay-other]").forEach(e=>e.onclick=()=>pay([e.dataset.payOther],"other"));
 $("paymentQueue").querySelectorAll("[data-mark-paid]").forEach(e=>e.onclick=()=>markPaid([e.dataset.markPaid]));
 const groups=receiptGroups().filter(g=>{
  const day=String(g.paidAt||"").slice(0,10);
  const text=norm([g.contact?.name,...g.items.map(x=>x.brandName||x.productName||"")].join(" "));
  return (!dateFilter||day===dateFilter)&&(!contactFilter||String(g.contactId)===contactFilter)&&(!query||text.includes(query));
 });
 let receiptBox=$("paymentReceipts");
 if(!receiptBox){receiptBox=document.createElement("div");receiptBox.id="paymentReceipts";$("paymentQueue").after(receiptBox);}
 receiptBox.innerHTML=groups.length?'<h3>Paid receipts — latest and history</h3>'+groups.map((g,i)=>{const calc=paymentBreakdown(g.items),dt=new Date(g.paidAt||g.items[0]?.paidAt||Date.now()),isLatest=groups.findIndex(x=>String(x.contact.id)===String(g.contact.id))===i;const stamp=dt.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})+" · "+dt.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});const brands=g.items.map(x=>`<div class="receipt-brand-line"><span>${esc(x.brandName||x.productName||"Brand")}</span><b>${money(x.amount)}</b></div>`).join("");return `<div class="item paid-receipt-card"><div class="sectionhead"><b>${esc(g.contact.name)}</b><span>${isLatest?"LATEST PAYMENT":"PREVIOUS RECEIPT"}</span></div><small>${stamp}</small>${brands}<div class="receipt-summary-line">Brand count: ${calc.brandCount} · Total: ${money(calc.gross)}</div><div class="receipt-summary-line">Campaign support Charges: −${money(calc.charges)} · <b>Net paid: ${money(calc.net)}</b></div><button class="secondary" type="button" data-receipt="${esc(g.batchKey)}">${isLatest?"Share latest receipt":"View / Share receipt"}</button></div>`;}).join(""):'';
 receiptBox.querySelectorAll("[data-receipt]").forEach(e=>e.onclick=()=>shareReceipt(e.dataset.receipt));
}
function pay(ids, provider="cred"){
 const chosen=rows().filter(x=>ids.includes(x.id)&&x.status!=="Paid"); if(!chosen.length)return;
 if(chosen.some(x=>!x.contactId)){alert("Match this payment to a saved contact before paying.");return;}
 const contactIds=[...new Set(chosen.map(x=>String(x.contactId)))];
 if(contactIds.length!==1){alert("Select payment rows for one contact at a time.");return;}
 const c=contacts().find(x=>String(x.id)===contactIds[0]), upi=String(c?.upiId||chosen[0].upiId||"").trim();
 if(!upi||! /^[^@\s]+@[^@\s]+$/.test(upi)){alert("Add a valid UPI ID to this contact first.");return;}
 const calc=paymentBreakdown(chosen), amount=calc.net;
 if(!(calc.gross>0)){alert("Payment amount must be greater than zero.");return;}
 if(!(amount>0)){alert("Campaign support Charges equal or exceed the selected product amount. Adjust the imported amounts before initiating payment.");return;}
 const note=chosen.map(x=>x.brandName||x.productName||x.remarks||"Deals by TA").join(", ").slice(0,55)+(calc.charges>0?" | Campaign support":"");
 const params=new URLSearchParams({pa:upi,pn:c?.name||chosen[0].contactName,am:amount.toFixed(2),cu:"INR",tn:note});
 const uri=(provider==="other"?"upi://pay?":"credpay://upi/pay?")+params.toString();
 // One payment action for one contact = one receipt batch. Persist this before
 // leaving the browser for CRED, so per-row confirmation can retain the same batch.
 const batchId="receipt-"+Date.now()+"-"+Math.random().toString(36).slice(2,7);
 const existing=rows();
 persist(existing.map(x=>ids.includes(x.id)&&x.status!=="Paid"?{...x,paymentBatchId:batchId,paymentInitiatedAt:new Date().toISOString(),paymentProvider:provider}:x));
 const appName=provider==="other"?"your available UPI app":"CRED";
 if(!confirm(`Payment summary for ${c?.name||chosen[0].contactName}:\nBrand count: ${calc.brandCount}\nTotal product amount: ${money(calc.gross)}\nCampaign support Charges: -${money(calc.charges)}\nNET PAY: ${money(amount)}\n\nOpen ${appName} for ${money(amount)} to ${upi}? Verify before authorising.`))return;
 // CRED is the preferred app. Keep a visible generic UPI fallback because app availability
 // and custom-scheme handling depend on the device/browser.
 const fallback=$("credPaymentFallback");
 if(fallback){fallback.hidden=false;fallback.innerHTML='If CRED does not open, use <button type="button" class="secondary" id="openOtherUpi">Open another UPI app</button>.';const fb=$("openOtherUpi");if(fb)fb.onclick=()=>{location.href="upi://pay?"+params.toString();};}
 location.href=uri;
}
function markPaid(ids){
 if(!confirm("Mark these entries paid only after confirming success in your bank/UPI app?"))return;
 const paidAt=new Date().toISOString();
 const selectedRows=rows().filter(x=>ids.includes(x.id));
 const existingBatchIds=[...new Set(selectedRows.map(x=>String(x.paymentBatchId||"")).filter(Boolean))];
 // Preserve the batch created by Pay selected with CRED. If there is no prior
 // payment session (manual Mark paid), create one batch for this mark-paid action.
 const batchId=existingBatchIds.length===1?existingBatchIds[0]:"receipt-"+Date.now()+"-"+Math.random().toString(36).slice(2,7);
 persist(rows().map(x=>ids.includes(x.id)?{...x,status:"Paid",paidAt,paymentBatchId:batchId,appliedCharge:rowCharge(x),paidNetAmount:Number(x.amount)-rowCharge(x)}:x));
 ids.forEach(x=>selected.delete(x));render();
}
function importRows(records,fileName){
 const cs=contacts(), old=rows(), added=[], unmatched=[];
 records.forEach((r,i)=>{
  const get=(...names)=>{const k=Object.keys(r).find(key=>names.some(n=>norm(n)===norm(key)));return k?String(r[k]??"").trim():"";};
  const name=get("Contact Name","Name","Contact","Recipient","Customer");
  const amount=Number(get("Pending Amount","Amount","Payment Amount","Payable Amount").replace(/[₹,\s]/g,""));
  if(!name||!Number.isFinite(amount)||amount<=0)return;
  const c=cs.find(x=>norm(x.name)===norm(name));
  if(!c)unmatched.push(name);
  added.push({id:`pay-${Date.now()}-${i}-${Math.random().toString(36).slice(2,7)}`,contactId:c?.id||"",contactName:name,upiId:c?.upiId||"",brandName:get("Brand Name","Brand"),amount,remarks:get("Remarks","Description","Narration"),status:"Pending",chargeEnabled:false,importedAt:new Date().toISOString(),sourceFile:fileName});
 });
 if(!added.length){$("paymentImportStatus").textContent="No valid rows found. Required columns: Contact Name, Brand Name and Pending Amount.";return;}
 persist(old.concat(added));
 $("paymentImportStatus").textContent=`Imported ${added.length} payment rows. Unmatched contacts: ${[...new Set(unmatched)].join(", ")||"None"}.`;
 render();
}
async function importFile(){
 const f=$("paymentExcelFile").files[0];if(!f){alert("Choose an Excel or CSV file first.");return;}
 try{
  if(/\.csv$/i.test(f.name)){
   const text=await f.text(), lines=text.split(/\r?\n/).filter(Boolean);
   const parse=line=>{const out=[];let v="",q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'&&line[i+1]==='"'){v+='"';i++;}else if(ch==='"')q=!q;else if(ch===","&&!q){out.push(v);v="";}else v+=ch;}out.push(v);return out;};
   const heads=parse(lines.shift()).map(x=>x.replace(/^\uFEFF/,"").trim());
   importRows(lines.map(l=>Object.fromEntries(parse(l).map((v,i)=>[heads[i],v]))),f.name);
  }else{
   if(!window.XLSX)throw Error("Excel reader did not load. Reload the page or import a CSV.");
   const wb=XLSX.read(await f.arrayBuffer(),{type:"array"}), ws=wb.Sheets[wb.SheetNames[0]];
   importRows(XLSX.utils.sheet_to_json(ws,{defval:""}),f.name);
  }
 }catch(e){$("paymentImportStatus").textContent="Import failed: "+e.message;}
}
function exportCsv(){
 const head=["Contact Name","WhatsApp Number","UPI ID","Brand Name","Total Product Amount","Campaign support Charges","Net Payable","Remarks","Status","Paid At","Imported At"];
 const lines=[head,...rows().map(x=>[x.contactName,(contacts().find(c=>String(c.id)===String(x.contactId))||{}).phone||"",x.upiId,x.brandName||x.productName||"",x.amount,rowCharge(x),Number(x.amount)-rowCharge(x),x.remarks,x.status,x.paidAt,x.importedAt])].map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
 const a=document.createElement("a"),u=URL.createObjectURL(new Blob([lines],{type:"text/csv;charset=utf-8"}));a.href=u;a.download="deal-dhamaka-payment-register.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}

function receiptGroups(){
 const paid=rows().filter(x=>x.status==="Paid"&&x.contactId),groups=new Map();
 paid.forEach(x=>{
  const d=new Date(x.paidAt||x.importedAt||Date.now()),legacyMinute=Number.isNaN(d.getTime())?"unknown":d.toISOString().slice(0,16);
  const batchKey=String(x.paymentBatchId||("legacy-"+x.contactId+"-"+legacyMinute)),key=String(x.contactId)+"|"+batchKey;
  if(!groups.has(key))groups.set(key,{contactId:String(x.contactId),batchKey,items:[],paidAt:x.paidAt||x.importedAt||""});
  const g=groups.get(key);g.items.push(x);if(String(x.paidAt||"")>String(g.paidAt||""))g.paidAt=x.paidAt;
 });
 return [...groups.values()].map(g=>({...g,contact:contacts().find(c=>String(c.id)===g.contactId)})).filter(g=>g.contact).sort((a,b)=>new Date(b.paidAt||0)-new Date(a.paidAt||0));
}
function receiptText(contact,items){
 const calc=paymentBreakdown(items),stamp=new Date();
 const paidStamp=new Date(items[0]?.paidAt||stamp);
 const date=paidStamp.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
 const time=paidStamp.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
 return `Deals by TA — Payment Summary\nTo: ${contact.name||"Contact"}\nDate: ${date} | Time: ${time}\n${items.map(x=>`${x.brandName||x.productName||"Brand"}: ${money(x.amount)}`).join("\n")}\nBrand count: ${calc.brandCount}\nTotal product amount: ${money(calc.gross)}\nCampaign support Charges: -${money(calc.charges)}\nNET AMOUNT PAID: ${money(calc.net)}`;
}
async function shareReceipt(batchKey){
 const group=receiptGroups().find(g=>String(g.batchKey)===String(batchKey));
 if(!group){alert("No paid entries found for this contact.");return;}
 const {contact,items}=group, total=items.reduce((s,x)=>s+Number(x.amount||0),0);
 const now=new Date(group.paidAt||items[0]?.paidAt||Date.now());
 const dateText=now.toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"});
 const timeText=now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
 const width=900, top=54, rowH=66, footer=470, height=top+570+items.length*rowH+footer;
 const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext("2d");
 if(!ctx){alert("Could not prepare receipt image on this device.");return;}
 // Modern Luxury: quiet charcoal, warm ivory and restrained champagne details.
 const bg=ctx.createLinearGradient(0,0,width,height);bg.addColorStop(0,"#10151d");bg.addColorStop(1,"#1b2028");
 ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
 const roundRect=(x,y,w,h,r)=>{ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();};
 roundRect(34,34,width-68,height-68,24);ctx.fillStyle="#171d25";ctx.fill();
 ctx.strokeStyle="#8d7957";ctx.lineWidth=2;ctx.stroke();
 // Slim accent rule and editorial heading.
 ctx.fillStyle="#c7b28a";ctx.fillRect(76,82,74,4);
 // Fine inner accent for a more polished, restrained luxury finish.
 ctx.strokeStyle="rgba(199,178,138,.18)";ctx.lineWidth=1;roundRect(49,49,width-98,height-98,18);ctx.stroke();
 ctx.fillStyle="#f2eee6";ctx.font="600 43px Georgia, 'Times New Roman', serif";ctx.fillText("Deals by TA",76,151);
 ctx.fillStyle="#c7b28a";ctx.font="600 20px Arial, sans-serif";ctx.letterSpacing="3px";ctx.fillText("PAYMENT SUMMARY",76,194);ctx.letterSpacing="0px";
 ctx.fillStyle="#eee9df";ctx.font="600 30px Arial, sans-serif";ctx.fillText(String(contact.name||"Contact").slice(0,34),76,270);
 ctx.fillStyle="#b8b5ad";ctx.font="21px Arial, sans-serif";ctx.fillText("WhatsApp  "+String(contact.phone||"—"),76,309);
 // Date and time are explicit and easy to read on the image.
 const metaY=365;ctx.fillStyle="#a99a7d";ctx.font="bold 17px Arial";ctx.fillText("DATE",76,metaY);ctx.fillText("TIME",475,metaY);
 ctx.fillStyle="#f0ece4";ctx.font="23px Arial";ctx.fillText(dateText,76,metaY+34);ctx.fillText(timeText,475,metaY+34);
 let y=metaY+105;
 ctx.strokeStyle="#625744";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(76,y);ctx.lineTo(width-76,y);ctx.stroke();
 y+=47;ctx.fillStyle="#bba982";ctx.font="bold 18px Arial";ctx.fillText("BRAND",76,y);ctx.textAlign="right";ctx.fillText("AMOUNT",width-76,y);ctx.textAlign="left";
 y+=22;ctx.strokeStyle="#393f47";ctx.beginPath();ctx.moveTo(76,y);ctx.lineTo(width-76,y);ctx.stroke();
 for(const item of items){
  y+=48;ctx.fillStyle="#f0ece4";ctx.font="23px Arial";
  let brand=String(item.brandName||item.productName||"Brand");
  while(ctx.measureText(brand).width>490&&brand.length>4)brand=brand.slice(0,-4)+"…";
  ctx.fillText(brand,76,y);ctx.textAlign="right";ctx.fillText(money(item.amount),width-76,y);ctx.textAlign="left";
  y+=18;ctx.strokeStyle="#303740";ctx.beginPath();ctx.moveTo(76,y);ctx.lineTo(width-76,y);ctx.stroke();
 }
 const calc=paymentBreakdown(items);
 y+=40;ctx.fillStyle="#bba982";ctx.font="bold 18px Arial";ctx.fillText(`BRAND COUNT: ${calc.brandCount}`,76,y);
 y+=48;ctx.fillStyle="#f0ece4";ctx.font="22px Arial";ctx.fillText("TOTAL PRODUCT AMOUNT",76,y);
 ctx.textAlign="right";ctx.fillText(money(calc.gross),width-76,y);ctx.textAlign="left";
 y+=46;ctx.fillStyle="#c7b28a";ctx.font="22px Arial";ctx.fillText("Campaign support Charges",76,y);
 ctx.textAlign="right";ctx.fillText("− "+money(calc.charges),width-76,y);ctx.textAlign="left";
 y+=50;ctx.fillStyle="#c7b28a";ctx.font="bold 23px Arial";ctx.fillText("NET AMOUNT PAID",76,y);
 ctx.textAlign="right";ctx.fillStyle="#f5f0e6";ctx.font="bold 34px Arial";ctx.fillText(money(calc.net),width-76,y+3);ctx.textAlign="left";
 y+=76;ctx.strokeStyle="#625744";ctx.beginPath();ctx.moveTo(76,y);ctx.lineTo(width-76,y);ctx.stroke();
 y+=48;ctx.fillStyle="#aaa69d";ctx.font="19px Arial";ctx.fillText("Thank you for your trust.",76,y);
 ctx.textAlign="right";ctx.fillStyle="#c7b28a";ctx.font="italic 21px Georgia, serif";ctx.fillText("Deals by TA",width-76,y);ctx.textAlign="left";
 y+=40;ctx.fillStyle="#777d83";ctx.font="15px Arial";ctx.fillText("A payment summary prepared for your records",76,y);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
 if(!blob){alert("Could not prepare receipt image on this device.");return;}
 const safeName=String(contact.name||"contact").replace(/[^a-z0-9]+/gi,"-");
 const file=new File([blob],`Deals-by-TA-Receipt-${safeName}.png`,{type:"image/png"});
 const message=receiptText(contact,items);
 if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
  try{await navigator.share({files:[file],title:"Deals by TA payment receipt",text:message});return;}
  catch(e){if(e.name==="AbortError")return;}
 }
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
 const phone=String(contact.phone||"").replace(/\D/g,"");
 if(phone)window.open("https://wa.me/"+phone+"?text="+encodeURIComponent(message),"_blank");
 alert("Receipt image downloaded. WhatsApp opened with the summary text. Attach the downloaded PNG before sending.");
}

// Expose receipt sharing immediately so a contact timeline can share without
// requiring the user to open the Payments tab first.
window.sharePaymentReceipt = shareReceipt;
window.renderPayments=render;
document.addEventListener("DOMContentLoaded",()=>{
 if(!$("payments"))return;
 $("paymentImportBtn").addEventListener("click",importFile);
 $("paymentExportBtn").addEventListener("click",exportCsv);
 $("paymentFilter").addEventListener("change",render);
 $("paymentSearch").addEventListener("input",render);
 $("paymentDateFilter")?.addEventListener("change",render);
 $("paymentContactFilter")?.addEventListener("change",render);
 $("paymentChargeMaster")?.addEventListener("change",e=>{const checked=e.target.checked;persist(rows().map(x=>x.status!=="Paid"?{...x,chargeEnabled:checked}:x));render();});
 const actionRow=document.createElement("div");actionRow.className="payment-bulk-actions";
 const b=document.createElement("button");b.id="paySelectedBtn";b.className="primary full";b.type="button";b.textContent="Pay selected with CRED (same contact)";b.addEventListener("click",()=>pay([...selected],"cred"));
 const markBtn=document.createElement("button");markBtn.id="markSelectedPaidBtn";markBtn.className="secondary full";markBtn.type="button";markBtn.textContent="Mark selected as paid";markBtn.addEventListener("click",()=>{const ids=rows().filter(x=>selected.has(x.id)&&x.status!=="Paid").map(x=>x.id);if(!ids.length){alert("Select one or more pending payment rows first.");return;}markPaid(ids);});
 actionRow.append(b,markBtn);$("paymentQueue").before(actionRow);
 const fallback=document.createElement("p");fallback.id="credPaymentFallback";fallback.className="hint";fallback.hidden=true;$("paymentQueue").before(fallback);
 render();
});
window.addEventListener("deal-dhamaka-data-updated",render);
})();
