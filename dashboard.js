/* Deal Dhamaka Agent V2 — consolidated executive dashboard
   Uses the existing dealDhamakaAgentV2 data store. No sample/demo figures. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const money = n => new Intl.NumberFormat("en-IN", {style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(n)||0);
  const qty = n => new Intl.NumberFormat("en-IN", {maximumFractionDigits:1}).format(Number(n)||0);
  const escText = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let period = "all";
  const palette = {blue:"#60a5fa",green:"#34d399",amber:"#fbbf24",red:"#fb7185",ink:"#a5b4fc",muted:"#94a3b8",line:"#334155"};

  const style = document.createElement("style");
  style.textContent = `
  .dashboard-shell{max-width:1180px;margin:0 auto;color:#17213b}
  .dashboard-welcome{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:20px 19px;border-radius:20px;background:linear-gradient(125deg,#171f3c 0%,#293d73 64%,#4f6bed 100%);color:#fff;box-shadow:0 10px 28px #26365b20}
  .dashboard-kicker{font-size:9px;font-weight:850;letter-spacing:1.7px;color:#c9d4ff}
  .dashboard-welcome h2{font-size:24px;line-height:1.1;margin:8px 0 6px;letter-spacing:-.6px}
  .dashboard-welcome p{font-size:12px;line-height:1.5;color:#e0e7ff;margin:0;max-width:460px}
  .dashboard-send{background:#fff;color:#25376b;white-space:nowrap;flex-shrink:0}
  .dashboard-periodbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:13px 1px 12px;color:#7c879e;font-size:11px}
  .dashboard-periodbar>div{display:flex;align-items:center;gap:7px;font-weight:750}
  .dashboard-live-dot{width:7px;height:7px;border-radius:50%;background:#19a974;box-shadow:0 0 0 3px #19a9741c}
  .dashboard-period-control{display:flex;align-items:center;gap:7px;margin:0;font-size:10px;color:#7c879e}
  .dashboard-period-control select{margin:0;padding:8px 10px;width:auto;min-width:110px;border-radius:10px;border-color:#e2e7f0;font-size:11px;font-weight:750;background:#fff}
  .dashboard-overview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
  .dash-kpi{position:relative;overflow:hidden;min-width:0;background:#fff;border:1px solid #e8ecf4;border-radius:16px;padding:13px;box-shadow:0 3px 10px #24365b05}
  .dash-kpi:after{content:"";position:absolute;right:-18px;top:-20px;width:66px;height:66px;border-radius:50%;background:var(--tint,#eef1ff)}
  .dash-kpi-head{display:flex;align-items:center;gap:7px;color:#7c879e;font-size:10px;font-weight:800;position:relative;z-index:1}
  .dash-kpi-icon{width:25px;height:25px;border-radius:8px;display:grid;place-items:center;background:var(--tint,#eef1ff);color:var(--tone,#4f6bed);font-size:14px}
  .dash-kpi-value{display:block;position:relative;z-index:1;font-size:clamp(19px,5vw,27px);letter-spacing:-.7px;line-height:1.2;font-weight:900;margin:11px 0 5px;color:#17213b;overflow-wrap:anywhere}
  .dash-kpi-note{position:relative;z-index:1;color:#8a94a8;font-size:10px;line-height:1.4}
  .dash-kpi-note strong{color:#53617b}
  .dash-section{background:#fff;border:1px solid #e8ecf4;border-radius:17px;padding:14px;margin-top:11px;min-width:0;box-shadow:0 3px 12px #24365b05}
  .dash-section-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px}
  .dash-section-head h3{margin:0;font-size:14px;color:#202b47;letter-spacing:-.2px}
  .dash-section-head p{margin:4px 0 0;color:#8a94a8;font-size:10px;line-height:1.4}
  .dash-tag{font-size:9px;font-weight:850;border-radius:20px;padding:5px 7px;background:#f1f4fa;color:#68758d;white-space:nowrap}
  .dash-chart{width:100%;display:block;overflow:visible}
  .dash-legend{display:flex;gap:13px;flex-wrap:wrap;font-size:10px;color:#7c879e;margin-top:7px}
  .dash-legend span{display:inline-flex;align-items:center;gap:5px}.dash-legend i{display:inline-block;width:8px;height:8px;border-radius:3px}
  .dash-insights{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .dash-insight{border-radius:13px;padding:11px;background:#f7f8fc;min-width:0}
  .dash-insight span{display:block;font-size:10px;color:#7c879e;font-weight:750}
  .dash-insight strong{display:block;font-size:21px;margin:5px 0;color:#202b47;overflow-wrap:anywhere}
  .dash-insight small{font-size:10px;color:#8a94a8;line-height:1.35;display:block}
  .dash-rate-track{height:9px;background:#edf0f7;border-radius:20px;overflow:hidden;margin:12px 0 7px}.dash-rate-fill{height:100%;background:linear-gradient(90deg,#19a974,#7bd8ae);border-radius:20px;min-width:0}
  .dash-action-list,.dash-rank-list,.dash-activity-list{display:grid;gap:7px}
  .dash-alert{display:flex;align-items:flex-start;gap:10px;padding:10px;border:1px solid #edf0f6;border-radius:12px;background:#fff}
  .dash-alert-icon{width:29px;height:29px;display:grid;place-items:center;border-radius:9px;background:var(--alertbg,#fff3e3);color:var(--alerttone,#bb771a);flex:0 0 auto;font-size:14px}
  .dash-alert-body{flex:1;min-width:0}.dash-alert-body strong{display:block;font-size:11px;color:#26324e}.dash-alert-body small{display:block;color:#8993a6;font-size:10px;line-height:1.45;margin-top:3px}
  .dash-alert button{border:0;background:#f1f4fb;color:#445579;border-radius:8px;padding:7px 9px;font-size:10px;font-weight:800;white-space:nowrap}
  .dash-rank{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
  .dash-rank-main{min-width:0}.dash-rank-title{display:flex;justify-content:space-between;gap:8px;font-size:10px;font-weight:750;color:#35415c}.dash-rank-title span:first-child{overflow-wrap:anywhere}.dash-rank-title span:last-child{white-space:nowrap;color:#6f7b92}
  .dash-rank-track{height:6px;background:#eef1f7;border-radius:10px;overflow:hidden;margin-top:6px}.dash-rank-fill{height:100%;border-radius:10px;background:linear-gradient(90deg,#4f6bed,#8ca0ff)}
  .dash-activity{display:flex;gap:9px;align-items:flex-start;padding:9px 0;border-bottom:1px solid #f0f2f7}.dash-activity:last-child{border-bottom:0}.dash-activity-dot{width:8px;height:8px;border-radius:50%;background:#4f6bed;margin-top:4px;flex:0 0 auto}.dash-activity-main{flex:1;min-width:0}.dash-activity-main strong{display:block;font-size:11px;overflow-wrap:anywhere;color:#26324e}.dash-activity-main small{display:block;color:#8993a6;font-size:10px;margin-top:3px;line-height:1.4}.dash-status{font-size:9px;font-weight:850;border-radius:20px;padding:5px 7px;white-space:nowrap}.dash-status.ordered{background:#e6f8ef;color:#168355}.dash-status.pending{background:#fff3df;color:#a66b12}
  .dash-empty{padding:15px 4px;color:#8a94a8;font-size:11px;text-align:center;line-height:1.5}
  .dashboard-data-shortcuts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:11px}.dashboard-data-shortcuts button{display:grid;grid-template-columns:28px minmax(0,1fr);grid-template-rows:auto auto;align-items:center;text-align:left;column-gap:8px;border:1px solid #e8ecf4;background:#fff;border-radius:13px;padding:11px;min-width:0}.dashboard-data-shortcuts button>span{grid-row:1/3;display:grid;place-items:center;background:#eef1ff;color:#4f6bed;width:28px;height:28px;border-radius:9px;font-size:15px}.dashboard-data-shortcuts b{font-size:11px;color:#2b3651}.dashboard-data-shortcuts small{font-size:9px;color:#8a94a8;margin-top:3px}
  .dashboard-hidden-stats{display:none!important}
  .dash-refund-card{display:flex;align-items:center;gap:13px;margin-top:10px;padding:14px 16px;border-radius:16px;border:1px solid #f5d9c4;background:linear-gradient(115deg,#fff7ed,#fff 75%);box-shadow:0 4px 14px #9a5b1910;position:relative;overflow:hidden}
  .dash-refund-icon{width:42px;height:42px;border-radius:13px;background:#ffead8;color:#b45309;display:grid;place-items:center;font-size:23px;flex:0 0 auto}
  .dash-refund-copy{flex:1;min-width:0}.dash-refund-label{font-size:10px;font-weight:850;letter-spacing:.5px;color:#9a5b27}.dash-refund-value{font-size:clamp(22px,5vw,29px);font-weight:900;letter-spacing:-.7px;color:#8f3f12;margin:4px 0}.dash-refund-note{font-size:10px;line-height:1.4;color:#a17d62}.dash-refund-count{padding:6px 9px;border-radius:20px;background:#ffead8;color:#9a4a13;font-size:10px;font-weight:850;white-space:nowrap}
  .contact-total-card{display:flex;align-items:center;gap:12px;margin:14px 0 12px;padding:13px 15px;border:1px solid #e2e9f7;border-radius:15px;background:linear-gradient(110deg,#eef2ff,#fff 78%);box-shadow:0 4px 12px #26365b08}
  .contact-total-icon{display:grid;place-items:center;width:39px;height:39px;border-radius:12px;background:#dfe7ff;color:#405bd1;font-size:22px;flex:0 0 auto}
  .contact-total-card div{display:flex;flex-direction:column;gap:2px}.contact-total-card small{font-size:9px;letter-spacing:.8px;font-weight:850;color:#7784a0}.contact-total-card strong{font-size:24px;line-height:1.1;color:#1b2744}.contact-total-caption{margin-left:auto;color:#8792aa;font-size:10px;font-weight:700}
  
  @media(min-width:650px){.dashboard-welcome{padding:25px 27px}.dashboard-welcome h2{font-size:30px}.dashboard-welcome p{font-size:13px}.dashboard-overview-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.dash-kpi{padding:16px}.dash-section{padding:18px;margin-top:13px}.dash-charts-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,1fr);gap:13px}.dash-lower-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.dashboard-data-shortcuts{grid-template-columns:repeat(4,minmax(0,1fr))}.dash-insights{grid-template-columns:repeat(4,minmax(0,1fr))}}

  /* Dashboard-only dark analytics skin. Other tabs intentionally retain their existing design. */
  #dashboard.page.active{max-width:none;padding:14px 12px 22px;background:#0b1020;color:#e5e7eb;min-height:calc(100vh - 140px);}
  #dashboard .dashboard-shell{max-width:1180px;color:#e5e7eb}
  #dashboard .dashboard-welcome{background:radial-gradient(circle at 88% 8%,#253d70 0,transparent 35%),linear-gradient(125deg,#111827 0%,#172554 58%,#1d4ed8 130%);border:1px solid #263650;box-shadow:0 14px 32px #0005}
  #dashboard .dashboard-kicker{color:#93c5fd}
  #dashboard .dashboard-welcome p{color:#cbd5e1}
  #dashboard .dashboard-send{background:#e0f2fe;color:#0f2a4a;border:1px solid #7dd3fc}
  #dashboard .dashboard-periodbar{color:#94a3b8}
  #dashboard .dashboard-period-control{color:#a8b4c8}
  #dashboard .dashboard-period-control select{background:#111a2c;color:#e5edf9;border:1px solid #334155;color-scheme:dark}
  #dashboard .dashboard-live-dot{background:#34d399;box-shadow:0 0 0 3px #34d39920}
  #dashboard .dash-pipeline-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:10px}
  #dashboard .dash-pipeline-card{position:relative;overflow:hidden;min-width:0;padding:12px;border-radius:15px;background:linear-gradient(145deg,#151f32,#101827);border:1px solid #293950;box-shadow:0 7px 18px #0002}
  #dashboard .dash-pipeline-card:before{content:"";position:absolute;inset:0 auto 0 0;width:3px;background:var(--pipeline,#60a5fa)}
  #dashboard .dash-pipeline-top{display:flex;align-items:center;justify-content:space-between;gap:6px;color:#a8b4c8;font-size:9px;font-weight:850;letter-spacing:.45px}
  #dashboard .dash-pipeline-icon{display:grid;place-items:center;width:23px;height:23px;border-radius:8px;background:color-mix(in srgb,var(--pipeline,#60a5fa) 16%,#111827);color:var(--pipeline,#60a5fa);font-size:12px}
  #dashboard .dash-pipeline-value{display:block;margin:8px 0;font-size:clamp(22px,5vw,29px);line-height:1;font-weight:900;letter-spacing:-.7px;color:#f8fafc;overflow-wrap:anywhere}
  #dashboard .dash-pipeline-track{height:6px;background:#263449;border-radius:10px;overflow:hidden}
  #dashboard .dash-pipeline-fill{height:100%;border-radius:10px;min-width:0;background:var(--pipeline,#60a5fa)}
  #dashboard .dash-pipeline-note{display:block;margin-top:7px;color:#94a3b8;font-size:9px;line-height:1.35}
  #dashboard .dash-kpi{background:linear-gradient(145deg,#151e31,#101827);border:1px solid #28364d;box-shadow:0 8px 20px #0002}
  #dashboard .dash-kpi:after{opacity:.22}
  #dashboard .dash-kpi-head{color:#a8b4c8}
  #dashboard .dash-kpi-icon{background:color-mix(in srgb,var(--tint,#1e293b) 24%,#111827);color:var(--tone,#60a5fa);border:1px solid color-mix(in srgb,var(--tone,#60a5fa) 25%,transparent)}
  #dashboard .dash-kpi-value{color:#f8fafc}
  #dashboard .dash-kpi-note{color:#94a3b8}
  #dashboard .dash-kpi-note strong{color:#cbd5e1}
  #dashboard .dash-section{background:linear-gradient(150deg,#121b2c,#0f1726);border:1px solid #26354b;box-shadow:0 8px 22px #0002}
  #dashboard .dash-section-head h3{color:#f1f5f9}
  #dashboard .dash-section-head p{color:#94a3b8}
  #dashboard .dash-tag{background:#1e293b;color:#cbd5e1;border:1px solid #334155}
  #dashboard .dash-legend{color:#a8b4c8}
  #dashboard .dash-insight{background:#182337;border:1px solid #293950}
  #dashboard .dash-insight span{color:#a8b4c8}
  #dashboard .dash-insight strong{color:#f8fafc}
  #dashboard .dash-insight small{color:#94a3b8}
  #dashboard .dash-rate-track{background:#263449}
  #dashboard .dash-alert{background:#141e30;border-color:#2a394f}
  #dashboard .dash-alert-body strong{color:#f1f5f9}
  #dashboard .dash-alert-body small{color:#a8b4c8}
  #dashboard .dash-alert button{background:#26364d;color:#dbeafe;border:1px solid #344963}
  #dashboard .dash-rank-title{color:#dbe5f5}
  #dashboard .dash-rank-title span:last-child{color:#94a3b8}
  #dashboard .dash-rank-track{background:#263449}
  #dashboard .dash-rank-fill{background:linear-gradient(90deg,#3b82f6,#a78bfa)}
  #dashboard .dash-activity{border-bottom-color:#263449}
  #dashboard .dash-activity-main strong{color:#f1f5f9}
  #dashboard .dash-activity-main small{color:#94a3b8}
  #dashboard .dash-status.ordered{background:#123b32;color:#6ee7b7;border:1px solid #1f6653}
  #dashboard .dash-status.pending{background:#493719;color:#fcd34d;border:1px solid #765520}
  #dashboard .dash-empty{color:#94a3b8}
  #dashboard .dash-refund-card{background:linear-gradient(115deg,#352719,#1b1b24 78%);border-color:#76512d;box-shadow:0 8px 20px #0002}
  #dashboard .dash-refund-icon{background:#50351f;color:#fbbf24}
  #dashboard .dash-refund-label{color:#fbbf24}
  #dashboard .dash-refund-value{color:#fde68a}
  #dashboard .dash-refund-note{color:#d6b995}
  #dashboard .dash-refund-count{background:#50351f;color:#fde68a}
  #dashboard .dashboard-data-shortcuts button{background:#121b2c;border-color:#293950;box-shadow:0 5px 15px #0002}
  #dashboard .dashboard-data-shortcuts button>span{background:#1d3151;color:#93c5fd}
  #dashboard .dashboard-data-shortcuts b{color:#e5edf9}
  #dashboard .dashboard-data-shortcuts small{color:#94a3b8}
  #dashboard .hint{color:#94a3b8!important}
  #dashboard .dash-insights .dash-insight{min-width:0}
  #dashboard .dash-chart{max-height:210px}
  #dashboard .dash-chart text{fill:#94a3b8}
  @media(max-width:380px){#dashboard.page.active{padding:10px 8px 18px}#dashboard .dashboard-periodbar{gap:7px}#dashboard .dashboard-period-control select{background:#111a2c;max-width:170px}#dashboard .dash-section{padding:12px}#dashboard .dash-kpi{padding:11px}#dashboard .dash-kpi-head{font-size:9px}#dashboard .dash-kpi-value{font-size:20px}}
  @media(prefers-reduced-motion:no-preference){#dashboard .dash-kpi,#dashboard .dash-section,#dashboard .dashboard-data-shortcuts button{transition:border-color .18s ease,transform .18s ease,box-shadow .18s ease}#dashboard .dash-kpi:hover,#dashboard .dashboard-data-shortcuts button:hover{transform:translateY(-2px);border-color:#45638a;box-shadow:0 12px 24px #0003}}
  `;
  document.head.appendChild(style);

  function readData() {
    const products = Array.isArray(state.products) ? state.products : [];
    const byId = new Map(products.map(p => [String(p.id), p]));
    const shares = (Array.isArray(state.shares) ? state.shares : []).map(s => {
      const product = s.productId == null ? null : byId.get(String(s.productId));
      if (s.productId != null && !product) return null;
      const price = s.priceSnapshot !== undefined && s.priceSnapshot !== null && s.priceSnapshot !== ""
        ? Math.max(0, Number(s.priceSnapshot) || 0)
        : Math.max(0, Number(product?.price) || 0);
      return {...s, _price:price, _brand:s.brand || product?.brand || product?.name || "Unspecified", _type:s.productType || product?.productType || "Unspecified", _product:product};
    }).filter(Boolean);
    return {contacts:state.contacts||[],products,shares};
  }
  function matchesPeriod(s) {
    if (period === "all") return true;
    const t = Number(s.time); if (!Number.isFinite(t) || t <= 0) return false;
    const now = new Date(); const d = new Date(t);
    if (period === "today") return d.toDateString() === now.toDateString();
    if (period === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    const days = period === "7days" ? 7 : period === "30days" ? 30 : 90;
    return t >= now.getTime() - days*86400000 && t <= now.getTime();
  }
  function section(title, subtitle, content, tag="") {
    return `<section class="dash-section"><div class="dash-section-head"><div><h3>${title}</h3><p>${subtitle}</p></div>${tag?`<span class="dash-tag">${tag}</span>`:""}</div>${content}</section>`;
  }
  function kpi(label, value, note, icon, tone, tint) {
    return `<div class="dash-kpi" style="--tone:${tone};--tint:${tint}"><div class="dash-kpi-head"><span class="dash-kpi-icon">${icon}</span>${label}</div><strong class="dash-kpi-value">${value}</strong><div class="dash-kpi-note">${note}</div></div>`;
  }
  function aggregate(rows, keyFn) {
    const map = new Map(); rows.forEach(r => {const k=String(keyFn(r)||"Unspecified"); const v=map.get(k)||{shared:0,ordered:0,sharedValue:0,orderedValue:0};v.shared++;v.sharedValue+=r._price;if(r.ordered){v.ordered++;v.orderedValue+=r._price;}map.set(k,v);});
    return [...map.entries()].sort((a,b)=>b[1].sharedValue-a[1].sharedValue||b[1].shared-a[1].shared);
  }
  function ranks(rows, empty) {
    if(!rows.length) return `<div class="dash-empty">${empty}</div>`;
    const max=Math.max(1,...rows.map(r=>r[1].sharedValue));
    return `<div class="dash-rank-list">${rows.slice(0,5).map(([name,v])=>`<div class="dash-rank"><div class="dash-rank-main"><div class="dash-rank-title"><span>${escText(name)}</span><span>${v.shared} shares</span></div><div class="dash-rank-track"><div class="dash-rank-fill" style="width:${Math.max(2,v.sharedValue/max*100)}%"></div></div></div><strong style="font-size:10px;white-space:nowrap">${money(v.sharedValue)}</strong></div>`).join("")}</div>`;
  }
  function trendChart(rows) {
    if(!rows.length) return `<div class="dash-empty">No share activity in this period yet. Once share records are created, the trend will appear here.</div>`;
    const now=new Date(); let buckets=[];
    if(period==="today") {for(let h=0;h<=now.getHours();h++) buckets.push({key:String(h).padStart(2,"0"),label:String(h).padStart(2,"0")+":00",shared:0,ordered:0});}
    else if(period==="7days") {for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);const key=d.toDateString();buckets.push({key,label:d.toLocaleDateString("en-IN",{weekday:"short"}),shared:0,ordered:0});}}
    else if(period==="30days"||period==="month"||period==="90days") {const start=period==="month"?new Date(now.getFullYear(),now.getMonth(),1):new Date(now.getTime()-(period==="90days"?89:29)*86400000);for(let d=new Date(start);d<=now;d.setDate(d.getDate()+1)){const x=new Date(d);buckets.push({key:x.toDateString(),label:x.getDate()+"",shared:0,ordered:0});}}
    else {const first=rows.reduce((min,s)=>Math.min(min,Number(s.time)||Date.now()),Date.now());const start=new Date(first);start.setDate(1);const d=new Date(start);while(d<=now){buckets.push({key:d.getFullYear()+"-"+d.getMonth(),label:d.toLocaleDateString("en-IN",{month:"short",year:"2-digit"}),shared:0,ordered:0});d.setMonth(d.getMonth()+1);}}
    const keys=new Map(buckets.map((b,i)=>[b.key,i]));rows.forEach(s=>{const d=new Date(Number(s.time));let key=period==="today"?String(d.getHours()).padStart(2,"0"):(period==="7days"||period==="30days"||period==="month"||period==="90days")?d.toDateString():d.getFullYear()+"-"+d.getMonth();const i=keys.get(key);if(i!==undefined){buckets[i].shared++;if(s.ordered)buckets[i].ordered++;}});
    const W=340,H=145,L=26,R=7,T=12,B=28,plotW=W-L-R,plotH=H-T-B,max=Math.max(1,...buckets.map(b=>b.shared));
    const step=plotW/Math.max(1,buckets.length);const barW=Math.max(2,Math.min(12,step*.48));
    const bars=buckets.map((b,i)=>{const x=L+i*step+(step-barW)/2;const h=b.shared/max*plotH;const oh=b.ordered/max*plotH;return `<rect x="${x.toFixed(1)}" y="${(T+plotH-h).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(1,h).toFixed(1)}" rx="2" fill="${palette.blue}" opacity=".85"/><rect x="${(x+barW*.22).toFixed(1)}" y="${(T+plotH-oh).toFixed(1)}" width="${(barW*.56).toFixed(1)}" height="${Math.max(0,oh).toFixed(1)}" rx="1.5" fill="${palette.green}"/>`;}).join("");
    const labels=buckets.map((b,i)=>{if(buckets.length>15&&i%Math.ceil(buckets.length/7)!==0&&i!==buckets.length-1)return "";return `<text x="${(L+i*step+step/2).toFixed(1)}" y="${H-8}" font-size="8" text-anchor="middle" fill="${palette.muted}">${escText(b.label)}</text>`;}).join("");
    const grid=[0,.5,1].map(p=>`<line x1="${L}" y1="${T+plotH*(1-p)}" x2="${W-R}" y2="${T+plotH*(1-p)}" stroke="${palette.line}" stroke-dasharray="3 3"/>`).join("");
    return `<svg class="dash-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Share attempts and ordered records over time">${grid}${bars}${labels}</svg><div class="dash-legend"><span><i style="background:${palette.blue}"></i>Share records</span><span><i style="background:${palette.green}"></i>Marked ordered</span></div>`;
  }
  function alertRow(icon,title,detail,page,tone="amber") {
    const bg=tone==="red"?"#fff0f0":tone==="green"?"#e7f8ef":"#fff3df";const color=tone==="red"?palette.red:tone==="green"?palette.green:"#bb771a";
    return `<div class="dash-alert" style="--alertbg:${bg};--alerttone:${color}"><span class="dash-alert-icon">${icon}</span><div class="dash-alert-body"><strong>${title}</strong><small>${detail}</small></div><button type="button" data-dashboard-page="${page}">Review →</button></div>`;
  }
  function render() {
    const host=$("advancedDashboard"); if(!host || typeof state==="undefined") return;
    const data=readData(), allShares=data.shares, selected=allShares.filter(matchesPeriod), ordered=selected.filter(s=>s.ordered), pending=selected.filter(s=>!s.ordered);
    const sharedValue=selected.reduce((n,s)=>n+s._price,0), orderedValue=ordered.reduce((n,s)=>n+s._price,0), pendingValue=pending.reduce((n,s)=>n+s._price,0);
    const refundedRows=selected.filter(s=>s.refunded);
    const refundedValue=refundedRows.reduce((n,s)=>n+Math.max(0,Number(s.refundAmount ?? s.priceSnapshot ?? s._price)||0),0);
    const allotted=data.products.reduce((n,p)=>n+Math.max(0,Number(p.allottedQty)||0),0);
    const allottedValue=data.products.reduce((n,p)=>n+Math.max(0,Number(p.allottedQty)||0)*Math.max(0,Number(p.price)||0),0);
    const allOrdered=allShares.filter(s=>s.ordered).length, conversion=allShares.length?Math.round(allOrdered/allShares.length*100):0;
    const sharedAll=allShares.length, orderedAll=allOrdered, pendingAll=Math.max(0,sharedAll-orderedAll);
    const sharedAllotted=data.products.reduce((n,p)=>n+allShares.filter(s=>String(s.productId)===String(p.id)).length,0);
    const pendingAllotted=Math.max(0,allotted-sharedAllotted), overAllocated=Math.max(0,sharedAllotted-allotted);
    const periodNames={all:"All-time performance",today:"Today's performance","7days":"Last 7 days", "30days":"Last 30 days",month:"This month","90days":"Last 90 days"};
    const caption=$("dashboardPeriodCaption");if(caption)caption.textContent=periodNames[period]||periodNames.all;
    const expiring=data.products.filter(p=>p.dealStatus!=="closed"&&p.dealEndDate&&p.dealEndDate>=new Date().toISOString().slice(0,10)&&p.dealEndDate<=new Date(Date.now()+7*86400000).toISOString().slice(0,10));
    const expired=data.products.filter(p=>p.dealStatus!=="closed"&&p.dealEndDate&&p.dealEndDate<new Date().toISOString().slice(0,10));
    const lowStock=data.products.filter(p=>p.dealStatus!=="closed"&&Math.max(0,Number(p.allottedQty)||0)-allShares.filter(s=>String(s.productId)===String(p.id)).length<=0&&Number(p.allottedQty)>0);
    const unpriced=data.products.filter(p=>!(Number(p.price)>0));
    const alertParts=[];
    if(overAllocated)alertParts.push(alertRow("⚠","Over-allocation detected",`${qty(overAllocated)} share record(s) exceed total allotted quantity. Check product allocation.` ,"products","red"));
    if(pendingAll)alertParts.push(alertRow("◷",`${pendingAll} order decision(s) pending`,`${money(allShares.filter(s=>!s.ordered).reduce((n,s)=>n+s._price,0))} pending order value across all saved share records.`,"tracking"));
    if(expired.length)alertParts.push(alertRow("⌛",`${expired.length} deal(s) past end date`,"Review deal status and close or extend these products.","products","red"));
    if(expiring.length)alertParts.push(alertRow("◷",`${expiring.length} deal(s) ending soon`,"These deals end within the next 7 days.","products"));
    if(unpriced.length)alertParts.push(alertRow("₹",`${unpriced.length} product(s) missing price`,"Add a unit price to make value reporting more complete.","products"));
    if(!alertParts.length)alertParts.push(alertRow("✓","No priority issues detected","Your current allocation and deal dates have no dashboard alerts.","products","green"));
    const recent=[...selected].sort((a,b)=>(Number(b.time)||0)-(Number(a.time)||0)).slice(0,5);
    const brandRows=aggregate(selected,s=>s._brand), typeRows=aggregate(selected,s=>s._type);
    const conversionHTML=`<div class="dash-insights"><div class="dash-insight"><span>All-time order conversion</span><strong>${conversion}%</strong><small>${orderedAll} marked ordered from ${sharedAll} saved share records</small><div class="dash-rate-track"><div class="dash-rate-fill" style="width:${conversion}%"></div></div></div><div class="dash-insight"><span>Pending order pipeline</span><strong>${money(allShares.filter(s=>!s.ordered).reduce((n,s)=>n+s._price,0))}</strong><small>${pendingAll} share records not marked ordered</small></div></div>`;
    const alertHTML=alertParts.slice(0,5).join("");
    const recentHTML=recent.length?`<div class="dash-activity-list">${recent.map(s=>`<div class="dash-activity"><span class="dash-activity-dot" style="background:${s.ordered?palette.green:palette.amber}"></span><div class="dash-activity-main"><strong>${escText(s.contactName||"Unknown recipient")} · ${escText(s.productName||s._product?.name||"Unknown product")}</strong><small>${escText(s._brand)} · ${Number(s.time)?new Date(Number(s.time)).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"Date unavailable"} · ${money(s._price)}</small></div><span class="dash-status ${s.ordered?"ordered":"pending"}">${s.ordered?"Ordered":"Pending"}</span></div>`).join("")}</div>`:`<div class="dash-empty">No share records yet. Use “Share a deal” to begin your workflow.</div>`;
    host.innerHTML=`
      <div class="dashboard-overview-grid">
        ${kpi("SHARED VALUE",money(sharedValue),`${selected.length} share record(s) in selected period`,"↗",palette.blue,"#eef1ff")}
        ${kpi("ORDERED VALUE",money(orderedValue),`${ordered.length} marked ordered · selected period`,"✓",palette.green,"#e7f8ef")}
        ${kpi("PENDING ORDER VALUE",money(pendingValue),`${pending.length} share record(s) awaiting order status`,"◷",palette.amber,"#fff4e2")}
        ${kpi("ALLOTTED VALUE",money(allottedValue),`${qty(allotted)} units allotted · current product prices`,"▦",palette.ink,"#edf0f7")}
      </div>
      <div class="dash-pipeline-grid" aria-label="Share and order pipeline">
        <div class="dash-pipeline-card" style="--pipeline:${palette.blue}"><div class="dash-pipeline-top"><span>SHARED</span><span class="dash-pipeline-icon">↗</span></div><strong class="dash-pipeline-value">${qty(selected.length)}</strong><div class="dash-pipeline-track"><div class="dash-pipeline-fill" style="width:${selected.length?100:0}%"></div></div><small class="dash-pipeline-note">Saved share records in period</small></div>
        <div class="dash-pipeline-card" style="--pipeline:${palette.green}"><div class="dash-pipeline-top"><span>ORDERED</span><span class="dash-pipeline-icon">✓</span></div><strong class="dash-pipeline-value">${qty(ordered.length)}</strong><div class="dash-pipeline-track"><div class="dash-pipeline-fill" style="width:${selected.length?Math.min(100,ordered.length/selected.length*100):0}%"></div></div><small class="dash-pipeline-note">${selected.length?Math.round(ordered.length/selected.length*100):0}% of shares marked ordered</small></div>
        <div class="dash-pipeline-card" style="--pipeline:${palette.amber}"><div class="dash-pipeline-top"><span>PENDING</span><span class="dash-pipeline-icon">◷</span></div><strong class="dash-pipeline-value">${qty(pending.length)}</strong><div class="dash-pipeline-track"><div class="dash-pipeline-fill" style="width:${selected.length?Math.min(100,pending.length/selected.length*100):0}%"></div></div><small class="dash-pipeline-note">Awaiting order status</small></div>
        <div class="dash-pipeline-card" style="--pipeline:#a78bfa"><div class="dash-pipeline-top"><span>ORDER RATE</span><span class="dash-pipeline-icon">%</span></div><strong class="dash-pipeline-value">${selected.length?Math.round(ordered.length/selected.length*100):0}%</strong><div class="dash-pipeline-track"><div class="dash-pipeline-fill" style="width:${selected.length?Math.min(100,ordered.length/selected.length*100):0}%"></div></div><small class="dash-pipeline-note">Recorded orders / share records</small></div>
      </div>
      <div class="dash-refund-card" role="group" aria-label="Refunded amount summary"><span class="dash-refund-icon">↩</span><div class="dash-refund-copy"><div class="dash-refund-label">REFUNDED AMOUNT</div><div class="dash-refund-value">${money(refundedValue)}</div><div class="dash-refund-note">${refundedRows.length} refunded record(s) · selected period</div></div><span class="dash-refund-count">${refundedRows.length} REFUND${refundedRows.length===1?"":"S"}</span></div>
      ${section("Share & order activity","Trend for the selected reporting period",trendChart(selected),period==="all"?"ALL TIME":period.toUpperCase())}
      ${section("Inventory & conversion","All-time quantities and order progress",conversionHTML)}
      <div class="dash-charts-grid">
        ${section("Top brands by shared value","Selected period · ranked by recorded share value",ranks(brandRows,"No brand data in this period."))}
        ${section("Top product types","Selected period · ranked by recorded share value",ranks(typeRows,"No product-type data in this period."))}
      </div>
      <div class="dash-lower-grid">
        ${section("Action centre","Exceptions and items that may need attention",`<div class="dash-action-list">${alertHTML}</div>`,`${alertParts.length} SIGNAL(S)`)}
        ${section("Recent activity","Latest saved share records in the selected period",recentHTML)}
      </div>
      <div class="dash-section"><div class="dash-section-head"><div><h3>Inventory snapshot</h3><p>All-time units · independent of selected reporting period</p></div><button class="mini" type="button" data-dashboard-page="products">Manage stock →</button></div><div class="dash-insights"><div class="dash-insight"><span>Allotted units</span><strong>${qty(allotted)}</strong><small>Across all products</small></div><div class="dash-insight"><span>Shared units</span><strong>${qty(sharedAllotted)}</strong><small>Saved share records for current products</small></div><div class="dash-insight"><span>Pending allotted</span><strong>${qty(pendingAllotted)}</strong><small>Allotted minus shared, minimum zero</small></div><div class="dash-insight"><span>Pending ordered</span><strong>${qty(pendingAll)}</strong><small>Shared records not marked ordered</small></div></div>${overAllocated?`<p class="hint" style="color:#b42318;font-weight:800">Attention: ${qty(overAllocated)} share record(s) exceed total allotted units. Product-level allocation should be reviewed.</p>`:""}</div>
      <p class="hint" style="padding:3px 2px">Financial values use saved unit-price snapshots when available. Older records without a snapshot use the current product price as an estimate. “Shared” means a share attempt was recorded; opening WhatsApp does not verify delivery or purchase. Allotted value uses current product price × allotted quantity.</p>`;
    host.querySelectorAll("[data-dashboard-page]").forEach(btn=>btn.addEventListener("click",()=>{if(typeof showPage==="function")showPage(btn.dataset.dashboardPage);}));
  }
  const selector=$("dashboardPeriod");
  if(selector) selector.addEventListener("change",()=>{period=selector.value;render();});
  if(typeof save==="function"&&!save.__advancedDashboardWrapped){const originalSave=save;const wrapped=function(...args){const result=originalSave.apply(this,args);render();return result;};wrapped.__advancedDashboardWrapped=true;save=wrapped;}
  document.querySelectorAll('[data-page="dashboard"]').forEach(btn=>btn.addEventListener("click",render));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)render();});
  window.addEventListener("storage",e=>{if(e.key==="dealDhamakaAgentV2")render();});
  render();
})();
