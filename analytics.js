
/* Deal Dhamaka V2 — Analytics Dashboard
   Uses existing localStorage key. Does not replace app.js or dashboard.js. */
(() => {
  "use strict";

  const STORAGE_KEY = "dealDhamakaAgentV2";
  const $ = id => document.getElementById(id);
  const safe = v => String(v ?? "").replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])
  );
  const num = v => Math.max(0, Number(v) || 0);
  const fmt = v => Number.isInteger(v)
    ? String(v)
    : String(Number((Number(v) || 0).toFixed(2)));

  let period = "all";
  let customFrom = "";
  let customTo = "";
  let category = "brand";

  const style = document.createElement("style");
  style.textContent = `
    #dda-analytics { margin:18px 0; }
    .dda-top {
      display:flex; align-items:center; justify-content:space-between;
      gap:10px; flex-wrap:wrap;
    }
    .dda-top h2 { margin:0; font-size:23px; }
    .dda-controls {
      display:grid; grid-template-columns:1fr 1fr;
      gap:8px; margin:12px 0;
    }
    .dda-controls select,.dda-controls input {
      width:100%; min-width:0; box-sizing:border-box;
      padding:11px; border:1px solid #d1d5db;
      border-radius:12px; background:#fff; color:#111827;
    }
    .dda-kpis {
      display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
    }
    .dda-kpi {
      border:1px solid #e5e7eb; border-radius:16px;
      padding:14px; background:#fff; min-width:0;
    }
    .dda-kpi small { display:block; color:#64748b; font-size:12px; }
    .dda-kpi strong {
      display:block; font-size:25px; margin:5px 0;
      color:#111827; overflow-wrap:anywhere;
    }
    .dda-card {
      background:#fff; border:1px solid #e5e7eb;
      border-radius:18px; padding:16px; margin:12px 0;
      color:#111827;
    }
    .dda-card h3 { margin:0 0 8px; font-size:17px; }
    .dda-note { font-size:12px; color:#64748b; line-height:1.5; }
    .dda-chart { width:100%; height:auto; display:block; }
    .dda-legend {
      display:flex; flex-wrap:wrap; gap:16px;
      font-size:12px; color:#475569; margin-top:6px;
    }
    .dda-dot {
      display:inline-block; width:10px; height:10px;
      border-radius:3px; margin-right:5px; background:#2563eb;
    }
    .dda-dot.order { background:#16a34a; }
    .dda-barline {
      display:grid; grid-template-columns:minmax(0,1fr) 58px;
      gap:10px; align-items:center; margin:14px 0;
    }
    .dda-barline b { font-size:13px; overflow-wrap:anywhere; }
    .dda-bartrack {
      height:9px; background:#eef2f7; border-radius:8px;
      overflow:hidden; margin-top:5px;
    }
    .dda-barfill { height:100%; background:#2563eb; border-radius:8px; }
    .dda-barfill.order { background:#16a34a; }
    .dda-number { text-align:right; font-weight:700; font-size:13px; }
    .dda-tablewrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
    .dda-table {
      border-collapse:collapse; min-width:740px; width:100%;
      font-size:13px;
    }
    .dda-table th,.dda-table td {
      padding:10px 8px; border-bottom:1px solid #e5e7eb;
      text-align:right; white-space:nowrap;
    }
    .dda-table th:first-child,.dda-table td:first-child {
      text-align:left; white-space:normal; min-width:130px;
    }
    .dda-table tfoot { font-weight:800; background:#f8fafc; }
    .dda-actions {
      display:grid; grid-template-columns:repeat(2,minmax(0,1fr));
      gap:8px; margin:12px 0;
    }
    .dda-actions button {
      border-radius:12px; padding:12px; border:1px solid #d1d5db;
      background:#fff; color:#111827; font-weight:700;
    }
    .dda-alert {
      padding:10px 0; border-bottom:1px solid #eee; font-size:13px;
    }
    @media(min-width:650px) {
      .dda-kpis { grid-template-columns:repeat(3,minmax(0,1fr)); }
      .dda-controls { grid-template-columns:repeat(4,minmax(0,1fr)); }
    }
  `;
  document.head.appendChild(style);

  function readData() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const products = Array.isArray(raw.products) ? raw.products : [];
      const storedShares = Array.isArray(raw.shares) ? raw.shares : [];
      const shares = storedShares.map(record => {
        const product = record.productId == null
          ? products.find(p =>
              String(p.name || p.brand || "").trim() ===
                String(record.productName || record.brand || "").trim() &&
              String(p.productType || "").trim() ===
                String(record.productType || "").trim()
            )
          : products.find(p => String(p.id) === String(record.productId));

        if (record.productId != null && !product) return null;
        return product ? {
          ...record,
          brand: product.brand || product.name || "",
          productType: product.productType || "",
          productName: product.name || product.brand || ""
        } : record;
      }).filter(Boolean);

      return {
        contacts: Array.isArray(raw.contacts) ? raw.contacts : [],
        products,
        shares
      };
    } catch (_) {
      return { contacts: [], products: [], shares: [] };
    }
  }

  function inPeriod(record) {
    if (period === "all") return true;

    const t = Number(record.time);
    if (!Number.isFinite(t) || t <= 0) return false;

    const now = new Date();

    if (period === "today") {
      const start = new Date(
        now.getFullYear(), now.getMonth(), now.getDate()
      ).getTime();
      return t >= start;
    }

    if (period === "7days") return t >= Date.now() - 7 * 86400000;
    if (period === "30days") return t >= Date.now() - 30 * 86400000;

    if (period === "custom") {
      const from = customFrom
        ? new Date(customFrom + "T00:00:00").getTime()
        : 0;
      const to = customTo
        ? new Date(customTo + "T23:59:59.999").getTime()
        : Infinity;
      return t >= from && t <= to;
    }

    return true;
  }

  function groupName(record, kind) {
    const value = kind === "brand"
      ? (record.brand || record.name || record.productName || "Unspecified")
      : (record.productType || "Unspecified");

    return String(value).trim() || "Unspecified";
  }

  function aggregate(products, shares, kind) {
    const groups = new Map();

    function get(name) {
      if (!groups.has(name)) {
        groups.set(name, {
          name,
          allotted: 0,
          shared: 0,
          ordered: 0
        });
      }
      return groups.get(name);
    }

    products.forEach(p => {
      get(groupName(p, kind)).allotted += num(p.allottedQty);
    });

    shares.forEach(s => {
      const row = get(groupName(s, kind));
      row.shared += 1;
      if (s.ordered) row.ordered += 1;
    });

    return [...groups.values()].map(x => ({
      ...x,
      pendingAllotted: Math.max(0, x.allotted - x.shared),
      pendingOrdered: Math.max(0, x.shared - x.ordered),
      shortage: Math.max(0, x.shared - x.allotted)
    })).sort((a, b) =>
      b.shared - a.shared || a.name.localeCompare(b.name)
    );
  }

  function metric(label, value, note) {
    return `
      <div class="dda-kpi">
        <small>${safe(label)}</small>
        <strong>${safe(value)}</strong>
        <small>${safe(note)}</small>
      </div>`;
  }

  function rankings(rows) {
    if (!rows.length) {
      return '<p class="dda-note">No activity for this selection.</p>';
    }

    const max = Math.max(1, ...rows.map(x => x.shared));

    return rows.slice(0, 10).map(r => `
      <div class="dda-barline">
        <div>
          <b>${safe(r.name)}</b>
          <div class="dda-bartrack">
            <div class="dda-barfill" style="width:${r.shared / max * 100}%"></div>
          </div>
          <div class="dda-bartrack">
            <div class="dda-barfill order" style="width:${r.ordered / max * 100}%"></div>
          </div>
        </div>
        <div class="dda-number">${r.shared} / ${r.ordered}</div>
      </div>
    `).join("");
  }

  function trendBuckets(shares) {
    const buckets = new Map();

    for (const s of shares) {
      const t = Number(s.time);
      if (!Number.isFinite(t) || t <= 0) continue;

      const d = new Date(t);
      let key;

      if (period === "today") {
        key = String(d.getHours()).padStart(2, "0") + ":00";
      } else if (period === "7days") {
        key = `${d.getMonth() + 1}/${d.getDate()}`;
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      }

      if (!buckets.has(key)) {
        buckets.set(key, { label: key, shared: 0, ordered: 0, sort: t });
      }

      const row = buckets.get(key);
      row.sort = Math.min(row.sort, t);
      row.shared += 1;
      if (s.ordered) row.ordered += 1;
    }

    return [...buckets.values()]
      .sort((a, b) => a.sort - b.sort)
      .slice(-12);
  }

  function trendChart(points) {
    if (!points.length) {
      return '<p class="dda-note">No dated share records for this period.</p>';
    }

    const w = 640, h = 230, left = 38, right = 12, top = 20, bottom = 45;
    const max = Math.max(1, ...points.flatMap(p => [p.shared, p.ordered]));

    const x = i => left + (
      points.length === 1
        ? (w - left - right) / 2
        : i * (w - left - right) / (points.length - 1)
    );

    const y = v => h - bottom - v / max * (h - top - bottom);

    const line = field => points.map((p, i) =>
      `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p[field]).toFixed(1)}`
    ).join(" ");

    const ticks = [0, .25, .5, .75, 1].map(f => `
      <line x1="${left}" y1="${y(max * f)}"
        x2="${w - right}" y2="${y(max * f)}" stroke="#e5e7eb"/>
      <text x="${left - 7}" y="${y(max * f) + 4}"
        text-anchor="end" fill="#64748b" font-size="11">${Math.round(max * f)}</text>
    `).join("");

    const step = Math.max(1, Math.ceil(points.length / 5));
    const labels = points.map((p, i) =>
      i % step === 0 || i === points.length - 1
        ? `<text x="${x(i)}" y="${h - 18}" text-anchor="middle"
             font-size="11" fill="#64748b">${safe(p.label)}</text>`
        : ""
    ).join("");

    return `
      <svg class="dda-chart" viewBox="0 0 ${w} ${h}"
        role="img" aria-label="Share and order trend">
        ${ticks}
        <path d="${line("shared")}" fill="none" stroke="#2563eb"
          stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${line("ordered")}" fill="none" stroke="#16a34a"
          stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        ${points.map((p, i) => `
          <circle cx="${x(i)}" cy="${y(p.shared)}" r="4" fill="#2563eb"/>
          <circle cx="${x(i)}" cy="${y(p.ordered)}" r="4" fill="#16a34a"/>
        `).join("")}
        ${labels}
      </svg>`;
  }

  function statusTable(rows, heading) {
    const totals = rows.reduce((a, r) => {
      ["allotted", "shared", "ordered", "pendingAllotted", "pendingOrdered"]
        .forEach(k => a[k] += r[k]);
      return a;
    }, {
      allotted: 0,
      shared: 0,
      ordered: 0,
      pendingAllotted: 0,
      pendingOrdered: 0
    });

    const cells = r => `
      <td>${fmt(r.allotted)}</td>
      <td>${fmt(r.shared)}</td>
      <td>${fmt(r.ordered)}</td>
      <td>${fmt(r.pendingAllotted)}</td>
      <td>${fmt(r.pendingOrdered)}</td>`;

    return `
      <div class="dda-tablewrap">
        <table class="dda-table">
          <thead>
            <tr>
              <th>${safe(heading)}</th>
              <th>Allotted</th>
              <th>Shared</th>
              <th>Ordered</th>
              <th>Pending Allotted</th>
              <th>Pending Ordered</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map(r => `
              <tr>
                <td>
                  ${safe(r.name)}
                  ${r.shortage
                    ? `<small style="display:block;color:#b42318">Over-allocated: ${fmt(r.shortage)}</small>`
                    : ""}
                </td>
                ${cells(r)}
              </tr>
            `).join("") : `
              <tr><td colspan="6">No records available.</td></tr>
            `}
          </tbody>
          <tfoot>
            <tr><td>TOTAL</td>${cells(totals)}</tr>
          </tfoot>
        </table>
      </div>`;
  }

  function exportCSV(products, shares) {
    const rows = [[
      "Group", "Name", "Allotted", "Shared", "Ordered",
      "Pending Allotted", "Pending Ordered"
    ]];

    for (const [kind, label] of [
      ["brand", "Brand"],
      ["type", "Product Type"]
    ]) {
      aggregate(products, shares, kind).forEach(r => {
        rows.push([
          label, r.name, r.allotted, r.shared, r.ordered,
          r.pendingAllotted, r.pendingOrdered
        ]);
      });
    }

    const csv = rows.map(row =>
      row.map(v => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(",")
    ).join("\r\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deal-dhamaka-analytics.csv";
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function render() {
    const host = $("dda-analytics");
    if (!host) return;

    const data = readData();
    const filtered = data.shares.filter(inPeriod);
    const allotted = data.products.reduce(
      (sum, p) => sum + num(p.allottedQty), 0
    );
    const shared = filtered.length;
    const allTimeShared = data.shares.length;
    const ordered = filtered.filter(s => !!s.ordered).length;
    const pendingAllotted = Math.max(0, allotted - allTimeShared);
    const activeDeals = data.products.filter(p => (p.dealStatus || "active") === "active").length;
    const closedDeals = data.products.filter(p => p.dealStatus === "closed").length;
    const pendingOrdered = Math.max(0, shared - ordered);
    const conversion = shared ? ordered / shared * 100 : 0;

    const brandRows = aggregate(data.products, filtered, "brand");
    const typeRows = aggregate(data.products, filtered, "type");
    const trend = trendBuckets(filtered);

    // Inventory alerts always use all share records, not the selected date range.
    const allBrandRows = aggregate(data.products, data.shares, "brand");
    const exhausted = data.products.filter(p => {
      const used = data.shares.filter(
        s => String(s.productId) === String(p.id)
      ).length;
      return used >= num(p.allottedQty);
    });

    const alerts = [
      ...exhausted.slice(0, 5).map(p => `
        <div class="dda-alert">
          ⚠️ ${safe(p.brand || p.name)} · ${safe(p.productType || "Unspecified")}
          — no available units
        </div>
      `),
      ...allBrandRows.filter(r => r.shortage > 0).slice(0, 5).map(r => `
        <div class="dda-alert">
          ⚠️ ${safe(r.name)} — over-allocated by ${fmt(r.shortage)}
        </div>
      `)
    ];

    host.innerHTML = `
      <div class="dda-top">
        <h2>Analytics Overview</h2>
        <span class="dda-note">Live browser data</span>
      </div>

      <div class="dda-controls">
        <select id="dda-period" aria-label="Dashboard period">
          ${[
            ["all", "All Time"],
            ["today", "Today"],
            ["7days", "Last 7 Days"],
            ["30days", "Last 30 Days"],
            ["custom", "Custom Dates"]
          ].map(([v, label]) => `
            <option value="${v}" ${period === v ? "selected" : ""}>${label}</option>
          `).join("")}
        </select>

        <select id="dda-category" aria-label="Ranking category">
          <option value="brand" ${category === "brand" ? "selected" : ""}>Brand Rankings</option>
          <option value="type" ${category === "type" ? "selected" : ""}>Product Type Rankings</option>
        </select>

        ${period === "custom" ? `
          <input id="dda-from" type="date" value="${safe(customFrom)}" aria-label="From date">
          <input id="dda-to" type="date" value="${safe(customTo)}" aria-label="To date">
        ` : ""}
      </div>

      <div class="dda-kpis">
        ${metric("Active Deals", activeDeals, "Products currently active")}
        ${metric("Closed Deals", closedDeals, "Products marked closed")}
        ${metric("Allotted", fmt(allotted), "Current product allotment")}
        ${metric("Shared", shared, "Share attempts in selected period")}
        ${metric("Ordered", ordered, "Selected-period records marked ordered")}
        ${metric("Pending Allotted", fmt(pendingAllotted), "Allotted minus all-time share attempts")}
        ${metric("Pending Ordered", pendingOrdered, "Selected-period shares not marked ordered")}
        ${metric("Order Conversion", conversion.toFixed(1) + "%", "Ordered ÷ shares in selected period")}
      </div>

      <div class="dda-card">
        <h3>Share &amp; Order Trend</h3>
        ${trendChart(trend)}
        <div class="dda-legend">
          <span><i class="dda-dot"></i>Shared</span>
          <span><i class="dda-dot order"></i>Ordered</span>
        </div>
      </div>

      <div class="dda-card">
        <h3>${category === "brand" ? "Brand Rankings" : "Product Type Rankings"}</h3>
        <p class="dda-note">Shared / Ordered</p>
        ${rankings(category === "brand" ? brandRows : typeRows)}
      </div>

      <div class="dda-card">
        <h3>Brand-wise Status</h3>
        ${statusTable(brandRows, "Brand")}
      </div>

      <div class="dda-card">
        <h3>Product Type-wise Status</h3>
        ${statusTable(typeRows, "Product Type")}
      </div>

      <div class="dda-card">
        <h3>Stock Alerts</h3>
        ${alerts.join("") || '<p class="dda-note">No stock alerts.</p>'}
      </div>

      <div class="dda-actions">
        <button type="button" id="dda-send">↗ Share Deals</button>
        <button type="button" id="dda-products">▣ Products</button>
        <button type="button" id="dda-tracking">📊 Tracking</button>
        <button type="button" id="dda-export">↓ Export CSV</button>
      </div>

      <p class="dda-note">
        Allotted is the current product allotment. Date filters apply to share
        attempts and their current ordered flags; they do not reconstruct
        historical allotments or the date an order was marked. A WhatsApp
        share attempt does not confirm message delivery or a completed purchase.
      </p>
    `;

    $("dda-period").onchange = e => {
      period = e.target.value;
      render();
    };

    $("dda-category").onchange = e => {
      category = e.target.value;
      render();
    };

    if ($("dda-from")) {
      $("dda-from").onchange = e => {
        customFrom = e.target.value;
        render();
      };
    }

    if ($("dda-to")) {
      $("dda-to").onchange = e => {
        customTo = e.target.value;
        render();
      };
    }

    for (const [id, page] of [
      ["dda-send", "send"],
      ["dda-products", "products"],
      ["dda-tracking", "tracking"]
    ]) {
      $(id).onclick = () => {
        if (typeof showPage === "function") showPage(page);
      };
    }

    $("dda-export").onclick = () => exportCSV(data.products, filtered);
  }

  function install() {
    const dashboard = $("dashboard");
    if (!dashboard || $("dda-analytics")) return;

    const host = document.createElement("div");
    host.id = "dda-analytics";

    const advanced = $("advancedDashboard");

    // Keep the existing advanced dashboard and add analytics before it.
    if (advanced) {
      advanced.insertAdjacentElement("beforebegin", host);
    } else {
      dashboard.appendChild(host);
    }

    render();

    // Refresh after existing app.js saves data.
    if (typeof save === "function") {
      const originalSave = save;
      save = function (...args) {
        const result = originalSave.apply(this, args);
        render();
        return result;
      };
    }

    document.querySelectorAll('[data-page="dashboard"]').forEach(button => {
      button.addEventListener("click", render);
    });

    window.addEventListener("storage", e => {
      if (e.key === STORAGE_KEY) render();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})();
